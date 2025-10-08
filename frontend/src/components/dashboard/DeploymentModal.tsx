import { useState } from "react";
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
import { mockEdgeDevices } from "@/lib/mockData";
import { toast } from "sonner";

interface DeploymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DeploymentModal = ({ open, onOpenChange }: DeploymentModalProps) => {
  const navigate = useNavigate();
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [commands, setCommands] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleDeploy = () => {
    if (selectedDevices.length === 0) {
      toast.error("Please select at least one device");
      return;
    }
    toast.success(`Deploying to ${selectedDevices.length} device(s)`);
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
            Select devices and upload your code or provide custom commands
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Device Selection */}
          <div className="space-y-4">
            <Label>Select Devices</Label>
            <div className="grid grid-cols-2 gap-4">
              {mockEdgeDevices.map((device) => (
                <div key={device.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={device.id}
                    checked={selectedDevices.includes(device.id)}
                    onCheckedChange={() => handleDeviceToggle(device.id)}
                  />
                  <label
                    htmlFor={device.id}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {device.name}
                    <span className="text-muted-foreground ml-2">
                      ({device.mac})
                    </span>
                  </label>
                </div>
              ))}
            </div>
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
            <Button onClick={handleDeploy}>Deploy</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeploymentModal;
