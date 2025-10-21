#!/usr/bin/env python3
"""
Test script for the fixed TerminalManager
"""

import sys
import os
import time
import subprocess
import pty
import select
import uuid


class TerminalManager:
    """Terminal session management with PTY support"""

    def __init__(self):
        self.sessions = {}  # session_id -> (process, master_fd)

    def create_session(self, session_id=None):
        """Create a new terminal session with PTY"""
        if not session_id:
            session_id = str(uuid.uuid4())

        # Close existing session if any
        if session_id in self.sessions:
            self.close_session(session_id)

        try:
            # Create PTY pair
            master_fd, slave_fd = pty.openpty()

            # Create bash process with PTY
            process = subprocess.Popen(
                ['/bin/bash', '-i'],  # Interactive bash
                stdin=slave_fd,
                stdout=slave_fd,
                stderr=slave_fd,
                close_fds=True,
                preexec_fn=os.setsid  # Create new session
            )

            # Close slave fd in parent process
            os.close(slave_fd)

            # Store session info
            self.sessions[session_id] = (process, master_fd)
            print(f"Created PTY terminal session: {session_id}")

            # Wait a bit for the shell to initialize
            time.sleep(0.1)

            return session_id

        except Exception as e:
            print(f"Failed to create terminal session: {str(e)}")
            raise

    def execute_command(self, session_id, command, timeout=5):
        """Execute command in terminal session"""
        try:
            if session_id not in self.sessions:
                return {
                    'success': False,
                    'error': 'Terminal session not found'
                }

            process, master_fd = self.sessions[session_id]

            # Check if process is still running
            if process.poll() is not None:
                return {
                    'success': False,
                    'error': 'Terminal session has ended'
                }

            # Send command to PTY
            try:
                command_bytes = (command + '\n').encode('utf-8')
                os.write(master_fd, command_bytes)
            except Exception as e:
                return {
                    'success': False,
                    'error': f'Failed to write command: {str(e)}'
                }

            # Read output with timeout using select
            output_parts = []
            end_time = time.time() + timeout

            while time.time() < end_time:
                # Use select to check if data is available
                rlist, _, _ = select.select([master_fd], [], [], 0.1)

                if master_fd in rlist:
                    try:
                        # Read available data
                        data = os.read(master_fd, 4096).decode(
                            'utf-8', errors='replace')
                        if data:
                            output_parts.append(data)
                        else:
                            break
                    except (OSError, UnicodeDecodeError) as e:
                        print(f"Error reading from PTY: {str(e)}")
                        break
                elif not rlist:
                    # No data available, continue polling
                    continue
                else:
                    break

            # Join all output parts
            full_output = ''.join(output_parts)

            # Clean up the output (remove command echo and prompts)
            lines = full_output.split('\n')
            cleaned_lines = []

            for line in lines:
                # Skip empty lines and command echoes
                line = line.strip()
                if line and not line.endswith('$') and line != command.strip():
                    cleaned_lines.append(line)

            cleaned_output = '\n'.join(
                cleaned_lines) if cleaned_lines else full_output.strip()

            return {
                'success': True,
                'stdout': cleaned_output,
                'stderr': '',  # PTY combines stdout and stderr
                'exit_code': 0,  # PTY doesn't provide exit codes easily
                'session_id': session_id
            }

        except Exception as e:
            print(f"Error executing command in session {session_id}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def close_session(self, session_id):
        """Close terminal session"""
        try:
            if session_id in self.sessions:
                process, master_fd = self.sessions.pop(session_id)

                # Close master fd
                try:
                    os.close(master_fd)
                except OSError:
                    pass  # Already closed

                # Terminate process
                try:
                    process.terminate()
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
                except ProcessLookupError:
                    pass  # Process already dead

                print(f"Closed terminal session: {session_id}")
                return True
            return False
        except Exception as e:
            print(f"Error closing session {session_id}: {str(e)}")
            return False


def test_terminal_manager():
    """Test the TerminalManager functionality"""
    print("🧪 Testing TerminalManager with PTY support...")

    tm = TerminalManager()

    # Test 1: Create session
    print("\n1. Creating terminal session...")
    session_id = tm.create_session()
    print(f"   Session created: {session_id}")

    # Test 2: Simple command
    print("\n2. Testing simple command (ls)...")
    result = tm.execute_command(session_id, 'ls')
    print(f"   Success: {result['success']}")
    if result['success']:
        print(f"   Output: {result['stdout'][:200]}...")
    else:
        print(f"   Error: {result['error']}")

    # Test 3: Change directory
    print("\n3. Testing cd command...")
    result = tm.execute_command(session_id, 'cd ~')
    print(f"   Success: {result['success']}")

    # Test 4: Check if cd persisted
    print("\n4. Testing pwd after cd...")
    result = tm.execute_command(session_id, 'pwd')
    print(f"   Success: {result['success']}")
    if result['success']:
        print(f"   Current directory: {result['stdout']}")
    else:
        print(f"   Error: {result['error']}")

    # Test 5: Environment variable
    print("\n5. Testing environment variable...")
    result = tm.execute_command(session_id, 'export TEST_VAR=hello')
    print(f"   Set variable - Success: {result['success']}")

    result = tm.execute_command(session_id, 'echo $TEST_VAR')
    print(f"   Get variable - Success: {result['success']}")
    if result['success']:
        print(f"   Variable value: {result['stdout']}")

    # Cleanup
    print("\n6. Cleaning up...")
    tm.close_session(session_id)
    print("   Session closed")

    print("\n✅ TerminalManager test completed!")


if __name__ == "__main__":
    try:
        test_terminal_manager()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
