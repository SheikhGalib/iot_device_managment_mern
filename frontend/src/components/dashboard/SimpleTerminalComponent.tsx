import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Send, Copy, Trash2 } from "lucide-react";
import { deviceApi } from "@/lib/deviceApi";
import { useToast } from "@/hooks/use-toast";

interface SimpleTerminalComponentProps {
  deviceId: string;
  deviceName: string;
}

interface CommandResult {
  id: string;
  command: string;
  timestamp: Date;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  success: boolean;
  error?: string;
  currentDir?: string;
}

const SimpleTerminalComponent: React.FC<SimpleTerminalComponentProps> = ({
  deviceId,
  deviceName
}) => {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentDir, setCurrentDir] = useState('~');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  // Initialize terminal session on component mount
  useEffect(() => {
    // Add welcome message
    if (history.length === 0) {
      setHistory([{
        id: 'welcome',
        command: '',
        timestamp: new Date(),
        success: true,
        stdout: `Welcome to ${deviceName} terminal.\nPersistent PTY session - your environment changes (cd, export, etc.) will persist.\nType 'pwd' to see current directory, 'help' for common commands.`,
        currentDir: '~'
      }]);
    }
  }, [deviceName]);

  const executeCommand = async () => {
    if (!command.trim() || isExecuting) return;

    const commandToExecute = command.trim();
    setCommand('');
    
    // Handle built-in help command
    if (commandToExecute === 'help') {
      showHelp();
      return;
    }

    setIsExecuting(true);

    // Add command to history immediately
    const pendingResult: CommandResult = {
      id: Date.now().toString(),
      command: commandToExecute,
      timestamp: new Date(),
      success: false,
    };

    setHistory(prev => [...prev, pendingResult]);

    try {
      const response = await deviceApi.executeCommand(deviceId, commandToExecute);
      
      // Update current directory if this was a cd command and it succeeded
      if ((response as any).success && commandToExecute.trim().startsWith('cd ')) {
        // Try to get current directory with pwd
        try {
          const pwdResponse = await deviceApi.executeCommand(deviceId, 'pwd');
          if ((pwdResponse as any).success && (pwdResponse as any).stdout) {
            const newDir = (pwdResponse as any).stdout.trim();
            setCurrentDir(newDir.replace(/^\/home\/[^\/]+/, '~'));
          }
        } catch (e) {
          // If pwd fails, just update based on command
          if (commandToExecute.trim() === 'cd' || commandToExecute.trim() === 'cd ~') {
            setCurrentDir('~');
          }
        }
      }
      
      // Update the command result
      setHistory(prev => prev.map(item => 
        item.id === pendingResult.id 
          ? {
              ...item,
              success: (response as any).success,
              stdout: (response as any).stdout,
              stderr: (response as any).stderr,
              exit_code: (response as any).exit_code,
              error: (response as any).error,
              currentDir: currentDir
            }
          : item
      ));

      if (!(response as any).success) {
        toast({
          title: "Command Failed", 
          description: (response as any).error || "Unknown error occurred",
          variant: "destructive"
        });
      } else if ((response as any).stdout && (response as any).stdout.trim() === '') {
        // For commands that don't produce output (like cd), show success indicator
        if (commandToExecute.trim().startsWith('cd ') || 
            commandToExecute.trim() === 'cd' ||
            commandToExecute.trim().startsWith('export ')) {
          setHistory(prev => prev.map(item => 
            item.id === pendingResult.id 
              ? {
                  ...item,
                  stdout: '✓ Command executed successfully'
                }
              : item
          ));
        }
      }
    } catch (error) {
      // Update the command result with error
      setHistory(prev => prev.map(item => 
        item.id === pendingResult.id 
          ? {
              ...item,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          : item
      ));

      toast({
        title: "Execution Error",
        description: "Failed to execute command",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand();
    }
    // Also support Ctrl+C to clear current command
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setCommand('');
      toast({
        title: "Interrupted",
        description: "Command input cleared",
      });
    }
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
    toast({
      title: "Copied!",
      description: "Output copied to clipboard",
    });
  };

  const clearHistory = () => {
    setHistory([{
      id: 'welcome-after-clear',
      command: '',
      timestamp: new Date(),
      success: true,
      stdout: `Terminal cleared. Session is still active.\nYour environment variables and current directory are preserved.`,
      currentDir: currentDir
    }]);
    toast({
      title: "Cleared",
      description: "Terminal history cleared (session preserved)",
    });
  };

  const showHelp = () => {
    const helpContent = `Common Commands:
• ls -la          - List files and directories
• pwd             - Show current directory  
• cd ~            - Go to home directory
• cd /path        - Change directory
• export VAR=val  - Set environment variable
• echo $VAR       - Show environment variable
• ps aux          - List running processes
• df -h           - Show disk usage
• free -h         - Show memory usage
• top             - Show system processes (press 'q' to quit)
• nano filename   - Edit a file
• cat filename    - Display file contents
• mkdir dirname   - Create directory
• rm filename     - Remove file
• cp src dest     - Copy file
• mv old new      - Move/rename file

Note: This is a persistent PTY terminal. Your cd changes and environment variables persist between commands.`;
    
    setHistory(prev => [...prev, {
      id: Date.now().toString(),
      command: '',
      timestamp: new Date(),
      success: true,
      stdout: helpContent,
      currentDir: currentDir
    }]);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Terminal - {deviceName}
            </CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              Persistent PTY Session • Current: {currentDir}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCommand('help')}>
              Help
            </Button>
            <Button variant="outline" size="sm" onClick={clearHistory}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Terminal Output */}
        <ScrollArea className="flex-1 mb-4 border rounded-md p-3 bg-black text-green-400 font-mono text-sm" ref={scrollAreaRef}>
          <div className="space-y-2">
            {history.map((result) => (
              <div key={result.id} className="space-y-1">
                {/* Command */}
                {result.command && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-blue-400">
                      user@{deviceName.toLowerCase().replace(/\s+/g, '-')}:{result.currentDir || currentDir}$
                    </span>
                    <span className="text-white break-all">{result.command}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {result.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                )}
                
                {/* Output */}
                {result.success !== undefined && (
                  <div className={result.command ? "ml-4" : ""}>
                    {result.success ? (
                      <>
                        {result.stdout && (
                          <div className="relative group">
                            <pre className="whitespace-pre-wrap text-green-400 break-words">
                              {result.stdout}
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyOutput(result.stdout || '');
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {result.stderr && (
                          <div className="relative group">
                            <pre className="whitespace-pre-wrap text-red-400 break-words">
                              {result.stderr}
                            </pre>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyOutput(result.stderr || '');
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {result.exit_code !== undefined && result.exit_code !== 0 && (
                          <div className="text-orange-400 text-xs">
                            Exit code: {result.exit_code}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-red-400 break-words">
                        Error: {result.error || 'Command execution failed'}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Loading indicator */}
                {result.success === undefined && isExecuting && (
                  <div className="ml-4 text-yellow-400 animate-pulse">
                    Executing...
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Command Input */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
            <span className="text-sm font-mono text-muted-foreground whitespace-nowrap">
              user@{deviceName.toLowerCase().replace(/\s+/g, '-')}:{currentDir}$
            </span>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type command here..."
              disabled={isExecuting}
              className="flex-1 font-mono"
              autoFocus
            />
            <Button
              onClick={executeCommand}
              disabled={!command.trim() || isExecuting}
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {isExecuting ? 'Running...' : 'Run'}
            </Button>
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-center">
            Press Enter to execute commands • Ctrl+C to clear input • Persistent PTY session
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleTerminalComponent;