import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import IoTChartWidget from '../components/dashboard/IoTChartWidget';
import { ArrowLeft, LineChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

const ChartTest = () => {
  // You can replace this with actual device IDs from your system
  const testDeviceId = "672e9a7b9b47a3d4a3e21d8a"; // Replace with your actual device ID

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <LineChart className="h-6 w-6" />
            <h1 className="text-2xl font-bold">IoT Chart Widget Test</h1>
          </div>
        </div>

        {/* Features Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Chart Widget Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">📊 Multi-Metric Support</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Temperature, Humidity, LED, GPS data</li>
                  <li>• Multiple metrics on same chart</li>
                  <li>• Different colored lines per metric</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">⏰ Time Range Selection</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 1 Hour, 1 Day, 1 Week, 1 Month</li>
                  <li>• Real-time updates every 30 seconds</li>
                  <li>• Manual refresh capability</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">🚨 Threshold System</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Temperature: {'>'}40°C red, {'>'}35°C yellow</li>
                  <li>• Humidity: {'>'}60% red, {'>'}50% yellow</li>
                  <li>• Visual threshold lines on chart</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">💡 Smart UI</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Color-coded current values</li>
                  <li>• Interactive tooltips</li>
                  <li>• Responsive design</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chart Widget Demo */}
        <div className="space-y-6">
          <div className="grid gap-6">
            {/* Full Size Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Large Chart Widget (Full Features)</CardTitle>
              </CardHeader>
              <CardContent>
                <IoTChartWidget
                  deviceId={testDeviceId}
                  title="Device Metrics Dashboard"
                  height={500}
                />
              </CardContent>
            </Card>

            {/* Widget Size Chart */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Widget Size Chart (Temperature Focus)</CardTitle>
                </CardHeader>
                <CardContent>
                  <IoTChartWidget
                    deviceId={testDeviceId}
                    title="Temperature Monitor"
                    height={300}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Compact Chart (Humidity Focus)</CardTitle>
                </CardHeader>
                <CardContent>
                  <IoTChartWidget
                    deviceId={testDeviceId}
                    title="Humidity Tracker"
                    height={300}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold">1. Setup Your ESP32</h4>
                <p className="text-muted-foreground">
                  Use the updated ESP32 code from the test files to send temperature, humidity, LED, and GPS data.
                  The system will automatically store historical data.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">2. Update Device ID</h4>
                <p className="text-muted-foreground">
                  Replace the <code className="bg-muted px-2 py-1 rounded">testDeviceId</code> in this component with your actual device ID.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">3. Test Features</h4>
                <ul className="text-muted-foreground space-y-1 ml-4">
                  <li>• Select different time ranges</li>
                  <li>• Toggle different metrics on/off</li>
                  <li>• Watch threshold colors change</li>
                  <li>• Test multi-metric visualization</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ChartTest;