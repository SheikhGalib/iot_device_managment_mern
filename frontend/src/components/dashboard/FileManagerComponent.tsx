import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Home, 
  RefreshCw,
  Loader2,
  HardDrive
} from 'lucide-react';
import { socketService } from '@/lib/socketService';
import { deviceApi, FileItem } from '@/lib/deviceApi';

interface FileManagerProps {
  deviceId: string;
  deviceName: string;
  isConnected: boolean;
}

interface FileTreeNode extends FileItem {
  path: string;
  children?: FileTreeNode[];
  isExpanded?: boolean;
  isLoading?: boolean;
}

const FileManagerComponent: React.FC<FileManagerProps> = ({ deviceId, deviceName, isConnected }) => {
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode[]>([]);

  useEffect(() => {
    if (isConnected) {
      loadFiles('/');
    }
  }, [deviceId, isConnected]);

  useEffect(() => {
    // Socket event listeners for real-time file operations
    const handleFileList = (data: { deviceId: string; path: string; files: FileItem[] }) => {
      if (data.deviceId === deviceId && data.path === currentPath) {
        setFiles(data.files);
        setIsLoading(false);
        setError(null);
      }
    };

    const handleFileError = (data: { deviceId: string; error: string }) => {
      if (data.deviceId === deviceId) {
        setError(data.error);
        setIsLoading(false);
      }
    };

    if (socketService.isConnected()) {
      socketService.onFileList(handleFileList);
      socketService.onFileError(handleFileError);
    }

    return () => {
      if (socketService.isConnected()) {
        socketService.off('file-list', handleFileList);
        socketService.off('file-error', handleFileError);
      }
    };
  }, [deviceId, currentPath]);

  const loadFiles = async (path: string) => {
    if (!isConnected) {
      setError('Device is not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use both API and Socket.IO for redundancy
      if (socketService.isConnected()) {
        socketService.browseFiles(deviceId, path);
      } else {
        // Fallback to REST API
        const response = await deviceApi.browseFiles(deviceId, path);
        if ((response as any).success) {
          setFiles((response as any).data.files);
        } else {
          setError((response as any).error || 'Failed to load files');
        }
        setIsLoading(false);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load files');
      setIsLoading(false);
    }
  };

  const navigateToPath = (newPath: string) => {
    setCurrentPath(newPath);
    loadFiles(newPath);
  };

  const navigateUp = () => {
    const parentPath = currentPath === '/' ? '/' : currentPath.split('/').slice(0, -1).join('/') || '/';
    navigateToPath(parentPath);
  };

  const navigateToRoot = () => {
    navigateToPath('/');
  };

  const onFileClick = (file: FileItem) => {
    if (file.type === 'directory') {
      const newPath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      navigateToPath(newPath);
    }
    // For files, we could implement download or view functionality later
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') {
      return <Folder className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (size: string) => {
    if (!size || size === '-') return '';
    
    const bytes = parseInt(size);
    if (isNaN(bytes)) return size;
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = bytes;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const breadcrumbPaths = currentPath.split('/').filter(Boolean);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            File Manager
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => loadFiles(currentPath)}
              disabled={!isConnected || isLoading}
              size="sm"
              variant="outline"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Navigation Bar */}
        <div className="border-b bg-muted p-3">
          <div className="flex items-center gap-2 text-sm">
            <Button
              onClick={navigateToRoot}
              variant="ghost"
              size="sm"
              className="h-6 px-2"
            >
              <Home className="h-3 w-3" />
            </Button>
            
            {currentPath !== '/' && (
              <Button
                onClick={navigateUp}
                variant="ghost"
                size="sm"
                className="h-6 px-2"
              >
                ..
              </Button>
            )}
            
            <span className="text-muted-foreground">/</span>
            
            {breadcrumbPaths.map((part, index) => (
              <React.Fragment key={index}>
                <Button
                  onClick={() => {
                    const path = '/' + breadcrumbPaths.slice(0, index + 1).join('/');
                    navigateToPath(path);
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-primary hover:text-primary/80"
                >
                  {part}
                </Button>
                {index < breadcrumbPaths.length - 1 && (
                  <span className="text-muted-foreground">/</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* File List */}
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {!isConnected ? (
              <div className="text-center text-muted-foreground py-8">
                Device is not connected. Please establish a connection first.
              </div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">
                <div className="font-medium">Error loading files</div>
                <div className="text-sm mt-1">{error}</div>
                <Button
                  onClick={() => loadFiles(currentPath)}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <div className="text-sm text-muted-foreground mt-2">Loading files...</div>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No files found in this directory.
              </div>
            ) : (
              <div className="space-y-1">
                {files
                  .sort((a, b) => {
                    // Directories first, then files
                    if (a.type === 'directory' && b.type !== 'directory') return -1;
                    if (a.type !== 'directory' && b.type === 'directory') return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((file, index) => (
                    <div
                      key={index}
                      onClick={() => onFileClick(file)}
                      className="flex items-center gap-3 p-2 rounded hover:bg-accent cursor-pointer group"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(file)}
                        <span className="truncate text-sm font-medium">
                          {file.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="w-16 text-right">
                          {formatFileSize(file.size)}
                        </span>
                        <span className="w-24 text-right">
                          {file.modified}
                        </span>
                        <span className="w-20 text-right font-mono">
                          {file.permissions}
                        </span>
                      </div>
                      
                      {file.type === 'directory' && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FileManagerComponent;