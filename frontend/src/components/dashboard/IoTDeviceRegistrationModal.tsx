import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, CheckCircle, AlertCircle, Copy, Code, Cpu, Wifi } from "lucide-react";
import { deviceApi } from "@/lib/deviceApi";
import { useToast } from "@/hooks/use-toast";

interface IoTDeviceRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceRegistered?: () => void;
}

const IoTDeviceRegistrationModal: React.FC<IoTDeviceRegistrationModalProps> = ({
  open,
  onOpenChange,
  onDeviceRegistered
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: 'ESP32',
    description: '',
    supported_apis: [] as string[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'success' | 'code'>('form');
  const [registeredDevice, setRegisteredDevice] = useState<any>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'ESP32',
      description: '',
      supported_apis: []
    });
    setStep('form');
    setRegisteredDevice(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Device name is required",
        variant: "destructive"
      });
      return false;
    }

    if (formData.supported_apis.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one supported API",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      console.log('Registering IoT device...');

      const deviceData = {
        ...formData,
        category: 'IoT' as const,
        device_key: `iot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // Generate unique key
        // Note: IoT devices don't need SSH credentials, IP address, etc.
        // These will be populated when the device connects via heartbeat
      };

      console.log('Registering IoT device with data:', deviceData);

      const response = await deviceApi.registerDevice(deviceData);
      console.log('Registration response:', response);

      if (response.data) {
        setRegisteredDevice(response.data);
        setStep('success');

        toast({
          title: "Success",
          description: "IoT device registered successfully!",
        });

        // Call callback to refresh device list
        if (onDeviceRegistered) {
          onDeviceRegistered();
        }
      }
    } catch (error: any) {
      console.error('Registration error:', error);

      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register IoT device. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateArduinoCode = () => {
    if (!registeredDevice) return '';

    return `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YourWiFiName";
const char* password = "YourWiFiPassword";

// Backend Configuration
const char* serverBase = "http://192.168.1.100:3001/api/devices";  // Change to your backend IP
const char* deviceId = "${registeredDevice._id}";

unsigned long previousMillis = 0;
const long interval = 5000; // Send data every 5 seconds

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println();
  Serial.println("WiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    sendHeartbeat();
    ${formData.supported_apis.includes('temperature-control') ? 'sendTemperatureData();' : ''}
    ${formData.supported_apis.includes('humidity-control') ? 'sendHumidityData();' : ''}
    ${formData.supported_apis.includes('led-control') ? 'sendLedData();' : ''}
    ${formData.supported_apis.includes('gps-control') ? 'sendGpsData();' : ''}
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

${formData.supported_apis.includes('temperature-control') ? `
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
}` : ''}

${formData.supported_apis.includes('humidity-control') ? `
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
}` : ''}

${formData.supported_apis.includes('led-control') ? `
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
}` : ''}

${formData.supported_apis.includes('gps-control') ? `
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
}` : ''}`;
  };

  const copyToClipboard = () => {
    const code = generateArduinoCode();
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Arduino code copied to clipboard"
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" />
            Register IoT Device
          </DialogTitle>
          <DialogDescription>
            Register a new IoT device (ESP32, ESP8266, Arduino) and get the code to connect it to your dashboard.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Device Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="ESP32 - Temperature Sensor"
                  disabled={isSubmitting}
                />
              </div>

              {/* Device Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Device Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESP32">ESP32</SelectItem>
                    <SelectItem value="ESP8266">ESP8266</SelectItem>
                    <SelectItem value="Arduino">Arduino Uno/Nano</SelectItem>
                    <SelectItem value="NodeMCU">NodeMCU</SelectItem>
                    <SelectItem value="Other">Other IoT Device</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Temperature and humidity sensor for greenhouse monitoring..."
                disabled={isSubmitting}
                rows={2}
              />
            </div>

            {/* Supported APIs */}
            <div className="space-y-3">
              <Label>Supported APIs *</Label>
              <p className="text-sm text-muted-foreground">
                Select the APIs this device will support. This determines what data it can send.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'temperature-control', name: 'Temperature Control', desc: 'Temperature sensor readings', icon: '🌡️' },
                  { key: 'humidity-control', name: 'Humidity Control', desc: 'Humidity sensor readings', icon: '💧' },
                  { key: 'led-control', name: 'LED Control', desc: 'LED state and brightness', icon: '💡' },
                  { key: 'gps-control', name: 'GPS Control', desc: 'GPS location data', icon: '📍' }
                ].map((api) => (
                  <Card 
                    key={api.key} 
                    className={`cursor-pointer transition-colors ${
                      formData.supported_apis.includes(api.key) ? 'bg-primary/5 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      const newApis = formData.supported_apis.includes(api.key)
                        ? formData.supported_apis.filter(a => a !== api.key)
                        : [...formData.supported_apis, api.key];
                      handleInputChange('supported_apis', newApis);
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.supported_apis.includes(api.key)}
                          onChange={() => {}} // Handled by card click
                          className="rounded"
                        />
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{api.icon}</span>
                          <div>
                            <div className="font-medium text-sm">{api.name}</div>
                            <div className="text-xs text-muted-foreground">{api.desc}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register IoT Device'
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'success' && (
          <div className="space-y-6">
            <div className="text-center py-6">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                  <Wifi className="h-6 w-6 text-blue-500 absolute -bottom-2 -right-2 bg-white rounded-full p-1" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">IoT Device Registered!</h3>
              <p className="text-muted-foreground mb-4">
                Your {formData.type} device "{formData.name}" has been registered successfully.
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm">
                  <strong>Device ID:</strong> {registeredDevice?._id}
                </div>
                <div className="text-sm mt-1">
                  <strong>Supported APIs:</strong> {formData.supported_apis.join(', ')}
                </div>
              </div>
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Code className="h-5 w-5" />
                  Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent className="text-blue-700 space-y-2">
                <p>1. Get the Arduino code for your device</p>
                <p>2. Update WiFi credentials and server IP</p>
                <p>3. Upload the code to your {formData.type}</p>
                <p>4. Your device will automatically connect and send data!</p>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={handleClose}>
                Finish
              </Button>
              <Button onClick={() => setStep('code')}>
                <Code className="h-4 w-4 mr-2" />
                Get Arduino Code
              </Button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Arduino Code</h3>
                <p className="text-sm text-muted-foreground">
                  Copy this code to your Arduino IDE and upload to your {formData.type}
                </p>
              </div>
              <Button onClick={copyToClipboard} size="sm">
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>

            <Card>
              <CardContent className="p-4">
                <Textarea
                  value={generateArduinoCode()}
                  readOnly
                  className="min-h-[400px] font-mono text-xs"
                />
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Update the WiFi credentials (ssid, password)</li>
                      <li>Change the server IP to your computer's IP address</li>
                      <li>Install required libraries: WiFi, HTTPClient, ArduinoJson</li>
                      <li>Make sure your device and computer are on the same network</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep('success')}>
                Back
              </Button>
              <Button onClick={handleClose}>
                Finish
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IoTDeviceRegistrationModal;