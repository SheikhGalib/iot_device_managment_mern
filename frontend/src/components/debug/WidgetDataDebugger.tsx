// Quick test component to debug widget data flow
// Add this to your workspace page to test

import React, { useEffect, useState } from 'react';
import { deviceApi } from '../../lib/deviceApi';

const WidgetDataDebugger = ({ deviceId }) => {
  const [deviceData, setDeviceData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!deviceId) return;

    const fetchData = async () => {
      try {
        const response = await deviceApi.getDevice(deviceId);
        setDeviceData(response.data);
        console.log('Raw device data:', response.data);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching device:', err);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [deviceId]);

  if (error) return <div>Error: {error}</div>;
  if (!deviceData) return <div>Loading...</div>;

  const extractData = (dataPath) => {
    const currentData = deviceData.current_data;
    if (!currentData) return null;

    switch (dataPath) {
      case 'temperature-control':
        return currentData.temperature?.value;
      case 'humidity-control':
        return currentData.humidity?.value;
      case 'led-control':
        return currentData.led?.state;
      case 'gps-control':
        return currentData.gps ? `${currentData.gps.latitude}, ${currentData.gps.longitude}` : null;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '10px' }}>
      <h3>Device Data Debugger</h3>
      <p><strong>Device:</strong> {deviceData.name} ({deviceData.status})</p>
      <p><strong>Last seen:</strong> {new Date(deviceData.last_seen).toLocaleString()}</p>
      
      <h4>Raw current_data:</h4>
      <pre style={{ background: '#f5f5f5', padding: '10px' }}>
        {JSON.stringify(deviceData.current_data, null, 2)}
      </pre>
      
      <h4>Extracted values:</h4>
      <ul>
        <li>Temperature: {extractData('temperature-control') ?? 'No data'}</li>
        <li>Humidity: {extractData('humidity-control') ?? 'No data'}</li>
        <li>LED: {extractData('led-control') !== null ? (extractData('led-control') ? 'ON' : 'OFF') : 'No data'}</li>
        <li>GPS: {extractData('gps-control') ?? 'No data'}</li>
      </ul>
    </div>
  );
};

export default WidgetDataDebugger;