# IoT Device Management System - Complete Project Report

## Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Backend System](#backend-system)
5. [Frontend System](#frontend-system)
6. [Edge Server System](#edge-server-system)
7. [Database Design](#database-design)
8. [API Documentation](#api-documentation)
9. [Authentication & Security](#authentication--security)
10. [Deployment Architecture](#deployment-architecture)
11. [Real-time Communication](#real-time-communication)
12. [Development Setup](#development-setup)
13. [Project Complexities](#project-complexities)
14. [Future Enhancements](#future-enhancements)

---

## Project Overview

The **IoT Device Management System** is a comprehensive full-stack application designed to manage, monitor, and control IoT devices and edge computing nodes from a centralized web-based dashboard. The system supports both IoT sensors (ESP32, Arduino) and edge computing devices (Raspberry Pi, Orange Pi) with real-time monitoring, remote command execution, and deployment capabilities.

### Key Features

- **Multi-Device Support**: Manages both IoT sensors and edge computing devices
- **Real-time Monitoring**: Live system metrics, sensor data, and device status
- **Remote Access**: Terminal access, file management, and command execution
- **Code Deployment**: Deploy applications and scripts to edge devices
- **Data Visualization**: Charts and dashboards for sensor data analysis
- **User Management**: Authentication, authorization, and multi-user support
- **WebSocket Communication**: Real-time bidirectional communication
- **RESTful APIs**: Comprehensive API system for all operations

---

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Edge Server   │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (Python)      │
│   Port: 5173    │    │   Port: 3001    │    │   Port: 8081    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │    MongoDB      │    │   IoT Devices   │
│   Dashboard     │    │   Database      │    │   (ESP32/etc)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Communication Flow

1. **Frontend ↔ Backend**: HTTP/HTTPS REST APIs + WebSocket connections
2. **Backend ↔ Database**: MongoDB native driver
3. **Backend ↔ Edge Server**: HTTP APIs for command execution and monitoring
4. **Edge Server ↔ IoT Devices**: HTTP APIs for sensor data collection
5. **Real-time Updates**: WebSocket connections for live data streaming

---

## Technology Stack

### Backend Technologies

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (v4.18+)
- **Database**: MongoDB (v6.0+)
- **ODM**: Mongoose (v7.0+)
- **Authentication**: JWT (JSON Web Tokens)
- **WebSocket**: Socket.io (v4.7+)
- **HTTP Client**: Axios
- **Process Management**: PM2
- **Security**: bcryptjs, helmet, cors
- **Logging**: Winston
- **Validation**: Joi/Express-validator

### Frontend Technologies

- **Framework**: React (v18.2+)
- **Build Tool**: Vite (v4.4+)
- **Language**: TypeScript (v5.0+)
- **UI Library**: shadcn/ui + Tailwind CSS
- **State Management**: React Context + useState/useEffect
- **HTTP Client**: Axios
- **Routing**: React Router (v6.15+)
- **Charts**: Recharts
- **Icons**: Lucide React
- **WebSocket**: Socket.io-client

### Edge Server Technologies

- **Language**: Python (v3.8+)
- **Web Framework**: aiohttp (async HTTP server)
- **WebSocket**: websockets library
- **System Monitoring**: psutil
- **Process Management**: subprocess
- **Network**: netifaces
- **Terminal Emulation**: pty, select

### Database & Infrastructure

- **Primary Database**: MongoDB
- **Caching**: In-memory caching
- **File Storage**: Local filesystem
- **Container**: Docker (optional)
- **Reverse Proxy**: Nginx (production)

---

## Backend System

### Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection configuration
├── middleware/
│   ├── auth.js              # JWT authentication middleware
│   ├── error.js             # Global error handling middleware
│   ├── rateLimiter.js       # Rate limiting middleware
│   └── validation.js        # Request validation middleware
├── models/
│   ├── User.js              # User schema and methods
│   ├── Device.js            # Device schema with category logic
│   ├── DeviceActivity.js    # Device activity/deployment logs
│   ├── SensorData.js        # IoT sensor data with aggregation methods
│   ├── Widget.js            # Dashboard widget schema
│   └── Workspace.js         # User workspace schema
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── devices.js           # Device management routes (main complexity)
│   ├── widgets.js           # Widget management routes
│   └── workspaces.js        # Workspace management routes
├── utils/
│   ├── sshManager.js        # SSH connection management
│   ├── socket.js            # WebSocket management
│   ├── httpApiManager.js    # HTTP API communication with edge servers
│   └── logger.js            # Winston logging utility
├── server.js                # Main application entry point
└── package.json             # Dependencies and scripts
```

### Route Implementation Patterns

#### 1. Authentication Bypass Pattern

```javascript
// In /routes/devices.js
router.use((req, res, next) => {
  // Skip auth for device endpoints called by IoT devices/edge servers
  const publicPaths = [
    "/heartbeat",
    "/api-status",
    "/led-control",
    "/temperature-control",
    "/humidity-control",
    "/gps-control",
  ];

  if (publicPaths.some((path) => req.path.includes(path))) {
    return next();
  }
  authenticate(req, res, next);
});
```

#### 2. User-Scoped Device Queries

```javascript
// All device queries are scoped to the authenticated user
const query = { created_by: req.user._id };
if (status) query.status = status;
if (type) query.type = type;

const devices = await Device.find(query)
  .select("-ssh_password") // Security: never return passwords
  .sort({ updatedAt: -1 });
```

#### 3. Async Device Registration Pattern

```javascript
// Device registration returns immediately, then handles SSH/deployment async
res.status(201).json({
  success: true,
  data: device,
  message: "Device registered successfully. Starting SSH connection...",
});

// Async SSH and edge server deployment
setImmediate(async () => {
  try {
    await sshManager.connect(device);
    const deploymentResult = await sshManager.deployEdgeServer(
      device._id,
      deviceKey
    );
    // Update device status based on results
  } catch (error) {
    // Log error and update device status
  }
});
```

#### 4. Route Ordering Critical Pattern

```javascript
// CRITICAL: Specific routes must come before parameterized routes
router.get("/deployments", authenticate, getDeployments); // Must be first
router.get("/:id", authenticate, getDeviceById); // After specific routes
```

### Core Components

#### 1. Authentication System

```javascript
// JWT-based authentication with refresh tokens
const authenticate = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};
```

#### 2. WebSocket Management

```javascript
// Real-time communication for device updates
io.on("connection", (socket) => {
  socket.on("join-device", (deviceId) => {
    socket.join(`device-${deviceId}`);
  });

  socket.on("device-command", async (data) => {
    // Execute command on device
    const result = await executeCommand(data.deviceId, data.command);
    socket.emit("command-result", result);
  });
});
```

#### 3. Device Management

- **Registration**: Automatic device discovery and manual registration
- **Monitoring**: Real-time system metrics and health checks
- **Control**: Remote command execution and file management
- **Deployment**: Code and configuration deployment

---

## Frontend System

### Project Structure

```
frontend/
├── public/
│   ├── index.html           # HTML template
│   └── favicon.ico          # Application icon
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (shadcn/ui)
│   │   └── dashboard/      # Dashboard-specific components
│   ├── pages/              # Page components
│   │   ├── auth/           # Authentication pages
│   │   └── dashboard/      # Dashboard pages
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility libraries
│   │   ├── api.ts          # API client configuration
│   │   ├── deviceApi.ts    # Device API methods
│   │   └── utils.ts        # Utility functions
│   ├── integrations/       # Third-party integrations
│   └── App.tsx             # Main application component
├── package.json            # Dependencies and scripts
└── vite.config.ts          # Vite configuration
```

### Application Architecture & Routing

#### 1. App Structure with Protected Routes

```typescript
const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<EdgeDevices />} />
              <Route path="device/:id" element={<DeviceDetail />} />
              <Route path="iot-devices" element={<IoTDevices />} />
              <Route path="iot-device/:id" element={<IoTDeviceDetail />} />
              <Route path="deployments" element={<Deployments />} />
              <Route path="workspaces" element={<Workspaces />} />
              <Route
                path="workspaces/:workspaceId"
                element={<WorkspaceEditorPage />}
              />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

#### 2. Advanced IoT Chart Widget Implementation

```typescript
// Comprehensive chart widget with multiple sensor support
const IoTChartWidget: React.FC<IoTChartWidgetProps> = ({
  deviceId,
  deviceName,
  title = "Device Metrics",
  height = 400,
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "temperature",
  ]);
  const [timeRange, setTimeRange] = useState("day");
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});

  // Metric configurations with colors, units, and thresholds
  const METRIC_CONFIGS: Record<string, MetricConfig> = {
    temperature: {
      key: "temperature",
      name: "Temperature",
      color: "#ef4444",
      icon: Thermometer,
      unit: "°C",
      thresholds: { warning: 35, critical: 40 },
    },
    humidity: {
      key: "humidity",
      name: "Humidity",
      color: "#3b82f6",
      icon: Droplets,
      unit: "%",
      thresholds: { warning: 50, critical: 60 },
    },
    led: {
      key: "led",
      name: "LED State",
      color: "#22c55e",
      icon: Lightbulb,
      unit: "",
      thresholds: {},
    },
    gps: {
      key: "gps",
      name: "GPS Signal",
      color: "#8b5cf6",
      icon: MapPin,
      unit: "m",
      thresholds: {},
    },
  };

  // Dynamic Y-axis labeling based on selected metrics
  const getYAxisLabel = (): string => {
    if (selectedMetrics.length === 1) {
      const config = METRIC_CONFIGS[selectedMetrics[0]];
      return `${config?.name || selectedMetrics[0]} (${config?.unit || ""})`;
    } else if (selectedMetrics.length > 1) {
      const units = [
        ...new Set(
          selectedMetrics.map((m) => METRIC_CONFIGS[m]?.unit).filter(Boolean)
        ),
      ];
      return units.length === 1 ? `Value (${units[0]})` : "Value";
    }
    return "Value";
  };

  // Temperature precision formatting
  const formatTooltipValue = (value: any, name: string): [string, string] => {
    const config = METRIC_CONFIGS[name];
    const unit = config?.unit || "";

    if (name === "led") {
      return [value ? "ON" : "OFF", config?.name || name];
    }

    // Format temperature to 2 decimal places
    if (name === "temperature" && typeof value === "number") {
      return [`${value.toFixed(2)}${unit}`, config?.name || name];
    }

    return [`${value}${unit}`, config?.name || name];
  };

  // Real-time data fetching with auto-refresh
  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [deviceId, selectedMetrics, timeRange]);

  return (
    <Card className="w-full">
      <CardHeader>
        {/* Multi-metric selector with checkboxes */}
        <div className="flex flex-wrap gap-3">
          {Object.values(METRIC_CONFIGS).map((config) => (
            <div key={config.key} className="flex items-center space-x-2">
              <Checkbox
                checked={selectedMetrics.includes(config.key)}
                onCheckedChange={(checked) =>
                  handleMetricToggle(config.key, !!checked)
                }
              />
              <Label className="flex items-center gap-1">
                <config.icon
                  className="h-4 w-4"
                  style={{ stroke: config.color }}
                />
                {config.name}
              </Label>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <XAxis dataKey="time" />
            <YAxis
              label={{
                value: getYAxisLabel(),
                angle: -90,
                position: "insideLeft",
              }}
              tickFormatter={(value) =>
                typeof value === "number" ? value.toFixed(1) : value
              }
            />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Threshold reference lines */}
            {showThresholds &&
              selectedMetrics.map((metric) => {
                const config = METRIC_CONFIGS[metric];
                return [
                  config.thresholds.critical && (
                    <ReferenceLine
                      key={`${metric}-critical`}
                      y={config.thresholds.critical}
                      stroke="#ef4444"
                      strokeDasharray="5 5"
                    />
                  ),
                  config.thresholds.warning && (
                    <ReferenceLine
                      key={`${metric}-warning`}
                      y={config.thresholds.warning}
                      stroke="#f59e0b"
                      strokeDasharray="5 5"
                    />
                  ),
                ];
              })}

            {/* Data lines for each selected metric */}
            {selectedMetrics.map((metric) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={METRIC_CONFIGS[metric].color}
                strokeWidth={2}
                dot={{ fill: METRIC_CONFIGS[metric].color, r: 4 }}
                name={METRIC_CONFIGS[metric].name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

#### 3. State Management & API Integration

```typescript
// Custom API client with error handling
export const apiClient = {
  get: async (endpoint: string, options?: any) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  },
};

// Device-specific API methods
export const deviceApi = {
  getChartData: (deviceId: string, params: any) =>
    apiClient.get(`/devices/${deviceId}/chart-data`, { params }),

  executeCommand: (deviceId: string, command: string) =>
    apiClient.post(`/devices/${deviceId}/execute`, { command }),

  deployToDevices: (deviceIds: string[], commands: string) =>
    apiClient.post("/devices/deploy", { deviceIds, commands }),
};
```

#### 4. Real-time Component Updates

```typescript
// WebSocket integration for live device updates
const useDeviceStatus = (deviceId: string) => {
  const [status, setStatus] = useState("offline");
  const [metrics, setMetrics] = useState({});

  useEffect(() => {
    const socket = io(WS_URL, {
      auth: { token: getToken() },
    });

    socket.emit("join-device", deviceId);

    socket.on("device-status", (data) => {
      if (data.deviceId === deviceId) {
        setStatus(data.status);
        setMetrics(data.metrics);
      }
    });

    return () => socket.disconnect();
  }, [deviceId]);

  return { status, metrics };
};
```

---

## Edge Server System

### Architecture Overview

The Edge Server is a Python-based application that runs on edge computing devices (Raspberry Pi, Orange Pi, etc.) to provide:

- System monitoring and health checks
- Remote terminal access via WebSocket
- File management capabilities
- Command execution with security controls
- Real-time system statistics

### Core Components

#### 1. System Monitor

```python
class SystemMonitor:
    def get_system_stats(self):
        return {
            'cpu_percent': psutil.cpu_percent(interval=1),
            'memory': psutil.virtual_memory()._asdict(),
            'disk': psutil.disk_usage('/')._asdict(),
            'temperature': self.get_cpu_temperature(),
            'uptime': time.time() - psutil.boot_time(),
            'network': self.get_network_stats()
        }
```

#### 2. Terminal Manager

```python
class TerminalManager:
    def __init__(self):
        self.sessions = {}

    async def create_session(self, session_id):
        master, slave = pty.openpty()
        proc = subprocess.Popen(['/bin/bash'], stdin=slave,
                               stdout=slave, stderr=slave)
        self.sessions[session_id] = {
            'master': master,
            'process': proc,
            'created_at': time.time()
        }
```

#### 3. HTTP API Server

```python
class HttpApiServer:
    def setup_routes(self):
        self.app.router.add_get('/api/system/stats', self.get_system_stats)
        self.app.router.add_post('/api/exec', self.execute_command)
        self.app.router.add_get('/api/logs', self.get_edge_logs)
        self.app.router.add_get('/api/files', self.browse_files)
```

### Security Features

- Command filtering to prevent dangerous operations
- Path traversal protection
- Authentication tokens
- Timeout mechanisms
- Process isolation

---

## Database Design

### MongoDB Collections

#### 1. Users Collection

```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  username: String (unique, required),
  password: String (hashed, required),
  first_name: String,
  last_name: String,
  role: String (enum: ['admin', 'user']),
  profile_picture: String,
  is_active: Boolean (default: true),
  last_login: Date,
  created_at: Date,
  updated_at: Date
}
```

#### 2. Devices Collection

```javascript
{
  _id: ObjectId,
  name: String (required, trim: true),
  type: String (required, enum: ['ESP32', 'ESP8266', 'Arduino', 'NodeMCU', 'Raspberry Pi', 'Orange Pi', 'Windows PC', 'Linux Server', 'Ubuntu', 'Other']),
  description: String (trim: true, maxLength: 500),
  category: String (required, enum: ['IoT', 'Computer'], auto-computed from type),
  created_by: ObjectId (ref: 'User', required),

  // Network configuration
  ip_address: String (required for Computer category, IP validation),
  ssh_port: Number (default: 22, range: 1-65535, required for Computer),
  ssh_username: String (required for Computer category),
  ssh_password: String (required for Computer category),
  http_port: Number (default: 8081, range: 1-65535),
  mac_address: String (optional, MAC format validation),

  // Device identification
  device_key: String (unique, required, auto-generated),

  // Status tracking
  status: String (enum: ['online', 'offline'], default: 'offline'),
  api_status: String (enum: ['not-connected', 'connected', 'error'], default: 'not-connected'),
  deployment_status: String (enum: ['idle', 'running', 'error'], default: 'idle'),
  last_seen: Date (default: Date.now),

  // System metrics (Computer devices)
  cpu_usage: Number (default: 0, range: 0-100),
  ram_usage: Number (default: 0, range: 0-100),
  temperature: Number (default: 0, range: 0-200),

  // IoT-specific metrics
  signal_strength: Number (default: 0, range: -100-0),
  uptime: Number (default: 0, min: 0),
  active_sessions: Number (default: 0, min: 0),

  // IoT device capabilities
  supported_apis: [String] (enum: ['temperature-control', 'humidity-control', 'led-control', 'gps-control', 'camera-control']),
  current_data: Map (of Mixed, default: {}),
  last_data_received: Date,
  heartbeat_interval: Number (default: 30000, min: 1000),

  // Computer-specific metadata
  metadata: {
    os: String,
    version: String,
    architecture: String,
    total_memory: String,
    total_storage: String,
    edge_server: Object // Edge server info
  },

  timestamps: true // createdAt, updatedAt
}
```

#### 3. SensorData Collection

```javascript
{
  _id: ObjectId,
  device_id: ObjectId (ref: 'Device', indexed),
  device_key: String (indexed),
  metric_type: String (enum: ['temperature', 'humidity', 'led', 'gps']),
  value: Mixed (Number, Boolean, Object),
  unit: String,
  metadata: Object,
  timestamp: Date (indexed, TTL: 1 year),
  created_at: Date,
  updated_at: Date
}

// Indexes:
// - { device_id: 1, metric_type: 1, timestamp: -1 }
// - { timestamp: 1 } (TTL index)
```

#### 4. DeviceActivity Collection

```javascript
{
  _id: ObjectId,
  device_id: ObjectId (ref: 'Device', required, indexed),
  action_type: String (required, enum: [
    'deploy_code',
    'check_logs',
    'run_script',
    'terminal_session',
    'file_operation',
    'file_write',
    'file_delete',
    'system_check',
    'restart',
    'shutdown',
    'heartbeat'
  ]),
  status: String (enum: ['in_progress', 'success', 'failed'], default: 'in_progress'),
  log_output: String (default: ''),
  command: String, // The actual command executed
  start_time: Date (default: Date.now),
  end_time: Date,
  triggered_by: String (required), // Username or user_id who triggered
  session_id: String, // For terminal sessions
  error_message: String,
  timestamps: true // createdAt, updatedAt
}

// Indexes:
// - { device_id: 1, createdAt: -1 }
// - { session_id: 1 }
// - { action_type: 1 }
```

#### 5. Widgets Collection

```javascript
{
  _id: ObjectId,
  type: String (enum: ['temperature', 'humidity', 'chart', 'terminal']),
  title: String,
  settings: Object,
  position: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  },
  workspace_id: ObjectId (ref: 'Workspace'),
  created_by: ObjectId (ref: 'User'),
  created_at: Date,
  updated_at: Date
}
```

### Database Relationships

```
Users (1) ←→ (many) Devices (created_by)
Devices (1) ←→ (many) SensorData (device_id)
Devices (1) ←→ (many) DeviceActivity (device_id)
Users (1) ←→ (many) Workspaces (created_by)
Workspaces (1) ←→ (many) Widgets (workspace_id)
```

### Database Indexes

```javascript
// Device collection indexes
{ "device_key": 1 } (unique)
{ "ip_address": 1 }
{ "status": 1 }
{ "type": 1 }
{ "created_by": 1 }

// SensorData collection indexes
{ "device_id": 1, "metric_type": 1, "timestamp": -1 }
{ "device_key": 1, "metric_type": 1, "timestamp": -1 }
{ "timestamp": -1 }
{ "timestamp": 1 } (TTL: 31536000 seconds / 1 year)

// DeviceActivity collection indexes
{ "device_id": 1, "createdAt": -1 }
{ "session_id": 1 }
{ "action_type": 1 }
```

---

## API Documentation

### Comprehensive API Routes List

#### Authentication APIs (Public)

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile (requires auth)
- `POST /api/auth/logout` - User logout (requires auth)

#### Device Management APIs (Requires Authentication)

- `GET /api/devices` - Get all devices with pagination (filters by user)
- `POST /api/devices/register` - Register new device (async SSH setup for Computer devices)
- `GET /api/devices/:id` - Get device by ID (user's devices only)
- `PUT /api/devices/:id` - Update device (user's devices only)
- `DELETE /api/devices/:id` - Delete device (closes SSH, deletes activities)
- `POST /api/devices/:id/connect` - Establish SSH connection (Computer devices)
- `POST /api/devices/:id/execute` - Execute command via HTTP API (rate limited)
- `GET /api/devices/:id/status` - Get real-time device status via HTTP API
- `GET /api/devices/:id/files` - Browse device filesystem via HTTP API
- `GET /api/devices/:id/files/read` - Read file from device (1MB limit)
- `POST /api/devices/:id/files/write` - Write file to device (creates directories)
- `DELETE /api/devices/:id/files/delete` - Delete file/directory on device
- `GET /api/devices/:id/logs` - Get device activity logs (paginated)
- `GET /api/devices/:id/supported-apis` - Get supported IoT APIs for device
- `GET /api/devices/:id/chart-data` - Get historical sensor data for charts
- `GET /api/devices/:id/chart-data/aggregated` - Get time-series aggregated data
- `GET /api/devices/:id/edge-logs` - Get edge server logs (tail via HTTP API)

#### Deployment APIs (Requires Authentication)

- `POST /api/devices/deploy` - Deploy code to multiple devices (async execution via HTTP API)
- `GET /api/devices/deployments` - Get deployment history (with filtering, pagination)
- `GET /api/devices/status/:id` - Get device deployment status (deployment_status, api_status)

#### IoT Device Data APIs (Public - No Authentication Required)

- `POST /api/devices/heartbeat/:deviceKey` - Receive heartbeat from devices (rate limited)
- `POST /api/devices/:deviceKey/temperature-control` - Receive temperature data (creates SensorData)
- `POST /api/devices/:deviceKey/humidity-control` - Receive humidity data (creates SensorData)
- `POST /api/devices/:deviceKey/led-control` - Receive LED state data (creates SensorData)
- `POST /api/devices/:deviceKey/gps-control` - Receive GPS coordinates (creates SensorData)
- `PATCH /api/devices/api-status/:deviceKey` - Update device API connection status (from edge servers)

**Security Note**: These endpoints bypass authentication using conditional middleware:

```javascript
router.use((req, res, next) => {
  // Skip authentication for device endpoints
  if (
    req.path.includes("/heartbeat") ||
    req.path.includes("/api-status") ||
    req.path.includes("/led-control") ||
    req.path.includes("/temperature-control") ||
    req.path.includes("/humidity-control") ||
    req.path.includes("/gps-control")
  ) {
    return next();
  }
  authenticate(req, res, next);
});
```

#### Widget Management APIs

- `GET /api/widgets` - Get all widgets for user
- `POST /api/widgets` - Create new widget
- `PUT /api/widgets/:id` - Update widget
- `DELETE /api/widgets/:id` - Delete widget

#### Workspace Management APIs

- `GET /api/workspaces` - Get all workspaces for user
- `POST /api/workspaces` - Create new workspace
- `PUT /api/workspaces/:id` - Update workspace
- `DELETE /api/workspaces/:id` - Delete workspace

#### System APIs

- `GET /health` - Health check endpoint
- `GET /api/test` - Test API connectivity

### Detailed API Examples

#### POST /api/auth/register

Register a new user account.

```json
Request:
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "first_name": "John",
  "last_name": "Doe"
}

Response:
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token_here"
  }
}
```

#### POST /api/auth/login

Authenticate user and return JWT token.

```json
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token_here"
  }
}
```

### Device Management APIs

#### GET /api/devices

Get all devices with pagination and filtering.

```
Query Parameters:
- page: number (default: 1)
- limit: number (default: 10)
- search: string
- status: 'online' | 'offline'
- type: string (device type filter)

Response:
{
  "success": true,
  "data": {
    "devices": [ /* device objects */ ],
    "pagination": {
      "page": 1,
      "pages": 5,
      "total": 100,
      "limit": 10
    }
  }
}
```

#### POST /api/devices/register

Register a new device.

```json
Request:
{
  "name": "Raspberry Pi 4",
  "type": "Raspberry Pi",
  "category": "Computer",
  "ip_address": "192.168.1.100",
  "ssh_username": "pi",
  "ssh_password": "raspberry"
}

Response:
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "device": { /* device object */ },
    "device_key": "generated_device_key"
  }
}
```

#### GET /api/devices/:id

Get device details by ID.

```json
Response:
{
  "success": true,
  "data": {
    "device": {
      "_id": "device_id",
      "name": "Device Name",
      "status": "online",
      "cpu_usage": 45.2,
      "ram_usage": 62.1,
      "temperature": 52.5,
      /* ... other fields */
    }
  }
}
```

#### POST /api/devices/:id/execute

Execute command on device.

```json
Request:
{
  "command": "ls -la",
  "action_type": "terminal_session"
}

Response:
{
  "success": true,
  "data": {
    "output": "command output here",
    "exit_code": 0,
    "session_id": "session_id"
  }
}
```

### Deployment APIs

#### POST /api/devices/deploy

Deploy code to multiple devices.

```json
Request:
{
  "deviceIds": ["device_id_1", "device_id_2"],
  "commands": "#!/bin/bash\necho 'Hello World'\npython3 app.py",
  "fileName": "deployment_script.sh"
}

