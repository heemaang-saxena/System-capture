// electron-renderer.js
// Renderer process script for the desktop application

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const startBtn = document.getElementById('start-btn');
    const stopBtn = document.getElementById('stop-btn');
    const reconnectBtn = document.getElementById('reconnect-btn');
    
    const micStatus = document.getElementById('mic-status');
    const systemStatus = document.getElementById('system-status');
    const websocketStatus = document.getElementById('websocket-status');
    const streamingStatus = document.getElementById('streaming-status');
    
    const micText = document.getElementById('mic-text');
    const systemText = document.getElementById('system-text');
    const websocketText = document.getElementById('websocket-text');
    const streamingText = document.getElementById('streaming-text');
    
    const micChunks = document.getElementById('mic-chunks');
    const systemChunks = document.getElementById('system-chunks');
    const logContent = document.getElementById('log-content');

    // Button event listeners
    startBtn.addEventListener('click', async () => {
        try {
            startBtn.disabled = true;
            addLog('Starting streaming...', 'info');
            await window.electronAPI.startStreaming();
        } catch (error) {
            addLog('Failed to start streaming: ' + error.message, 'error');
        } finally {
            startBtn.disabled = false;
        }
    });

    stopBtn.addEventListener('click', async () => {
        try {
            stopBtn.disabled = true;
            addLog('Stopping streaming...', 'info');
            await window.electronAPI.stopStreaming();
        } catch (error) {
            addLog('Failed to stop streaming: ' + error.message, 'error');
        } finally {
            stopBtn.disabled = false;
        }
    });

    reconnectBtn.addEventListener('click', async () => {
        try {
            reconnectBtn.disabled = true;
            addLog('Reconnecting...', 'info');
            await window.electronAPI.reconnect();
        } catch (error) {
            addLog('Failed to reconnect: ' + error.message, 'error');
        } finally {
            reconnectBtn.disabled = false;
        }
    });

    // IPC event listeners
    window.electronAPI.onStatusUpdate((event, status) => {
        updateStatus(status);
    });

    window.electronAPI.onChunkUpdate((event, chunks) => {
        updateChunks(chunks);
    });

    window.electronAPI.onLog((event, message) => {
        addLog(message, 'info');
    });

    window.electronAPI.onError((event, error) => {
        addLog(error, 'error');
    });

    // Helper functions
    function updateStatus(status) {
        if (status.mic !== undefined) {
            if (status.mic) {
                micStatus.className = 'status-card active';
                micText.textContent = 'Active';
                if (status.micChannels && status.micRate) {
                    micText.textContent = `Active (${status.micChannels}ch, ${status.micRate}Hz)`;
                }
            } else {
                micStatus.className = 'status-card inactive';
                micText.textContent = 'Inactive';
            }
        }

        if (status.system !== undefined) {
            if (status.system) {
                systemStatus.className = 'status-card active';
                systemText.textContent = 'Active';
                if (status.systemChannels && status.systemRate) {
                    systemText.textContent = `Active (${status.systemChannels}ch, ${status.systemRate}Hz)`;
                }
            } else {
                systemStatus.className = 'status-card inactive';
                systemText.textContent = 'Inactive';
            }
        }

        if (status.websocket !== undefined) {
            switch (status.websocket) {
                case 'connected':
                    websocketStatus.className = 'status-card active';
                    websocketText.textContent = 'Connected';
                    break;
                case 'connecting':
                    websocketStatus.className = 'status-card';
                    websocketText.textContent = 'Connecting...';
                    break;
                case 'disconnected':
                    websocketStatus.className = 'status-card inactive';
                    websocketText.textContent = 'Disconnected';
                    break;
                case 'error':
                    websocketStatus.className = 'status-card inactive';
                    websocketText.textContent = 'Error';
                    break;
            }
        }

        if (status.streaming !== undefined) {
            if (status.streaming) {
                streamingStatus.className = 'status-card active';
                streamingText.textContent = 'Active';
                startBtn.disabled = true;
                stopBtn.disabled = false;
            } else {
                streamingStatus.className = 'status-card inactive';
                streamingText.textContent = 'Inactive';
                startBtn.disabled = false;
                stopBtn.disabled = true;
            }
        }
    }

    function updateChunks(chunks) {
        if (chunks.mic !== undefined) {
            micChunks.textContent = chunks.mic.toLocaleString();
        }
        if (chunks.system !== undefined) {
            systemChunks.textContent = chunks.system.toLocaleString();
        }
    }

    function addLog(message, type = 'info') {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.textContent = `[${timestamp}] ${message}`;
        
        logContent.appendChild(logEntry);
        
        // Auto-scroll to bottom
        logContent.scrollTop = logContent.scrollHeight;
        
        // Keep only last 50 log entries
        while (logContent.children.length > 50) {
            logContent.removeChild(logContent.firstChild);
        }
    }

    // Initialize status
    async function initializeStatus() {
        try {
            const status = await window.electronAPI.getStatus();
            updateStatus(status);
            updateChunks({
                mic: status.micChunks || 0,
                system: status.systemChunks || 0
            });
        } catch (error) {
            addLog('Failed to get initial status: ' + error.message, 'error');
        }
    }

    // Initialize on load
    initializeStatus();

    // Add some helpful tips
    setTimeout(() => {
        addLog('💡 Tip: Make sure your microphone is working and you have permission to access it.', 'info');
    }, 2000);
});
