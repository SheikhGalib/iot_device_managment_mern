const express = require('express');
const Device = require('../models/Device');
const DeviceActivity = require('../models/DeviceActivity');
const { authenticate } = require('../middleware/auth');
const { validateDevice, validateDeviceUpdate, validateCommand } = require('../middleware/validation');
const { sshRateLimit } = require('../middleware/rateLimiter');
const sshManager = require('../utils/sshManager');
const httpApiManager = require('../utils/httpApiManager');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Apply authentication to all device routes except heartbeat endpoints
router.use((req, res, next) => {
  // Skip authentication for heartbeat and status endpoints called by edge servers
  if (req.path.includes('/heartbeat/') || req.path.includes('/api-status/')) {
    return next();
  }
  authenticate(req, res, next);
});

// @route   GET /api/devices
// @desc    Get all devices with optional filtering
// @access  Private
router.get('/', async (req, res, next) => {
  try {
    const { status, type, search, page = 1, limit = 10 } = req.query;
    
    // Build query - filter by user
    const query = { created_by: req.user._id };
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
    // Generate unique device key
    const deviceKey = `device_${uuidv4().replace(/-/g, '')}`;
    
    const device = await Device.create({
      ...req.body,
      device_key: deviceKey,
      created_by: req.user._id,
      status: 'offline',
      deployment_status: 'idle',
      api_status: 'not-connected'
    });

    // Return immediately with device info and device key
    res.status(201).json({
      success: true,
      data: device,
      message: 'Device registered successfully. Starting SSH connection and edge server deployment...',
      device_key: deviceKey
    });

    // Handle SSH connection and deployment asynchronously
    setImmediate(async () => {
      try {
        // Update deployment status
        device.deployment_status = 'running';
        await device.save();

        // Try to establish initial connection to verify credentials
        await sshManager.connect(device);
        device.status = 'online';
        device.last_seen = new Date();
        await device.save();
        
        logger.info(`SSH connection established to device ${device.name} (${device.ip_address})`);
        
        // Deploy edge server to the device
        const deploymentResult = await sshManager.deployEdgeServer(device._id.toString(), deviceKey);
        
        if (deploymentResult.success) {
          device.api_status = 'not-connected'; // Waiting for edge server to connect
          device.deployment_status = 'idle';
          logger.info(`Edge server deployed successfully to ${device.name}`);
        } else {
          device.api_status = 'error';
          device.deployment_status = 'error';
          logger.warn(`Edge server deployment failed for ${device.name}: ${deploymentResult.error}`);
        }
        
        await device.save();

        // Get initial system info
        try {
          const systemInfo = await sshManager.getSystemInfo(device._id.toString());
          device.cpu_usage = parseFloat(systemInfo.cpu) || 0;
          device.ram_usage = parseFloat(systemInfo.memory) || 0;
          device.temperature = parseFloat(systemInfo.temperature) || 0;
          await device.save();
        } catch (sysError) {
          logger.warn(`Failed to get system info for ${device.name}: ${sysError.message}`);
        }

        logger.info(`Device registered and connected: ${device.name} (${device.ip_address})`);

        // Log activity
        await DeviceActivity.create({
          device_id: device._id,
          action_type: 'system_check',
          status: 'success',
          log_output: 'Device registered and edge server deployed successfully',
          triggered_by: 'system'
        });

      } catch (sshError) {
        logger.warn(`Device registered but SSH connection failed: ${device.name} - ${sshError.message}`);
        
        device.status = 'offline';
        device.deployment_status = 'error';
        device.api_status = 'error';
        await device.save();

        // Log error activity
        await DeviceActivity.create({
          device_id: device._id,
          action_type: 'system_check',
          status: 'failed',
          log_output: `SSH connection failed: ${sshError.message}`,
          error_message: sshError.message,
          triggered_by: 'system'
        });
      }
    });

  } catch (error) {
    next(error);
  }
});

// @route   GET /api/devices/status/:id
// @desc    Get device deployment status
// @access  Private
router.get('/status/:id', async (req, res, next) => {
  try {
    const device = await Device.findById(req.params.id).select('deployment_status api_status status device_key name');
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: {
        deployment_status: device.deployment_status,
        api_status: device.api_status,
        status: device.status,
        device_key: device.device_key,
        name: device.name
      }
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
    const device = await Device.findOne({ 
      _id: req.params.id, 
      created_by: req.user._id 
    }).select('-ssh_password');
    
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

    logger.info(`Device updated: ${device.name} by ${req.user?.username || 'system'}`);

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

    logger.info(`Device deleted: ${device.name} by ${req.user?.username || 'system'}`);

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
      triggered_by: req.user?.username || 'system'
    });

    logger.info(`SSH connection established to device ${device.name} by ${req.user?.username || 'system'}`);

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
        triggered_by: req.user?.username || 'system'
      });
    } catch (logError) {
      logger.error('Failed to log connection attempt:', logError);
    }

    next(error);
  }
});

// @route   POST /api/devices/:id/execute
// @desc    Execute command on device via HTTP API
// @access  Private
router.post('/:id/execute', sshRateLimit, validateCommand, async (req, res, next) => {
  try {
    const { command, action_type } = req.body;
    const device = await Device.findOne({ 
      _id: req.params.id, 
      created_by: req.user._id 
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Check if device API is reachable
    const isReachable = await httpApiManager.isDeviceReachable(device);
    if (!isReachable) {
      return res.status(503).json({
        success: false,
        error: `Device ${device.name} is not reachable. Make sure the edge server is running.`
      });
    }

    // Create activity log
    const activity = await DeviceActivity.create({
      device_id: device._id,
      action_type: action_type || 'terminal_session',
      command,
      status: 'in_progress',
      triggered_by: req.user?.username || 'system',
      session_id: uuidv4()
    });

    try {
      // Execute command using HTTP API
      const result = await httpApiManager.executeCommand(device, command);
      
      // Update activity with results
      activity.status = result.code === 0 ? 'success' : 'failed';
      activity.log_output = result.stdout;
      activity.error_message = result.stderr;
      activity.end_time = new Date();
      await activity.save();

      // Update device last seen
      device.last_seen = new Date();
      device.status = 'online';
      device.api_status = 'connected';
      await device.save();

      logger.info(`Command executed on device ${device.name} by ${req.user?.username || 'system'}: ${command}`);

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

      // Update device status if connection failed
      try {
        device.status = 'offline';
        device.api_status = 'error';
        await device.save();
      } catch (updateError) {
        logger.error('Failed to update device status:', updateError);
      }

      throw execError;
    }
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/devices/:id/status
// @desc    Get real-time device status and metrics via HTTP API
// @access  Private
router.get('/:id/status', async (req, res, next) => {
  try {
    const device = await Device.findOne({ 
      _id: req.params.id, 
      created_by: req.user._id 
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    let systemInfo = {};
    let connectionStatus = 'disconnected';

    try {
      // Get fresh system info using HTTP API
      systemInfo = await httpApiManager.getSystemStats(device);
      connectionStatus = 'connected';

      // Update device with fresh data
      if (systemInfo.cpu_usage !== undefined) {
        device.cpu_usage = parseFloat(systemInfo.cpu_usage) || 0;
      }
      if (systemInfo.memory?.percentage !== undefined) {
        device.ram_usage = parseFloat(systemInfo.memory.percentage) || 0;
      }
      if (systemInfo.temperature !== undefined) {
        // Handle temperature object or direct value
        const tempValue = typeof systemInfo.temperature === 'object' 
          ? Object.values(systemInfo.temperature)[0] || 0
          : systemInfo.temperature;
        device.temperature = parseFloat(tempValue) || 0;
      }
      
      device.status = 'online';
      device.api_status = 'connected';
      device.last_seen = new Date();
      await device.save();

    } catch (apiError) {
      logger.warn(`Failed to get system info for device ${device.name}: ${apiError.message}`);
      device.status = 'offline';
      device.api_status = 'error';
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
          last_seen: device.last_seen,
          api_status: device.api_status
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
// @desc    Browse device filesystem via HTTP API
// @access  Private
router.get('/:id/files', async (req, res, next) => {
  try {
    const { path = '/' } = req.query;
    const device = await Device.findOne({ 
      _id: req.params.id, 
      created_by: req.user._id 
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Check if device API is reachable
    const isReachable = await httpApiManager.isDeviceReachable(device);
    if (!isReachable) {
      return res.status(503).json({
        success: false,
        error: `Device ${device.name} is not reachable. Make sure the edge server is running.`
      });
    }

    // List directory using HTTP API
    const files = await httpApiManager.listDirectory(device, path);

    // Update device last seen
    device.last_seen = new Date();
    device.status = 'online';
    device.api_status = 'connected';
    await device.save();

    res.json({
      success: true,
      data: {
        path,
        files
      }
    });
  } catch (error) {
    logger.error(`Failed to list files for device ${req.params.id}: ${error.message}`);
    
    // Update device status to offline if connection failed
    try {
      const device = await Device.findById(req.params.id);
      if (device) {
        device.status = 'offline';
        device.api_status = 'error';
        await device.save();
      }
    } catch (updateError) {
      logger.error('Failed to update device status:', updateError);
    }

    next(error);
  }
});

// @route   GET /api/devices/:id/files/read
// @desc    Read file contents from device
// @access  Private
router.get('/:id/files/read', async (req, res, next) => {
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    const device = await Device.findOne({ 
      _id: req.params.id, 
      created_by: req.user._id 
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Read file using HTTP API
    const content = await httpApiManager.readFile(device, path);

    // Update device last seen
    device.last_seen = new Date();
    await device.save();

    // Return file content as plain text
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  } catch (error) {
    logger.error(`Failed to read file for device ${req.params.id}: ${error.message}`);
    next(error);
  }
});

// @route   POST /api/devices/:id/files/write
// @desc    Write file contents to device
// @access  Private
router.post('/:id/files/write', async (req, res, next) => {
  try {
    const { path, content } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    const device = await Device.findOne({ 
      _id: req.params.id, 
      created_by: req.user._id 
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Write file using HTTP API
    const result = await httpApiManager.writeFile(device, path, content || '');

    // Update device last seen
    device.last_seen = new Date();
    await device.save();

    // Log activity
    await DeviceActivity.create({
      device_id: device._id,
      action_type: 'file_write',
      command: `Write file: ${path}`,
      status: 'success',
      log_output: `File written successfully: ${path}`,
      triggered_by: req.user?.username || 'system'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Failed to write file for device ${req.params.id}: ${error.message}`);
    
    // Log failed activity
    try {
      await DeviceActivity.create({
        device_id: req.params.id,
        action_type: 'file_write',
        command: `Write file: ${req.body.path}`,
        status: 'failed',
        error_message: error.message,
        triggered_by: req.user?.username || 'system'
      });
    } catch (logError) {
      logger.error('Failed to log file write activity:', logError);
    }

    next(error);
  }
});

// @route   DELETE /api/devices/:id/files/delete
// @desc    Delete file or directory on device
// @access  Private
router.delete('/:id/files/delete', async (req, res, next) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        error: 'File path is required'
      });
    }

    const device = await Device.findOne({ 
      _id: req.params.id, 
      created_by: req.user._id 
    });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Delete file using HTTP API
    const result = await httpApiManager.deleteFile(device, path);

    // Update device last seen
    device.last_seen = new Date();
    await device.save();

    // Log activity
    await DeviceActivity.create({
      device_id: device._id,
      action_type: 'file_delete',
      command: `Delete: ${path}`,
      status: 'success',
      log_output: `File/directory deleted successfully: ${path}`,
      triggered_by: req.user?.username || 'system'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error(`Failed to delete file for device ${req.params.id}: ${error.message}`);
    
    // Log failed activity
    try {
      await DeviceActivity.create({
        device_id: req.params.id,
        action_type: 'file_delete',
        command: `Delete: ${req.body.path}`,
        status: 'failed',
        error_message: error.message,
        triggered_by: req.user?.username || 'system'
      });
    } catch (logError) {
      logger.error('Failed to log file delete activity:', logError);
    }

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

// @route   PATCH /api/devices/api-status/:deviceId
// @desc    Update device API connection status
// @access  Public (called by edge servers)
router.patch('/api-status/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { api_status, server_info } = req.body;

    const device = await Device.findOne({ device_key: deviceId });
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        error: 'Device not found' 
      });
    }

    device.api_status = api_status;
    device.last_seen = new Date();
    
    if (server_info) {
      device.metadata = {
        ...device.metadata,
        edge_server: server_info
      };
    }

    await device.save();

    logger.info(`Device ${device.name} API status updated to: ${api_status}`);

    res.json({ 
      success: true, 
      message: 'API status updated',
      device: {
        id: device._id,
        name: device.name,
        api_status: device.api_status
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/devices/heartbeat/:deviceId  
// @desc    Receive heartbeat from edge server
// @access  Public (called by edge servers)
router.post('/heartbeat/:deviceId', async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const { cpu_usage, ram_usage, temperature, timestamp } = req.body;

    const device = await Device.findOne({ device_key: deviceId });
    if (!device) {
      return res.status(404).json({ 
        success: false, 
        error: 'Device not found' 
      });
    }

    // Update device metrics
    device.cpu_usage = cpu_usage || 0;
    device.ram_usage = ram_usage || 0; 
    device.temperature = temperature || 0;
    device.last_seen = new Date();
    device.status = 'online';

    await device.save();

    // Log heartbeat activity
    await DeviceActivity.create({
      device_id: device._id,
      action_type: 'heartbeat',
      status: 'success',
      log_output: `CPU: ${cpu_usage}%, RAM: ${ram_usage}%, Temp: ${temperature}°C`,
      triggered_by: 'edge_server'
    });

    res.json({ 
      success: true, 
      message: 'Heartbeat received',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// @route   PATCH /api/devices/api-status/:deviceKey
// @desc    Update device API connection status (called by edge server)
// @access  Public (edge server endpoint)
router.patch('/api-status/:deviceKey', async (req, res, next) => {
  try {
    const { deviceKey } = req.params;
    const { api_status, server_info } = req.body;

    const device = await Device.findOne({ device_key: deviceKey });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    device.api_status = api_status;
    device.last_seen = new Date();
    
    if (api_status === 'connected') {
      device.status = 'online';
    }
    
    await device.save();

    logger.info(`Device API status updated: ${device.name} -> ${api_status}`);

    res.json({
      success: true,
      message: 'API status updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/devices/heartbeat/:deviceKey
// @desc    Receive heartbeat from edge server with system stats
// @access  Public (edge server endpoint)
router.post('/heartbeat/:deviceKey', async (req, res, next) => {
  try {
    const { deviceKey } = req.params;
    const { cpu_usage, ram_usage, temperature, timestamp } = req.body;

    const device = await Device.findOne({ device_key: deviceKey });
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    // Update device metrics
    device.cpu_usage = cpu_usage || device.cpu_usage;
    device.ram_usage = ram_usage || device.ram_usage;
    device.temperature = temperature || device.temperature;
    device.last_seen = new Date();
    device.status = 'online';
    device.api_status = 'connected';
    
    await device.save();

    // Optional: Log activity for monitoring
    await DeviceActivity.create({
      device_id: device._id,
      action_type: 'heartbeat',
      status: 'success',
      log_output: `Heartbeat received - CPU: ${cpu_usage}%, RAM: ${ram_usage}%, Temp: ${temperature}°C`,
      triggered_by: 'edge_server'
    });

    res.json({
      success: true,
      message: 'Heartbeat received'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;