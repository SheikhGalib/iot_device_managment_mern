#include <WiFi.h>
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
const char *deviceKey = "device_221d491a20eb4605b518d8382ac380fb";

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
  Serial.println("\nWiFi Connected!");
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
    sendLedData();\n    delay(500);\n    sendTemperatureData();\n    delay(500);\n    sendHumidityData();\n    delay(500);\n    sendGpsData();
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
    Serial.printf("Heartbeat: %d\n", httpResponseCode);
    http.end();
  }
}


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
    Serial.printf("Temperature sent: %.1f°C, Response: %d\n", temperature, httpResponseCode);
    http.end();
  }
}


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
    Serial.printf("Humidity sent: %.1f%%, Response: %d\n", humidity, httpResponseCode);
    http.end();
  }
}


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
    Serial.printf("LED sent: %s, Response: %d\n", ledState ? "ON" : "OFF", httpResponseCode);
    http.end();
  }
}


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
    Serial.printf("GPS sent: %.6f, %.6f, Response: %d\n", latitude, longitude, httpResponseCode);
    http.end();
  }
}