Response:
{
  "success": true,
  "data": {
    "deployments": [
      {
        "deviceId": "device_id_1",
        "deviceName": "Device 1",
        "status": "started",
        "activityId": "activity_id"
      }
    ],
    "successCount": 2,
    "failedCount": 0
  }
}
```

#### GET /api/devices/deployments

Get deployment history with filtering.

```
Query Parameters:
- page: number
- limit: number
- status: 'in_progress' | 'success' | 'failed' | 'all'
- deviceId: string

Response:
{
  "success": true,
  "data": {
    "deployments": [
      {
        "id": "deployment_id",
        "deviceName": "Device Name",
        "status": "in_progress",
        "startTime": "2025-10-22T10:30:00Z",
        "logs": "deployment logs...",
        "triggeredBy": "user@example.com"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### Sensor Data APIs

#### GET /api/devices/:id/chart-data

Get historical sensor data for charts.

```
Query Parameters:
- metrics: 'temperature,humidity,led'
- timeRange: 'hour' | 'day' | 'week' | 'month'
- startDate: ISO date string
- endDate: ISO date string

Response:
{
  "success": true,
  "data": {
    "historicalData": {
      "temperature": [
        {
          "timestamp": "2025-10-22T10:00:00Z",
          "value": 25.5,
          "unit": "Celsius"
        }
      ]
    },
    "currentValues": {
      "temperature": {
        "value": 26.2,
        "unit": "Celsius",
        "timestamp": "2025-10-22T11:00:00Z"
      }
    }
  }
}
```

### Edge Server APIs (Python HTTP Server - Port 8081)

#### POST /api/exec

Execute shell command on edge device.

```json
Request:
{
  "command": "ls -la"
}

Response:
{
  "success": true,
  "stdout": "total 8\ndrwxr-xr-x 2 user user 4096 Oct 22 10:30 .\n...",
  "stderr": "",
  "exit_code": 0
}
```

#### GET /api/system/stats

Get real-time system statistics.

```json
Response:
{
  "success": true,
  "data": {
    "timestamp": "2025-10-22T10:30:00.000Z",
    "cpu_usage": 45.2,
    "memory": {
      "total": 8589934592,
      "available": 3221225472,
      "used": 5368709120,
      "percentage": 62.5
    },
    "disk": {
      "total": 107374182400,
      "used": 32212254720,
      "free": 75161927680,
      "percentage": 30.0
    },
    "temperature": {
      "cpu_thermal": 52.5
    },
    "network_info": {
      "ip_address": "192.168.1.100",
      "mac_address": "b8:27:eb:xx:xx:xx",
      "interface": "eth0"
    }
  },
  "device_id": "device_abc123"
}
```

#### POST /api/file/list

List directory contents.

```json
Request:
{
  "path": "/home/pi"
}

Response:
{
  "success": true,
  "path": "/home/pi",
  "items": [
    {
      "name": "Documents",
      "path": "/home/pi/Documents",
      "type": "directory",
      "size": null,
      "modified": "2025-10-22T10:00:00.000Z",
      "permissions": "755"
    },
    {
      "name": "script.py",
      "path": "/home/pi/script.py",
      "type": "file",
      "size": 1024,
      "modified": "2025-10-22T09:30:00.000Z",
      "permissions": "644"
    }
  ]
}
```

#### GET /api/logs

Get edge server logs.

```
Query Parameters:
- lines: number (default: 15, max: 1000)

Response:
{
  "success": true,
  "data": {
    "logs": "2025-10-22 10:30:00 - edge_server - INFO - Server started\n...",
    "lines_requested": 15,
    "lines_returned": 15,
    "device_id": "device_abc123"
  }
}
```

### WebSocket Events

#### Client → Server Events

```javascript
// Join device room for real-time updates
socket.emit("join-device", deviceId);

// Execute command
socket.emit("device-command", {
  deviceId: "device_id",
  command: "ls -la",
});

// Request system stats
socket.emit("get-system-stats", deviceId);
```

#### Server → Client Events

```javascript
// Device status update
socket.emit("device-status", {
  deviceId: "device_id",
  status: "online",
  timestamp: "2025-10-22T11:00:00Z",
});

// System metrics update
socket.emit("device-metrics", {
  deviceId: "device_id",
  cpu: 45.2,
  ram: 62.1,
  temperature: 52.5,
});

// Command execution result
socket.emit("command-result", {
  success: true,
  output: "command output",
  sessionId: "session_id",
});
```

---

## Middleware & Security Implementation

### Authentication Middleware (`/middleware/auth.js`)

```javascript
const authenticate = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "No token provided, authorization denied" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ error: "Token is not valid" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token is not valid" });
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Access denied, no user found" });
    }

    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Access denied, insufficient permissions" });
    }

    next();
  };
};
```

### Rate Limiting Middleware (`/middleware/rateLimiter.js`)

```javascript
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});

const sshRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 SSH requests per minute
  message: "Too many SSH requests, please try again later.",
});

const iotRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more frequent IoT device updates
  message: "Too many IoT requests, please try again later.",
});
```

### Validation Middleware (`/middleware/validation.js`)

```javascript
const validateDevice = (req, res, next) => {
  const { name, type, ip_address, ssh_username, category } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      success: false,
      error: "Device name and type are required",
    });
  }

  if (category === "Computer" && (!ip_address || !ssh_username)) {
    return res.status(400).json({
      success: false,
      error: "IP address and SSH username are required for Computer devices",
    });
  }

  next();
};

const validateCommand = (req, res, next) => {
  const { command } = req.body;

  if (!command) {
    return res.status(400).json({
      success: false,
      error: "Command is required",
    });
  }

  // Security: Block dangerous commands
  const dangerousCommands = ["rm -rf /", "format", "mkfs", "dd if="];
  if (dangerousCommands.some((cmd) => command.toLowerCase().includes(cmd))) {
    return res.status(403).json({
      success: false,
      error: "Command not allowed for security reasons",
    });
  }

  next();
};
```

### Error Handling Middleware (`/middleware/error.js`)

```javascript
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  console.error(err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    error = { message, statusCode: 400 };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || "Server Error",
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
```

---

## Authentication & Security

### JWT Token System

```javascript
// Token structure
{
  "header": {
    "typ": "JWT",
    "alg": "HS256"
  },
  "payload": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "admin",
    "iat": 1698847200,
    "exp": 1698933600
  }
}
```

### Security Middleware

```javascript
// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// Rate limiting
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Request validation
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
    }
    next();
  };
};
```

### Password Security

```javascript
// Password hashing using bcryptjs
const bcrypt = require("bcryptjs");

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};
```

---

## Deployment Architecture

### Production Environment

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    │    (Nginx)      │
                    └─────────────────┘
                             │
                             ▼
    ┌─────────────────────────────────────────────┐
    │              Reverse Proxy                   │
    │             (Nginx/Apache)                   │
    └─────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Frontend      │ │    Backend      │ │   Edge Servers  │
│   (Static)      │ │   (Node.js)     │ │   (Python)      │
│   Port: 80/443  │ │   Port: 3001    │ │   Port: 8081    │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │    MongoDB      │
                    │   Replica Set   │
                    └─────────────────┘
```

### Docker Configuration

```yaml
# docker-compose.yml
version: "3.8"
services:
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://backend:3001

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/iot_device_management
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - mongo

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db

volumes:
  mongo_data:
```

### Environment Variables

```bash
# Backend (.env)
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://localhost:27017/iot_device_management
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Frontend (.env)
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Edge Server (environment variables or CLI args)
DEVICE_ID=edge_device_001
API_URL=http://192.168.1.50:3001  # Backend server URL
HTTP_PORT=8081
WS_PORT=8080
LOG_LEVEL=INFO
```

### Database Migrations & Setup

#### Initial Database Setup

```javascript
// Migration script to create indexes and initial data
use iot_device_management

// Create unique indexes
db.devices.createIndex({ "device_key": 1 }, { unique: true })
db.devices.createIndex({ "created_by": 1 })
db.devices.createIndex({ "ip_address": 1 })
db.devices.createIndex({ "status": 1 })
db.devices.createIndex({ "type": 1 })

// SensorData indexes for time-series performance
db.sensordata.createIndex({ "device_id": 1, "metric_type": 1, "timestamp": -1 })
db.sensordata.createIndex({ "device_key": 1, "metric_type": 1, "timestamp": -1 })
db.sensordata.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 31536000 })

// DeviceActivity indexes
db.deviceactivity.createIndex({ "device_id": 1, "createdAt": -1 })
db.deviceactivity.createIndex({ "session_id": 1 })
db.deviceactivity.createIndex({ "action_type": 1 })

// Create admin user (optional)
db.users.insertOne({
  email: "admin@iot-system.com",
  username: "admin",
  password: "$2a$12$...", // bcrypt hashed password
  first_name: "System",
  last_name: "Administrator",
  role: "admin",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
})
```

#### Schema Evolution Scripts

```javascript
// Migration: Add category field to existing devices
db.devices.updateMany({ category: { $exists: false } }, [
  {
    $set: {
      category: {
        $cond: {
          if: { $in: ["$type", ["ESP32", "ESP8266", "Arduino", "NodeMCU"]] },
          then: "IoT",
          else: "Computer",
        },
      },
    },
  },
]);

// Migration: Add default deployment_status
db.devices.updateMany(
  { deployment_status: { $exists: false } },
  { $set: { deployment_status: "idle" } }
);
```

---

## Real-time Communication

### WebSocket Implementation

```javascript
// Server-side Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"],
  },
});

