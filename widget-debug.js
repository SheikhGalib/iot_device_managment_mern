// Debug utility to check widget and device data flow
// Copy this into your browser console when on the workspace page

function debugWidgetData() {
  console.log("=== WIDGET DATA DEBUG ===");
  
  // Check if there are any widgets on the page
  const widgets = document.querySelectorAll('[data-widget]');
  console.log(`Found ${widgets.length} widgets on page`);
  
  // Get workspace data from localStorage or API
  const workspaces = JSON.parse(localStorage.getItem('workspaces') || '[]');
  console.log("Workspaces:", workspaces);
  
  // Check device data
  fetch('/api/devices')
    .then(response => response.json())
    .then(data => {
      console.log("All devices:", data.data);
      
      data.data.forEach(device => {
        if (device.category === 'IoT' && device.current_data) {
          console.log(`Device ${device.name} (${device._id}):`, {
            status: device.status,
            lastSeen: device.last_seen,
            currentData: device.current_data
          });
        }
      });
    })
    .catch(err => console.error("Failed to fetch devices:", err));
}

// Test individual widget data fetch
function testWidgetDataFetch(deviceId, dataPath) {
  console.log(`Testing data fetch for device ${deviceId} with dataPath ${dataPath}`);
  
  fetch(`/api/devices/${deviceId}`)
    .then(response => response.json())
    .then(data => {
      console.log("Device response:", data);
      
      if (data.data.current_data) {
        console.log("Current data structure:", data.data.current_data);
        
        // Test data extraction logic
        const currentData = data.data.current_data;
        let extractedData = {};
        
        switch (dataPath) {
          case 'temperature-control':
            if (currentData.temperature?.value !== undefined) {
              extractedData = {
                temperature: currentData.temperature.value,
                timestamp: currentData.temperature.timestamp
              };
            }
            break;
          case 'humidity-control':
            if (currentData.humidity?.value !== undefined) {
              extractedData = {
                humidity: currentData.humidity.value,
                timestamp: currentData.humidity.timestamp
              };
            }
            break;
          case 'led-control':
            if (currentData.led?.state !== undefined) {
              extractedData = {
                led_state: currentData.led.state,
                brightness: currentData.led.brightness || 100,
                timestamp: currentData.led.timestamp
              };
            }
            break;
          case 'gps-control':
            if (currentData.gps?.latitude !== undefined && currentData.gps?.longitude !== undefined) {
              extractedData = {
                latitude: currentData.gps.latitude,
                longitude: currentData.gps.longitude,
                altitude: currentData.gps.altitude,
                accuracy: currentData.gps.accuracy,
                timestamp: currentData.gps.timestamp
              };
            }
            break;
        }
        
        console.log("Extracted data:", extractedData);
      }
    })
    .catch(err => console.error("Failed to fetch device:", err));
}

// Export functions to global scope
window.debugWidgetData = debugWidgetData;
window.testWidgetDataFetch = testWidgetDataFetch;

console.log("Debug functions loaded. Run debugWidgetData() or testWidgetDataFetch(deviceId, dataPath)");