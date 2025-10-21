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
  1000, // limit each IP to 1000 requests per windowMs (much more lenient)
  'Too many requests from this IP, try again later'
);

const sshRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  100, // limit each IP to 100 SSH commands per minute
  'Too many SSH commands, try again later'
);

const iotRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  500, // limit each IP to 500 requests per minute (very lenient for IoT)
  'Too many IoT requests, try again later'
);

module.exports = {
  authRateLimit,
  generalRateLimit,
  sshRateLimit,
  iotRateLimit
};