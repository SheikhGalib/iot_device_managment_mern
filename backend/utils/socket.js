let io;

const initSocket = (server) => {
  io = require('socket.io')(server, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ["http://localhost:3000", "http://localhost:5173"],
      methods: ["GET", "POST"]
    }
  });

  const sshManager = require('../utils/sshManager');
  const Device = require('../models/Device');
  const DeviceActivity = require('../models/DeviceActivity');
  const logger = require('../utils/logger');

  // Store active terminal sessions
  const terminalSessions = new Map(); // sessionId -> { deviceId, userId, socket }

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    // Join device-specific rooms for real-time updates
    socket.on('join-device', (deviceId) => {
      socket.join(`device-${deviceId}`);
      logger.debug(`Socket ${socket.id} joined device room: ${deviceId}`);
    });

    // Leave device rooms
    socket.on('leave-device', (deviceId) => {
      socket.leave(`device-${deviceId}`);
      logger.debug(`Socket ${socket.id} left device room: ${deviceId}`);
    });

    // Terminal session management
    socket.on('terminal-start', async (data) => {
      try {
        const { deviceId, userId, username } = data;
        
        // Verify device exists
        const device = await Device.findById(deviceId);
        if (!device) {
          socket.emit('terminal-error', { error: 'Device not found' });
          return;
        }

        // Ensure SSH connection
        let connection = sshManager.getConnection(deviceId);
        if (!connection) {
          await sshManager.connect(device);
        }

        // Create session
        const sessionId = require('uuid').v4();
        terminalSessions.set(sessionId, {
          deviceId,
          userId,
          username,
          socketId: socket.id,
          startTime: new Date()
        });

        // Update user's active sessions
        const user = await require('../models/User').findById(userId);
        if (user) {
          user.active_sessions.push({
            session_id: sessionId,
            device_id: deviceId,
            created_at: new Date()
          });
          await user.save();
        }

        // Log activity
        await DeviceActivity.create({
          device_id: deviceId,
          action_type: 'terminal_session',
          status: 'in_progress',
          session_id: sessionId,
          triggered_by: username
        });

        socket.emit('terminal-ready', { 
          sessionId,
          message: `Terminal session started for ${device.name}\\n$ ` 
        });

        logger.info(`Terminal session started: ${sessionId} for device ${device.name} by ${username}`);

      } catch (error) {
        logger.error('Terminal start error:', error);
        socket.emit('terminal-error', { error: error.message });
      }
    });

    // Execute terminal command
    socket.on('terminal-command', async (data) => {
      try {
        const { sessionId, command } = data;
        const session = terminalSessions.get(sessionId);
        
        if (!session) {
          socket.emit('terminal-error', { error: 'Session not found' });
          return;
        }

        if (session.socketId !== socket.id) {
          socket.emit('terminal-error', { error: 'Unauthorized session access' });
          return;
        }

        // Execute command
        const result = await sshManager.executeCommand(session.deviceId, command);
        
        // Send result back to client
        socket.emit('terminal-output', {
          sessionId,
          command,
          output: result.stdout,
          error: result.stderr,
          exitCode: result.code,
          timestamp: new Date()
        });

        // Log command execution
        await DeviceActivity.create({
          device_id: session.deviceId,
          action_type: 'terminal_session',
          command,
          status: result.code === 0 ? 'success' : 'failed',
          log_output: result.stdout,
          error_message: result.stderr,
          session_id: sessionId,
          triggered_by: session.username
        });

      } catch (error) {
        logger.error('Terminal command error:', error);
        socket.emit('terminal-error', { 
          sessionId: data.sessionId,
          error: error.message 
        });
      }
    });

    // End terminal session
    socket.on('terminal-end', async (data) => {
      try {
        const { sessionId } = data;
        const session = terminalSessions.get(sessionId);
        
        if (session) {
          // Update activity log
          await DeviceActivity.findOneAndUpdate(
            { session_id: sessionId, action_type: 'terminal_session' },
            { 
              status: 'success',
              end_time: new Date(),
              log_output: 'Terminal session ended'
            }
          );

          // Remove from user's active sessions
          const user = await require('../models/User').findById(session.userId);
          if (user) {
            user.active_sessions = user.active_sessions.filter(
              s => s.session_id !== sessionId
            );
            await user.save();
          }

          terminalSessions.delete(sessionId);
          logger.info(`Terminal session ended: ${sessionId}`);
        }

        socket.emit('terminal-closed', { sessionId });
      } catch (error) {
        logger.error('Terminal end error:', error);
      }
    });

    // Handle file operations
    socket.on('file-browse', async (data) => {
      try {
        const { deviceId, path = '/' } = data;
        const device = await Device.findById(deviceId);
        
        if (!device) {
          socket.emit('file-error', { error: 'Device not found' });
          return;
        }

        // Ensure SSH connection
        let connection = sshManager.getConnection(deviceId);
        if (!connection) {
          await sshManager.connect(device);
        }

        const files = await sshManager.listDirectory(deviceId, path);
        
        socket.emit('file-list', {
          deviceId,
          path,
          files
        });

      } catch (error) {
        logger.error('File browse error:', error);
        socket.emit('file-error', { 
          deviceId: data.deviceId,
          error: error.message 
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`Client disconnected: ${socket.id}`);
      
      // Clean up terminal sessions for this socket
      for (const [sessionId, session] of terminalSessions.entries()) {
        if (session.socketId === socket.id) {
          try {
            // Update activity log
            await DeviceActivity.findOneAndUpdate(
              { session_id: sessionId, action_type: 'terminal_session' },
              { 
                status: 'success',
                end_time: new Date(),
                log_output: 'Terminal session ended (client disconnected)'
              }
            );

            // Remove from user's active sessions
            const user = await require('../models/User').findById(session.userId);
            if (user) {
              user.active_sessions = user.active_sessions.filter(
                s => s.session_id !== sessionId
              );
              await user.save();
            }

            terminalSessions.delete(sessionId);
            logger.info(`Cleaned up terminal session: ${sessionId}`);
          } catch (error) {
            logger.error('Error cleaning up terminal session:', error);
          }
        }
      }
    });
  });

  // Broadcast device status updates
  const broadcastDeviceUpdate = (deviceId, data) => {
    io.to(`device-${deviceId}`).emit('device-update', {
      deviceId,
      ...data
    });
  };

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Real-time device monitoring
const startDeviceMonitoring = () => {
  const sshManager = require('../utils/sshManager');
  const Device = require('../models/Device');
  
  setInterval(async () => {
    try {
      const onlineDevices = await Device.find({ status: 'online' });
      const now = new Date();
      
      for (const device of onlineDevices) {
        try {
          if (device.category === 'Computer') {
            // SSH-based monitoring for edge servers
            const connection = sshManager.getConnection(device._id.toString());
            if (connection) {
              const systemInfo = await sshManager.getSystemInfo(device._id.toString());
              
              // Update device metrics
              const updatedDevice = await Device.findByIdAndUpdate(device._id, {
                cpu_usage: parseFloat(systemInfo.cpu) || 0,
                ram_usage: parseFloat(systemInfo.memory) || 0,
                temperature: parseFloat(systemInfo.temperature) || 0,
                last_seen: new Date()
              }, { new: true });

              // Broadcast to connected clients
              if (io) {
                io.to(`device-${device._id}`).emit('device-metrics', {
                  deviceId: device._id,
                  cpu: updatedDevice.cpu_usage,
                  ram: updatedDevice.ram_usage,
                  temperature: updatedDevice.temperature,
                  timestamp: new Date()
                });
              }
            }
          } else if (device.category === 'IoT') {
            // Heartbeat-based monitoring for IoT devices
            const lastSeen = new Date(device.last_seen);
            const timeSinceLastHeartbeat = now - lastSeen;
            const heartbeatTimeout = 60000; // 60 seconds timeout
            
            if (timeSinceLastHeartbeat > heartbeatTimeout) {
              // Mark IoT device as offline if no heartbeat for more than 60 seconds
              await Device.findByIdAndUpdate(device._id, { 
                status: 'offline',
                api_status: 'not-connected'
              });
              
              logger.warn(`IoT Device ${device.name} went offline - no heartbeat for ${Math.round(timeSinceLastHeartbeat/1000)}s`);
              
              if (io) {
                io.to(`device-${device._id}`).emit('device-status', {
                  deviceId: device._id,
                  status: 'offline'
                });
              }
            }
          }
        } catch (error) {
          // Device became unavailable
          await Device.findByIdAndUpdate(device._id, { status: 'offline' });
          logger.warn(`Device ${device.name} went offline: ${error.message}`);
          
          if (io) {
            io.to(`device-${device._id}`).emit('device-status', {
              deviceId: device._id,
              status: 'offline'
            });
          }
        }
      }
    } catch (error) {
      logger.error('Device monitoring error:', error);
    }
  }, 30000); // Check every 30 seconds
};

module.exports = {
  initSocket,
  getIO,
  startDeviceMonitoring
};