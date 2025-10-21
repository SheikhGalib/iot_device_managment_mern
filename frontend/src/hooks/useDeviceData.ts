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
        
        // Extract data based on dataPath
        if (deviceResponse.data.current_data && dataPath) {
          const currentData = deviceResponse.data.current_data;
          
          // Map API paths to data
          switch (dataPath) {
            case 'temperature-control':
              if (currentData.temperature !== undefined) {
                setData({
                  temperature: currentData.temperature,
                  timestamp: deviceResponse.data.updatedAt
                });
              }
              break;
              
            case 'humidity-control':
              if (currentData.humidity !== undefined) {
                setData({
                  humidity: currentData.humidity,
                  timestamp: deviceResponse.data.updatedAt
                });
              }
              break;
              
            case 'led-control':
              if (currentData.led_state !== undefined) {
                setData({
                  led_state: currentData.led_state,
                  brightness: currentData.brightness || 100,
                  timestamp: deviceResponse.data.updatedAt
                });
              }
              break;
              
            case 'gps-control':
              if (currentData.latitude !== undefined && currentData.longitude !== undefined) {
                setData({
                  latitude: currentData.latitude,
                  longitude: currentData.longitude,
                  altitude: currentData.altitude,
                  accuracy: currentData.accuracy,
                  timestamp: deviceResponse.data.updatedAt
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
        }
        
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

  const refresh = () => {
    if (deviceId && enabled) {
      setLoading(true);
      // Trigger a manual refresh by clearing and resetting the effect
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
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