// Device room management
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Join device-specific room
  socket.on("join-device", (deviceId) => {
    socket.join(`device-${deviceId}`);
    console.log(`Socket ${socket.id} joined device-${deviceId}`);
  });

  // Broadcast device updates
  socket.on("device-update", (data) => {
    io.to(`device-${data.deviceId}`).emit("device-status", data);
  });
});
```

### Client-side WebSocket

```typescript
// Frontend WebSocket service
class SocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io(API_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    this.socket.on("connect", () => {
      console.log("Connected to server");
    });

    this.socket.on("device-status", (data) => {
      // Update device status in UI
      this.handleDeviceUpdate(data);
    });
  }

  joinDevice(deviceId: string) {
    if (this.socket) {
      this.socket.emit("join-device", deviceId);
    }
  }

  onDeviceUpdate(callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on("device-update", callback);
    }
  }
}
```

---

## Development Setup

### Prerequisites

- Node.js (v18+)
- Python (v3.8+)
- MongoDB (v6.0+)
- Git

### Backend Setup

```bash
# Clone repository
git clone https://github.com/username/iot-device-management.git
cd iot-device-management/backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configuration

# Start MongoDB (if local)
mongod --dbpath /path/to/data

# Run development server
npm run dev

# Available scripts
npm start          # Production server
npm run dev        # Development with nodemon
npm run test       # Run tests
npm run lint       # ESLint
```

### Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with backend URL

# Start development server
npm run dev

# Available scripts
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint
npm run type-check # TypeScript checking
```

