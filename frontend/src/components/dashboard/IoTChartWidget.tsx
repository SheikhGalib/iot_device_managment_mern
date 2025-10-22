import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { 
  Calendar,
  Clock,
  Thermometer,
  Droplets,
  MapPin,
  Lightbulb,
  RefreshCw,
  Settings,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { deviceApi } from '../../lib/deviceApi';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../hooks/use-toast';

interface ChartData {
  timestamp: string;
  [key: string]: any;
}

interface MetricConfig {
  key: string;
  name: string;
  color: string;
  icon: React.ComponentType<any>;
  unit: string;
  thresholds: {
    warning?: number;
    critical?: number;
  };
}

interface IoTChartWidgetProps {
  deviceId: string;
  deviceName?: string;
  title?: string;
  height?: number;
  className?: string;
}

const METRIC_CONFIGS: Record<string, MetricConfig> = {
  temperature: {
    key: 'temperature',
    name: 'Temperature',
    color: '#ef4444',
    icon: Thermometer,
    unit: '°C',
    thresholds: {
      warning: 35,
      critical: 40
    }
  },
  humidity: {
    key: 'humidity',
    name: 'Humidity',
    color: '#3b82f6',
    icon: Droplets,
    unit: '%',
    thresholds: {
      warning: 50,
      critical: 60
    }
  },
  led: {
    key: 'led',
    name: 'LED State',
    color: '#22c55e',
    icon: Lightbulb,
    unit: '',
    thresholds: {}
  },
  gps: {
    key: 'gps',
    name: 'GPS Signal',
    color: '#8b5cf6',
    icon: MapPin,
    unit: 'm',
    thresholds: {}
  }
};

const TIME_RANGES = [
  { value: 'hour', label: '1 Hour', icon: Clock },
  { value: 'day', label: '1 Day', icon: Calendar },
  { value: 'week', label: '1 Week', icon: Calendar },
  { value: 'month', label: '1 Month', icon: Calendar }
];

export const IoTChartWidget: React.FC<IoTChartWidgetProps> = ({
  deviceId,
  deviceName,
  title = "Device Metrics",
  height = 400,
  className = ""
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['temperature']);
  const [timeRange, setTimeRange] = useState('day');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentValues, setCurrentValues] = useState<Record<string, any>>({});
  const [showThresholds, setShowThresholds] = useState(true);
  
  const { toast } = useToast();

  const fetchChartData = async () => {
    if (!deviceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await deviceApi.getDevice(deviceId);
      const device = response.data;
      
      // Get historical data using the API client
      const chartData = await apiClient.get(`/devices/${deviceId}/chart-data`, {
        params: {
          metrics: selectedMetrics.join(','),
          timeRange,
          limit: '500'
        }
      });
      
      if (chartData.success) {
        // Combine data from different metrics into single time series
        const combinedData = combineMetricData(chartData.data.historicalData);
        setChartData(combinedData);
        setCurrentValues(chartData.data.currentValues || {});
      } else {
        throw new Error(chartData.error || 'Failed to load chart data');
      }
      
    } catch (err: any) {
      console.error('Chart data fetch error:', err);
      setError(err.message || 'Failed to load chart data');
      toast({
        title: "Error",
        description: "Failed to load chart data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const combineMetricData = (historicalData: Record<string, any[]>): ChartData[] => {
    // Create a map of timestamps to data points
    const timeMap = new Map<string, ChartData>();
    
    selectedMetrics.forEach(metric => {
      const metricData = historicalData[metric] || [];
      
      metricData.forEach(point => {
        const timeKey = new Date(point.timestamp).toISOString();
        
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, {
            timestamp: point.timestamp,
            time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })
          });
        }
        
        const entry = timeMap.get(timeKey)!;
        
        // Handle different data types
        if (metric === 'gps' && typeof point.value === 'object') {
          entry[`${metric}_lat`] = point.value.latitude;
          entry[`${metric}_lng`] = point.value.longitude;
          // For GPS, we can chart distance from origin or accuracy
          entry[metric] = point.metadata?.accuracy || 0;
        } else {
          entry[metric] = typeof point.value === 'number' ? point.value : (point.value ? 1 : 0);
        }
      });
    });
    
    // Convert to array and sort by timestamp
    return Array.from(timeMap.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  };

  const getThresholdColor = (metric: string, value: number): string => {
    const config = METRIC_CONFIGS[metric];
    if (!config || !showThresholds) return config?.color || '#6b7280';
    
    const { warning, critical } = config.thresholds;
    
    if (critical !== undefined && value >= critical) {
      return '#ef4444'; // Red
    }
    if (warning !== undefined && value >= warning) {
      return '#f59e0b'; // Yellow
    }
    return '#22c55e'; // Green
  };

  const getCurrentValueColor = (metric: string): string => {
    const currentValue = currentValues[metric];
    if (!currentValue || typeof currentValue.value !== 'number') {
      return METRIC_CONFIGS[metric]?.color || '#6b7280';
    }
    
    return getThresholdColor(metric, currentValue.value);
  };

  const formatTooltipValue = (value: any, name: string): [string, string] => {
    const config = METRIC_CONFIGS[name];
    const unit = config?.unit || '';
    
    if (name === 'led') {
      return [value ? 'ON' : 'OFF', config?.name || name];
    }
    
    return [`${value}${unit}`, config?.name || name];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">
                {entry.name}: {entry.value}
                {METRIC_CONFIGS[entry.dataKey]?.unit}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    fetchChartData();
    
    // Set up auto-refresh
    const interval = setInterval(fetchChartData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [deviceId, selectedMetrics, timeRange]);

  const handleMetricToggle = (metric: string, checked: boolean) => {
    if (checked) {
      setSelectedMetrics(prev => [...prev, metric]);
    } else {
      setSelectedMetrics(prev => prev.filter(m => m !== metric));
    }
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
            {deviceName && (
              <Badge variant="outline" className="ml-2">
                {deviceName}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchChartData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            <Label className="text-sm">Time Range:</Label>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map(range => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Metric Selectors */}
          <div className="flex flex-wrap gap-3">
            {Object.values(METRIC_CONFIGS).map(config => {
              const IconComponent = config.icon;
              const isSelected = selectedMetrics.includes(config.key);
              const currentValue = currentValues[config.key];
              
              return (
                <div key={config.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={config.key}
                    checked={isSelected}
                    onCheckedChange={(checked) => handleMetricToggle(config.key, !!checked)}
                  />
                  <Label
                    htmlFor={config.key}
                    className="flex items-center gap-1 cursor-pointer"
                  >
                    <IconComponent 
                      className="h-4 w-4" 
                      style={{ color: getCurrentValueColor(config.key) }}
                    />
                    <span className="text-sm">{config.name}</span>
                    {currentValue && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: getCurrentValueColor(config.key) + '20',
                          borderColor: getCurrentValueColor(config.key)
                        }}
                      >
                        {currentValue.value}
                        {config.unit}
                      </Badge>
                    )}
                  </Label>
                </div>
              );
            })}
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Threshold Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="thresholds"
              checked={showThresholds}
              onCheckedChange={(checked) => setShowThresholds(!!checked)}
            />
            <Label htmlFor="thresholds" className="text-sm cursor-pointer">
              Show Thresholds
            </Label>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height: `${height}px` }}>
          {error ? (
            <div className="flex items-center justify-center h-full text-red-500">
              <AlertTriangle className="h-6 w-6 mr-2" />
              <span>{error}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {/* Threshold Lines */}
                {showThresholds && selectedMetrics.map(metric => {
                  const config = METRIC_CONFIGS[metric];
                  const thresholds = [];
                  
                  if (config.thresholds.critical !== undefined) {
                    thresholds.push(
                      <ReferenceLine
                        key={`${metric}-critical`}
                        y={config.thresholds.critical}
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label={`${config.name} Critical (${config.thresholds.critical}${config.unit})`}
                      />
                    );
                  }
                  
                  if (config.thresholds.warning !== undefined) {
                    thresholds.push(
                      <ReferenceLine
                        key={`${metric}-warning`}
                        y={config.thresholds.warning}
                        stroke="#f59e0b"
                        strokeDasharray="5 5"
                        label={`${config.name} Warning (${config.thresholds.warning}${config.unit})`}
                      />
                    );
                  }
                  
                  return thresholds;
                })}
                
                {/* Data Lines */}
                {selectedMetrics.map(metric => {
                  const config = METRIC_CONFIGS[metric];
                  return (
                    <Line
                      key={metric}
                      type="monotone"
                      dataKey={metric}
                      stroke={config.color}
                      strokeWidth={2}
                      dot={{ fill: config.color, strokeWidth: 2, r: 4 }}
                      name={config.name}
                      connectNulls={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Current Values Summary */}
        {Object.keys(currentValues).length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-2">Current Values</h4>
            <div className="flex flex-wrap gap-4">
              {selectedMetrics.map(metric => {
                const config = METRIC_CONFIGS[metric];
                const current = currentValues[metric];
                
                if (!current) return null;
                
                const IconComponent = config.icon;
                const valueColor = getCurrentValueColor(metric);
                
                return (
                  <div key={metric} className="flex items-center gap-2">
                    <IconComponent 
                      className="h-4 w-4" 
                      style={{ color: valueColor }}
                    />
                    <span className="text-sm">
                      {config.name}: 
                      <span 
                        className="font-medium ml-1"
                        style={{ color: valueColor }}
                      >
                        {current.value}{config.unit}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IoTChartWidget;