import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Cpu, HardDrive, Thermometer, ChevronRight } from "lucide-react";
import { Device } from "@/lib/deviceApi";
import { useNavigate } from "react-router-dom";

interface DeviceCardProps {
  device: Device;
}

const DeviceCard = ({ device }: DeviceCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="relative p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/device/${device._id}`)}>
      {/* API Status Indicator */}
      <div className="absolute top-3 left-3">
        <div className={`w-3 h-3 rounded-full ${
          device.api_status === 'connected' 
            ? 'bg-green-500' 
            : device.api_status === 'error'
            ? 'bg-red-500'
            : 'bg-orange-500'
        }`} title={`API Status: ${device.api_status || 'not-connected'}`} />
      </div>

      <div className="flex items-start justify-between mb-4 ml-6">
        <div>
          <h3 className="text-lg font-semibold mb-1">{device.name}</h3>
          <p className="text-sm text-muted-foreground">{device.type}</p>
          {device.api_status && (
            <p className="text-xs text-muted-foreground">
              API: {device.api_status.replace('-', ' ')}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={device.status === "online" ? "default" : "destructive"}>
            {device.status}
          </Badge>
          <Badge
            variant={
              device.deployment_status === "running"
                ? "default"
                : device.deployment_status === "error"
                ? "destructive"
                : "secondary"
            }
          >
            {device.deployment_status}
          </Badge>
        </div>
      </div>

      <div className="text-xs text-muted-foreground mb-4">
        <p>MAC: {device.mac_address}</p>
        <p>IP: {device.ip_address}:{device.ssh_port}</p>
        <p>Last seen: {new Date(device.last_seen).toLocaleDateString()}</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span>CPU</span>
            </div>
            <span className="font-medium">{device.cpu_usage.toFixed(1)}%</span>
          </div>
          <Progress value={device.cpu_usage} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              <span>RAM</span>
            </div>
            <span className="font-medium">{device.ram_usage.toFixed(1)}%</span>
          </div>
          <Progress value={device.ram_usage} />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            <span>Temperature</span>
          </div>
          <span className="font-medium">{device.temperature.toFixed(1)}°C</span>
        </div>
      </div>

      <Button variant="outline" className="w-full mt-4">
        View Details
        <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
};

export default DeviceCard;
