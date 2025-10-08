import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LayoutGrid, List, Plus, Upload, Loader2 } from "lucide-react";
import { deviceApi, Device } from "@/lib/deviceApi";
import { socketService } from "@/lib/socketService";
import { getToken } from "@/lib/authApi";
import DeviceCard from "@/components/dashboard/DeviceCard";
import DeviceList from "@/components/dashboard/DeviceList";
import DeploymentModal from "@/components/dashboard/DeploymentModal";
import DeviceRegistrationModal from "@/components/dashboard/DeviceRegistrationModal";
import { useToast } from "@/hooks/use-toast";

const EdgeDevices = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "online" | "offline">("all");
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);
  const [isRegistrationModalOpen, setIsRegistrationModalOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20
  });
  const { toast } = useToast();

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
  }, []);

  // Load devices
  useEffect(() => {
    loadDevices();
  }, [searchQuery, filterStatus]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socketService.isConnected()) return;

    const handleDeviceUpdate = (data: any) => {
      setDevices(prev => prev.map(device => 
        device._id === data.deviceId 
          ? { ...device, ...data }
          : device
      ));
    };

    const handleDeviceStatus = (data: any) => {
      setDevices(prev => prev.map(device => 
        device._id === data.deviceId 
          ? { ...device, status: data.status }
          : device
      ));
    };

    const handleDeviceMetrics = (data: any) => {
      setDevices(prev => prev.map(device => 
        device._id === data.deviceId 
          ? { 
              ...device, 
              cpu_usage: data.cpu,
              ram_usage: data.ram,
              temperature: data.temperature 
            }
          : device
      ));
    };

    socketService.onDeviceUpdate(handleDeviceUpdate);
    socketService.onDeviceStatus(handleDeviceStatus);
    socketService.onDeviceMetrics(handleDeviceMetrics);

    return () => {
      socketService.off('device-update', handleDeviceUpdate);
      socketService.off('device-status', handleDeviceStatus);
      socketService.off('device-metrics', handleDeviceMetrics);
    };
  }, []);

  const loadDevices = async (page = 1) => {
    try {
      setIsLoading(true);
      
      const params: any = {
        page,
        limit: pagination.limit,
      };

      if (searchQuery) {
        params.search = searchQuery;
      }
      
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      const response = await deviceApi.getDevices(params);
      
      if (response.data.success) {
        setDevices(response.data.devices);
        setPagination(response.data.pagination);
      } else {
        toast({
          title: "Error",
          description: "Failed to load devices",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error loading devices:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load devices",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         device.ip_address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || device.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Edge Devices</h2>
          <p className="text-muted-foreground">Monitor and manage your edge computing devices</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsRegistrationModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
          <Button onClick={() => setIsDeploymentModalOpen(true)} variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Deploy Code
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              onClick={() => setFilterStatus("all")}
              size="sm"
            >
              All
            </Button>
            <Button
              variant={filterStatus === "online" ? "default" : "outline"}
              onClick={() => setFilterStatus("online")}
              size="sm"
            >
              Online
            </Button>
            <Button
              variant={filterStatus === "offline" ? "default" : "outline"}
              onClick={() => setFilterStatus("offline")}
              size="sm"
            >
              Offline
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading devices...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && devices.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium mb-2">No devices found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || filterStatus !== "all" 
              ? "Try adjusting your search or filter criteria."
              : "Get started by registering your first device."
            }
          </p>
          <Button onClick={() => setIsRegistrationModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Device
          </Button>
        </div>
      )}

      {/* Devices Display */}
      {!isLoading && filteredDevices.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDevices.map((device) => (
                <DeviceCard key={device._id} device={device} />
              ))}
            </div>
          ) : (
            <DeviceList devices={filteredDevices} />
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} devices
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadDevices(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadDevices(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <DeviceRegistrationModal
        open={isRegistrationModalOpen}
        onOpenChange={setIsRegistrationModalOpen}
        onDeviceRegistered={() => {
          loadDevices(1); // Refresh the device list
          setIsRegistrationModalOpen(false);
        }}
      />

      <DeploymentModal
        open={isDeploymentModalOpen}
        onOpenChange={setIsDeploymentModalOpen}
      />
    </div>
  );
};

export default EdgeDevices;
