const axios = require('axios');
const logger = require('./logger');

class HttpApiManager {
  constructor() {
    this.timeout = 30000; // 30 seconds timeout
  }

  /**
   * Get the base URL for device HTTP API
   * @param {Object} device - Device document with ip_address and http_port
   * @returns {String} Base URL for device API
   */
  getDeviceApiUrl(device) {
    const port = device.http_port || 8081;
    return `http://${device.ip_address}:${port}/api`;
  }

  /**
   * Make HTTP request to device API
   * @param {Object} device - Device document
   * @param {String} endpoint - API endpoint (e.g., '/file/list')
   * @param {String} method - HTTP method (GET, POST, etc.)
   * @param {Object} data - Request data for POST/PUT requests
   * @param {Object} params - Query parameters for GET requests
   * @returns {Promise<Object>} API response data
   */
  async makeRequest(device, endpoint, method = 'GET', data = null, params = null) {
    try {
      const baseUrl = this.getDeviceApiUrl(device);
      const url = `${baseUrl}${endpoint}`;

      logger.info(`Making ${method} request to device ${device.name}: ${url}`);

      const config = {
        method,
        url,
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      if (params && method === 'GET') {
        config.params = params;
      }

      const response = await axios(config);
      
      if (response.data.success === false) {
        throw new Error(response.data.error || 'Device API request failed');
      }

      return response.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to device ${device.name} at ${device.ip_address}:${device.http_port || 8081}. Edge server may not be running.`);
      } else if (error.code === 'ETIMEDOUT') {
        throw new Error(`Timeout connecting to device ${device.name}. Device may be unreachable.`);
      } else if (error.response) {
        throw new Error(`Device API error: ${error.response.data?.error || error.response.statusText}`);
      } else {
        throw new Error(`Failed to connect to device ${device.name}: ${error.message}`);
      }
    }
  }

  /**
   * List directory contents on device
   * @param {Object} device - Device document
   * @param {String} path - Directory path to list
   * @returns {Promise<Array>} Array of file/directory objects
   */
  async listDirectory(device, path = '/') {
    try {
      const response = await this.makeRequest(device, '/file/list', 'POST', { path });
      return response.items || [];
    } catch (error) {
      logger.error(`Failed to list directory on device ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read file contents from device
   * @param {Object} device - Device document
   * @param {String} filePath - Path to file to read
   * @returns {Promise<String>} File contents
   */
  async readFile(device, filePath) {
    try {
      const response = await this.makeRequest(device, '/file/read', 'GET', null, { path: filePath });
      return response;
    } catch (error) {
      logger.error(`Failed to read file on device ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Write file contents to device
   * @param {Object} device - Device document
   * @param {String} filePath - Path to file to write
   * @param {String} content - File contents
   * @returns {Promise<Object>} Write result
   */
  async writeFile(device, filePath, content) {
    try {
      const response = await this.makeRequest(device, '/file/write', 'POST', {
        path: filePath,
        content
      });
      return response;
    } catch (error) {
      logger.error(`Failed to write file on device ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete file or directory on device
   * @param {Object} device - Device document
   * @param {String} filePath - Path to file/directory to delete
   * @returns {Promise<Object>} Delete result
   */
  async deleteFile(device, filePath) {
    try {
      const response = await this.makeRequest(device, '/file/delete', 'DELETE', { path: filePath });
      return response;
    } catch (error) {
      logger.error(`Failed to delete file on device ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute command on device
   * @param {Object} device - Device document
   * @param {String} command - Command to execute
   * @returns {Promise<Object>} Command execution result
   */
  async executeCommand(device, command) {
    try {
      const response = await this.makeRequest(device, '/exec', 'POST', {
        cmd: command
      });
      return {
        stdout: response.output || '',
        stderr: response.error || '',
        code: response.success ? 0 : 1
      };
    } catch (error) {
      logger.error(`Failed to execute command on device ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get system statistics from device
   * @param {Object} device - Device document
   * @returns {Promise<Object>} System stats
   */
  async getSystemStats(device) {
    try {
      const response = await this.makeRequest(device, '/system/stats', 'GET');
      
      // The edge server returns { success: true, data: {...}, device_id: "..." }
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error('Invalid response format from device');
      }
    } catch (error) {
      logger.error(`Failed to get system stats from device ${device.name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if device HTTP API is reachable
   * @param {Object} device - Device document
   * @returns {Promise<Boolean>} True if reachable, false otherwise
   */
  async isDeviceReachable(device) {
    try {
      await this.getSystemStats(device);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new HttpApiManager();