### Edge Server Setup

```bash
cd ../edgeServer

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run edge server
python edge_server.py --device-id edge-device-1 --host 0.0.0.0 --port 8081

# Available options
--device-id    # Unique device identifier
--host         # Host to bind to (default: 0.0.0.0)
--port         # Port to listen on (default: 8081)
--log-level    # Logging level (DEBUG, INFO, WARNING, ERROR)
```

### Database Initialization

```javascript
// Run in MongoDB shell or use a migration script
use iot_device_management

// Create indexes
db.devices.createIndex({ "device_key": 1 }, { unique: true })
db.devices.createIndex({ "created_by": 1 })
db.sensordata.createIndex({ "device_id": 1, "metric_type": 1, "timestamp": -1 })
db.sensordata.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 31536000 })
db.deviceactivity.createIndex({ "device_id": 1, "createdAt": -1 })

// Create admin user (optional)
db.users.insertOne({
  email: "admin@example.com",
  username: "admin",
  password: "$2a$12$hashedPasswordHere",
  role: "admin",
  is_active: true,
  created_at: new Date(),
  updated_at: new Date()
})
```

---

## Project Complexities & Solutions

### 1. Multi-Device Architecture

The system supports two fundamentally different device types:

- **IoT Devices**: Lightweight sensors (ESP32, Arduino) with HTTP-only communication
- **Edge Devices**: Full computing nodes (Raspberry Pi, Linux servers) with SSH + HTTP APIs

