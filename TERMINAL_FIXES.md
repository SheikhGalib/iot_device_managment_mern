# Terminal Command Execution Fixes

## Issues Fixed

### 1. **Blocking readline() Problem**

**Problem**: `process.stdout.readline()` blocks indefinitely when commands don't output newlines immediately  
**Cause**: Commands like `cd ~/` don't produce immediate output, causing the frontend to timeout  
**Fix**: Replaced with non-blocking `select()` + `os.read()` using PTY

### 2. **No State Persistence**

**Problem**: Each command ran in a separate subprocess, so `cd` commands didn't persist  
**Cause**: `subprocess.Popen` creates isolated processes  
**Fix**: Implemented persistent PTY-based terminal sessions that maintain shell state

### 3. **Poor Timeout Handling**

**Problem**: 5-second timeout loop with `readline()` didn't work reliably  
**Cause**: `readline()` blocks regardless of timeout loop  
**Fix**: Used `select()` with proper timeout handling for non-blocking reads

### 4. **No Interactive Shell Features**

**Problem**: Commands requiring interactive shell features failed  
**Cause**: Standard subprocess doesn't provide PTY/terminal environment  
**Fix**: Created PTY pair with interactive bash (`/bin/bash -i`)

## Key Changes Made

### 1. **TerminalManager Class** (Complete Rewrite)

```python
# Before: subprocess.Popen with pipes
process = subprocess.Popen(['/bin/bash'], stdin=PIPE, stdout=PIPE, stderr=STDOUT)

# After: PTY-based session
master_fd, slave_fd = pty.openpty()
process = subprocess.Popen(['/bin/bash', '-i'], stdin=slave_fd, stdout=slave_fd, stderr=slave_fd)
```

### 2. **Non-blocking Command Execution**

```python
# Before: blocking readline()
line = process.stdout.readline()

# After: non-blocking select + read
rlist, _, _ = select.select([master_fd], [], [], 0.1)
if master_fd in rlist:
    data = os.read(master_fd, 4096).decode('utf-8')
```

### 3. **HttpApiServer Integration**

- Added `TerminalManager` instance to `HttpApiServer`
- Created persistent session for HTTP API commands
- Updated `execute_command()` to use PTY-based terminal
- Added proper cleanup methods

### 4. **Enhanced Error Handling**

- Better error messages for session management
- Graceful handling of PTY read/write errors
- Proper process cleanup on session close
- Debug logging for troubleshooting

## New Features

### 1. **Persistent Shell State**

- Directory changes (`cd`) persist between commands
- Environment variables persist across commands
- Shell history and aliases work properly

### 2. **Proper Interactive Shell**

- Support for shell built-ins like `cd`, `export`, `alias`
- Proper handling of shell prompts and output
- Interactive command behavior

### 3. **Robust Session Management**

- Sessions survive multiple commands
- Automatic session creation for HTTP API
- Proper cleanup on server shutdown
- Session isolation between different clients

### 4. **Better Output Processing**

- Filters out command echoes and prompts
- Handles unicode characters properly
- Combines stdout/stderr as real terminals do
- Configurable timeout per command

## Files Modified

### 1. `edgeServer/edge_server.py`

- **Imports**: Added `pty` and `select` modules
- **TerminalManager**: Complete rewrite with PTY support
- **HttpApiServer**: Added terminal manager integration
- **execute_command**: Updated to use persistent terminal sessions
- **Cleanup**: Added proper resource cleanup methods

### 2. **New Test File**: `test_terminal_manager.py`

- Standalone test script to verify PTY functionality
- Tests session persistence, command execution, and cleanup

## How the New System Works

### 1. **Session Creation**

```python
# Create PTY pair
master_fd, slave_fd = pty.openpty()

# Start interactive bash with PTY
process = subprocess.Popen(['/bin/bash', '-i'],
                          stdin=slave_fd, stdout=slave_fd, stderr=slave_fd)
```

### 2. **Command Execution**

```python
# Send command to PTY
os.write(master_fd, (command + '\n').encode('utf-8'))

# Read output with timeout
while time.time() < end_time:
    rlist, _, _ = select.select([master_fd], [], [], 0.1)
    if master_fd in rlist:
        data = os.read(master_fd, 4096).decode('utf-8')
        output_parts.append(data)
```

### 3. **Session Persistence**

- Same bash process handles all commands
- Shell state (pwd, env vars, aliases) persists
- Sessions maintained until explicitly closed

## Expected Results

### Before Fixes

- ❌ `cd` commands don't change directory
- ❌ Commands timeout with "Unknown error"
- ❌ No persistent shell state
- ❌ Interactive commands fail

### After Fixes

- ✅ `cd` commands work and persist
- ✅ All bash built-ins work properly
- ✅ Environment variables persist
- ✅ Fast, reliable command execution
- ✅ Proper error messages
- ✅ Interactive shell features

## Testing Commands

After restarting the edge server, these should work:

```bash
# Test basic commands
ls -la

# Test directory change (should persist)
cd ~/
pwd

# Test environment variables (should persist)
export TEST_VAR=hello
echo $TEST_VAR

# Test shell built-ins
alias ll='ls -la'
ll

# Test command chaining
cd /tmp && pwd && ls
```

## Deployment Instructions

1. **Copy updated `edge_server.py` to Orange Pi**
2. **Restart the edge server** with the same command
3. **Test terminal from frontend** - commands should now work properly
4. **Check edge server logs** for "Created PTY terminal session" messages

The new PTY-based approach provides a true terminal experience that matches what users expect from SSH or local terminal access.
