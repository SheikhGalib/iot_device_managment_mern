import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.socket = io(SOCKET_URL, {
        auth: {
          token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('Connected to server');
        this.reconnectAttempts = 0;
        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect
          this.disconnect();
        }
      });

      this.socket.on('reconnect_attempt', () => {
        this.reconnectAttempts++;
        console.log(`Reconnection attempt ${this.reconnectAttempts}`);
      });

      this.socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect after maximum attempts');
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.disconnect();
        }
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  // Device-specific methods
  joinDeviceRoom(deviceId: string) {
    if (this.socket) {
      this.socket.emit('join-device', deviceId);
    }
  }

  leaveDeviceRoom(deviceId: string) {
    if (this.socket) {
      this.socket.emit('leave-device', deviceId);
    }
  }

  // Terminal session methods
  startTerminalSession(deviceId: string, userId: string, username: string) {
    if (this.socket) {
      this.socket.emit('terminal-start', {
        deviceId,
        userId,
        username
      });
    }
  }

  sendTerminalCommand(sessionId: string, command: string) {
    if (this.socket) {
      this.socket.emit('terminal-command', {
        sessionId,
        command
      });
    }
  }

  endTerminalSession(sessionId: string) {
    if (this.socket) {
      this.socket.emit('terminal-end', {
        sessionId
      });
    }
  }

  // File browser methods
  browseFiles(deviceId: string, path = '/') {
    if (this.socket) {
      this.socket.emit('file-browse', {
        deviceId,
        path
      });
    }
  }

  // Event listeners
  onDeviceUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('device-update', callback);
    }
  }

  onDeviceMetrics(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('device-metrics', callback);
    }
  }

  onDeviceStatus(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('device-status', callback);
    }
  }

  onTerminalReady(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('terminal-ready', callback);
    }
  }

  onTerminalOutput(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('terminal-output', callback);
    }
  }

  onTerminalError(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('terminal-error', callback);
    }
  }

  onTerminalClosed(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('terminal-closed', callback);
    }
  }

  onFileList(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('file-list', callback);
    }
  }

  onFileError(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on('file-error', callback);
    }
  }

  // Remove listeners
  off(event: string, callback?: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();