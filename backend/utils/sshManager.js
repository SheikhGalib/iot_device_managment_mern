const { NodeSSH } = require('node-ssh');
const logger = require('./logger');

class SSHManager {
  constructor() {
    this.connections = new Map(); // deviceId -> SSH connection
  }

  async connect(device) {
    try {
      const ssh = new NodeSSH();
      
      await ssh.connect({
        host: device.ip_address,
        username: device.ssh_username,
        password: device.ssh_password,
        port: device.ssh_port || 22,
        tryKeyboard: true,
        onKeyboardInteractive: (name, instructions, instructionsLang, prompts, finish) => {
          if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
            finish([device.ssh_password]);
          }
        }
      });

      this.connections.set(device._id.toString(), ssh);
      logger.info(`SSH connection established to device ${device.name} (${device.ip_address})`);
      
      return ssh;
    } catch (error) {
      logger.error(`Failed to connect to device ${device.name}:`, error.message);
      throw error;
    }
  }

  async disconnect(deviceId) {
    const connection = this.connections.get(deviceId);
    if (connection) {
      connection.dispose();
      this.connections.delete(deviceId);
      logger.info(`SSH connection closed for device ${deviceId}`);
    }
  }

  getConnection(deviceId) {
    return this.connections.get(deviceId);
  }

  async executeCommand(deviceId, command) {
    const connection = this.getConnection(deviceId);
    if (!connection) {
      throw new Error('No SSH connection found for device');
    }

    try {
      const result = await connection.execCommand(command);
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code
      };
    } catch (error) {
      logger.error(`Command execution failed on device ${deviceId}:`, error.message);
      throw error;
    }
  }

  async getSystemInfo(deviceId) {
    try {
      const commands = {
        cpu: "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | awk -F'%' '{print $1}'",
        memory: "free | grep Mem | awk '{printf \"%.2f\", $3/$2 * 100.0}'",
        temperature: "vcgencmd measure_temp 2>/dev/null | cut -d= -f2 | cut -d\\' -f1 || sensors | grep 'Core 0' | awk '{print $3}' | cut -d+ -f2 | cut -d° -f1 || echo '0'",
        uptime: "uptime -p",
        disk: "df -h / | awk 'NR==2{printf \"%s\", $5}' | sed 's/%//'"
      };

      const results = {};
      for (const [key, cmd] of Object.entries(commands)) {
        try {
          const result = await this.executeCommand(deviceId, cmd);
          results[key] = result.stdout.trim();
        } catch (error) {
          logger.warn(`Failed to get ${key} for device ${deviceId}:`, error.message);
          results[key] = '0';
        }
      }

      return results;
    } catch (error) {
      logger.error(`Failed to get system info for device ${deviceId}:`, error.message);
      throw error;
    }
  }

  async listDirectory(deviceId, path = '/') {
    try {
      const command = `ls -la "${path}" 2>/dev/null || echo "Error: Cannot access directory"`;
      const result = await this.executeCommand(deviceId, command);
      
      if (result.stderr || result.stdout.includes('Error:')) {
        throw new Error(result.stderr || 'Cannot access directory');
      }

      // Parse ls output into structured format
      const lines = result.stdout.split('\n').filter(line => line.trim());
      const items = lines.slice(1).map(line => { // Skip first line (total)
        const parts = line.split(/\s+/);
        if (parts.length < 9) return null;
        
        const permissions = parts[0];
        const isDirectory = permissions.startsWith('d');
        const name = parts.slice(8).join(' ');
        const size = parts[4];
        const date = `${parts[5]} ${parts[6]} ${parts[7]}`;
        
        return {
          name,
          type: isDirectory ? 'directory' : 'file',
          permissions,
          size: isDirectory ? '' : size,
          modified: date
        };
      }).filter(Boolean);

      return items;
    } catch (error) {
      logger.error(`Failed to list directory ${path} for device ${deviceId}:`, error.message);
      throw error;
    }
  }

  disconnectAll() {
    for (const [deviceId, connection] of this.connections.entries()) {
      try {
        connection.dispose();
        logger.info(`SSH connection closed for device ${deviceId}`);
      } catch (error) {
        logger.error(`Error closing SSH connection for device ${deviceId}:`, error.message);
      }
    }
    this.connections.clear();
  }
}

module.exports = new SSHManager();