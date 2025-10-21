const express = require('express');
const Widget = require('../models/Widget');
const Workspace = require('../models/Workspace');
const Device = require('../models/Device');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to all widget routes
router.use(authenticate);

// @route   GET /api/widgets/types
// @desc    Get available widget types with their configurations
// @access  Private
router.get('/types', async (req, res, next) => {
  try {
    const widgetTypes = [
      {
        type: 'temperature',
        name: 'Temperature Sensor',
        description: 'Display temperature readings with configurable units',
        icon: 'thermometer',
        defaultSettings: {
          unit: '°C',
          format: 'number',
          precision: 1,
          color: '#ef4444'
        },
        defaultLayout: { w: 3, h: 4, minW: 2, minH: 3 }
      },
      {
        type: 'humidity',
        name: 'Humidity Sensor',
        description: 'Display humidity percentage readings',
        icon: 'droplets',
        defaultSettings: {
          unit: '%',
          format: 'number',
          precision: 1,
          color: '#3b82f6'
        },
        defaultLayout: { w: 3, h: 4, minW: 2, minH: 3 }
      },
      {
        type: 'led',
        name: 'LED Control',
        description: 'Control and monitor LED status',
        icon: 'lightbulb',
        defaultSettings: {
          format: 'boolean',
          color: '#22c55e'
        },
        defaultLayout: { w: 2, h: 3, minW: 2, minH: 2 }
      },
      {
        type: 'gps',
        name: 'GPS Location',
        description: 'Display GPS coordinates and location',
        icon: 'map-pin',
        defaultSettings: {
          format: 'json',
          precision: 6,
          color: '#8b5cf6'
        },
        defaultLayout: { w: 4, h: 5, minW: 3, minH: 4 }
      },
      {
        type: 'camera',
        name: 'Camera Feed',
        description: 'Display camera feed or images',
        icon: 'camera',
        defaultSettings: {
          format: 'text',
          refreshInterval: 5000,
          color: '#f59e0b'
        },
        defaultLayout: { w: 6, h: 6, minW: 4, minH: 4 }
      },
      {
        type: 'chart',
        name: 'Data Chart',
        description: 'Display historical data as charts',
        icon: 'bar-chart-3',
        defaultSettings: {
          format: 'number',
          showHistory: true,
          historyDuration: 3600,
          color: '#06b6d4'
        },
        defaultLayout: { w: 6, h: 5, minW: 4, minH: 4 }
      },
      {
        type: 'gauge',
        name: 'Gauge Display',
        description: 'Display values with gauge visualization',
        icon: 'gauge',
        defaultSettings: {
          format: 'number',
          minValue: 0,
          maxValue: 100,
          color: '#ec4899'
        },
        defaultLayout: { w: 4, h: 4, minW: 3, minH: 3 }
      },
      {
        type: 'text',
        name: 'Text Display',
        description: 'Display text or simple values',
        icon: 'type',
        defaultSettings: {
          format: 'text',
          color: '#6b7280'
        },
        defaultLayout: { w: 3, h: 2, minW: 2, minH: 1 }
      },
      {
        type: 'custom',
        name: 'Custom Widget',
        description: 'Custom widget with flexible configuration',
        icon: 'puzzle',
        defaultSettings: {
          format: 'json',
          color: '#84cc16'
        },
        defaultLayout: { w: 3, h: 4, minW: 2, minH: 2 }
      }
    ];

    res.json({
      success: true,
      data: widgetTypes
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/widgets/:id
// @desc    Update widget settings and metadata
// @access  Private
router.put('/:id', async (req, res, next) => {
  try {
    const { title, settings, layout, deviceId, dataPath, isActive, order } = req.body;

    // Find widget and verify ownership through workspace
    const widget = await Widget.findById(req.params.id).populate({
      path: 'workspace',
      select: 'user'
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found'
      });
    }

    if (widget.workspace.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this widget'
      });
    }

    // Validate device if deviceId is being updated
    if (deviceId !== undefined && deviceId !== null) {
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

    // Update fields
    if (title !== undefined) widget.title = title.trim();
    if (settings !== undefined) {
      widget.settings = {
        ...widget.settings,
        ...settings
      };
    }
    if (layout !== undefined) {
      widget.layout = {
        ...widget.layout,
        ...layout,
        i: widget._id.toString() // Ensure i is always the widget ID
      };

      // Validate layout after update
      const layoutErrors = widget.validateLayout();
      if (layoutErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid layout: ${layoutErrors.join(', ')}`
        });
      }
    }
    if (deviceId !== undefined) widget.deviceId = deviceId;
    if (dataPath !== undefined) widget.dataPath = dataPath?.trim() || '';
    if (isActive !== undefined) widget.isActive = isActive;
    if (order !== undefined) widget.order = order;

    await widget.save();

    // Populate device info for response
    await widget.populate('deviceId', 'name type status ip_address');

    logger.info(`Widget updated: ${widget.title} (${widget.type}) by ${req.user.username}`);

    res.json({
      success: true,
      data: widget
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/widgets/:id
// @desc    Delete widget
// @access  Private
router.delete('/:id', async (req, res, next) => {
  try {
    // Find widget and verify ownership through workspace
    const widget = await Widget.findById(req.params.id).populate({
      path: 'workspace',
      select: 'user widgets'
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found'
      });
    }

    if (widget.workspace.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this widget'
      });
    }

    // Remove widget from workspace widgets array
    const workspace = widget.workspace;
    workspace.widgets = workspace.widgets.filter(
      widgetId => widgetId.toString() !== widget._id.toString()
    );
    await workspace.save();

    // Delete the widget
    await Widget.findByIdAndDelete(widget._id);

    logger.info(`Widget deleted: ${widget.title} (${widget.type}) by ${req.user.username}`);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/widgets/:id
// @desc    Get widget by ID
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const widget = await Widget.findById(req.params.id)
      .populate('deviceId', 'name type status ip_address')
      .populate({
        path: 'workspace',
        select: 'user name'
      });

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found'
      });
    }

    if (widget.workspace.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this widget'
      });
    }

    res.json({
      success: true,
      data: widget
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/widgets/:id/duplicate
// @desc    Duplicate widget within the same workspace
// @access  Private
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const originalWidget = await Widget.findById(req.params.id).populate({
      path: 'workspace',
      select: 'user'
    });

    if (!originalWidget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found'
      });
    }

    if (originalWidget.workspace.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to duplicate this widget'
      });
    }

    // Create duplicate widget
    const duplicateWidget = new Widget({
      workspace: originalWidget.workspace._id,
      type: originalWidget.type,
      title: `${originalWidget.title} (Copy)`,
      settings: { ...originalWidget.settings },
      layout: {
        ...originalWidget.layout,
        x: (originalWidget.layout.x + originalWidget.layout.w) % 12,
        y: originalWidget.layout.y,
        i: undefined // Will be set to new widget ID automatically
      },
      deviceId: originalWidget.deviceId,
      dataPath: originalWidget.dataPath,
      order: originalWidget.order + 1
    });

    // Set layout.i to new widget ID
    duplicateWidget.layout.i = duplicateWidget._id.toString();

    await duplicateWidget.save();

    // Add to workspace
    const workspace = await Workspace.findById(originalWidget.workspace._id);
    workspace.widgets.push(duplicateWidget._id);
    await workspace.save();

    // Populate device info for response
    await duplicateWidget.populate('deviceId', 'name type status ip_address');

    logger.info(`Widget duplicated: ${duplicateWidget.title} (${duplicateWidget.type}) by ${req.user.username}`);

    res.status(201).json({
      success: true,
      data: duplicateWidget
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/widgets/:id/position
// @desc    Update widget position and size
// @access  Private
router.put('/:id/position', async (req, res, next) => {
  try {
    const { x, y, w, h } = req.body;

    if (x === undefined || y === undefined || w === undefined || h === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Position and size (x, y, w, h) are required'
      });
    }

    const widget = await Widget.findById(req.params.id).populate({
      path: 'workspace',
      select: 'user'
    });

    if (!widget) {
      return res.status(404).json({
        success: false,
        error: 'Widget not found'
      });
    }

    if (widget.workspace.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this widget'
      });
    }

    // Validate position and size
    if (x < 0 || y < 0 || w < 1 || w > 12 || h < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid position or size values'
      });
    }

    // Update layout
    widget.layout.x = x;
    widget.layout.y = y;
    widget.layout.w = w;
    widget.layout.h = h;

    // Validate layout constraints
    const layoutErrors = widget.validateLayout();
    if (layoutErrors.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid layout: ${layoutErrors.join(', ')}`
      });
    }

    await widget.save();

    res.json({
      success: true,
      data: {
        id: widget._id,
        layout: widget.layout
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;