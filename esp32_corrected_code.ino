#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* ssid = "YourHotspotName";
const char* password = "YourHotspotPassword";

// Backend Configuration
const char* serverBase = "http://192.168.4.1:5000/api/devices";
const char* deviceId = "68f8040b0689b254720691b0";

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
  Serial.println("\nWiFi Connected!");
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
      Serial.printf("LED state sent: %s, Response: %d\n", ledState ? "ON" : "OFF", httpResponseCode);
    }
    http.end();
  }
}