import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { mockIoTDevices } from "@/lib/mockData";
import IoTDeviceCard from "@/components/dashboard/IoTDeviceCard";

const IoTDevices = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDevices = mockIoTDevices.filter((device) =>
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Device
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
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDevices.map((device) => (
          <IoTDeviceCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
};

export default IoTDevices;
