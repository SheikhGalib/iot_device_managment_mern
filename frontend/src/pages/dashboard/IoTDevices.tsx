import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { deviceApi, type Device } from "@/lib/deviceApi";
import { useToast } from "@/hooks/use-toast";
import IoTDeviceCard from "@/components/dashboard/IoTDeviceCard";
import IoTDeviceRegistrationModal from "@/components/dashboard/IoTDeviceRegistrationModal";

const IoTDevices = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await deviceApi.getDevices();
      // Filter for IoT devices only
      const iotDevices = response.data.devices.filter((device: Device) => device.category === 'IoT');
      setDevices(iotDevices);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load IoT devices",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDevices = devices.filter((device) =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">IoT Devices</h2>
          <p className="text-muted-foreground">Monitor your ESP32, Arduino, and custom IoT devices</p>
        </div>
        <Button onClick={() => setRegistrationModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add IoT Device
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search devices..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      {/* Devices Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading IoT devices...</span>
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔌</div>
          <h3 className="text-lg font-semibold mb-2">No IoT Devices Found</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? `No devices match "${searchQuery}". Try a different search term.`
              : "Get started by registering your first ESP32, Arduino, or other IoT device."
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setRegistrationModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Register Your First IoT Device
            </Button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map((device) => (
            <IoTDeviceCard key={device._id} device={device} />
          ))}
        </div>
      )}

      {/* IoT Device Registration Modal */}
      <IoTDeviceRegistrationModal
        open={registrationModalOpen}
        onOpenChange={setRegistrationModalOpen}
        onDeviceRegistered={loadDevices}
      />
    </div>
  );
};

export default IoTDevices;
