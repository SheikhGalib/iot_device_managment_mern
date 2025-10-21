import { useNavigate } from 'react-router-dom';
import { WorkspacesList } from '@/components/dashboard/WorkspacesList';
import { type Workspace } from '@/lib/workspaceApi';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/apiClient';

const Workspaces = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const handleSelectWorkspace = (workspace: Workspace) => {
    navigate(`/dashboard/workspaces/${workspace._id}`);
  };

  return (
    <>
      <WorkspacesList onSelectWorkspace={handleSelectWorkspace} />

    </>
  );
};

export default Workspaces;