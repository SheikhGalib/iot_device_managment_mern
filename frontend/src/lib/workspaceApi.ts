import { apiClient } from './apiClient';

export interface Widget {
  _id: string;
  workspace: string;
  type: 'temperature' | 'humidity' | 'led' | 'gps' | 'camera' | 'chart' | 'gauge' | 'text' | 'custom';
  title: string;
  settings: {
    unit?: string;
    sensorKey?: string;
    format?: 'number' | 'text' | 'boolean' | 'json';
    precision?: number;
    minValue?: number;
    maxValue?: number;
    thresholds?: {
      warning?: number;
      critical?: number;
    };
    color?: string;
    refreshInterval?: number;
    showHistory?: boolean;
    historyDuration?: number;
  };
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
  };
  deviceId?: string;
  dataPath?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  _id: string;
  user: string;
  name: string;
  description: string;
  widgets: Widget[];
  isDefault: boolean;
  gridSettings: {
    cols: number;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
  };
  createdAt: string;
  updatedAt: string;
  widgetCount?: number;
}

export interface WorkspaceCreate {
  name: string;
  description?: string;
  isDefault?: boolean;
  gridSettings?: Partial<Workspace['gridSettings']>;
}

export interface WorkspaceUpdate {
  name?: string;
  description?: string;
  isDefault?: boolean;
  gridSettings?: Partial<Workspace['gridSettings']>;
}

export interface WidgetCreate {
  type: Widget['type'];
  title: string;
  settings?: Partial<Widget['settings']>;
  layout?: Partial<Widget['layout']>;
  deviceId?: string;
  dataPath?: string;
}

export interface WidgetUpdate {
  title?: string;
  settings?: Partial<Widget['settings']>;
  layout?: Partial<Widget['layout']>;
  deviceId?: string;
  dataPath?: string;
  isActive?: boolean;
  order?: number;
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetType {
  type: string;
  name: string;
  description: string;
  icon: string;
  defaultSettings: Partial<Widget['settings']>;
  defaultLayout: { w: number; h: number; minW: number; minH: number };
}

class WorkspaceService {
  // Workspace operations
  async getWorkspaces(params?: { page?: number; limit?: number; search?: string }) {
    const response = await apiClient.get('/workspaces', { params });
    return response;
  }

  async createWorkspace(data: WorkspaceCreate) {
    const response = await apiClient.post('/workspaces', data);
    return response.data;
  }

  async getWorkspace(id: string) {
    const response = await apiClient.get(`/workspaces/${id}`);
    return response.data;
  }

  async updateWorkspace(id: string, data: WorkspaceUpdate) {
    const response = await apiClient.put(`/workspaces/${id}`, data);
    return response.data;
  }

  async deleteWorkspace(id: string) {
    const response = await apiClient.delete(`/workspaces/${id}`);
    return response.data;
  }

  async exportWorkspace(id: string) {
    const response = await apiClient.get(`/workspaces/${id}/export`);
    return response.data;
  }

  // Widget operations
  async addWidget(workspaceId: string, data: WidgetCreate) {
    const response = await apiClient.post(`/workspaces/${workspaceId}/widgets`, data);
    return response.data;
  }

  async updateWidget(widgetId: string, data: WidgetUpdate) {
    const response = await apiClient.put(`/widgets/${widgetId}`, data);
    return response.data;
  }

  async deleteWidget(widgetId: string) {
    const response = await apiClient.delete(`/widgets/${widgetId}`);
    return response.data;
  }

  async getWidget(widgetId: string) {
    const response = await apiClient.get(`/widgets/${widgetId}`);
    return response.data;
  }

  async duplicateWidget(widgetId: string) {
    const response = await apiClient.post(`/widgets/${widgetId}/duplicate`);
    return response.data;
  }

  async updateWidgetPosition(widgetId: string, position: { x: number; y: number; w: number; h: number }) {
    const response = await apiClient.put(`/widgets/${widgetId}/position`, position);
    return response.data;
  }

  // Layout operations
  async updateLayout(workspaceId: string, layouts: LayoutItem[]) {
    const response = await apiClient.put(`/workspaces/${workspaceId}/layout`, { layouts });
    return response.data;
  }

  // Widget types
  async getWidgetTypes() {
    const response = await apiClient.get('/widgets/types');
    return response.data;
  }

  // Utility methods
  generateDefaultLayout(type: Widget['type'], widgets: Widget[] = []): Widget['layout'] {
    const defaultLayouts = {
      temperature: { w: 3, h: 4, minW: 2, minH: 3 },
      humidity: { w: 3, h: 4, minW: 2, minH: 3 },
      led: { w: 2, h: 3, minW: 2, minH: 2 },
      gps: { w: 4, h: 5, minW: 3, minH: 4 },
      camera: { w: 6, h: 6, minW: 4, minH: 4 },
      chart: { w: 6, h: 5, minW: 4, minH: 4 },
      gauge: { w: 4, h: 4, minW: 3, minH: 3 },
      text: { w: 3, h: 2, minW: 2, minH: 1 },
      custom: { w: 3, h: 4, minW: 2, minH: 2 }
    };

    const defaultLayout = defaultLayouts[type] || defaultLayouts.custom;
    
    // Find available position
    let x = 0;
    let y = 0;
    const gridCols = 12;

    if (widgets.length > 0) {
      // Sort widgets by position to find gaps
      const sortedWidgets = widgets
        .filter(w => w.layout)
        .sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);

      // Find first available spot
      for (const widget of sortedWidgets) {
        const layout = widget.layout;
        if (x + defaultLayout.w <= gridCols) {
          // Check if this position overlaps with existing widget
          const overlaps = sortedWidgets.some(w => {
            const wl = w.layout;
            return !(x >= wl.x + wl.w || x + defaultLayout.w <= wl.x || 
                    y >= wl.y + wl.h || y + defaultLayout.h <= wl.y);
          });
          
          if (!overlaps) {
            break;
          }
        }
        
        // Move to next position
        x += layout.w;
        if (x + defaultLayout.w > gridCols) {
          x = 0;
          y = Math.max(y, layout.y + layout.h);
        }
      }
      
      // If we couldn't find a spot in the current row, move to next row
      if (x + defaultLayout.w > gridCols) {
        x = 0;
        y = Math.max(...sortedWidgets.map(w => w.layout.y + w.layout.h), y);
      }
    }

    return {
      x,
      y,
      w: defaultLayout.w,
      h: defaultLayout.h,
      i: '', // Will be set by the server
      minW: defaultLayout.minW,
      minH: defaultLayout.minH,
      maxW: 12,
      maxH: 20,
      static: false,
      isDraggable: true,
      isResizable: true
    };
  }

  validateLayout(layout: Widget['layout']): string[] {
    const errors: string[] = [];

    if (layout.x < 0) errors.push('x position cannot be negative');
    if (layout.y < 0) errors.push('y position cannot be negative');
    if (layout.w < 1 || layout.w > 12) errors.push('width must be between 1 and 12');
    if (layout.h < 1) errors.push('height must be at least 1');
    if (layout.minW && layout.w < layout.minW) errors.push('width cannot be less than minW');
    if (layout.minH && layout.h < layout.minH) errors.push('height cannot be less than minH');
    if (layout.maxW && layout.w > layout.maxW) errors.push('width cannot be greater than maxW');
    if (layout.maxH && layout.h > layout.maxH) errors.push('height cannot be greater than maxH');

    return errors;
  }
}

export const workspaceService = new WorkspaceService();