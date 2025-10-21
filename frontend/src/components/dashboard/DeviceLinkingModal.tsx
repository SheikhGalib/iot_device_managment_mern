import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Wifi, WifiOff, CheckCircle, AlertCircle, Code } from "lucide-react";
import { deviceApi, type Device } from "@/lib/deviceApi";
import { workspaceService, type Widget } from "@/lib/workspaceApi";
import { useToast } from "@/hooks/use-toast";

interface DeviceLinkingModalProps {
  widget: Widget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceLinked?: (widgetId: string, deviceId: string) => void;
}

const DeviceLinkingModal: React.FC<DeviceLinkingModalProps> = ({
  widget,
  open,
  onOpenChange,
  onDeviceLinked
}) => {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedApi, setSelectedApi] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [codeTemplate, setCodeTemplate] = useState<string>('');
  const [showCode, setShowCode] = useState(false);

  // Widget type to API mapping
  const widgetApiMap: Record<string, string> = {
    'temperature': 'temperature-control',
    'humidity': 'humidity-control',
    'led': 'led-control',
    'gps': 'gps-control'
  };

  useEffect(() => {
    if (open) {
      loadDevices();
      if (widget) {
        const suggestedApi = widgetApiMap[widget.type];
        if (suggestedApi) {
          setSelectedApi(suggestedApi);
        }
      }
    }
  }, [open, widget]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await deviceApi.getDevices();
      // Filter for IoT devices only
      const iotDevices = response.data.devices.filter((device: Device) => device.category === 'IoT');
      setDevices(iotDevices);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load devices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceSelect = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    if (deviceId && selectedApi) {
      await generateCodeTemplate(deviceId, selectedApi);
    }
  };

  const handleApiSelect = async (api: string) => {
    setSelectedApi(api);
    if (selectedDevice && api) {
      await generateCodeTemplate(selectedDevice, api);
    }
  };

  const generateCodeTemplate = async (deviceId: string, apiType: string) => {
    try {
      const device = devices.find(d => d._id === deviceId);
      if (!device) return;

      // Generate code template based on the API type
      const templates = {
        'temperature-control': generateTemperatureCode(device),
        'humidity-control': generateHumidityCode(device),
        'led-control': generateLedCode(device),
        'gps-control': generateGpsCode(device)
      };

      const template = templates[apiType as keyof typeof templates];
      setCodeTemplate(template);
    } catch (error) {
      console.error('Failed to generate code template:', error);
    }
  };

  const generateTemperatureCode = (device: Device) => {
    return `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YourHotspotName";
const char* password = "YourHotspotPassword";

// Backend Configuration
const char* serverBase = "http://192.168.4.1:5000/api/devices";  // Change to your laptop IP
const char* deviceId = "${device._id}";

unsigned long previousMillis = 0;
const long interval = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    sendHeartbeat();
    sendTemperatureData();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    int httpResponseCode = http.POST("{}");
    if (httpResponseCode > 0) {
      Serial.printf("Heartbeat sent! Response: %d\\n", httpResponseCode);
    }
    http.end();
  }
}

void sendTemperatureData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/temperature-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Read temperature from sensor (replace with actual sensor reading)
    float temperature = random(200, 400) / 10.0; // Simulate 20.0 to 40.0°C
    
    StaticJsonDocument<200> doc;
    doc["temperature"] = temperature;
    doc["unit"] = "Celsius";
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      Serial.printf("Temperature sent: %.1f°C, Response: %d\\n", temperature, httpResponseCode);
    }
    http.end();
  }
}`;
  };

  const generateHumidityCode = (device: Device) => {
    return `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YourHotspotName";
const char* password = "YourHotspotPassword";

// Backend Configuration
const char* serverBase = "http://192.168.4.1:5000/api/devices";
const char* deviceId = "${device._id}";

unsigned long previousMillis = 0;
const long interval = 5000;

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    sendHeartbeat();
    sendHumidityData();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    http.POST("{}");
    http.end();
  }
}

void sendHumidityData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/humidity-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Read humidity from sensor (replace with actual sensor reading)
    float humidity = random(300, 800) / 10.0; // Simulate 30.0 to 80.0%
    
    StaticJsonDocument<200> doc;
    doc["humidity"] = humidity;
    doc["unit"] = "%";
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      Serial.printf("Humidity sent: %.1f%%, Response: %d\\n", humidity, httpResponseCode);
    }
    http.end();
  }
}`;
  };

  const generateLedCode = (device: Device) => {
    return `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YourHotspotName";
const char* password = "YourHotspotPassword";

// Backend Configuration
const char* serverBase = "http://192.168.4.1:5000/api/devices";
const char* deviceId = "${device._id}";

unsigned long previousMillis = 0;
const long interval = 5000;

void setup() {
  Serial.begin(115200);
  pinMode(LED_BUILTIN, OUTPUT);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    sendHeartbeat();
    
    // Toggle LED for demonstration
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
    sendLedData();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    http.POST("{}");
    http.end();
  }
}

void sendLedData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/led-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    bool ledState = digitalRead(LED_BUILTIN);
    
    StaticJsonDocument<200> doc;
    doc["led_state"] = ledState;
    doc["brightness"] = 100;
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      Serial.printf("LED state sent: %s, Response: %d\\n", ledState ? "ON" : "OFF", httpResponseCode);
    }
    http.end();
  }
}`;
  };

  const generateGpsCode = (device: Device) => {
    return `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YourHotspotName";
const char* password = "YourHotspotPassword";

// Backend Configuration
const char* serverBase = "http://192.168.4.1:5000/api/devices";
const char* deviceId = "${device._id}";

unsigned long previousMillis = 0;
const long interval = 10000; // Send GPS data every 10 seconds

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    sendHeartbeat();
    sendGpsData();
  }
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    http.POST("{}");
    http.end();
  }
}

void sendGpsData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/gps-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    // Simulate GPS coordinates (replace with actual GPS reading)
    float latitude = 40.7128 + (random(-100, 100) / 10000.0);
    float longitude = -74.0060 + (random(-100, 100) / 10000.0);
    
    StaticJsonDocument<200> doc;
    doc["latitude"] = latitude;
    doc["longitude"] = longitude;
    doc["altitude"] = random(0, 100);
    doc["accuracy"] = random(1, 10);
    
    String requestBody;
    serializeJson(doc, requestBody);
    
    int httpResponseCode = http.POST(requestBody);
    if (httpResponseCode > 0) {
      Serial.printf("GPS sent: %.6f, %.6f, Response: %d\\n", latitude, longitude, httpResponseCode);
    }
    http.end();
  }
}`;
  };

  const handleLinkDevice = async () => {
    if (!widget || !selectedDevice || !selectedApi) {
      toast({
        title: "Error",
        description: "Please select both device and API",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      // Update widget with device information
      await workspaceService.updateWidget(widget._id, {
        deviceId: selectedDevice,
        dataPath: selectedApi
      });

      toast({
        title: "Success",
        description: "Device linked successfully!"
      });

      if (onDeviceLinked) {
        onDeviceLinked(widget._id, selectedDevice);
      }

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to link device",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeTemplate);
    toast({
      title: "Copied!",
      description: "Code template copied to clipboard"
    });
  };

  if (!widget) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Device to Widget</DialogTitle>
          <DialogDescription>
            Connect an IoT device to "{widget.title}" widget to receive real-time data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Selection */}
          <div className="space-y-3">
            <Label>Select IoT Device</Label>
            {loading ? (
              <div className="text-center py-4">Loading devices...</div>
            ) : devices.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No IoT devices found. Register an ESP32/ESP8266 device first.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {devices.map((device) => (
                  <Card 
                    key={device._id}
                    className={`cursor-pointer transition-colors ${
                      selectedDevice === device._id ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleDeviceSelect(device._id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            checked={selectedDevice === device._id}
                            onChange={() => handleDeviceSelect(device._id)}
                            className="rounded"
                          />
                          <div>
                            <div className="font-medium">{device.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                              {device.type}
                              {device.status === 'online' ? (
                                <Wifi className="h-3 w-3 text-green-500" />
                              ) : (
                                <WifiOff className="h-3 w-3 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </div>
                      {device.supported_apis && device.supported_apis.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Supports: {device.supported_apis.join(', ')}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* API Selection */}
          {selectedDevice && (
            <div className="space-y-3">
              <Label>Select API Endpoint</Label>
              <Select value={selectedApi} onValueChange={handleApiSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose the data type this widget will receive" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temperature-control">Temperature Control</SelectItem>
                  <SelectItem value="humidity-control">Humidity Control</SelectItem>
                  <SelectItem value="led-control">LED Control</SelectItem>
                  <SelectItem value="gps-control">GPS Control</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Code Template */}
          {codeTemplate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>ESP32 Code Template</Label>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={copyToClipboard}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCode(!showCode)}
                  >
                    <Code className="h-4 w-4 mr-1" />
                    {showCode ? 'Hide' : 'Show'} Code
                  </Button>
                </div>
              </div>
              
              {showCode && (
                <Card>
                  <CardContent className="p-4">
                    <Textarea
                      value={codeTemplate}
                      readOnly
                      className="min-h-[300px] font-mono text-xs"
                    />
                  </CardContent>
                </Card>
              )}
              
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Instructions:</p>
                      <ol className="list-decimal list-inside space-y-1 text-xs">
                        <li>Copy the code template above</li>
                        <li>Update WiFi credentials (ssid, password)</li>
                        <li>Change the server IP to your laptop's IP address</li>
                        <li>Upload to your ESP32 device</li>
                        <li>The widget will automatically receive data</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkDevice}
              disabled={!selectedDevice || !selectedApi || loading}
            >
              {loading ? "Linking..." : "Link Device"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeviceLinkingModal;