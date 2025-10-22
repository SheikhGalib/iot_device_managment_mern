import { useState, useEffect, useRef } from 'react';
import { deviceApi, type Device } from '@/lib/deviceApi';

interface DeviceData {
  temperature?: number;
  humidity?: number;
  led_state?: boolean;
  brightness?: number;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: string;
}

interface UseDeviceDataOptions {
  deviceId?: string;
  dataPath?: string;
  refreshInterval?: number;
  enabled?: boolean;
}

export function useDeviceData({ 
  deviceId, 
  dataPath,
  refreshInterval = 5000,
  enabled = true 
}: UseDeviceDataOptions) {
  const [data, setData] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !deviceId) {
      setData(null);
      setDevice(null);
      setError(null);
      return;
    }

    const fetchData = async () => {
      try {
        setError(null);
        
        // Fetch device info and current data
        const deviceResponse = await deviceApi.getDevice(deviceId);
        setDevice(deviceResponse.data);
        
        console.log(`[useDeviceData] Fetching data for device ${deviceId}, dataPath: ${dataPath}`, {
          deviceName: deviceResponse.data.name,
          currentData: deviceResponse.data.current_data,
          lastSeen: deviceResponse.data.last_seen,
          status: deviceResponse.data.status
        });
        
        // Extract data based on dataPath or directly from current_data
        if (deviceResponse.data.current_data) {
          const currentData = deviceResponse.data.current_data;
          
          if (dataPath) {
            // Map API paths to data (extract nested values)
            switch (dataPath) {
              case 'temperature-control':
                if (currentData.temperature?.value !== undefined) {
                  setData({
                    temperature: currentData.temperature.value,
                    timestamp: currentData.temperature.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
                
              case 'humidity-control':
                if (currentData.humidity?.value !== undefined) {
                  setData({
                    humidity: currentData.humidity.value,
                    timestamp: currentData.humidity.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
                
              case 'led-control':
                if (currentData.led?.state !== undefined) {
                  setData({
                    led_state: currentData.led.state,
                    brightness: currentData.led.brightness || 100,
                    timestamp: currentData.led.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
                
              case 'gps-control':
                if (currentData.gps?.latitude !== undefined && currentData.gps?.longitude !== undefined) {
                  setData({
                    latitude: currentData.gps.latitude,
                    longitude: currentData.gps.longitude,
                    altitude: currentData.gps.altitude,
                    accuracy: currentData.gps.accuracy,
                    timestamp: currentData.gps.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
                
              default:
                // Generic data extraction
                setData({
                  ...currentData,
                  timestamp: deviceResponse.data.updatedAt
                });
            }
          } else {
            // No specific dataPath, extract all available data
            const extractedData: DeviceData = {};
            
            if (currentData.temperature?.value !== undefined) {
              extractedData.temperature = currentData.temperature.value;
            }
            if (currentData.humidity?.value !== undefined) {
              extractedData.humidity = currentData.humidity.value;
            }
            if (currentData.led?.state !== undefined) {
              extractedData.led_state = currentData.led.state;
              extractedData.brightness = currentData.led.brightness || 100;
            }
            if (currentData.gps?.latitude !== undefined && currentData.gps?.longitude !== undefined) {
              extractedData.latitude = currentData.gps.latitude;
              extractedData.longitude = currentData.gps.longitude;
              extractedData.altitude = currentData.gps.altitude;
              extractedData.accuracy = currentData.gps.accuracy;
            }
            
            extractedData.timestamp = deviceResponse.data.updatedAt;
            setData(extractedData);
          }
        }
        
        console.log(`[useDeviceData] Final extracted data:`, data ? data : 'No data extracted');
        
      } catch (err: any) {
        console.error('Failed to fetch device data:', err);
        setError(err.message || 'Failed to fetch device data');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    setLoading(true);
    fetchData();

    // Set up interval for real-time updates
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [deviceId, dataPath, refreshInterval, enabled]);

  const refresh = async () => {
    if (deviceId && enabled) {
      setLoading(true);
      
      try {
        const deviceResponse = await deviceApi.getDevice(deviceId);
        setDevice(deviceResponse.data);
        
        // Extract data the same way as in the main effect
        if (deviceResponse.data.current_data) {
          const currentData = deviceResponse.data.current_data;
          
          if (dataPath) {
            // Same extraction logic as above
            switch (dataPath) {
              case 'temperature-control':
                if (currentData.temperature?.value !== undefined) {
                  setData({
                    temperature: currentData.temperature.value,
                    timestamp: currentData.temperature.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
                
              case 'humidity-control':
                if (currentData.humidity?.value !== undefined) {
                  setData({
                    humidity: currentData.humidity.value,
                    timestamp: currentData.humidity.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
                
              case 'led-control':
                if (currentData.led?.state !== undefined) {
                  setData({
                    led_state: currentData.led.state,
                    brightness: currentData.led.brightness || 100,
                    timestamp: currentData.led.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
                
              case 'gps-control':
                if (currentData.gps?.latitude !== undefined && currentData.gps?.longitude !== undefined) {
                  setData({
                    latitude: currentData.gps.latitude,
                    longitude: currentData.gps.longitude,
                    altitude: currentData.gps.altitude,
                    accuracy: currentData.gps.accuracy,
                    timestamp: currentData.gps.timestamp || deviceResponse.data.updatedAt
                  });
                }
                break;
            }
          } else {
            // Extract all data if no specific dataPath
            const extractedData: DeviceData = {};
            
            if (currentData.temperature?.value !== undefined) {
              extractedData.temperature = currentData.temperature.value;
            }
            if (currentData.humidity?.value !== undefined) {
              extractedData.humidity = currentData.humidity.value;
            }
            if (currentData.led?.state !== undefined) {
              extractedData.led_state = currentData.led.state;
              extractedData.brightness = currentData.led.brightness || 100;
            }
            if (currentData.gps?.latitude !== undefined && currentData.gps?.longitude !== undefined) {
              extractedData.latitude = currentData.gps.latitude;
              extractedData.longitude = currentData.gps.longitude;
              extractedData.altitude = currentData.gps.altitude;
              extractedData.accuracy = currentData.gps.accuracy;
            }
            
            extractedData.timestamp = deviceResponse.data.updatedAt;
            setData(extractedData);
          }
        }
      } catch (err: any) {
        console.error('Manual refresh failed:', err);
        setError(err.message || 'Refresh failed');
      } finally {
        setLoading(false);
      }
    }
  };

  return {
    data,
    device,
    loading,
    error,
    refresh,
    isConnected: device?.status === 'online',
    lastUpdate: data?.timestamp
  };
}