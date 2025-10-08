import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Thermometer, Droplets, Wind, Activity, Video } from "lucide-react";
import { mockIoTDevices } from "@/lib/mockData";

const IoTDeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const device = mockIoTDevices.find((d) => d.id === id);

  if (!device) {
    return <div className="p-6">Device not found</div>;
  }

  const getIcon = (metric: string) => {
    switch (metric) {
      case "temperature":
        return Thermometer;
      case "humidity":
        return Droplets;
      case "gas":
        return Wind;
      case "moisture":
        return Activity;
      default:
        return Activity;
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
              {device.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{device.type}</p>
        </div>
      </div>

      {/* Data Metrics Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(device.metrics).map(([key, value]) => {
          const Icon = getIcon(key);
          return (
            <Card key={key} className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold capitalize">{key}</h3>
              </div>
              <div className="text-4xl font-bold text-primary">
                {value}{getUnit(key)}
              </div>
            </Card>
          );
        })}

        {/* Camera Feed Placeholder */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Camera Feed</h3>
          </div>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-2" />
              <p>Camera feed placeholder</p>
              <p className="text-sm">Live feed would appear here</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Device Information</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Device Type:</span>
            <span className="ml-2 font-medium">{device.type}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <span className="ml-2 font-medium capitalize">{device.status}</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IoTDeviceDetail;
