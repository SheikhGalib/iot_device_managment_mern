const express = require('express');
const Workspace = require('../models/Workspace');
const Widget = require('../models/Widget');
const Device = require('../models/Device');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Apply authentication to all workspace routes
router.use(authenticate);

// @route   GET /api/workspaces
// @desc    Get all workspaces for authenticated user
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    
    // Build query
    const query = { user: req.user._id };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { isDefault: -1, updatedAt: -1 }
    };

    const workspaces = await Workspace.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .lean();

    const total = await Workspace.countDocuments(query);

    logger.info(`Found ${workspaces.length} workspaces for user ${req.user._id}`);

    res.json({
      success: true,
      data: {
        workspaces,
        pagination: {
          page: options.page,
          pages: Math.ceil(total / options.limit),
          total,
          limit: options.limit
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/workspaces
// @desc    Create a new workspace
// @access  Private
router.post('/', async (req, res, next) => {
  try {
    const { name, description, isDefault = false, gridSettings } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Workspace name is required'
      });
    }

    // Check if workspace name already exists for this user
    const existingWorkspace = await Workspace.findOne({
      user: req.user._id,
      name: name.trim()
    });

    if (existingWorkspace) {
      return res.status(400).json({
        success: false,
        error: 'Workspace with this name already exists'
      });
    }

    const workspace = await Workspace.create({
      user: req.user._id,
      name: name.trim(),
      description: description?.trim() || '',
      isDefault,
      gridSettings: gridSettings || {}
    });

    logger.info(`Workspace created: ${workspace.name} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/workspaces/:id
// @desc    Get workspace by ID with populated widgets
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate({
      path: 'widgets',
      populate: {
        path: 'deviceId',
        select: 'name type status ip_address'
      },
      options: { sort: { order: 1, createdAt: 1 } }
    }).lean();

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Ensure each widget has proper layout.i set to widget._id string
    workspace.widgets = workspace.widgets.map(widget => ({
      ...widget,
      layout: {
        ...widget.layout,
        i: widget._id.toString()
      }
    }));

    res.json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/workspaces/:id
// @desc    Update workspace metadata
// @access  Private
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, isDefault, gridSettings } = req.body;
    
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Check name uniqueness if name is being changed
    if (name && name.trim() !== workspace.name) {
      const existingWorkspace = await Workspace.findOne({
        user: req.user._id,
        name: name.trim(),
        _id: { $ne: workspace._id }
      });

      if (existingWorkspace) {
        return res.status(400).json({
          success: false,
          error: 'Workspace with this name already exists'
        });
      }
    }

    // Update fields
    if (name !== undefined) workspace.name = name.trim();
    if (description !== undefined) workspace.description = description.trim();
    if (isDefault !== undefined) workspace.isDefault = isDefault;
    if (gridSettings !== undefined) {
      workspace.gridSettings = {
        ...workspace.gridSettings,
        ...gridSettings
      };
    }

    await workspace.save();

    logger.info(`Workspace updated: ${workspace.name} by ${req.user.username}`);

    res.json({
      success: true,
      data: workspace
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/workspaces/:id
// @desc    Delete workspace and all its widgets
// @access  Private
router.delete('/:id', async (req, res, next) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Don't allow deletion of default workspace if it's the only one
    if (workspace.isDefault) {
      const workspaceCount = await Workspace.countDocuments({ user: req.user._id });
      if (workspaceCount === 1) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete the only workspace. Create another workspace first.'
        });
      }
    }

    // Delete all widgets in this workspace
    await Widget.deleteMany({ workspace: workspace._id });

    // Delete the workspace
    await Workspace.findByIdAndDelete(workspace._id);

    logger.info(`Workspace deleted: ${workspace.name} by ${req.user.username}`);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/workspaces/:id/widgets
// @desc    Add a new widget to workspace
// @access  Private
router.post('/:id/widgets', async (req, res, next) => {
  try {
    const { type, title, settings = {}, layout = {}, deviceId, dataPath } = req.body;

    if (!type || !title) {
      return res.status(400).json({
        success: false,
        error: 'Widget type and title are required'
      });
    }

    const workspace = await Workspace.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Validate device if deviceId is provided
    if (deviceId) {
      const device = await Device.findOne({
        _id: deviceId,
        created_by: req.user._id
      });

      if (!device) {
        return res.status(400).json({
          success: false,
          error: 'Device not found or not accessible'
        });
      }
    }

    // Create widget
    const widget = new Widget({
      workspace: workspace._id,
      type,
      title: title.trim(),
      settings,
      deviceId: deviceId || null,
      dataPath: dataPath?.trim() || ''
    });

    // Set layout - use provided layout or generate default
    if (Object.keys(layout).length > 0) {
      widget.layout = {
        ...widget.getDefaultLayout(),
        ...layout,
        i: widget._id.toString()
      };
    } else {
      widget.layout = widget.getDefaultLayout();
    }

    // Validate layout
    const layoutErrors = widget.validateLayout();
    if (layoutErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid layout: ${layoutErrors.join(', ')}`
      });
    }

    await widget.save();

    // Add widget to workspace
    workspace.widgets.push(widget._id);
    await workspace.save();

    // Populate device info for response
    await widget.populate('deviceId', 'name type status ip_address');

    logger.info(`Widget added: ${widget.title} (${widget.type}) to workspace ${workspace.name} by ${req.user.username}`);

    res.status(201).json({
      success: true,
      data: widget
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/workspaces/:id/layout
// @desc    Bulk update widget layouts
// @access  Private
router.put('/:id/layout', async (req, res, next) => {
  try {
    const { layouts } = req.body;

    if (!Array.isArray(layouts)) {
      return res.status(400).json({
        success: false,
        error: 'Layouts must be an array'
      });
    }

    const workspace = await Workspace.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Prepare bulk operations
    const bulkOps = [];
    
    for (const layoutItem of layouts) {
      const { i, x, y, w, h } = layoutItem;
      
      if (!i || x === undefined || y === undefined || w === undefined || h === undefined) {
        continue; // Skip invalid layout items
      }

      // Validate layout values
      if (x < 0 || y < 0 || w < 1 || w > 12 || h < 1) {
        continue; // Skip invalid values
      }

      bulkOps.push({
        updateOne: {
          filter: { 
            _id: i,
            workspace: workspace._id
          },
          update: {
            $set: {
              'layout.x': x,
              'layout.y': y,
              'layout.w': w,
              'layout.h': h
            }
          }
        }
      });
    }

    if (bulkOps.length > 0) {
      const result = await Widget.bulkWrite(bulkOps);
      
      logger.info(`Bulk layout update: ${result.modifiedCount} widgets updated in workspace ${workspace.name} by ${req.user.username}`);

      res.json({
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
          matchedCount: result.matchedCount
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          modifiedCount: 0,
          matchedCount: 0
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/workspaces/:id/export
// @desc    Export workspace configuration as JSON
// @access  Private
router.get('/:id/export', async (req, res, next) => {
  try {
    const workspace = await Workspace.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('widgets').lean();

    if (!workspace) {
      return res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Remove sensitive data and prepare for export
    const exportData = {
      name: workspace.name,
      description: workspace.description,
      gridSettings: workspace.gridSettings,
      widgets: workspace.widgets.map(widget => ({
        type: widget.type,
        title: widget.title,
        settings: widget.settings,
        layout: widget.layout,
        dataPath: widget.dataPath
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;