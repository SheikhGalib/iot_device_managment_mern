import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Responsive, WidthProvider, Layout } from 'react-grid-layout';
import debounce from 'lodash.debounce';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Settings, 
  Grid3X3, 
  Download,
  Edit3,
  RotateCcw
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '../ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { useToast } from '../../hooks/use-toast';
import { WidgetCard } from './WidgetCard';
import { WidgetSettingsModal } from './WidgetSettingsModal';
import { workspaceService, type Workspace, type Widget, type LayoutItem, type WidgetType } from '../../lib/workspaceApi';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface WorkspaceEditorProps {
  workspace: Workspace;
  onBack: () => void;
  onWorkspaceUpdate: (workspace: Workspace) => void;
}

export function WorkspaceEditor({ workspace, onBack, onWorkspaceUpdate }: WorkspaceEditorProps) {
  const [widgets, setWidgets] = useState<Widget[]>(workspace.widgets || []);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addWidgetDialogOpen, setAddWidgetDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [widgetTypes, setWidgetTypes] = useState<WidgetType[]>([]);
  const [gridSettings, setGridSettings] = useState(workspace.gridSettings);
  const { toast } = useToast();

  // Load widget types on mount
  useEffect(() => {
    loadWidgetTypes();
  }, []);

  const loadWidgetTypes = async () => {
    try {
      const response = await workspaceService.getWidgetTypes();
      setWidgetTypes(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load widget types',
        variant: 'destructive'
      });
    }
  };

  // Debounced layout save function
  const debouncedSaveLayout = useCallback(
    debounce(async (layouts: LayoutItem[]) => {
      if (!isEditing) return;
      
      try {
        setSaving(true);
        await workspaceService.updateLayout(workspace._id, layouts);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save layout',
          variant: 'destructive'
        });
      } finally {
        setSaving(false);
      }
    }, 1000),
    [workspace._id, isEditing]
  );

  // Convert widgets to layout format
  const layouts = useMemo(() => {
    const layout = widgets.map(widget => ({
      i: widget._id,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.w,
      h: widget.layout.h,
      minW: widget.layout.minW || 1,
      minH: widget.layout.minH || 1,
      maxW: widget.layout.maxW || 12,
      maxH: widget.layout.maxH || 20,
      static: !isEditing || widget.layout.static,
      isDraggable: isEditing && (widget.layout.isDraggable !== false),
      isResizable: isEditing && (widget.layout.isResizable !== false)
    }));

    return {
      lg: layout,
      md: layout,
      sm: layout,
      xs: layout,
      xxs: layout
    };
  }, [widgets, isEditing]);

  const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    if (!isEditing) return;

    // Update widget layouts
    const updatedWidgets = widgets.map(widget => {
      const layoutItem = layout.find(l => l.i === widget._id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            ...widget.layout,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h
          }
        };
      }
      return widget;
    });

    setWidgets(updatedWidgets);

    // Debounced save to backend
    const layoutItems: LayoutItem[] = layout.map(l => ({
      i: l.i,
      x: l.x,
      y: l.y,
      w: l.w,
      h: l.h
    }));

    debouncedSaveLayout(layoutItems);
  };

  const handleAddWidget = async (type: Widget['type']) => {
    try {
      const widgetType = widgetTypes.find(wt => wt.type === type);
      if (!widgetType) return;

      const newLayout = workspaceService.generateDefaultLayout(type, widgets);
      
      const widgetData = {
        type,
        title: widgetType.name,
        settings: widgetType.defaultSettings,
        layout: newLayout
      };

      const response = await workspaceService.addWidget(workspace._id, widgetData);
      setWidgets(prev => [...prev, response]);
      setAddWidgetDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Widget added successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add widget',
        variant: 'destructive'
      });
    }
  };

  const handleEditWidget = (widget: Widget) => {
    setEditingWidget(widget);
  };

  const handleUpdateWidget = async (widgetId: string, updates: any) => {
    try {
      const response = await workspaceService.updateWidget(widgetId, updates);
      setWidgets(prev => prev.map(w => w._id === widgetId ? response : w));
      setEditingWidget(null);

      toast({
        title: 'Success',
        description: 'Widget updated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update widget',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicateWidget = async (widget: Widget) => {
    try {
      const response = await workspaceService.duplicateWidget(widget._id);
      setWidgets(prev => [...prev, response]);

      toast({
        title: 'Success',
        description: 'Widget duplicated successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to duplicate widget',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteWidget = async (widget: Widget) => {
    if (!confirm(`Are you sure you want to delete "${widget.title}"?`)) {
      return;
    }

    try {
      await workspaceService.deleteWidget(widget._id);
      setWidgets(prev => prev.filter(w => w._id !== widget._id));

      toast({
        title: 'Success',
        description: 'Widget deleted successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete widget',
        variant: 'destructive'
      });
    }
  };

  const handleExportWorkspace = async () => {
    try {
      const response = await workspaceService.exportWorkspace(workspace._id);
      const dataStr = JSON.stringify(response, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workspace.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.json`;
      link.click();
      
      URL.revokeObjectURL(url);

      toast({
        title: 'Success',
        description: 'Workspace exported successfully'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export workspace',
        variant: 'destructive'
      });
    }
  };

  const resetLayout = () => {
    if (!confirm('Are you sure you want to reset the layout? This will arrange all widgets in their default positions.')) {
      return;
    }

    const resetWidgets = widgets.map((widget, index) => ({
      ...widget,
      layout: {
        ...widget.layout,
        x: (index * 3) % 12,
        y: Math.floor((index * 3) / 12) * 4,
        w: 3,
        h: 4
      }
    }));

    setWidgets(resetWidgets);

    // Save reset layout
    const layoutItems: LayoutItem[] = resetWidgets.map(widget => ({
      i: widget._id,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.w,
      h: widget.layout.h
    }));

    debouncedSaveLayout(layoutItems);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-sm text-muted-foreground">{workspace.description}</p>
            )}
          </div>
          {workspace.isDefault && (
            <Badge variant="secondary">Default</Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {saving && <Badge variant="outline">Saving...</Badge>}
          
          <div className="flex items-center space-x-2">
            <Label htmlFor="edit-mode">Edit Mode</Label>
            <Switch
              id="edit-mode"
              checked={isEditing}
              onCheckedChange={setIsEditing}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                Workspace Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportWorkspace}>
                <Download className="mr-2 h-4 w-4" />
                Export Workspace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={resetLayout}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Layout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isEditing && (
            <Button onClick={() => setAddWidgetDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Widget
            </Button>
          )}
        </div>
      </div>

      {/* Grid Layout */}
      <div className="flex-1 p-4 overflow-auto">
        {widgets.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Grid3X3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No widgets yet</h3>
              <p className="text-muted-foreground mb-4">
                Start building your dashboard by adding widgets
              </p>
              <Button onClick={() => setAddWidgetDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Widget
              </Button>
            </div>
          </div>
        ) : (
          <ResponsiveGridLayout
            className="layout"
            layouts={layouts}
            onLayoutChange={handleLayoutChange}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={gridSettings.rowHeight}
            margin={gridSettings.margin}
            containerPadding={gridSettings.containerPadding}
            isDraggable={isEditing}
            isResizable={isEditing}
            draggableHandle=".drag-handle"
            compactType="vertical"
            preventCollision={false}
          >
            {widgets.map((widget) => (
              <div key={widget._id} className="widget-container">
                <WidgetCard
                  widget={widget}
                  onEdit={handleEditWidget}
                  onDuplicate={handleDuplicateWidget}
                  onDelete={handleDeleteWidget}
                  isEditing={isEditing}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        )}
      </div>

      {/* Add Widget Dialog */}
      <Dialog open={addWidgetDialogOpen} onOpenChange={setAddWidgetDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add Widget</DialogTitle>
            <DialogDescription>
              Choose a widget type to add to your workspace
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {widgetTypes.map((widgetType) => {
              const IconComponent = {
                thermometer: () => <div className="w-8 h-8 bg-red-500 rounded" />,
                droplets: () => <div className="w-8 h-8 bg-blue-500 rounded" />,
                lightbulb: () => <div className="w-8 h-8 bg-yellow-500 rounded" />,
                'map-pin': () => <div className="w-8 h-8 bg-purple-500 rounded" />,
                camera: () => <div className="w-8 h-8 bg-orange-500 rounded" />,
                'bar-chart-3': () => <div className="w-8 h-8 bg-cyan-500 rounded" />,
                gauge: () => <div className="w-8 h-8 bg-pink-500 rounded" />,
                type: () => <div className="w-8 h-8 bg-gray-500 rounded" />,
                puzzle: () => <div className="w-8 h-8 bg-green-500 rounded" />
              }[widgetType.icon] || (() => <div className="w-8 h-8 bg-gray-500 rounded" />);

              return (
                <Button
                  key={widgetType.type}
                  variant="outline"
                  className="h-auto p-4 flex flex-col space-y-2 hover:bg-accent"
                  onClick={() => handleAddWidget(widgetType.type as Widget['type'])}
                >
                  <IconComponent />
                  <div className="text-center">
                    <div className="font-medium">{widgetType.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {widgetType.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Widget Settings Modal */}
      {editingWidget && (
        <WidgetSettingsModal
          widget={editingWidget}
          open={!!editingWidget}
          onClose={() => setEditingWidget(null)}
          onSave={handleUpdateWidget}
        />
      )}
    </div>
  );
}