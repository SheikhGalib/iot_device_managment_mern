import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Lightbulb, MapPin, Wifi, WifiOff, ChevronRight, Activity } from "lucide-react";
import { Device } from "@/lib/deviceApi";
import { useNavigate } from "react-router-dom";

interface IoTDeviceCardProps {
  device: Device;
}

const IoTDeviceCard = ({ device }: IoTDeviceCardProps) => {
  const navigate = useNavigate();

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

      {/* Last seen */}
      <div className="mt-4 text-xs text-muted-foreground">
        Last seen: {new Date(device.last_seen).toLocaleDateString()} {new Date(device.last_seen).toLocaleTimeString()}
      </div>

      <Button variant="outline" className="w-full mt-4">
        View Details
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};

export default IoTDeviceCard;
