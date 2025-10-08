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

  async deployEdgeServer(deviceId, deviceKey) {
    try {
      const connection = this.getConnection(deviceId);
      if (!connection) {
        throw new Error('No SSH connection available for device');
      }

      logger.info(`Starting edge server deployment for device ${deviceId}`);

      // Step 1: Check if git is installed
      try {
        await connection.execCommand('git --version');
      } catch (error) {
        logger.warn('Git not found, installing...');
        await connection.execCommand('sudo apt update && sudo apt install -y git python3 python3-pip python3-venv');
      }

      // Step 2: Clone or update the edge server repository
      const edgeServerPath = '~/edgeServer';
      
      // Check if directory exists
      const dirExists = await connection.execCommand(`test -d ${edgeServerPath} && echo "exists" || echo "not exists"`);
      
      if (dirExists.stdout.trim() === 'exists') {
        // Update existing repository
        await connection.execCommand(`cd ${edgeServerPath} && git pull origin main`);
        logger.info('Updated existing edge server repository');
      } else {
        // Clone new repository
        await connection.execCommand('git clone https://github.com/SheikhGalib/edgeServer.git ~/edgeServer');
        logger.info('Cloned edge server repository');
      }

      // Step 3: Set up Python virtual environment
      await connection.execCommand(`cd ${edgeServerPath} && python3 -m venv venv`);
      
      // Step 4: Install requirements
      await connection.execCommand(`cd ${edgeServerPath} && source venv/bin/activate && pip install -r requirements.txt`);

      // Step 5: Create systemd service for auto-start
      const serviceContent = `[Unit]
Description=IoT Edge Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=${edgeServerPath}
ExecStart=${edgeServerPath}/venv/bin/python edge_server.py --device-id ${deviceKey} --host 0.0.0.0 --port 8080
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target`;

      // Write service file
      await connection.execCommand(`echo '${serviceContent}' | sudo tee /etc/systemd/system/iot-edge-server.service`);
      
      // Enable and start the service
      await connection.execCommand('sudo systemctl daemon-reload');
      await connection.execCommand('sudo systemctl enable iot-edge-server.service');
      await connection.execCommand('sudo systemctl start iot-edge-server.service');

      logger.info(`Edge server deployed and started with device key: ${deviceKey}`);

      return {
        success: true,
        message: 'Edge server deployed successfully',
        deviceKey: deviceKey,
        installPath: edgeServerPath,
        serviceStatus: 'started'
      };

    } catch (error) {
      logger.error(`Failed to deploy edge server for device ${deviceId}:`, error.message);
      return {
        success: false,
        error: error.message
      };
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