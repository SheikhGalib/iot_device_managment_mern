// Mock data for the dashboard

export interface EdgeDevice {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
  cpu: number;
  ram: number;
  temperature: number;
  deploymentStatus: "running" | "error" | "idle";
  mac: string;
  ip: string;
}

export interface IoTDevice {
  id: string;
  name: string;
  type: string;
  status: "online" | "offline";
  metrics: {
    temperature?: number;
    humidity?: number;
    gas?: number;
    moisture?: number;
  };
}

export const mockEdgeDevices: EdgeDevice[] = [
  {
    id: "1",
    name: "Raspberry Pi 4 - Main",
    type: "Raspberry Pi",
    status: "online",
    cpu: 45,
    ram: 62,
    temperature: 52,
    deploymentStatus: "running",
    mac: "B8:27:EB:XX:XX:01",
    ip: "192.168.1.100",
  },
  {
    id: "2",
    name: "Orange Pi Zero",
    type: "Orange Pi",
    status: "online",
    cpu: 28,
    ram: 41,
    temperature: 48,
    deploymentStatus: "idle",
    mac: "02:42:AC:XX:XX:02",
    ip: "192.168.1.101",
  },
  {
    id: "3",
    name: "Raspberry Pi 3 - Gateway",
    type: "Raspberry Pi",
    status: "offline",
    cpu: 0,
    ram: 0,
    temperature: 0,
    deploymentStatus: "error",
    mac: "B8:27:EB:XX:XX:03",
    ip: "192.168.1.102",
  },
  {
    id: "4",
    name: "Edge Server 01",
    type: "Custom",
    status: "online",
    cpu: 72,
    ram: 85,
    temperature: 65,
    deploymentStatus: "running",
    mac: "00:1B:44:XX:XX:04",
    ip: "192.168.1.103",
  },
];

export const mockIoTDevices: IoTDevice[] = [
  {
    id: "1",
    name: "Environmental Sensor A1",
    type: "ESP32",
    status: "online",
    metrics: {
      temperature: 24.5,
      humidity: 58,
      gas: 420,
    },
  },
  {
    id: "2",
    name: "Soil Monitor B2",
    type: "Arduino",
    status: "online",
    metrics: {
      moisture: 65,
      temperature: 22.1,
    },
  },
  {
    id: "3",
    name: "Weather Station C3",
    type: "ESP32",
    status: "offline",
    metrics: {
      temperature: 0,
      humidity: 0,
    },
  },
  {
    id: "4",
    name: "Air Quality Monitor D4",
    type: "Custom",
    status: "online",
    metrics: {
      gas: 385,
      temperature: 23.8,
    },
  },
];

export const mockFileSystem = {
  name: "root",
  type: "folder",
  children: [
    {
      name: "projects",
      type: "folder",
      children: [
        { name: "app.py", type: "file" },
        { name: "config.json", type: "file" },
        { name: "requirements.txt", type: "file" },
      ],
    },
    {
      name: "logs",
      type: "folder",
      children: [
        { name: "system.log", type: "file" },
        { name: "error.log", type: "file" },
      ],
    },
    { name: "README.md", type: "file" },
    { name: "startup.sh", type: "file" },
  ],
};

export const mockTerminalLog = `
[2025-01-15 10:23:45] System started
[2025-01-15 10:23:46] Initializing sensors...
[2025-01-15 10:23:47] Connected to network (192.168.1.100)
[2025-01-15 10:23:48] Starting main application...
[2025-01-15 10:23:49] Application running on port 8080
[2025-01-15 10:24:15] Received data from sensor A1
[2025-01-15 10:24:45] Received data from sensor B2
[2025-01-15 10:25:15] Health check: OK
[2025-01-15 10:25:45] Processing batch data...
[2025-01-15 10:26:00] Batch processing complete
`;

export interface Deployment {
  id: string;
  deviceName: string;
  deviceId: string;
  status: "in-progress" | "success" | "failed";
  startTime: string;
  endTime?: string;
  fileName?: string;
  logs: string;
}

export const mockDeployments: Deployment[] = [
  {
    id: "1",
    deviceName: "Raspberry Pi 4 - Main",
    deviceId: "1",
    status: "in-progress",
    startTime: "2025-01-15 14:30:22",
    fileName: "app_v2.3.zip",
    logs: `[14:30:22] Starting deployment...
[14:30:23] Uploading app_v2.3.zip to device
[14:30:28] Upload complete (2.4 MB)
[14:30:29] Extracting files...
[14:30:31] Installing dependencies...
[14:30:45] Running setup scripts...
[14:31:02] Starting application...`,
  },
  {
    id: "2",
    deviceName: "Edge Server 01",
    deviceId: "4",
    status: "success",
    startTime: "2025-01-15 13:15:10",
    endTime: "2025-01-15 13:18:45",
    fileName: "sensor_update.py",
    logs: `[13:15:10] Starting deployment...
[13:15:11] Uploading sensor_update.py to device
[13:15:14] Upload complete (145 KB)
[13:15:15] Backing up existing version...
[13:15:18] Installing dependencies...
[13:16:22] Running tests...
[13:17:55] All tests passed
[13:18:12] Restarting service...
[13:18:45] Deployment completed successfully`,
  },
  {
    id: "3",
    deviceName: "Orange Pi Zero",
    deviceId: "2",
    status: "success",
    startTime: "2025-01-15 11:05:33",
    endTime: "2025-01-15 11:08:12",
    fileName: "config.json",
    logs: `[11:05:33] Starting deployment...
[11:05:34] Uploading config.json to device
[11:05:35] Upload complete (3.2 KB)
[11:05:36] Validating configuration...
[11:05:40] Configuration valid
[11:07:22] Applying new configuration...
[11:08:12] Deployment completed successfully`,
  },
  {
    id: "4",
    deviceName: "Raspberry Pi 3 - Gateway",
    deviceId: "3",
    status: "failed",
    startTime: "2025-01-15 09:42:18",
    endTime: "2025-01-15 09:43:05",
    fileName: "firmware_update.sh",
    logs: `[09:42:18] Starting deployment...
[09:42:19] Uploading firmware_update.sh to device
[09:42:22] Upload complete (512 KB)
[09:42:25] Setting permissions...
[09:42:28] Executing script...
[09:42:45] ERROR: Device connection lost
[09:42:50] Retry attempt 1/3...
[09:43:00] ERROR: Unable to reconnect to device
[09:43:05] Deployment failed: Device offline`,
  },
  {
    id: "5",
    deviceName: "Raspberry Pi 4 - Main",
    deviceId: "1",
    status: "success",
    startTime: "2025-01-14 16:20:05",
    endTime: "2025-01-14 16:24:33",
    fileName: "app_v2.2.zip",
    logs: `[16:20:05] Starting deployment...
[16:20:06] Uploading app_v2.2.zip to device
[16:20:12] Upload complete (2.3 MB)
[16:20:13] Extracting files...
[16:20:16] Installing dependencies...
[16:21:45] Running setup scripts...
[16:23:10] Starting application...
[16:24:33] Deployment completed successfully`,
  },
];
