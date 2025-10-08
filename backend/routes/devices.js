const express = require('express');
const Device = require('../models/Device');
const DeviceActivity = require('../models/DeviceActivity');
const { authenticate } = require('../middleware/auth');
const { validateDevice, validateDeviceUpdate, validateCommand } = require('../middleware/validation');
const { sshRateLimit } = require('../middleware/rateLimiter');
const sshManager = require('../utils/sshManager');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Apply authentication to all device routes (temporarily disabled for testing)
// router.use(authenticate);

// @route   GET /api/devices
// @desc    Get all devices with optional filtering
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { ip_address: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { updatedAt: -1 }
    };

    const devices = await Device.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .select('-ssh_password'); // Don't send password in response

    const total = await Device.countDocuments(query);

    res.json({
      success: true,
      data: {
        devices,
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

// @route   POST /api/devices/register
// @desc    Register a new device
// @access  Private
router.post('/register', validateDevice, async (req, res, next) => {
  try {
    const device = await Device.create(req.body);

    // Try to establish initial connection to verify credentials
    try {
      await sshManager.connect(device);
      device.status = 'online';
      device.last_seen = new Date();
      await device.save();

      // Get initial system info
      const systemInfo = await sshManager.getSystemInfo(device._id.toString());
      device.cpu_usage = parseFloat(systemInfo.cpu) || 0;
      device.ram_usage = parseFloat(systemInfo.memory) || 0;
      device.temperature = parseFloat(systemInfo.temperature) || 0;
      await device.save();

      logger.info(`Device registered and connected: ${device.name} (${device.ip_address})`);
    } catch (sshError) {
      logger.warn(`Device registered but SSH connection failed: ${device.name} - ${sshError.message}`);
    }

    // Log activity
    await DeviceActivity.create({
      device_id: device._id,
      action_type: 'system_check',
      status: 'success',
      log_output: 'Device registered successfully',
      triggered_by: req.user.username
    });

    res.status(201).json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/devices/:id
// @desc    Get device by ID
// @access  Private
router.get('/:id', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id).select('-ssh_password');
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/devices/:id
// @desc    Update device
// @access  Private
router.put('/:id', validateDeviceUpdate, async (req, res, next) => {
  try {
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-ssh_password');

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    logger.info(`Device updated: ${device.name} by ${req.user.username}`);

    res.json({
      success: true,
      data: device
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/devices/:id
// @desc    Delete device
// @access  Private
router.delete('/:id', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Close SSH connection if exists
    await sshManager.disconnect(device._id.toString());

    // Delete device and related activities
    await Device.findByIdAndDelete(req.params.id);
    await DeviceActivity.deleteMany({ device_id: req.params.id });

    logger.info(`Device deleted: ${device.name} by ${req.user.username}`);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/devices/:id/connect
// @desc    Establish SSH connection to device
// @access  Private
router.post('/:id/connect', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Check if already connected
    if (sshManager.getConnection(device._id.toString())) {
      return res.json({
        success: true,
        message: 'Device is already connected',
        data: { status: 'connected' }
      });
    }

    // Establish connection
    await sshManager.connect(device);
    
    // Update device status
    device.status = 'online';
    device.last_seen = new Date();
    device.active_sessions = (device.active_sessions || 0) + 1;
    await device.save();

    // Log activity
    await DeviceActivity.create({
      device_id: device._id,
      action_type: 'system_check',
      status: 'success',
      log_output: 'SSH connection established',
      triggered_by: req.user.username
    });

    logger.info(`SSH connection established to device ${device.name} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Connected to device successfully',
      data: { status: 'connected' }
    });
  } catch (error) {
    // Log failed connection attempt
    try {
      await DeviceActivity.create({
        device_id: req.params.id,
        action_type: 'system_check',
        status: 'failed',
        log_output: `SSH connection failed: ${error.message}`,
        error_message: error.message,
        triggered_by: req.user.username
      });
    } catch (logError) {
      logger.error('Failed to log connection attempt:', logError);
    }

    next(error);
  }
});

// @route   POST /api/devices/:id/execute
// @desc    Execute command on device
// @access  Private
router.post('/:id/execute', sshRateLimit, validateCommand, async (req, res, next) => {
  try {
    const { command, action_type } = req.body;
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Ensure SSH connection exists
    let connection = sshManager.getConnection(device._id.toString());
    if (!connection) {
      await sshManager.connect(device);
    }

    // Create activity log
    const activity = await DeviceActivity.create({
      device_id: device._id,
      action_type: action_type || 'terminal_session',
      command,
      status: 'in_progress',
      triggered_by: req.user.username,
      session_id: uuidv4()
    });

    try {
      // Execute command
      const result = await sshManager.executeCommand(device._id.toString(), command);
      
      // Update activity with results
      activity.status = result.code === 0 ? 'success' : 'failed';
      activity.log_output = result.stdout;
      activity.error_message = result.stderr;
      activity.end_time = new Date();
      await activity.save();

      // Update device last seen
      device.last_seen = new Date();
      await device.save();

      logger.info(`Command executed on device ${device.name} by ${req.user.username}: ${command}`);

      res.json({
        success: true,
        data: {
          output: result.stdout,
          error: result.stderr,
          exitCode: result.code,
          sessionId: activity.session_id
        }
      });
    } catch (execError) {
      // Update activity with error
      activity.status = 'failed';
      activity.error_message = execError.message;
      activity.end_time = new Date();
      await activity.save();

      throw execError;
    }
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/devices/:id/status
// @desc    Get real-time device status and metrics
// @access  Private
router.get('/:id/status', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    let systemInfo = {};
    let connectionStatus = 'disconnected';

    try {
      // Ensure SSH connection
      let connection = sshManager.getConnection(device._id.toString());
      if (!connection) {
        await sshManager.connect(device);
      }
      
      // Get fresh system info
      systemInfo = await sshManager.getSystemInfo(device._id.toString());
      connectionStatus = 'connected';

      // Update device with fresh data
      device.cpu_usage = parseFloat(systemInfo.cpu) || 0;
      device.ram_usage = parseFloat(systemInfo.memory) || 0;
      device.temperature = parseFloat(systemInfo.temperature) || 0;
      device.status = 'online';
      device.last_seen = new Date();
      await device.save();

    } catch (sshError) {
      logger.warn(`Failed to get system info for device ${device.name}: ${sshError.message}`);
      device.status = 'offline';
      await device.save();
    }

    res.json({
      success: true,
      data: {
        device: {
          id: device._id,
          name: device.name,
          status: device.status,
          cpu_usage: device.cpu_usage,
          ram_usage: device.ram_usage,
          temperature: device.temperature,
          last_seen: device.last_seen
        },
        systemInfo,
        connectionStatus
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/devices/:id/files
// @desc    Browse device filesystem
// @access  Private
router.get('/:id/files', async (req, res, next) => {
  try {
    const { path = '/' } = req.query;
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Ensure SSH connection
    let connection = sshManager.getConnection(device._id.toString());
    if (!connection) {
      await sshManager.connect(device);
    }

    const files = await sshManager.listDirectory(device._id.toString(), path);

    res.json({
      success: true,
      data: {
        path,
        files
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/devices/:id/logs
// @desc    Get device activity logs
// @access  Private
router.get('/:id/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const activities = await DeviceActivity.find({ device_id: req.params.id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await DeviceActivity.countDocuments({ device_id: req.params.id });

    res.json({
      success: true,
      data: {
        activities,
        pagination: {
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;