**Complexity**: Different APIs, communication patterns, and data models for each type.

**Solution**:

- Unified Device schema with category-based field validation
- Conditional middleware that bypasses auth for IoT endpoints
- Category-specific metric handling (CPU/RAM for computers, signal strength for IoT)

```javascript
category: {
  type: String,
  required: true,
  enum: ['IoT', 'Computer'],
  default: function() {
    return ['ESP32', 'ESP8266', 'Arduino'].includes(this.type) ? 'IoT' : 'Computer';
  }
}
```

### 2. Real-time Communication

Multiple real-time channels need to be managed:

- Device status updates
- Sensor data streaming
- Terminal session output
- Deployment progress

**Complexity**: WebSocket connection management, room-based broadcasting, and message queuing.

**Solution**: Socket.io with room-based architecture and event-driven updates.

### 3. Remote Command Execution

Executing commands on remote devices with:

- Security constraints
- Session management
- Output streaming
- Error handling

**Complexity**: PTY management, subprocess handling, and secure command filtering.

**Solution**: Python-based edge server with pty emulation and command sanitization.

### 4. Data Visualization

Rendering charts with:

- Multiple metrics
- Time range selection
- Real-time updates
- Threshold visualization

**Complexity**: Data aggregation, time series handling, and efficient rendering.

