import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Lightbulb, MapPin, Wifi, WifiOff, ChevronRight, Activity, Copy, Code } from "lucide-react";
import { Device } from "@/lib/deviceApi";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface IoTDeviceCardProps {
  device: Device;
}

const IoTDeviceCard = ({ device }: IoTDeviceCardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const copyDeviceKey = () => {
    navigator.clipboard.writeText(device.device_key);
    toast({
      title: "Copied!",
      description: "Device key copied to clipboard",
    });
  };

  const generateArduinoCode = () => {
    // Get the LED code template
    const arduinoTemplate = `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define LED_BUILTIN 2 // Define manually for ESP32

// WiFi Configuration
const char *ssid = "YOUR_WIFI_SSID";
const char *password = "YOUR_WIFI_PASSWORD";

// Backend Configuration
const char *serverBase = "http://192.168.137.1:3001/api/devices";
const char *deviceKey = "${device.device_key}"; // Use device_key

unsigned long previousMillis = 0;
const long interval = 10000; // Send data every 10 seconds

unsigned long ledPreviousMillis = 0;
const long ledInterval = 2000; // Toggle LED every 2 seconds
bool ledState = false;

void setup()
{
    pinMode(LED_BUILTIN, OUTPUT);
    Serial.begin(115200);

    WiFi.begin(ssid, password);
    Serial.println("Connecting to WiFi...");
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(1000);
        Serial.print(".");
    }
    Serial.println("\\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
}

void loop()
{
    unsigned long currentMillis = millis();
        
    // Toggle LED every 2 seconds
    if (currentMillis - ledPreviousMillis >= ledInterval)
    {
        ledPreviousMillis = currentMillis;
        ledState = !ledState;
        digitalWrite(LED_BUILTIN, ledState ? HIGH : LOW);
        Serial.printf("LED %s\\n", ledState ? "ON" : "OFF");
    }

    
    if (currentMillis - previousMillis >= interval)
    {
        previousMillis = currentMillis;

        // Send heartbeat and LED data with a small delay between them
        sendHeartbeat();
        delay(1000); // 1 second delay between requests
        sendLedData();
    }
}

void sendHeartbeat()
{
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceKey + "/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    
    http.POST("{}");
    http.end();
  }
}

void sendLedData()
{
    if (WiFi.status() == WL_CONNECTED)
    {
        HTTPClient http;
        String url = String(serverBase) + "/" + deviceKey + "/led-control"; 
        http.begin(url);
        http.addHeader("Content-Type", "application/json");

        bool ledState = digitalRead(LED_BUILTIN);

        JsonDocument doc;
        doc["led_state"] = ledState;
        doc["brightness"] = 100;

        String requestBody;
        serializeJson(doc, requestBody);

        int httpResponseCode = http.POST(requestBody);
        if (httpResponseCode > 0)
        {
            String response = http.getString();
            Serial.printf("LED state sent: %s, Response: %d - %s\\n", ledState ? "ON" : "OFF", httpResponseCode, response.c_str());
        }
        else
        {
            Serial.printf("Error sending LED state: %d\\n", httpResponseCode);
        }
        http.end();
    }
}`;

    navigator.clipboard.writeText(arduinoTemplate);
    toast({
      title: "Code Copied!",
      description: "Arduino code with your device key copied to clipboard",
    });
  };

  const getApiIcon = (api: string) => {
    switch (api) {
      case "temperature-control":
        return <Thermometer className="h-4 w-4 text-red-500" />;
      case "humidity-control":
        return <Droplets className="h-4 w-4 text-blue-500" />;
      case "led-control":
        return <Lightbulb className="h-4 w-4 text-yellow-500" />;
      case "gps-control":
        return <MapPin className="h-4 w-4 text-purple-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getDataValue = (key: string) => {
    if (!device.current_data) return null;
    
    switch (key) {
      case "temperature-control":
        return device.current_data.temperature ? `${device.current_data.temperature}°C` : null;
      case "humidity-control":
        return device.current_data.humidity ? `${device.current_data.humidity}%` : null;
      case "led-control":
        return device.current_data.led_state !== undefined ? 
          (device.current_data.led_state ? 'ON' : 'OFF') : null;
      case "gps-control":
        return (device.current_data.latitude && device.current_data.longitude) ? 
          `${device.current_data.latitude.toFixed(4)}, ${device.current_data.longitude.toFixed(4)}` : null;
      default:
        return null;
    }
  };

  const getApiName = (api: string) => {
    switch (api) {
      case "temperature-control":
        return "Temperature";
      case "humidity-control":
        return "Humidity";
      case "led-control":
        return "LED Control";
      case "gps-control":
        return "GPS";
      default:
        return api;
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/iot-device/${device._id}`)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{device.name}</h3>
          <p className="text-sm text-muted-foreground">{device.type}</p>
        </div>
        <div className="flex items-center gap-2">
          {device.status === "online" ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-400" />
          )}
          <Badge variant={device.status === "online" ? "default" : "destructive"}>
            {device.status}
          </Badge>
        </div>
      </div>

      {/* Supported APIs */}
      {device.supported_apis && device.supported_apis.length > 0 && (
        <div className="space-y-3">
          {device.supported_apis.map((api) => {
            const dataValue = getDataValue(api);
            return (
              <div key={api} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getApiIcon(api)}
                  <span className="text-sm">{getApiName(api)}</span>
                </div>
                <span className="text-sm font-medium text-primary">
                  {dataValue || '--'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Device Key */}
      <div className="mt-4 p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Device Key:</span>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); copyDeviceKey(); }}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>
        <code className="text-xs font-mono text-primary break-all">
          {device.device_key}
        </code>
      </div>

      {/* Last seen */}
      <div className="mt-4 text-xs text-muted-foreground">
        Last seen: {new Date(device.last_seen).toLocaleDateString()} {new Date(device.last_seen).toLocaleTimeString()}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); generateArduinoCode(); }}>
          <Code className="mr-2 h-4 w-4" />
          Copy Code
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => navigate(`/dashboard/iot-device/${device._id}`)}>
          View Details
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default IoTDeviceCard;
