const rateLimit = require('express-rate-limit');

// General API rate limiting
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Different rate limits for different endpoints
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, try again later'
);

const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, try again later'
);

const sshRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 SSH commands per minute
  'Too many SSH commands, try again later'
);

const iotRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  50, // limit each IP to 50 requests per minute (allows heartbeat + data every 5 seconds)
  'Too many IoT requests, try again later'
);

module.exports = {
  authRateLimit,
  generalRateLimit,
  sshRateLimit,
  iotRateLimit
};