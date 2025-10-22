import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wifi, WifiOff, Loader2, Activity } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { deviceApi, Device } from "@/lib/deviceApi";
import { socketService } from "@/lib/socketService";
import { getToken, getUser } from "@/lib/authApi";
import TerminalComponent from "@/components/dashboard/TerminalComponent";
import FileManagerComponent from "@/components/dashboard/FileManagerComponent";
import { useToast } from "@/hooks/use-toast";

const DeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [device, setDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [realtimeMetrics, setRealtimeMetrics] = useState({
    cpu: 0,
    ram: 0,
    temperature: 0
  });

  // Initialize socket connection
  useEffect(() => {
    const initSocket = async () => {
      const token = getToken();
      if (token && !socketService.isConnected()) {
        try {
          await socketService.connect(token);
        } catch (error) {
          console.error('Failed to connect to socket:', error);
        }
      }
    };

    initSocket();

    return () => {
      if (id) {
        socketService.leaveDeviceRoom(id);
      }
    };
  }, [id]);

  // Load device data
  useEffect(() => {
    const loadDevice = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await deviceApi.getDevice(id);
        
        if ((response as any).success) {
          setDevice((response as any).data);
          setRealtimeMetrics({
            cpu: (response as any).data.cpu_usage,
            ram: (response as any).data.ram_usage,
            temperature: (response as any).data.temperature
          });
          setIsConnected((response as any).data.status === 'online');
          
          // Join device room for real-time updates
          if (socketService.isConnected()) {
            socketService.joinDeviceRoom(id);
          }
        } else {
          toast({
            title: "Error",
            description: "Failed to load device details",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error('Error loading device:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to load device details",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDevice();
  }, [id, toast]);

  // Socket event listeners
  useEffect(() => {
    if (!socketService.isConnected() || !device) return;

    const handleDeviceMetrics = (data: any) => {
      if (data.deviceId === device._id) {
        setRealtimeMetrics({
          cpu: data.cpu,
          ram: data.ram,
          temperature: data.temperature
        });
      }
    };

    const handleDeviceStatus = (data: any) => {
      if (data.deviceId === device._id) {
        setIsConnected(data.status === 'online');
      }
    };

    socketService.onDeviceMetrics(handleDeviceMetrics);
    socketService.onDeviceStatus(handleDeviceStatus);

    return () => {
      socketService.off('device-metrics', handleDeviceMetrics);
      socketService.off('device-status', handleDeviceStatus);
    };
  }, [device]);

  const connectToDevice = async () => {
    if (!device) return;

    try {
      setIsConnecting(true);
      const response = await deviceApi.connectToDevice(device._id);
      
      if ((response as any).success) {
        setIsConnected(true);
        toast({
          title: "Success",
          description: "Connected to device successfully",
        });
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to device",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading device details...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Device Not Found</h2>
          <p className="text-muted-foreground mb-4">The device you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/dashboard/edge-devices")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Edge Devices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/edge-devices")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-3xl font-bold">{device.name}</h2>
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Offline
                </>
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <span>{device.type}</span>
            <span>•</span>
            <span>{device.ip_address}:{device.ssh_port}</span>
            <span>•</span>
            <span>MAC: {device.mac_address}</span>
          </div>
        </div>
        
        {!isConnected && (
          <Button
            onClick={connectToDevice}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Connect
          </Button>
        )}
      </div>

      {/* Two Panel Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* File Manager */}
        <FileManagerComponent
          deviceId={device._id}
          deviceName={device.name}
          isConnected={isConnected}
        />

        {/* Terminal */}
        <TerminalComponent
          deviceId={device._id}
          deviceName={device.name}
          isConnected={isConnected}
        />
      </div>

      {/* Device Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Device Health Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-2xl font-bold text-primary">{realtimeMetrics.cpu.toFixed(1)}%</span>
              </div>
              <Progress value={realtimeMetrics.cpu} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">RAM Usage</span>
                <span className="text-2xl font-bold text-primary">{realtimeMetrics.ram.toFixed(1)}%</span>
              </div>
              <Progress value={realtimeMetrics.ram} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Temperature</span>
                <span className="text-2xl font-bold text-primary">{realtimeMetrics.temperature.toFixed(1)}°C</span>
              </div>
              <Progress value={(realtimeMetrics.temperature / 100) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Device Information */}
      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Last Seen</span>
                <p className="text-sm">{new Date(device.last_seen).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Active Sessions</span>
                <p className="text-sm">{device.active_sessions}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Deployment Status</span>
                <Badge variant={device.deployment_status === 'running' ? 'default' : 
                              device.deployment_status === 'error' ? 'destructive' : 'secondary'}>
                  {device.deployment_status}
                </Badge>
              </div>
            </div>
            
            {device.metadata && (
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Operating System</span>
                  <p className="text-sm">{device.metadata.os || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Architecture</span>
                  <p className="text-sm">{device.metadata.architecture || 'Unknown'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Total Memory</span>
                  <p className="text-sm">{device.metadata.total_memory || 'Unknown'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceDetail;
