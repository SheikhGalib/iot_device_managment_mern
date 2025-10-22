import React, { useState } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Lightbulb, 
  MapPin, 
  Camera, 
  BarChart3, 
  Gauge, 
  Type,
  Puzzle,
  Settings,
  Copy,
  Trash2,
  MoreVertical,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Link,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';
import { type Widget } from '../../lib/workspaceApi';
import { useDeviceData } from '../../hooks/useDeviceData';

interface WidgetCardProps {
  widget: Widget;
  onEdit: (widget: Widget) => void;
  onDuplicate: (widget: Widget) => void;
  onDelete: (widget: Widget) => void;
  onLinkDevice: (widget: Widget) => void;
  isEditing?: boolean;
}

const getWidgetIcon = (type: Widget['type']) => {
  const iconMap = {
    temperature: Thermometer,
    humidity: Droplets,
    led: Lightbulb,
    gps: MapPin,
    camera: Camera,
    chart: BarChart3,
    gauge: Gauge,
    text: Type,
    custom: Puzzle
  };
  
  return iconMap[type] || Puzzle;
};

const getWidgetColor = (type: Widget['type']) => {
  const colorMap = {
    temperature: '#ef4444',
    humidity: '#3b82f6',
    led: '#22c55e',
    gps: '#8b5cf6',
    camera: '#f59e0b',
    chart: '#06b6d4',
    gauge: '#ec4899',
    text: '#6b7280',
    custom: '#84cc16'
  };
  
  return colorMap[type] || '#84cc16';
};

const formatValue = (value: any, widget: Widget): string => {
  if (value === null || value === undefined) return '--';
  
  const { format, precision = 2, unit = '' } = widget.settings;
  
  switch (format) {
    case 'number':
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return '--';
      return `${num.toFixed(precision)}${unit ? ` ${unit}` : ''}`;
      
    case 'boolean':
      return value ? 'ON' : 'OFF';
      
    case 'json':
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
      
    default:
      return String(value);
  }
};

const getStatusColor = (widget: Widget, value: any) => {
  if (value === null || value === undefined) return 'text-muted-foreground';
  
  const { thresholds, format } = widget.settings;
  
  if (format === 'boolean') {
    return value ? 'text-green-500' : 'text-red-500';
  }
  
  if (format === 'number' && thresholds) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      if (thresholds.critical !== undefined && num >= thresholds.critical) {
        return 'text-red-500';
      }
      if (thresholds.warning !== undefined && num >= thresholds.warning) {
        return 'text-yellow-500';
      }
      return 'text-green-500';
    }
  }
  
  return 'text-foreground';
};

const getStatusIcon = (widget: Widget, value: any) => {
  if (value === null || value === undefined) return null;
  
  const { thresholds, format } = widget.settings;
  
  if (format === 'boolean') {
    return value ? CheckCircle : XCircle;
  }
  
  if (format === 'number' && thresholds) {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (!isNaN(num)) {
      if (thresholds.critical !== undefined && num >= thresholds.critical) {
        return AlertTriangle;
      }
      if (thresholds.warning !== undefined && num >= thresholds.warning) {
        return AlertTriangle;
      }
      return CheckCircle;
    }
  }
  
  return null;
};

const renderWidgetContent = (widget: Widget, currentValue: any) => {
  const IconComponent = getWidgetIcon(widget.type);
  const StatusIcon = getStatusIcon(widget, currentValue);
  const statusColor = getStatusColor(widget, currentValue);
  const formattedValue = formatValue(currentValue, widget);
  
  switch (widget.type) {
    case 'temperature':
    case 'humidity':
    case 'gauge':
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-2">
          <div className="flex items-center space-x-2">
            <IconComponent 
              className="h-8 w-8" 
              style={{ color: widget.settings.color || getWidgetColor(widget.type) }}
            />
            {StatusIcon && <StatusIcon className={`h-4 w-4 ${statusColor}`} />}
          </div>
          <div className={`text-2xl font-bold ${statusColor}`}>
            {currentValue !== null ? formattedValue : 'No Data'}
          </div>
          {widget.settings.sensorKey && (
            <div className="text-xs text-muted-foreground">
              {widget.settings.sensorKey}
            </div>
          )}
        </div>
      );
      
    case 'led':
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-2">
          <Lightbulb 
            className={`h-12 w-12 ${currentValue ? 'text-yellow-500' : 'text-gray-400'}`}
            fill={currentValue ? 'currentColor' : 'none'}
          />
          <div className={`text-lg font-bold ${statusColor}`}>
            {currentValue !== null ? formatValue(currentValue, widget) : 'No Data'}
          </div>
        </div>
      );
      
    case 'gps':
      return (
        <div className="flex flex-col justify-center h-full space-y-2">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Location</span>
          </div>
          <div className="space-y-1 text-sm">
            <div>Lat: {currentValue?.lat || 'No Data'}</div>
            <div>Lng: {currentValue?.lng || 'No Data'}</div>
            {currentValue?.address && (
              <div className="text-xs text-muted-foreground truncate">
                {currentValue.address}
              </div>
            )}
          </div>
        </div>
      );
      
    case 'camera':
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-2">
          <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">
            Camera Feed
          </div>
        </div>
      );
      
    case 'chart':
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-cyan-500" />
            <span className="text-sm font-medium">Chart Data</span>
          </div>
          <div className="flex-1 bg-muted rounded flex items-center justify-center">
            <div className="text-xs text-muted-foreground">Chart visualization</div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Last: {formattedValue}
          </div>
        </div>
      );
      
    case 'text':
      return (
        <div className="flex flex-col justify-center h-full">
          <div className="text-lg font-medium">
            {formattedValue}
          </div>
        </div>
      );
      
    default:
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-2">
          <IconComponent className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm">
            {formattedValue}
          </div>
        </div>
      );
  }
};

