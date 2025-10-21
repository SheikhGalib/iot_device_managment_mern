import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useToast } from '../../hooks/use-toast';
import { type Widget, type WidgetUpdate } from '../../lib/workspaceApi';

interface WidgetSettingsModalProps {
  widget: Widget;
  open: boolean;
  onClose: () => void;
  onSave: (widgetId: string, updates: WidgetUpdate) => Promise<void>;
}

const widgetTypeOptions = [
  { value: 'temperature', label: 'Temperature Sensor' },
  { value: 'humidity', label: 'Humidity Sensor' },
  { value: 'led', label: 'LED Control' },
  { value: 'gps', label: 'GPS Location' },
  { value: 'camera', label: 'Camera Feed' },
  { value: 'chart', label: 'Data Chart' },
  { value: 'gauge', label: 'Gauge Display' },
  { value: 'text', label: 'Text Display' },
  { value: 'custom', label: 'Custom Widget' }
];

const formatOptions = [
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Text' },
  { value: 'boolean', label: 'Boolean (On/Off)' },
  { value: 'json', label: 'JSON Object' }
];

export function WidgetSettingsModal({ widget, open, onClose, onSave }: WidgetSettingsModalProps) {
  const [formData, setFormData] = useState<WidgetUpdate>({});
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (widget) {
      setFormData({
        title: widget.title,
        settings: { ...widget.settings },
        layout: { ...widget.layout },
        deviceId: widget.deviceId,
        dataPath: widget.dataPath,
        isActive: widget.isActive
      });
    }
  }, [widget]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (!formData.title?.trim()) {
        toast({
          title: 'Error',
          description: 'Widget title is required',
          variant: 'destructive'
        });
        return;
      }

      await onSave(widget._id, formData);
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save widget settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }));
  };

  const updateLayout = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: value
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Widget Settings</DialogTitle>
          <DialogDescription>
            Configure the widget properties, appearance, and data source.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
            <TabsTrigger value="data">Data</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter widget title"
              />
            </div>

            <div>
              <Label htmlFor="type">Widget Type</Label>
              <Select
                value={widget.type}
                disabled // Type cannot be changed after creation
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {widgetTypeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Widget type cannot be changed after creation
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive !== false}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
              <p className="text-xs text-muted-foreground">
                Inactive widgets will not receive data updates
              </p>
            </div>
          </TabsContent>

          <TabsContent value="display" className="space-y-4">
            <div>
              <Label htmlFor="format">Data Format</Label>
              <Select
                value={formData.settings?.format || 'number'}
                onValueChange={(value) => updateSettings('format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formatOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.settings?.format === 'number' && (
              <>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={formData.settings?.unit || ''}
                    onChange={(e) => updateSettings('unit', e.target.value)}
                    placeholder="e.g., °C, %, V"
                  />
                </div>

                <div>
                  <Label htmlFor="precision">Decimal Places</Label>
                  <Input
                    id="precision"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.settings?.precision || 2}
                    onChange={(e) => updateSettings('precision', parseInt(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minValue">Min Value</Label>
                    <Input
                      id="minValue"
                      type="number"
                      value={formData.settings?.minValue || ''}
                      onChange={(e) => updateSettings('minValue', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Min value"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxValue">Max Value</Label>
                    <Input
                      id="maxValue"
                      type="number"
                      value={formData.settings?.maxValue || ''}
                      onChange={(e) => updateSettings('maxValue', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder="Max value"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <Label>Thresholds</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <Label htmlFor="warningThreshold">Warning</Label>
                      <Input
                        id="warningThreshold"
                        type="number"
                        value={formData.settings?.thresholds?.warning || ''}
                        onChange={(e) => updateSettings('thresholds', {
                          ...formData.settings?.thresholds,
                          warning: e.target.value ? parseFloat(e.target.value) : null
                        })}
                        placeholder="Warning threshold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="criticalThreshold">Critical</Label>
                      <Input
                        id="criticalThreshold"
                        type="number"
                        value={formData.settings?.thresholds?.critical || ''}
                        onChange={(e) => updateSettings('thresholds', {
                          ...formData.settings?.thresholds,
                          critical: e.target.value ? parseFloat(e.target.value) : null
                        })}
                        placeholder="Critical threshold"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="color">Widget Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.settings?.color || '#3b82f6'}
                  onChange={(e) => updateSettings('color', e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={formData.settings?.color || '#3b82f6'}
                  onChange={(e) => updateSettings('color', e.target.value)}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="refreshInterval">Refresh Interval (ms)</Label>
              <Input
                id="refreshInterval"
                type="number"
                min="1000"
                max="300000"
                step="1000"
                value={formData.settings?.refreshInterval || 5000}
                onChange={(e) => updateSettings('refreshInterval', parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How often to update the widget data (1000ms = 1 second)
              </p>
            </div>

            {widget.type === 'chart' && (
              <>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showHistory"
                    checked={formData.settings?.showHistory !== false}
                    onCheckedChange={(checked) => updateSettings('showHistory', checked)}
                  />
                  <Label htmlFor="showHistory">Show Historical Data</Label>
                </div>

                {formData.settings?.showHistory && (
                  <div>
                    <Label htmlFor="historyDuration">History Duration (seconds)</Label>
                    <Input
                      id="historyDuration"
                      type="number"
                      min="3600"
                      max="86400"
                      step="3600"
                      value={formData.settings?.historyDuration || 3600}
                      onChange={(e) => updateSettings('historyDuration', parseInt(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      3600 = 1 hour, 86400 = 24 hours
                    </p>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="layout" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width (grid units)</Label>
                <Input
                  id="width"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.layout?.w || 3}
                  onChange={(e) => updateLayout('w', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="height">Height (grid units)</Label>
                <Input
                  id="height"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.layout?.h || 4}
                  onChange={(e) => updateLayout('h', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minW">Min Width</Label>
                <Input
                  id="minW"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.layout?.minW || 1}
                  onChange={(e) => updateLayout('minW', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="minH">Min Height</Label>
                <Input
                  id="minH"
                  type="number"
                  min="1"
                  max="20"
                  value={formData.layout?.minH || 1}
                  onChange={(e) => updateLayout('minH', parseInt(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxW">Max Width</Label>
                <Input
                  id="maxW"
                  type="number"
                  min="1"
                  max="12"
                  value={formData.layout?.maxW || 12}
                  onChange={(e) => updateLayout('maxW', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="maxH">Max Height</Label>
                <Input
                  id="maxH"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.layout?.maxH || 20}
                  onChange={(e) => updateLayout('maxH', parseInt(e.target.value))}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDraggable"
                  checked={formData.layout?.isDraggable !== false}
                  onCheckedChange={(checked) => updateLayout('isDraggable', checked)}
                />
                <Label htmlFor="isDraggable">Draggable</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isResizable"
                  checked={formData.layout?.isResizable !== false}
                  onCheckedChange={(checked) => updateLayout('isResizable', checked)}
                />
                <Label htmlFor="isResizable">Resizable</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="static"
                  checked={formData.layout?.static === true}
                  onCheckedChange={(checked) => updateLayout('static', checked)}
                />
                <Label htmlFor="static">Static (locked position)</Label>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <div>
              <Label htmlFor="sensorKey">Sensor Key</Label>
              <Input
                id="sensorKey"
                value={formData.settings?.sensorKey || ''}
                onChange={(e) => updateSettings('sensorKey', e.target.value)}
                placeholder="e.g., temperature, humidity, status"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The key used to identify this sensor in device data
              </p>
            </div>

            <div>
              <Label htmlFor="dataPath">Data Path</Label>
              <Input
                id="dataPath"
                value={formData.dataPath || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, dataPath: e.target.value }))}
                placeholder="e.g., sensors.temperature, status.led1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Path to the data in device telemetry messages
              </p>
            </div>

            <div>
              <Label htmlFor="deviceId">Device</Label>
              <Input
                id="deviceId"
                value={formData.deviceId || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, deviceId: e.target.value }))}
                placeholder="Select or enter device ID"
                disabled // TODO: Implement device selector
              />
              <p className="text-xs text-muted-foreground mt-1">
                The device that provides data for this widget
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Current Configuration</h4>
              <div className="space-y-1 text-sm">
                <div><span className="font-medium">Type:</span> {widget.type}</div>
                <div><span className="font-medium">Format:</span> {formData.settings?.format || 'number'}</div>
                <div><span className="font-medium">Sensor Key:</span> {formData.settings?.sensorKey || 'Not set'}</div>
                <div><span className="font-medium">Data Path:</span> {formData.dataPath || 'Not set'}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}