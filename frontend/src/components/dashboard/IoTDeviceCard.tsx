import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Thermometer, Droplets, Wind, Activity, ChevronRight } from "lucide-react";
import { IoTDevice } from "@/lib/mockData";
import { useNavigate } from "react-router-dom";

interface IoTDeviceCardProps {
  device: IoTDevice;
}

const IoTDeviceCard = ({ device }: IoTDeviceCardProps) => {
  const navigate = useNavigate();

  const getIcon = (metric: string) => {
    switch (metric) {
      case "temperature":
        return <Thermometer className="h-4 w-4 text-primary" />;
      case "humidity":
        return <Droplets className="h-4 w-4 text-primary" />;
      case "gas":
        return <Wind className="h-4 w-4 text-primary" />;
      case "moisture":
        return <Activity className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4 text-primary" />;
    }
  };

  const getUnit = (metric: string) => {
    switch (metric) {
      case "temperature":
        return "°C";
      case "humidity":
        return "%";
      case "gas":
        return "ppm";
      case "moisture":
        return "%";
      default:
        return "";
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/iot-device/${device.id}`)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold mb-1">{device.name}</h3>
          <p className="text-sm text-muted-foreground">{device.type}</p>
        </div>
        <Badge variant={device.status === "online" ? "default" : "destructive"}>
          {device.status}
        </Badge>
      </div>

      <div className="space-y-3">
        {Object.entries(device.metrics).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              {getIcon(key)}
              <span className="text-sm capitalize">{key}</span>
            </div>
            <span className="text-lg font-bold text-primary">
              {value}{getUnit(key)}
            </span>
          </div>
        ))}
      </div>

      <Button variant="outline" className="w-full mt-4">
        View Details
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};

export default IoTDeviceCard;