**Solution**: Recharts with custom data processing and WebSocket updates.

### 5. Authentication & Authorization

Multi-layered security:

- JWT token management
- Role-based access control
- Device-specific permissions
- API rate limiting

**Complexity**: Token refresh, permission inheritance, and secure communication.

**Solution**: Middleware-based authentication with role checking and token validation.

### 6. Database Performance & Time Series Data

Optimizing for:

- High-frequency sensor data ingestion (every 30 seconds per device)
- Time series queries with aggregation
- Historical analysis with date ranges
- Automatic data retention (TTL)

**Complexity**: Index optimization, TTL policies, and efficient aggregation pipelines.

**Solution**:

```javascript
// Compound indexes for efficient time-series queries
sensorDataSchema.index({ device_id: 1, metric_type: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 1 year TTL

// Aggregation methods for chart data
sensorDataSchema.statics.getAggregatedData = function (
  deviceId,
  metricType,
  startDate,
  endDate,
  interval
) {
  const pipeline = [
    {
      $match: {
        device_id: deviceId,
        metric_type: metricType,
        timestamp: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: groupBy[interval],
        avgValue: { $avg: "$value" },
        minValue: { $min: "$value" },
      },
    },
  ];
  return this.aggregate(pipeline);
};
```

### 7. Route Security & Performance Patterns

**Critical Route Ordering Issue**:

```javascript
// ❌ WRONG - This causes "Cast to ObjectId failed for value 'deployments'"
router.get("/:id", getDevice); // Catches /deployments as :id
router.get("/deployments", getDeployments);

// ✅ CORRECT - Specific routes first
router.get("/deployments", getDeployments);
router.get("/:id", getDevice);
```

**Authentication Bypass for IoT Devices**:

```javascript
// IoT devices can't handle JWT tokens, so certain endpoints bypass auth
router.use((req, res, next) => {
  const publicPaths = [
    "/heartbeat",
    "/temperature-control",
    "/humidity-control",
  ];
  if (publicPaths.some((path) => req.path.includes(path))) {
    return next(); // Skip authentication
  }
  authenticate(req, res, next);
});
```

---

## Future Enhancements

### 1. Scalability Improvements

- **Microservices Architecture**: Split monolith into focused services
- **Message Queue**: Redis/RabbitMQ for async processing
- **Load Balancing**: Multiple backend instances
- **Database Sharding**: Horizontal scaling for large datasets

### 2. Advanced Features

- **Machine Learning**: Predictive maintenance and anomaly detection
- **Mobile App**: React Native application
- **Edge Computing**: Distributed processing capabilities
- **Advanced Analytics**: Business intelligence dashboard

### 3. DevOps & Monitoring

- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring**: Prometheus + Grafana integration
- **Logging**: Centralized log management (ELK stack)
- **Health Checks**: Comprehensive system monitoring

### 4. Security Enhancements

- **OAuth2/SAML**: Enterprise authentication
- **Audit Logging**: Comprehensive activity tracking
- **Encryption**: End-to-end encrypted communication
- **Vulnerability Scanning**: Automated security testing

### 5. User Experience

- **Progressive Web App**: Offline capabilities
- **Dark Mode**: Theme customization
- **Accessibility**: WCAG compliance
- **Internationalization**: Multi-language support

---

## Debugging & Troubleshooting Guide

### Common Issues & Solutions

#### 1. "Cast to ObjectId failed for value 'deployments'" Error

**Problem**: Route ordering causes Express to treat `/deployments` as a device ID parameter.

```javascript
// ❌ WRONG ORDER
router.get("/:id", getDevice); // This catches everything
router.get("/deployments", getDeployments); // Never reached

// ✅ CORRECT ORDER
router.get("/deployments", getDeployments); // Specific routes first
router.get("/:id", getDevice); // Parameterized routes last
```

#### 2. React Router 404 Error for `/dashboard/edge-devices`

**Problem**: Route configuration missing explicit edge-devices path, causing navigation from DeviceDetail back button to fail.

```tsx
// ❌ MISSING ROUTE
<Route path="/dashboard" element={<DashboardLayout />}>
  <Route index element={<EdgeDevices />} />  // Only handles /dashboard
  {/* Missing edge-devices route */}
</Route>

// ✅ COMPLETE ROUTING
<Route path="/dashboard" element={<DashboardLayout />}>
  <Route index element={<Navigate to="/dashboard/edge-devices" replace />} />
  <Route path="edge-devices" element={<EdgeDevices />} />
</Route>

// ✅ REACT ROUTER FUTURE FLAGS (suppress v7 warnings)
<BrowserRouter
  future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
>
```