// Static placeholder data for widgets without linked devices
const getPlaceholderValue = (widget: Widget) => {
  switch (widget.type) {
    case 'temperature':
      return null; // Show "No Data" instead of fake temperature
    case 'humidity':
      return null; // Show "No Data" instead of fake humidity  
    case 'led':
      return false; // Default to OFF state
    case 'gps':
      return { lat: 'No Data', lng: 'No Data', address: null }; // Show "No Data" instead of fake coordinates
    case 'gauge':
      return 0; // Default to 0
    case 'text':
      return "No Data";
    default:
      return null;
  }
};

export function WidgetCard({ widget, onEdit, onDuplicate, onDelete, onLinkDevice, isEditing = false }: WidgetCardProps) {
  const placeholderValue = getPlaceholderValue(widget);
  
  // Use real device data if widget is linked to a device
  const { 
    data: deviceData, 
    device, 
    loading, 
    error, 
    isConnected, 
    refresh 
  } = useDeviceData({
    deviceId: widget.deviceId ? String(widget.deviceId) : undefined,
    dataPath: widget.dataPath,
    refreshInterval: widget.settings.refreshInterval || 3000, // Reduced to 3 seconds for more responsive updates
    enabled: !!widget.deviceId && widget.isActive
  });

  // Determine which value to use - real device data or placeholder data
  const getCurrentValue = () => {
    if (!widget.deviceId || !deviceData) {
      console.log(`[WidgetCard] No device data for widget ${widget.title} (type: ${widget.type}, deviceId: ${widget.deviceId}, dataPath: ${widget.dataPath})`);
      return placeholderValue; // Use placeholder data if no device linked or no real data
    }

    console.log(`[WidgetCard] Processing data for widget ${widget.title}:`, {
      type: widget.type,
      deviceId: widget.deviceId,
      dataPath: widget.dataPath,
      deviceData: deviceData,
      isConnected: isConnected
    });

    // Extract the appropriate value based on widget type and device data
    switch (widget.type) {
      case 'temperature':
        const tempValue = deviceData.temperature ?? placeholderValue;
        console.log(`[WidgetCard] Temperature value:`, tempValue);
        return tempValue;
      case 'humidity':
        const humValue = deviceData.humidity ?? placeholderValue;
        console.log(`[WidgetCard] Humidity value:`, humValue);
        return humValue;
      case 'led':
        const ledValue = deviceData.led_state ?? placeholderValue;
        console.log(`[WidgetCard] LED value:`, ledValue);
        return ledValue;
      case 'gps':
        if (deviceData.latitude !== undefined && deviceData.longitude !== undefined) {
          const gpsValue = {
            lat: Number(deviceData.latitude).toFixed(6),
            lng: Number(deviceData.longitude).toFixed(6),
            address: "Real GPS Location"
          };
          console.log(`[WidgetCard] GPS value:`, gpsValue);
          return gpsValue;
        }
        console.log(`[WidgetCard] GPS data incomplete:`, { latitude: deviceData.latitude, longitude: deviceData.longitude });
        return placeholderValue;
      default:
        return placeholderValue;
    }
  };

  const currentValue = getCurrentValue();

  return (
    <Card className="h-full flex flex-col relative group">
      <CardHeader className="pb-2 drag-handle">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium truncate flex-1">
            {widget.title}
          </CardTitle>
          
          <div className="flex items-center space-x-1">
            {!widget.isActive && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
            
            {isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onLinkDevice(widget)}>
                    <Link className="mr-2 h-4 w-4" />
                    Link Device
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(widget)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(widget)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(widget)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {widget.deviceId && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <span>Device: {device?.name || String(widget.deviceId).slice(-8)}</span>
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-gray-400" />
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-4 w-4 p-0"
              onClick={(e) => { e.stopPropagation(); refresh(); }}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 pt-0">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full space-y-2 text-red-500">
            <AlertTriangle className="h-6 w-6" />
            <div className="text-xs text-center">Device Error</div>
          </div>
        ) : (
          renderWidgetContent(widget, currentValue)
        )}
      </CardContent>
      
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2">
        <div 
          className={`w-2 h-2 rounded-full ${
            widget.deviceId 
              ? (isConnected ? 'bg-green-500' : 'bg-red-500')
              : (widget.isActive ? 'bg-blue-500' : 'bg-gray-400')
          }`}
          title={
            widget.deviceId 
              ? (isConnected ? 'Device Online' : 'Device Offline')
              : (widget.isActive ? 'Active (Mock Data)' : 'Inactive')
          }
        />
      </div>
    </Card>
  );
}