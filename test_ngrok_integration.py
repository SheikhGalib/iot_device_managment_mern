#!/usr/bin/env python3
"""
Test script to verify ngrok integration for edge server HTTP API
This script demonstrates how to run the edge server with ngrok support
"""

import subprocess
import sys
import time
import requests
import json


def test_edge_server_with_ngrok():
    """Test the edge server with ngrok public HTTP URL"""

    print("=== Edge Server ngrok Integration Test ===\n")

    # Configuration
    DEVICE_ID = "test_device_001"
    BACKEND_API_URL = "https://ca2b56f884c3.ngrok-free.app"
    # Replace with actual ngrok URL
    EDGE_NGROK_URL = "https://YOUR_EDGE_NGROK_URL.ngrok.io"
    HTTP_PORT = 8081

    print(f"Device ID: {DEVICE_ID}")
    print(f"Backend API URL: {BACKEND_API_URL}")
    print(f"Edge Server ngrok URL: {EDGE_NGROK_URL}")
    print(f"HTTP Port: {HTTP_PORT}")
    print()

    # Test 1: Verify backend is accessible
    print("1. Testing backend API accessibility...")
    try:
        response = requests.get(f"{BACKEND_API_URL}/api/devices", timeout=10)
        print(f"   ✓ Backend API accessible: {response.status_code}")
    except Exception as e:
        print(f"   ✗ Backend API error: {e}")
        return False

    # Test 2: Show how to start edge server with ngrok
    print("\n2. Edge server command with ngrok support:")
    command = [
        "python", "edgeServer/edge_server.py",
        "--device-id", DEVICE_ID,
        "--api-url", BACKEND_API_URL,
        "--public-http-url", EDGE_NGROK_URL,
        "--http-port", str(HTTP_PORT)
    ]
    print(f"   Command: {' '.join(command)}")

    # Test 3: Show expected registration payload
    print("\n3. Expected registration payload:")
    server_info = {
        "host": "localhost",
        "port": 8080,  # WebSocket port
        "http_port": HTTP_PORT,
        "public_http_url": EDGE_NGROK_URL
    }
    print(f"   server_info: {json.dumps(server_info, indent=2)}")

    # Test 4: Manual ngrok setup instructions
    print("\n4. Manual ngrok setup steps:")
    print("   a. Install ngrok: https://ngrok.com/download")
    print("   b. Authenticate: ngrok config add-authtoken YOUR_TOKEN")
    print(f"   c. Start tunnel: ngrok http {HTTP_PORT}")
    print("   d. Copy the https URL (e.g., https://abc123.ngrok.io)")
    print("   e. Update EDGE_NGROK_URL in this script")
    print("   f. Run edge server with --public-http-url parameter")

    # Test 5: Expected backend behavior
    print("\n5. Expected backend behavior:")
    print("   - Device registration includes public_http_url in server_info")
    print("   - Backend HTTP API requests use public URL when available")
    print("   - Falls back to local IP if public URL not available")
    print("   - File operations and terminal commands work through ngrok tunnel")

    print("\n=== Test Complete ===")
    print("To run the actual edge server with ngrok, execute:")
    print(
        f"python edgeServer/edge_server.py --device-id {DEVICE_ID} --api-url {BACKEND_API_URL} --public-http-url {EDGE_NGROK_URL} --http-port {HTTP_PORT}")

    return True


if __name__ == "__main__":
    try:
        test_edge_server_with_ngrok()
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
