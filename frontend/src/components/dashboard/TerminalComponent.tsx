import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Terminal, Send, X, Loader2 } from 'lucide-react';
import { socketService } from '@/lib/socketService';
import { getUser } from '@/lib/authApi';

interface TerminalProps {
  deviceId: string;
  deviceName: string;
  isConnected: boolean;
}

interface TerminalOutput {
  id: string;
  type: 'input' | 'output' | 'error';
  content: string;
  timestamp: Date;
}

const TerminalComponent: React.FC<TerminalProps> = ({ deviceId, deviceName, isConnected }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<TerminalOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    // Socket event listeners
    const handleTerminalReady = (data: { sessionId: string; message: string }) => {
      setSessionId(data.sessionId);
      setIsSessionActive(true);
      setIsLoading(false);
      addOutput('output', data.message);
    };

    const handleTerminalOutput = (data: {
      sessionId: string;
      command: string;
      output: string;
      error: string;
      exitCode: number;
      timestamp: string;
    }) => {
      if (data.command) {
        addOutput('input', `$ ${data.command}`);
      }
      if (data.output) {
        addOutput('output', data.output);
      }
      if (data.error) {
        addOutput('error', data.error);
      }
      setIsLoading(false);
    };

    const handleTerminalError = (data: { error: string; sessionId?: string }) => {
      addOutput('error', `Error: ${data.error}`);
      setIsLoading(false);
      if (data.sessionId === sessionId) {
        setIsSessionActive(false);
      }
    };

    const handleTerminalClosed = (data: { sessionId: string }) => {
      if (data.sessionId === sessionId) {
        setIsSessionActive(false);
        setSessionId(null);
        addOutput('output', 'Terminal session ended.');
      }
    };

    if (socketService.isConnected()) {
      socketService.onTerminalReady(handleTerminalReady);
      socketService.onTerminalOutput(handleTerminalOutput);
      socketService.onTerminalError(handleTerminalError);
      socketService.onTerminalClosed(handleTerminalClosed);
    }

    return () => {
      if (socketService.isConnected()) {
        socketService.off('terminal-ready', handleTerminalReady);
        socketService.off('terminal-output', handleTerminalOutput);
        socketService.off('terminal-error', handleTerminalError);
        socketService.off('terminal-closed', handleTerminalClosed);
      }
    };
  }, [sessionId]);

  const addOutput = (type: 'input' | 'output' | 'error', content: string) => {
    setOutput(prev => [...prev, {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    }]);
  };

  const startTerminalSession = () => {
    const user = getUser();
    if (!user) return;

    setIsLoading(true);
    setOutput([]);
    addOutput('output', `Starting terminal session for ${deviceName}...`);
    
    socketService.startTerminalSession(deviceId, user._id, user.username);
  };

  const endTerminalSession = () => {
    if (sessionId) {
      socketService.endTerminalSession(sessionId);
      setIsSessionActive(false);
      setSessionId(null);
      addOutput('output', 'Ending terminal session...');
    }
  };

  const executeCommand = () => {
    if (!command.trim() || !sessionId || isLoading) return;

    setIsLoading(true);
    socketService.sendTerminalCommand(sessionId, command.trim());
    setCommand('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand();
    }
  };

  const getOutputClassName = (type: string) => {
    switch (type) {
      case 'input':
        return 'text-green-400 font-semibold';
      case 'error':
        return 'text-red-400';
      case 'output':
      default:
        return 'text-gray-300';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Terminal
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            {isSessionActive ? (
              <Button
                onClick={endTerminalSession}
                variant="destructive"
                size="sm"
              >
                <X className="h-4 w-4" />
                End Session
              </Button>
            ) : (
              <Button
                onClick={startTerminalSession}
                disabled={!isConnected || isLoading}
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Terminal className="h-4 w-4" />
                )}
                Start Session
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Terminal Output */}
        <ScrollArea className="h-[300px] w-full">
          <div 
            ref={scrollRef}
            className="bg-black p-4 font-mono text-sm text-gray-300 min-h-full"
          >
            {output.length === 0 ? (
              <div className="text-gray-500">
                Terminal output will appear here. Click "Start Session" to begin.
              </div>
            ) : (
              output.map((item) => (
                <div key={item.id} className={`whitespace-pre-wrap ${getOutputClassName(item.type)}`}>
                  {item.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-yellow-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Executing command...
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Command Input */}
        <div className="border-t bg-muted p-3">
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2">
              <span className="text-sm font-mono text-muted-foreground">$</span>
              <Input
                ref={inputRef}
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isSessionActive ? "Enter command..." : "Start a session to execute commands"}
                disabled={!isSessionActive || isLoading}
                className="font-mono"
              />
            </div>
            <Button
              onClick={executeCommand}
              disabled={!isSessionActive || !command.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TerminalComponent;