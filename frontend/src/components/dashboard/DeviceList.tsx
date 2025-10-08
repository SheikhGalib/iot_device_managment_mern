import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Device } from "@/lib/deviceApi";
import { useNavigate } from "react-router-dom";

interface DeviceListProps {
  devices: Device[];
}

const DeviceList = ({ devices }: DeviceListProps) => {
  const navigate = useNavigate();

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Device Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>CPU</TableHead>
            <TableHead>RAM</TableHead>
            <TableHead>Temperature</TableHead>
            <TableHead>Deployment</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device._id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/dashboard/device/${device._id}`)}>
              <TableCell className="font-medium">{device.name}</TableCell>
              <TableCell>{device.type}</TableCell>
              <TableCell>
                <Badge variant={device.status === "online" ? "default" : "destructive"}>
                  {device.status}
                </Badge>
              </TableCell>
              <TableCell>{device.cpu_usage.toFixed(1)}%</TableCell>
              <TableCell>{device.ram_usage.toFixed(1)}%</TableCell>
              <TableCell>{device.temperature.toFixed(1)}°C</TableCell>
              <TableCell>
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
              </TableCell>
              <TableCell className="text-muted-foreground">{device.ip_address}:{device.ssh_port}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm">
                  Details
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DeviceList;
