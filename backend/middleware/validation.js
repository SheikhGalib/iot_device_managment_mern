const Joi = require('joi');

const validateDevice = (req, res, next) => {
  // Base schema for all devices
  const baseSchema = {
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid(
      'ESP32', 'ESP8266', 'Arduino', 'NodeMCU', // IoT devices
      'Raspberry Pi', 'Orange Pi', 'Windows PC', 'Linux Server', 'Ubuntu', 'Other' // Edge devices
    ).required(),
    category: Joi.string().valid('IoT', 'Computer').required(),
    device_key: Joi.string().optional(), // Allow device_key to be provided
    description: Joi.string().max(500).optional(),
    mac_address: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
    metadata: Joi.object({
      os: Joi.string().allow(''),
      version: Joi.string().allow(''),
      architecture: Joi.string().allow(''),
      total_memory: Joi.string().allow(''),
      total_storage: Joi.string().allow('')
    }).optional()
  };

  // Different validation based on category
  let schema;
  const category = req.body.category;

  if (category === 'Computer') {
    // Edge device validation
    schema = Joi.object({
      ...baseSchema,
      ip_address: Joi.string().ip().required(),
      ssh_port: Joi.number().integer().min(1).max(65535).default(22),
      ssh_username: Joi.string().min(1).max(50).required(),
      ssh_password: Joi.string().min(1).required(),
      http_port: Joi.number().integer().min(1).max(65535).default(8081)
    });
  } else if (category === 'IoT') {
    // IoT device validation - IoT devices don't need SSH or network configuration
    schema = Joi.object({
      ...baseSchema,
      supported_apis: Joi.array().items(
        Joi.string().valid('temperature-control', 'humidity-control', 'led-control', 'gps-control', 'camera-control')
      ).min(1).required(), // At least one API required for IoT devices
      heartbeat_interval: Joi.number().integer().min(1000).default(30000)
    });
  } else {
    return res.status(400).json({
      success: false,
      error: 'Category must be either "IoT" or "Computer"'
    });
  }

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

const validateDeviceUpdate = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(100),
    type: Joi.string().valid('Raspberry Pi', 'Orange Pi', 'Windows PC', 'Linux Server', 'Other'),
    ip_address: Joi.string().ip(),
    ssh_port: Joi.number().integer().min(1).max(65535),
    ssh_username: Joi.string().min(1).max(50),
    ssh_password: Joi.string().min(1),
    http_port: Joi.number().integer().min(1).max(65535),
    mac_address: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/),
    status: Joi.string().valid('online', 'offline'),
    deployment_status: Joi.string().valid('idle', 'running', 'error'),
    metadata: Joi.object({
      os: Joi.string().allow(''),
      version: Joi.string().allow(''),
      architecture: Joi.string().allow(''),
      total_memory: Joi.string().allow(''),
      total_storage: Joi.string().allow('')
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

const validateUser = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'user').default('user')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

const validateCommand = (req, res, next) => {
  const schema = Joi.object({
    command: Joi.string().min(1).required(),
    action_type: Joi.string().valid(
      'deploy_code', 
      'check_logs', 
      'run_script', 
      'terminal_session', 
      'file_operation', 
      'system_check',
      'restart',
      'shutdown'
    ).default('terminal_session')
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  next();
};

module.exports = {
  validateDevice,
  validateDeviceUpdate,
  validateUser,
  validateLogin,
  validateCommand
};