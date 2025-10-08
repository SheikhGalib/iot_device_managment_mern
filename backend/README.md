# IoT Device Management System - Setup Instructions

This is a complete IoT Device Management System built with MERN stack (MongoDB, Express.js, React, Node.js) with real-time capabilities using Socket.IO.

## Features

### ✅ Implemented Features

- **Device Registration & Management**: Register and manage edge devices with SSH connectivity
- **Real-time Terminal**: Interactive terminal sessions with edge devices via WebSocket
- **File Manager**: Browse and navigate device filesystems remotely
- **Device Monitoring**: Real-time CPU, RAM, and temperature monitoring
- **User Authentication**: Secure JWT-based authentication system
- **WebSocket Integration**: Real-time updates for device metrics and status
- **Responsive UI**: Modern UI with Tailwind CSS and Shadcn components

### 🔧 Backend Features

- Express.js REST API with comprehensive endpoints
- MongoDB with Mongoose for data persistence
- Socket.IO for real-time communication
- SSH connection management for device access
- Device activity logging
- User management and authentication
- Rate limiting and security middleware
- Error handling and logging

### 🎨 Frontend Features

- React with TypeScript
- Real-time terminal component
- Interactive file manager
- Device registration modal
- Live device metrics dashboard
- Card and list view for devices
- Socket.IO client integration

## Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v16 or higher)
2. **MongoDB** (running locally or MongoDB Atlas)
3. **Git** (for version control)

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd IoTdeviceManagment_MERN
```

### 2. Backend Setup

#### Navigate to backend directory:

```bash
cd backend
```

#### Install dependencies:

```bash
npm install
```

#### Set up environment variables:

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/iot-device-management
JWT_SECRET=your_super_secure_jwt_secret_key_change_in_production_2024
JWT_EXPIRE=7d
NODE_ENV=development

# Edge Server Default Credentials (for prototype only)
DEFAULT_SSH_USERNAME=pi
DEFAULT_SSH_PASSWORD=raspberry
DEFAULT_SSH_PORT=22

# CORS Origins
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

#### Start MongoDB:

Make sure MongoDB is running on your system. If using local installation:

```bash
# On Windows (if MongoDB is installed as a service)
net start MongoDB

# On macOS (if installed via Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

#### Start the backend server:

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

#### Navigate to frontend directory (in a new terminal):

```bash
cd frontend
```

#### Install dependencies:

```bash
npm install
```

#### Install additional required packages:

```bash
npm install axios socket.io-client
```

#### Set up environment variables:

The `.env` file should already contain:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

#### Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Initial Setup

#### Create an admin user:

You can register through the UI or create a user directly in MongoDB. The first user should be created through the registration endpoint.

#### Test the application:

1. Open `http://localhost:5173` in your browser
2. Register a new account or login
3. Navigate to Edge Devices section
4. Add a new device using the registration modal

## Testing Edge Device Connection

### Option 1: Using a Raspberry Pi

If you have a Raspberry Pi or similar device:

1. Ensure SSH is enabled on the device
2. Note down the IP address (`ip addr show` or `ifconfig`)
3. Get the MAC address (`ip link show` or `ifconfig`)
4. Use the device registration form to add your device

### Option 2: Testing with Local Machine (Linux/macOS)

For testing purposes, you can use your local machine:

1. Enable SSH server:

   ```bash
   # On Ubuntu/Debian
   sudo systemctl enable ssh
   sudo systemctl start ssh

   # On macOS
   sudo systemsetup -setremotelogin on
   ```

2. Get your local IP: `ifconfig` or `ip addr show`
3. Get your MAC address from the network interface
4. Register the device using your local credentials

### Option 3: Docker Container for Testing

Create a test container with SSH enabled:

```bash
# Create a test SSH container
docker run -d --name test-device -p 2222:22 \
  -e SSH_ENABLE_ROOT=true \
  panubo/sshd:latest

# Connect using: localhost:2222, username: root, password: (none - use key auth)
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Devices

- `GET /api/devices` - List all devices
- `POST /api/devices/register` - Register new device
- `GET /api/devices/:id` - Get device details
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device
- `POST /api/devices/:id/connect` - Connect to device
- `POST /api/devices/:id/execute` - Execute command
- `GET /api/devices/:id/status` - Get device status
- `GET /api/devices/:id/files` - Browse device files
- `GET /api/devices/:id/logs` - Get device logs

### WebSocket Events

- `join-device` - Join device room for updates
- `terminal-start` - Start terminal session
- `terminal-command` - Send command to terminal
- `terminal-end` - End terminal session
- `file-browse` - Browse device files

## Security Considerations

⚠️ **Important Security Notes:**

1. **SSH Passwords**: This implementation uses SSH passwords for simplicity. In production, use SSH keys instead.

2. **JWT Secret**: Change the JWT secret in production to a cryptographically secure random string.

3. **HTTPS**: Use HTTPS in production for both frontend and backend.

4. **Environment Variables**: Never commit `.env` files to version control.

5. **Network Security**: Ensure your edge devices are on a secure network.

## Troubleshooting

### Common Issues:

1. **MongoDB Connection Error**:

   - Ensure MongoDB is running
   - Check the connection string in `.env`
   - Verify firewall settings

2. **SSH Connection Failed**:

   - Verify device IP address and SSH credentials
   - Check if SSH server is running on target device
   - Ensure firewall allows SSH connections (port 22)

3. **Frontend API Errors**:

   - Check if backend server is running
   - Verify API base URL in frontend `.env`
   - Check browser console for CORS errors

4. **WebSocket Connection Issues**:
   - Ensure Socket.IO server is running
   - Check WebSocket URL configuration
   - Verify firewall allows WebSocket connections

### Logs:

- Backend logs are stored in `backend/logs/` directory
- Check browser console for frontend errors
- Monitor the terminal output of both frontend and backend servers

## Development Guidelines

### Adding New Features:

1. **Backend**: Add routes in `routes/` directory, models in `models/`, and middleware in `middleware/`
2. **Frontend**: Create components in `components/` and pages in `pages/`
3. **API Integration**: Update API services in `lib/` directory
4. **Real-time Features**: Add Socket.IO events in backend `utils/socket.js` and frontend `lib/socketService.ts`

### Database Schema:

- **Users**: Authentication and user management
- **Devices**: Edge device information and metadata
- **DeviceActivity**: Logs of all device operations

## Production Deployment

For production deployment:

1. Use environment variables for all configuration
2. Enable HTTPS with proper SSL certificates
3. Use SSH keys instead of passwords
4. Implement proper backup strategies for MongoDB
5. Use process managers like PM2 for Node.js
6. Set up monitoring and logging
7. Configure reverse proxy (Nginx) for better performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the established patterns
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
