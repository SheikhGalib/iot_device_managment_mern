import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Thermometer, 
  Droplets, 
  Lightbulb, 
  MapPin, 
  Copy, 
  Code, 
  Wifi, 
  WifiOff 
} from "lucide-react";
import { deviceApi, type Device } from "@/lib/deviceApi";
import { useToast } from "@/hooks/use-toast";

const IoTDeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [loading, setLoading] = useState(true);
  const [availableApis] = useState(['temperature-control', 'humidity-control', 'led-control', 'gps-control', 'camera-control']);
  const [selectedApis, setSelectedApis] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      loadDevice();
    }
  }, [id]);

  const loadDevice = async () => {
    try {
      setLoading(true);
      const response = await deviceApi.getDevice(id!);
      setDevice(response.data);
      setSelectedApis(response.data.supported_apis || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load device details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApiChange = async (apiName: string, checked: boolean) => {
    let newApis: string[];
    if (checked) {
      newApis = [...selectedApis, apiName];
    } else {
      newApis = selectedApis.filter(api => api !== apiName);
    }
    
    try {
      await deviceApi.updateDevice(id!, { supported_apis: newApis });
      setSelectedApis(newApis);
      setDevice(prev => prev ? { ...prev, supported_apis: newApis } : null);
      toast({
        title: "Success",
        description: "Device APIs updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: "Failed to update device APIs",
        variant: "destructive"
      });
    }
  };

  const copyDeviceKey = () => {
    if (device) {
      navigator.clipboard.writeText(device.device_key);
      toast({
        title: "Copied!",
        description: "Device key copied to clipboard",
      });
    }
  };

  const generateFullESP32Code = () => {
    if (!device) return;

    const template = `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Pin definitions
#define LED_BUILTIN 2
#define TEMP_SENSOR_PIN A0  // Analog pin for temperature sensor
#define HUMIDITY_SENSOR_PIN A1  // Analog pin for humidity sensor

// WiFi Configuration
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// Backend Configuration
const char *serverBase = "http://192.168.137.1:3001/api/devices";
const char *deviceKey = "${device.device_key}";

// Timing variables
unsigned long previousMillis = 0;
const long interval = 15000; // Send data every 15 seconds

// Demo data variables
float temperature = 25.0;
float humidity = 60.0;
float latitude = 23.7808875; // Demo coordinates (Dhaka, Bangladesh)
float longitude = 90.2792308;
bool ledState = false;

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
  
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMillis = millis();
  
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // Generate demo data
    generateDemoData();
    
    // Send heartbeat
    sendHeartbeat();
    delay(1000);

    // Send data for selected APIs
${selectedApis.map(api => {
  switch(api) {
    case 'temperature-control':
      return '    sendTemperatureData();';
    case 'humidity-control':
      return '    sendHumidityData();';
    case 'led-control':
      return '    sendLedData();';
    case 'gps-control':
      return '    sendGpsData();';
    default:
      return `    // ${api} - implement as needed`;
  }
}).join('\\n    delay(500);\\n')}
  }
}

void generateDemoData() {
  // Generate realistic demo sensor data
  temperature = 25.0 + random(-50, 150) / 10.0; // 20°C to 40°C
  humidity = 60.0 + random(-200, 200) / 10.0;   // 40% to 80%
  latitude += (random(-10, 10) / 100000.0);      // Small GPS variations
  longitude += (random(-10, 10) / 100000.0);
  
  // Toggle LED
  ledState = !ledState;
  digitalWrite(LED_BUILTIN, ledState ? HIGH : LOW);
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/heartbeat/" + deviceKey;
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    JsonDocument doc;
    doc["cpu_usage"] = random(10, 30);
    doc["ram_usage"] = random(20, 50);
    doc["temperature"] = temperature;
    doc["timestamp"] = millis();
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    Serial.printf("Heartbeat: %d\\n", httpResponseCode);
    http.end();
  }
}

${selectedApis.includes('temperature-control') ? `
void sendTemperatureData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceKey + "/temperature-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    JsonDocument doc;
    doc["temperature"] = temperature;
    doc["unit"] = "Celsius";
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    Serial.printf("Temperature sent: %.1f°C, Response: %d\\n", temperature, httpResponseCode);
    http.end();
  }
}` : ''}

