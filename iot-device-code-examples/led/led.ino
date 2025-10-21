#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#define LED_BUILTIN 2 // Define manually for ESP32

// WiFi Configuration
const char *ssid = "temp_network";
const char *password = "12345678";

// Backend Configuration
const char *serverBase = "http://192.168.137.1:3001/api/devices";
const char *deviceKey = "device_eaffce0945934a84a3a506d17e23656b"; // Use device_key

unsigned long previousMillis = 0;
const long interval = 10000; // Send data every 10 seconds (reduced frequency)

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
    Serial.println("\nWiFi Connected!");
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
        Serial.printf("LED %s\n", ledState ? "ON" : "OFF");
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
    if (WiFi.status() == WL_CONNECTED)
    {
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
            Serial.printf("LED state sent: %s, Response: %d - %s\n", ledState ? "ON" : "OFF", httpResponseCode, response.c_str());
        }
        else
        {
            Serial.printf("Error sending LED state: %d\n", httpResponseCode);
        }
        http.end();
    }
}