#### 3. Edge Server Connection Issues

**Symptoms**: Device shows as offline, HTTP API calls fail
**Debug steps**:

```bash
# Check if edge server is running on device
curl http://DEVICE_IP:8081/api/system/stats

# Check edge server logs
python edge_server.py --log-level DEBUG

# Verify device registration
grep "device_key" edge_server.log
```

#### 4. Chart Data Not Loading

**Problem**: Frontend chart shows "No data" or demo data
**Debug process**:

```javascript
// Check API response in browser console
console.log("[IoTChartWidget] API Response:", chartData);
console.log("[IoTChartWidget] Historical data:", chartData.data.historicalData);

// Verify SensorData in database
db.sensordata.find({ device_id: ObjectId("DEVICE_ID") }).limit(5);

// Check if device is sending data
db.sensordata.find().sort({ timestamp: -1 }).limit(5);
```

#### 5. Authentication Token Issues

**Problem**: "Token is not valid" errors
**Solutions**:

```javascript
// Check token expiration
const decoded = jwt.decode(token);
console.log("Token expires:", new Date(decoded.exp * 1000));

// Verify JWT secret matches between client and server
console.log("JWT_SECRET:", process.env.JWT_SECRET?.substring(0, 10) + "...");

// Clear invalid tokens
localStorage.removeItem("auth_token");
```

#### 5. IoT Device Data Not Saving

**Problem**: ESP32/Arduino data not appearing in dashboard
**Debug checklist**:

```javascript
// Check device registration
const device = await Device.findOne({ device_key: 'DEVICE_KEY' });
console.log('Device found:', device ? 'Yes' : 'No');

// Verify API endpoint accessibility (no auth required)
curl -X POST http://BACKEND_URL/api/devices/DEVICE_KEY/temperature-control \
  -H "Content-Type: application/json" \
  -d '{"temperature": 25.5, "unit": "Celsius"}'

// Check rate limiting
console.log('Rate limit headers:', response.headers['x-ratelimit-remaining']);
```

### Performance Monitoring

#### Database Query Optimization

```javascript
// Monitor slow queries
db.setProfilingLevel(2, { slowms: 100 });
db.system.profile.find().sort({ ts: -1 }).limit(5);

// Check index usage
db.sensordata.find({ device_id: ObjectId("...") }).explain("executionStats");

// Monitor collection sizes
db.stats();
db.sensordata.stats();
```

#### Memory & Resource Monitoring

```bash
# Backend server monitoring
pm2 monit

# Edge server resource usage
python -c "import psutil; print(f'CPU: {psutil.cpu_percent()}%, RAM: {psutil.virtual_memory().percent}%')"

# Database connection pool
mongoose.connection.db.admin().serverStatus().connections
```

### Development Workflow

#### 1. Local Development Setup

```bash
# Terminal 1: Start MongoDB
mongod --dbpath ./data/db

# Terminal 2: Backend server
cd backend && npm run dev

# Terminal 3: Frontend server
cd frontend && npm run dev

# Terminal 4: Edge server (if testing locally)
cd edgeServer && python edge_server.py --device-id test-device --api-url http://localhost:3001
```

#### 2. Testing Device Integration

```bash
# Test IoT device endpoints
curl -X POST http://localhost:3001/api/devices/test-device-key/temperature-control \
  -H "Content-Type: application/json" \
  -d '{"temperature": 23.5}'

# Test edge server HTTP API
curl -X POST http://localhost:8081/api/exec \
  -H "Content-Type: application/json" \
  -d '{"command": "echo Hello World"}'
```

#### 3. Database Seeding for Development

```javascript
// Create test user
db.users.insertOne({
  email: "test@example.com",
  username: "testuser",
  password: "$2a$12$hashed_password_here",
  role: "user",
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Create test devices
db.devices.insertMany([
  {
    name: "Test ESP32",
    type: "ESP32",
    category: "IoT",
    device_key: "test_iot_device_001",
    status: "online",
    supported_apis: ["temperature-control", "humidity-control"],
    created_by: ObjectId("USER_ID"),
    createdAt: new Date(),
  },
  {
    name: "Test Raspberry Pi",
    type: "Raspberry Pi",
    category: "Computer",
    device_key: "test_edge_device_001",
    ip_address: "192.168.1.100",
    ssh_username: "pi",
    ssh_password: "raspberry",
    status: "online",
    created_by: ObjectId("USER_ID"),
    createdAt: new Date(),
  },
]);
```

---

## Conclusion

The IoT Device Management System represents a comprehensive solution for managing diverse IoT and edge computing infrastructure. Its modular architecture, real-time capabilities, and extensive API coverage make it suitable for both small-scale deployments and enterprise environments.

### Key Architectural Strengths:

- **Dual Device Support**: Seamlessly handles both IoT sensors and edge computing devices
- **Real-time Communication**: WebSocket integration for live updates and monitoring
- **Secure Remote Access**: SSH tunneling and HTTP API communication with authentication
- **Scalable Data Management**: Time-series data with automatic retention and aggregation
- **User-Centric Design**: Multi-user support with device ownership and access control

### Technical Complexity Highlights:

- **Route Security Patterns**: Conditional authentication bypass for IoT devices
- **Async Device Registration**: Immediate response with background SSH/deployment setup
- **Chart Data Processing**: Multi-metric time-series visualization with threshold monitoring
- **Cross-Platform Deployment**: WSL integration for Linux edge server deployment

### For New Developers:

1. **Start Here**: Development setup section and database seeding scripts
2. **Understand Data Flow**: Frontend → Backend API → Edge Server HTTP API → IoT Devices
3. **Debug Systematically**: Use the troubleshooting guide for common issues
4. **Extend Carefully**: Follow the established patterns for authentication, validation, and error handling

The system's extensive logging, comprehensive API documentation, and modular component structure provide a solid foundation for both learning and extending functionality for specific IoT deployment needs.

---

**Project Repository**: [https://github.com/SheikhGalib/iot_device_managment_mern](https://github.com/SheikhGalib/iot_device_managment_mern)

**Documentation Version**: 1.0  
**Last Updated**: October 22, 2025  
**Maintainer**: Sheikh Galib
