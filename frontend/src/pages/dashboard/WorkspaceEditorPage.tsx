import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkspaceEditor } from '@/components/dashboard/WorkspaceEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { workspaceService, type Workspace } from '@/lib/workspaceApi';

const WorkspaceEditorPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!workspaceId) return;
      
      try {
        setLoading(true);
        setError(null);
        const data = await workspaceService.getWorkspace(workspaceId);
        console.log('WorkspaceEditorPage - getWorkspace result:', data);
        setWorkspace(data);
      } catch (err: any) {
        console.error('Failed to load workspace:', err);
        setError(err.message || 'Failed to load workspace');
        toast({
          title: 'Error',
          description: 'Failed to load workspace',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadWorkspace();
  }, [workspaceId, toast]);

  const handleBack = () => {
    navigate('/dashboard/workspaces');
  };

  const handleWorkspaceUpdate = (updatedWorkspace: Workspace) => {
    setWorkspace(updatedWorkspace);
  };

  if (!workspaceId) {
    return (
      <div className="p-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">No Workspace Selected</h2>
          <p className="text-muted-foreground">Please select a workspace to edit.</p>
          <Button onClick={() => navigate('/dashboard/workspaces')}>
            Go to Workspaces
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspaces
          </Button>
          <div className="flex-1">
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        
        <div className="flex-1 p-6">
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b border-border bg-card px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workspaces
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Workspace Editor</h1>
          </div>
        </div>
        
        <div className="flex-1 p-6">
          <Card className="p-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-bold">Failed to Load Workspace</h2>
              <p className="text-muted-foreground">
                {error || 'The workspace could not be found or loaded.'}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
                <Button variant="outline" onClick={handleBack}>
                  Go Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">

      
      {workspace ? (
        <WorkspaceEditor 
          workspace={workspace}
          onBack={handleBack}
          onWorkspaceUpdate={handleWorkspaceUpdate}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold">Loading workspace...</h2>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceEditorPage;