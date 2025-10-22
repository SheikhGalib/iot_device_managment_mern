import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Play, StopCircle, FileText, Loader2 } from "lucide-react";
import { deviceApi } from "@/lib/deviceApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Real deployment interface
interface Deployment {
  id: string;
  deviceId: string;
  deviceName: string;
  status: "in_progress" | "success" | "failed";
  startTime: string;
  endTime?: string;
  fileName?: string;
  logs: string;
  triggeredBy?: string;
  errorMessage?: string;
  duration?: number;
}

const Deployments = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_progress" | "success" | "failed">("all");
  const [selectedLog, setSelectedLog] = useState<Deployment | null>(null);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 20
  });

  // Load deployments
  useEffect(() => {
    loadDeployments();
  }, [statusFilter, pagination.page]);

  // Auto-refresh every 10 seconds for in-progress deployments
  useEffect(() => {
    const hasInProgress = deployments.some(d => d.status === 'in_progress');
    if (hasInProgress) {
      const interval = setInterval(loadDeployments, 10000);
      return () => clearInterval(interval);
    }
  }, [deployments]);

  const loadDeployments = async () => {
    try {
      setIsLoading(true);
      const response = await deviceApi.getDeployments(
        pagination.page,
        pagination.limit,
        statusFilter === 'all' ? undefined : statusFilter
      );

      if (response.data.success) {
        setDeployments(response.data.data.deployments);
        setPagination(response.data.data.pagination);
      } else {
        toast.error('Failed to load deployments');
      }
    } catch (error: any) {
      console.error('Error loading deployments:', error);
      toast.error(error.message || 'Failed to load deployments');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDeployments = deployments;

  const getStatusBadge = (status: Deployment["status"]) => {
    const variants = {
      "in_progress": "bg-warning/20 text-warning border-warning/30",
      success: "bg-success/20 text-success border-success/30",
      failed: "bg-destructive/20 text-destructive border-destructive/30",
    };
    const labels = {
      "in_progress": "In Progress",
      success: "Success",
      failed: "Failed",
    };
    return (
      <Badge variant="outline" className={cn("border", variants[status])}>
        {labels[status]}
      </Badge>
    );
  };

  const getElapsedTime = (deployment: Deployment) => {
    if (deployment.duration) {
      const minutes = Math.floor(deployment.duration / 60);
      const seconds = deployment.duration % 60;
      return `${minutes}m ${seconds}s`;
    }
    
    const start = new Date(deployment.startTime);
    const end = deployment.endTime ? new Date(deployment.endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const handleStop = (deployment: Deployment) => {
    toast.warning(`Stopping deployment to ${deployment.deviceName}`);
  };

  const handleDeployAgain = (deployment: Deployment) => {
    toast.success(`Re-deploying to ${deployment.deviceName}`);
  };

  const DeploymentCard = ({ deployment }: { deployment: Deployment }) => (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{deployment.deviceName}</h3>
          {deployment.fileName && (
            <p className="text-sm text-muted-foreground">{deployment.fileName}</p>
          )}
        </div>
        {getStatusBadge(deployment.status)}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Started:</span>
          <span>{deployment.startTime}</span>
        </div>
        {deployment.endTime && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completed:</span>
            <span>{deployment.endTime}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Duration:</span>
          <span>{getElapsedTime(deployment)}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        {deployment.status === "in_progress" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleStop(deployment)}
            className="flex-1"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Stop
          </Button>
        )}
        {deployment.status !== "in_progress" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDeployAgain(deployment)}
            className="flex-1"
          >
            <Play className="h-4 w-4 mr-2" />
            Deploy Again
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSelectedLog(deployment)}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Check Log
        </Button>
      </div>
    </Card>
  );

  const DeploymentListItem = ({ deployment }: { deployment: Deployment }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{deployment.deviceName}</h3>
          {deployment.fileName && (
            <p className="text-sm text-muted-foreground truncate">{deployment.fileName}</p>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {getStatusBadge(deployment.status)}
          
          <div className="text-sm text-muted-foreground min-w-[80px] text-right">
            {getElapsedTime(deployment)}
          </div>

          <div className="flex gap-2">
            {deployment.status === "in_progress" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStop(deployment)}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            )}
            {deployment.status !== "in_progress" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeployAgain(deployment)}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedLog(deployment)}
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Deployments</h1>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="success">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading deployments...</span>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredDeployments.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">
            {statusFilter === "all" 
              ? "No deployments found. Start by deploying code to your edge devices." 
              : `No ${statusFilter} deployments found.`
            }
          </p>
        </Card>
      )}

      {/* Deployments Display */}
      {!isLoading && filteredDeployments.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDeployments.map((deployment) => (
                <DeploymentCard key={deployment.id} deployment={deployment} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDeployments.map((deployment) => (
                <DeploymentListItem key={deployment.id} deployment={deployment} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} deployments
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Deployment Log - {selectedLog?.deviceName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[500px]">
            <pre className="text-sm bg-muted p-4 rounded-lg font-mono">
              {selectedLog?.logs}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Deployments;
