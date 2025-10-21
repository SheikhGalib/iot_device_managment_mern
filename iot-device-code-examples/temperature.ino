#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---- WiFi ----
const char* ssid = "YourHotspotName";
const char* password = "YourHotspotPassword";

// ---- Backend ----
const char* serverBase = "http://192.168.4.1:5000/api/devices";  // change IP to your laptop IP
const char* deviceId = "68f79d8598b623a98b7ba061"; // your registered device _id

unsigned long previousMillis = 0;
const long heartbeatInterval = 5000; // 5 seconds

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.println("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= heartbeatInterval) {
    previousMillis = currentMillis;

    sendHeartbeat();
    // DO YOUR CODING
    // temperature_function();
    // sendData();
  }
}

void temperature_function()
{
    // Simulate temperature reading from sensor
    int temperature = random(20, 40);
    Serial.printf("Current Temperature: %d Celsius\n", temperature);   
}

void sendHeartbeat() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/heartbeat";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST("{}");

    if (httpResponseCode > 0) {
      Serial.printf("Heartbeat sent! Response: %d\n", httpResponseCode);
    } else {
      Serial.printf("Error sending heartbeat: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  }
}

void sendData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    String url = String(serverBase) + "/" + deviceId + "/temperature-control";
    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<200> doc;
    // Update with actual temperature reading
    doc["temperature"] = random(20, 40);
    doc["unit"] = "Celsius";

    String requestBody;
    serializeJson(doc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      Serial.printf("Temperature sent! Response: %d\n", httpResponseCode);
    } else {
      Serial.printf("Error sending temperature: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  }
}
