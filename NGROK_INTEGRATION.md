# ngrok Integration Guide for IoT Device Management System

## Overview

This guide explains how to set up ngrok tunnels for the IoT Device Management System to enable communication between the backend API and remote edge devices through the internet.

## Architecture

```
Internet
    ↓
Backend API (ngrok) ←→ Edge Device (ngrok)
    ↓                      ↓
MongoDB Database      Local IoT Hardware
```

## Setup Requirements

### 1. Backend API ngrok (Already configured)

- Backend running on localhost:3001
- ngrok tunnel: `https://ca2b56f884c3.ngrok-free.app`
- Accessible from internet for edge device registration

### 2. Edge Device ngrok (New requirement)

- Edge server HTTP API running on port 8081
- Need ngrok tunnel for backend to access edge device APIs
- Required for file operations and terminal commands

## Implementation Details

### Backend Changes Made

1. **Device Model** (`backend/models/Device.js`)

   ```javascript
   server_info: {
     host: String,
     port: Number,
     http_port: Number,
     public_http_url: String  // ngrok URL for HTTP API access
   }
   ```

2. **HTTP API Client** (`backend/routes/devices.js`)

   ```javascript
   const makeEdgeServerRequest = async (device, endpoint, options = {}) => {
     // Use public HTTP URL if available, otherwise fall back to local IP
     const baseUrl =
       device.server_info?.public_http_url ||
       `http://${device.detected_ip || device.ip_address}:8081`;
     const url = `${baseUrl}${endpoint}`;
     // ... rest of implementation
   };
   ```

3. **Registration Endpoints**
   - Both `/api/devices/api-status/:deviceKey` and `/api/devices/heartbeat/:deviceKey` now accept `server_info` with `public_http_url`

### Edge Server Changes Made

1. **Constructor** (`edgeServer/edge_server.py`)

   ```python
   def __init__(self, device_id, api_url, host='localhost', port=8080,
                http_port=8081, public_http_url=None):
       # ... initialization
       self.public_http_url = public_http_url
   ```

2. **Registration Method**

   ```python
   async def register_with_api(self):
       server_info = {
           'host': self.host,
           'port': self.port,
           'http_port': self.http_port,
           'public_http_url': self.public_http_url
       }
       # Send server_info to backend
   ```

3. **Command Line Arguments**
   ```python
   parser.add_argument('--public-http-url', type=str,
                      help='Public HTTP URL (e.g., ngrok tunnel)')
   ```

## Setup Instructions

### Step 1: Install ngrok

1. Download from https://ngrok.com/download
2. Extract and install
3. Sign up for ngrok account
4. Get authentication token from dashboard

### Step 2: Configure ngrok

```bash
# Authenticate ngrok
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 3: Start ngrok tunnel for edge server

```bash
# In terminal 1: Start ngrok tunnel for edge server HTTP API
ngrok http 8081
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Step 4: Start edge server with ngrok support

```bash
# In terminal 2: Start edge server with public URL
python edgeServer/edge_server.py \
  --device-id "your_device_id" \
  --api-url "https://ca2b56f884c3.ngrok-free.app" \
  --public-http-url "https://abc123.ngrok.io" \
  --http-port 8081
```

### Step 5: Verify integration

1. Check edge server logs for successful registration
2. Check backend logs for device registration with public_http_url
3. Test file operations from frontend dashboard
4. Test terminal commands from frontend dashboard

## Testing Commands

### Test edge server locally

```bash
# Test HTTP API locally
curl http://localhost:8081/api/file/list?path=/home

# Test HTTP API through ngrok
curl https://abc123.ngrok.io/api/file/list?path=/home
```

### Test backend communication

```bash
# Check device registration
curl https://ca2b56f884c3.ngrok-free.app/api/devices

# Test file operation (backend -> edge server)
curl https://ca2b56f884c3.ngrok-free.app/api/devices/DEVICE_ID/files?path=/home
```

## Troubleshooting

### Common Issues

1. **Connection timeouts**

   - Verify ngrok tunnel is active
   - Check firewall settings
   - Ensure edge server HTTP API is running

2. **Registration failures**

   - Check device_id matches between edge server and backend
   - Verify API URL is correct
   - Check backend logs for registration attempts

3. **File operation failures**
   - Verify public_http_url is correctly stored in database
   - Check edge server HTTP API is accessible through ngrok
   - Verify CORS headers are properly set

### Debug Commands

```bash
# Check ngrok status
curl http://localhost:4040/api/tunnels

# Test edge server health
curl https://YOUR_NGROK_URL.ngrok.io/health

# Check backend device data
# Use MongoDB Compass or CLI to verify server_info.public_http_url field
```

## Security Considerations

1. **ngrok Authentication**

   - Use ngrok authentication for production
   - Consider ngrok custom domains for consistent URLs

2. **API Security**

   - Implement proper authentication on edge server APIs
   - Use HTTPS only (ngrok provides this automatically)
   - Consider IP whitelisting if needed

3. **Data Protection**
   - Encrypt sensitive file operations
   - Implement audit logging
   - Use secure command validation

## Production Deployment

For production, consider:

1. Static ngrok domains or custom domains
2. Load balancers for multiple edge devices
3. Monitoring and alerting for tunnel health
4. Backup connectivity methods
5. Edge device authentication and authorization

## Example Configuration

### Complete edge server startup

```bash
python edgeServer/edge_server.py \
  --device-id "orangepi_001" \
  --api-url "https://ca2b56f884c3.ngrok-free.app" \
  --public-http-url "https://1234-5678-90ab-cdef.ngrok.io" \
  --http-port 8081 \
  --port 8080
```

### Expected device registration

```json
{
  "device_id": "orangepi_001",
  "server_info": {
    "host": "localhost",
    "port": 8080,
    "http_port": 8081,
    "public_http_url": "https://1234-5678-90ab-cdef.ngrok.io"
  },
  "network_info": {
    "ip_address": "192.168.0.108",
    "mac_address": "aa:bb:cc:dd:ee:ff"
  }
}
```

This setup enables full bidirectional communication between the backend and remote edge devices through secure ngrok tunnels.
