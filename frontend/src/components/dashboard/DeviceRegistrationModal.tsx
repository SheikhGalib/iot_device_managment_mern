import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { deviceApi } from "@/lib/deviceApi";
import { useToast } from "@/hooks/use-toast";

interface DeviceRegistrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeviceRegistered?: () => void;
}

const DeviceRegistrationModal: React.FC<DeviceRegistrationModalProps> = ({
  open,
  onOpenChange,
  onDeviceRegistered
}) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    ip_address: '',
    ssh_port: 22,
    ssh_username: '',
    ssh_password: '',
    mac_address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'form' | 'testing' | 'success'>('form');
  const [connectionResult, setConnectionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      ip_address: '',
      ssh_port: 22,
      ssh_username: '',
      ssh_password: '',
      mac_address: ''
    });
    setStep('form');
    setConnectionResult(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const required = ['name', 'type', 'ip_address', 'ssh_username', 'ssh_password', 'mac_address'];
    for (const field of required) {
      if (!formData[field as keyof typeof formData]) {
        toast({
          title: "Validation Error",
          description: `${field.replace('_', ' ')} is required`,
          variant: "destructive"
        });
        return false;
      }
    }

    // Validate IP address format
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(formData.ip_address)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid IP address",
        variant: "destructive"
      });
      return false;
    }

    // Validate MAC address format
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    if (!macRegex.test(formData.mac_address)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid MAC address (e.g., AA:BB:CC:DD:EE:FF)",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setStep('testing');

    try {
      const response = await deviceApi.registerDevice(formData);
      
      if (response.data.success) {
        setStep('success');
        setConnectionResult({
          success: true,
          message: 'Device registered and connected successfully!'
        });

        toast({
          title: "Success",
          description: "Device registered successfully",
        });

        // Call callback to refresh device list
        if (onDeviceRegistered) {
          onDeviceRegistered();
        }

        // Auto close after 2 seconds
        setTimeout(() => {
          onOpenChange(false);
          resetForm();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      setStep('form');
      setConnectionResult({
        success: false,
        message: error.message || 'Failed to register device'
      });

      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register device. Please check your connection details.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Register New Device
          </DialogTitle>
          <DialogDescription>
            Add a new edge device to your IoT management system. We'll test the connection during registration.
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {/* Device Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Device Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Raspberry Pi - Living Room"
                  disabled={isSubmitting}
                />
              </div>

              {/* Device Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Device Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Raspberry Pi">Raspberry Pi</SelectItem>
                    <SelectItem value="Orange Pi">Orange Pi</SelectItem>
                    <SelectItem value="Windows PC">Windows PC</SelectItem>
                    <SelectItem value="Linux Server">Linux Server</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* IP Address */}
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address *</Label>
                <Input
                  id="ip_address"
                  value={formData.ip_address}
                  onChange={(e) => handleInputChange('ip_address', e.target.value)}
                  placeholder="192.168.1.100"
                  disabled={isSubmitting}
                />
              </div>

              {/* SSH Port */}
              <div className="space-y-2">
                <Label htmlFor="ssh_port">SSH Port</Label>
                <Input
                  id="ssh_port"
                  type="number"
                  value={formData.ssh_port}
                  onChange={(e) => handleInputChange('ssh_port', parseInt(e.target.value))}
                  placeholder="22"
                  disabled={isSubmitting}
                />
              </div>

              {/* SSH Username */}
              <div className="space-y-2">
                <Label htmlFor="ssh_username">SSH Username *</Label>
                <Input
                  id="ssh_username"
                  value={formData.ssh_username}
                  onChange={(e) => handleInputChange('ssh_username', e.target.value)}
                  placeholder="pi"
                  disabled={isSubmitting}
                />
              </div>

              {/* SSH Password */}
              <div className="space-y-2">
                <Label htmlFor="ssh_password">SSH Password *</Label>
                <Input
                  id="ssh_password"
                  type="password"
                  value={formData.ssh_password}
                  onChange={(e) => handleInputChange('ssh_password', e.target.value)}
                  placeholder="Password"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* MAC Address */}
            <div className="space-y-2">
              <Label htmlFor="mac_address">MAC Address *</Label>
              <Input
                id="mac_address"
                value={formData.mac_address}
                onChange={(e) => handleInputChange('mac_address', e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                disabled={isSubmitting}
              />
            </div>

            {/* Connection Result */}
            {connectionResult && (
              <Card className={`border ${connectionResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    {connectionResult.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={`text-sm ${connectionResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {connectionResult.message}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  'Register Device'
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'testing' && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-medium mb-2">Testing Connection</h3>
            <p className="text-muted-foreground">
              We're establishing an SSH connection to verify your device credentials...
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <h3 className="text-lg font-medium mb-2">Device Registered Successfully!</h3>
            <p className="text-muted-foreground">
              {connectionResult?.message}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeviceRegistrationModal;