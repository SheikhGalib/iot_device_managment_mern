import api from './api';

export interface Device {
  _id: string;
  name: string;
  type: string;
  category: 'IoT' | 'Computer';
  ip_address?: string;
  ssh_port?: number;
  ssh_username?: string;
  mac_address?: string;
  device_key: string;
  status: 'online' | 'offline';
  api_status?: 'not-connected' | 'connected' | 'error';
  last_seen: string;
  cpu_usage?: number;
  ram_usage?: number;
  temperature?: number;
  deployment_status?: 'idle' | 'running' | 'error';
  active_sessions?: number;
  // IoT-specific fields
  supported_apis?: string[];
  current_data?: { [key: string]: any };
  last_data_received?: string;
  heartbeat_interval?: number;
  // Computer-specific metadata
  metadata?: {
    os?: string;
    version?: string;
    architecture?: string;
    total_memory?: string;
    total_storage?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DeviceActivity {
  _id: string;
  device_id: string;
  action_type: string;
  status: 'in_progress' | 'success' | 'failed';
  log_output: string;
  command?: string;
  start_time: string;
  end_time?: string;
  triggered_by: string;
  session_id?: string;
  error_message?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileItem {
  name: string;
  type: 'file' | 'directory';
  permissions: string;
  size: string;
  modified: string;
}

// Device API functions
export const deviceApi = {
  // Get all devices with optional filters
  getDevices: async (params?: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/devices', { params });
    return response;
  },

  // Register a new device
  registerDevice: async (deviceData: Omit<Device, '_id' | 'status' | 'last_seen' | 'cpu_usage' | 'ram_usage' | 'temperature' | 'deployment_status' | 'active_sessions' | 'createdAt' | 'updatedAt'>) => {
    const response = await api.post('/devices/register', deviceData);
    return response;
  },

  // Get device by ID
  getDevice: async (id: string) => {
    const response = await api.get(`/devices/${id}`);
    return response;
  },

  // Get device deployment status
  getDeviceDeploymentStatus: async (id: string) => {
    const response = await api.get(`/devices/status/${id}`);
    return response;
  },

  // Update device
  updateDevice: async (id: string, deviceData: Partial<Device>) => {
    const response = await api.put(`/devices/${id}`, deviceData);
    return response;
  },

  // Delete device
  deleteDevice: async (id: string) => {
    const response = await api.delete(`/devices/${id}`);
    return response;
  },

  // Connect to device
  connectToDevice: async (id: string) => {
    const response = await api.post(`/devices/${id}/connect`);
    return response;
  },

  // Execute command on device
  executeCommand: async (id: string, command: string, action_type?: string) => {
    const response = await api.post(`/devices/${id}/execute`, {
      command,
      action_type: action_type || 'terminal_session'
    });
    return response;
  },

  // Get device status and metrics
  getDeviceStatus: async (id: string) => {
    const response = await api.get(`/devices/${id}/status`);
    return response;
  },

  // Browse device files
  browseFiles: async (id: string, path = '/') => {
    const response = await api.get(`/devices/${id}/files`, { params: { path } });
    return response;
  },

  // Get device logs
  getDeviceLogs: async (id: string, page = 1, limit = 50) => {
    const response = await api.get(`/devices/${id}/logs`, { params: { page, limit } });
    return response;
  },

  // IoT-specific methods
  getSupportedApis: async (id: string) => {
    const response = await api.get(`/devices/${id}/supported-apis`);
    return response;
  },

  getCurrentData: async (id: string) => {
    const response = await api.get(`/devices/${id}/current-data`);
    return response;
  },

  // Get ESP32 code templates
  getCodeTemplate: async (deviceId: string, apiType: string) => {
    const response = await api.get(`/devices/${deviceId}/code-template/${apiType}`);
    return response;
  },
};