${selectedApis.includes('humidity-control') ? `
void sendHumidityData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceKey + "/humidity-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    JsonDocument doc;
    doc["humidity"] = humidity;
    doc["unit"] = "percent";
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    Serial.printf("Humidity sent: %.1f%%, Response: %d\\n", humidity, httpResponseCode);
    http.end();
  }
}` : ''}

${selectedApis.includes('led-control') ? `
void sendLedData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceKey + "/led-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    JsonDocument doc;
    doc["led_state"] = ledState;
    doc["brightness"] = 100;
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    Serial.printf("LED sent: %s, Response: %d\\n", ledState ? "ON" : "OFF", httpResponseCode);
    http.end();
  }
}` : ''}

${selectedApis.includes('gps-control') ? `
void sendGpsData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceKey + "/gps-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    JsonDocument doc;
    doc["latitude"] = latitude;
    doc["longitude"] = longitude;
    doc["altitude"] = 10.5 + random(-50, 50) / 10.0;
    doc["accuracy"] = 2.5;
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    Serial.printf("GPS sent: %.6f, %.6f, Response: %d\\n", latitude, longitude, httpResponseCode);
    http.end();
  }
}` : ''}`;

    navigator.clipboard.writeText(template);
    toast({
      title: "Complete Code Copied!",
      description: "ESP32 code with all selected APIs copied to clipboard",
    });
  };

  const getApiIcon = (api: string) => {
    switch (api) {
      case "temperature-control": return <Thermometer className="h-4 w-4" />;
      case "humidity-control": return <Droplets className="h-4 w-4" />;
      case "led-control": return <Lightbulb className="h-4 w-4" />;
      case "gps-control": return <MapPin className="h-4 w-4" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const getApiName = (api: string) => {
    switch (api) {
      case "temperature-control": return "Temperature Control";
      case "humidity-control": return "Humidity Control";
      case "led-control": return "LED Control";
      case "gps-control": return "GPS Control";
      case "camera-control": return "Camera Control";
      default: return api;
    }
  };

  if (loading) {
    return <div className="p-6">Loading device details...</div>;
  }

  if (!device) {
    return <div className="p-6">Device not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/iot-devices")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold">{device.name}</h2>
            <Badge variant={device.status === "online" ? "default" : "destructive"}>
              {device.status === "online" ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {device.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{device.type}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Device Information */}
        <Card>
          <CardHeader>
            <CardTitle>Device Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Device Key</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs font-mono">
                  {device.device_key}
                </code>
                <Button variant="outline" size="sm" onClick={copyDeviceKey}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Last Seen:</span>
                <p className="font-medium">{new Date(device.last_seen).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">API Status:</span>
                <p className="font-medium capitalize">{device.api_status || 'not-connected'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Supported APIs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableApis.map((api) => (
              <div key={api} className="flex items-center space-x-3">
                <Checkbox
                  id={api}
                  checked={selectedApis.includes(api)}
                  onCheckedChange={(checked) => handleApiChange(api, checked as boolean)}
                />
                <div className="flex items-center gap-2 flex-1">
                  {getApiIcon(api)}
                  <label htmlFor={api} className="text-sm font-medium">
                    {getApiName(api)}
                  </label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Current Data */}
      {device.current_data && Object.keys(device.current_data).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(device.current_data).map(([key, value]: [string, any]) => (
                <div key={key} className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getApiIcon(key + '-control')}
                    <span className="text-sm font-medium capitalize">{key}</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {typeof value === 'object' ? 
                      (value.state !== undefined ? (value.state ? 'ON' : 'OFF') : 
                       value.value !== undefined ? `${value.value}${value.unit || ''}` : 
                       JSON.stringify(value)) : 
                      String(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button onClick={generateFullESP32Code}>
              <Code className="mr-2 h-4 w-4" />
              Copy Complete ESP32 Code
            </Button>
            <Button variant="outline" onClick={loadDevice}>
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IoTDeviceDetail;
