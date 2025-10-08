import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, Play, StopCircle, FileText } from "lucide-react";
import { mockDeployments, Deployment } from "@/lib/mockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const Deployments = () => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [statusFilter, setStatusFilter] = useState<"all" | "in-progress" | "success" | "failed">("all");
  const [selectedLog, setSelectedLog] = useState<Deployment | null>(null);

  const filteredDeployments = mockDeployments.filter((deployment) => {
    if (statusFilter === "all") return true;
    return deployment.status === statusFilter;
  });

  const getStatusBadge = (status: Deployment["status"]) => {
    const variants = {
      "in-progress": "bg-warning/20 text-warning border-warning/30",
      success: "bg-success/20 text-success border-success/30",
      failed: "bg-destructive/20 text-destructive border-destructive/30",
    };
    const labels = {
      "in-progress": "In Progress",
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
        {deployment.status === "in-progress" && (
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
        {deployment.status !== "in-progress" && (
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
            {deployment.status === "in-progress" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStop(deployment)}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            )}
            {deployment.status !== "in-progress" && (
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
          <TabsTrigger value="in-progress">In Progress</TabsTrigger>
          <TabsTrigger value="success">Completed</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredDeployments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No deployments found</p>
        </Card>
      ) : viewMode === "grid" ? (
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
