import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload } from "lucide-react";
import { Device } from "@/lib/deviceApi";
import { toast } from "sonner";

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: Device[];
}

const DeploymentModal = ({ open, onOpenChange, devices }: DeploymentModalProps) => {
  const navigate = useNavigate();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [commands, setCommands] = useState("");
  const [file, setFile] = useState<File | null>(null);

  // Clear selections when modal opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedDevices([]);
      setCommands("");
      setFile(null);
    }
  }, [open]);

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSelectAll = () => {
    const onlineDeviceIds = devices
      .filter(device => device.status === 'online')
      .map(device => device._id);
    setSelectedDevices(onlineDeviceIds);
  };

  const handleSelectNone = () => {
    setSelectedDevices([]);
  };

  const onlineDevicesCount = devices.filter(device => device.status === 'online').length;
  const isAllSelected = onlineDevicesCount > 0 && selectedDevices.length === onlineDevicesCount;
  const hasSelections = selectedDevices.length > 0;

  const handleDeploy = () => {
    if (selectedDevices.length === 0) {
      toast.error("Please select at least one device");
      return;
    }
    
    if (!commands.trim() && !file) {
      toast.error("Please provide commands or upload a file");
      return;
    }

    // Get selected device names for toast message
    const selectedDeviceNames = devices
      .filter(device => selectedDevices.includes(device._id))
      .map(device => device.name);
    
    toast.success(`Deploying to ${selectedDeviceNames.length} device(s): ${selectedDeviceNames.join(', ')}`);
    onOpenChange(false);
    setSelectedDevices([]);
    setCommands("");
    setFile(null);
    
    // Redirect to deployments page to track progress
    navigate("/dashboard/deployments");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deploy Code to Edge Devices</DialogTitle>
          <DialogDescription>
            Select edge devices and upload your code or provide custom commands to deploy
            {devices.length > 0 ? ` (${devices.length} device${devices.length === 1 ? '' : 's'} available)` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Select Devices</Label>
              {devices.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isAllSelected || (!isAllSelected && hasSelections) ? handleSelectNone : handleSelectAll}
                    disabled={onlineDevicesCount === 0}
                  >
                    {isAllSelected 
                      ? 'Deselect All' 
                      : hasSelections 
                        ? 'Clear Selection' 
                        : `Select All Online (${onlineDevicesCount})`
                    }
                  </Button>
                </div>
              )}
            </div>
            {devices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No edge devices found.</p>
                <p className="text-xs mt-1">Register edge devices first to deploy code.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {devices.map((device) => (
                  <div key={device._id} className="flex items-center space-x-2">
                    <Checkbox
                      id={device._id}
                      checked={selectedDevices.includes(device._id)}
                      onCheckedChange={() => handleDeviceToggle(device._id)}
                      disabled={device.status !== 'online'}
                    />
                    <label
                      htmlFor={device._id}
                      className={`text-sm flex-1 ${
                        device.status === 'online' ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                        {device.name}
                        {device.status !== 'online' && (
                          <span className="text-xs text-muted-foreground ml-1">(offline)</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {device.type} • {device.ip_address || 'No IP'}
                        {device.mac_address && (
                          <span className="ml-1">• {device.mac_address}</span>
                        )}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
            {devices.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {selectedDevices.length} of {onlineDevicesCount} online devices selected
                {devices.length - onlineDevicesCount > 0 && (
                  <span className="ml-2">• {devices.length - onlineDevicesCount} offline devices unavailable</span>
                )}
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload Code (ZIP or Script)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".zip,.py,.sh,.js"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : "Click to upload or drag and drop"}
                </p>
              </label>
            </div>
          </div>

          {/* Custom Commands */}
          <div className="space-y-2">
            <Label htmlFor="commands">Custom Commands</Label>
            <Textarea
              id="commands"
              placeholder="Enter commands to execute (one per line)..."
              value={commands}
              onChange={(e) => setCommands(e.target.value)}
              rows={6}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeploy}
              disabled={devices.length === 0 || selectedDevices.length === 0}
            >
              Deploy {selectedDevices.length > 0 && `(${selectedDevices.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeploymentModal;
