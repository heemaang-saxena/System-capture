const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { startMicCapture, stopMicCapture, startLoopbackCapture, stopLoopbackCapture } = require('./index');
const WebSocket = require('ws');

// Global state
let mainWindow;
let ws = null;
let wsConfirmed = false;
let micStarted = false;
let systemStarted = false;
let streaming = false;
let micChunkCount = 0;
let sysChunkCount = 0;

const WS_URL = "wss://omrealtime.cur8.in/ws/audio-stream";
const USER_PARAMS = {
    user_id: "user.abcd@darwix.ai",
    manager_id: "4248",
    company_id: "31",
    team_id: "23",
    full_name: "User Abcd"
};

function buildWsUrl() {
    const params = new URLSearchParams(USER_PARAMS).toString();
    return `${WS_URL}?${params}`;
}

function downsampleBuffer(buffer, inChannels, inRate, outChannels = 1, outRate = 16000) {
    // Convert stereo to mono (average channels)
    let samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    if (inChannels === 2 && outChannels === 1) {
        const mono = new Int16Array(samples.length / 2);
        for (let i = 0; i < mono.length; i++) {
            mono[i] = ((samples[i * 2] + samples[i * 2 + 1]) / 2) | 0;
        }
        samples = mono;
    }
    // Downsample (simple decimation)
    if (inRate !== outRate) {
        const factor = inRate / outRate;
        const outLen = Math.floor(samples.length / factor);
        const down = new Int16Array(outLen);
        for (let i = 0; i < outLen; i++) {
            down[i] = samples[Math.floor(i * factor)];
        }
        samples = down;
    }
    return Buffer.from(samples.buffer);
}

function startAudioCaptures() {
    console.log('🎙️ Starting microphone capture...');
    try {
        startMicCapture((samples, ch, rate) => {
            if (!micStarted) {
                console.log(`✅ Microphone started: ${ch}ch, ${rate}Hz`);
                micStarted = true;
                mainWindow.webContents.send('status-update', {
                    mic: true,
                    micChannels: ch,
                    micRate: rate
                });
            }
            if (wsConfirmed && streaming) {
                sendChunk('mic', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
            }
        }, -1);
        console.log('✅ Microphone capture initiated');
    } catch (err) {
        console.error('❌ Failed to start microphone capture:', err);
        mainWindow.webContents.send('error', 'Failed to start microphone capture: ' + err.message);
    }

    console.log('🎧 Starting system audio capture...');
    try {
        startLoopbackCapture((samples, ch, rate) => {
            if (!systemStarted) {
                console.log(`✅ System audio started: ${ch}ch, ${rate}Hz`);
                systemStarted = true;
                mainWindow.webContents.send('status-update', {
                    system: true,
                    systemChannels: ch,
                    systemRate: rate
                });
            }
            if (wsConfirmed && streaming) {
                sendChunk('system', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
            }
        }, -1);
        console.log('✅ System audio capture initiated');
    } catch (err) {
        console.error('❌ Failed to start system audio capture:', err);
        mainWindow.webContents.send('error', 'Failed to start system audio capture: ' + err.message);
    }
}

function sendChunk(source, chunk, ch, rate) {
    try {
        // Downsample to mono 16kHz 16bit
        const buf = downsampleBuffer(chunk, ch, rate, 1, 16000);
        
        // Send as binary data
        ws.send(buf);
        
        if (source === 'mic') {
            micChunkCount++;
            if (micChunkCount % 100 === 0) {
                mainWindow.webContents.send('chunk-update', {
                    mic: micChunkCount,
                    system: sysChunkCount
                });
            }
        } else if (source === 'system') {
            sysChunkCount++;
            if (sysChunkCount % 100 === 0) {
                mainWindow.webContents.send('chunk-update', {
                    mic: micChunkCount,
                    system: sysChunkCount
                });
            }
        }
    } catch (err) {
        console.error(`❌ Error sending ${source} chunk:`, err);
        mainWindow.webContents.send('error', `Error sending ${source} chunk: ` + err.message);
    }
}

function connectWebSocket() {
    console.log('📡 Connecting to WebSocket server...');
    mainWindow.webContents.send('log', 'Connecting to WebSocket server...');
    
    ws = new WebSocket(buildWsUrl());
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected, waiting for server confirmation...');
        mainWindow.webContents.send('log', 'WebSocket connected, waiting for server confirmation...');
        mainWindow.webContents.send('status-update', { websocket: 'connecting' });
    });
    
    ws.on('message', (data) => {
        if (!wsConfirmed) {
            try {
                const msg = JSON.parse(data);
                if (msg.status === 'connected') {
                    wsConfirmed = true;
                    console.log('✅ Server confirmed connection. Starting audio captures...');
                    mainWindow.webContents.send('log', 'Server confirmed connection. Starting audio captures...');
                    mainWindow.webContents.send('status-update', { websocket: 'connected' });
                    startAudioCaptures();
                    streaming = true;
                    console.log('🎯 STREAMING STARTED! Audio is being sent to server.');
                    mainWindow.webContents.send('log', 'STREAMING STARTED! Audio is being sent to server.');
                    mainWindow.webContents.send('status-update', { streaming: true });
                }
            } catch (e) {
                console.log('📨 Received message:', data.toString());
                mainWindow.webContents.send('log', 'Received message: ' + data.toString());
            }
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        mainWindow.webContents.send('log', 'WebSocket connection closed');
        mainWindow.webContents.send('status-update', { websocket: 'disconnected' });
        if (streaming) {
            console.log('⚠️ Connection lost. Use "reconnect" to try again.');
            mainWindow.webContents.send('log', 'Connection lost. Use reconnect to try again.');
            streaming = false;
            wsConfirmed = false;
            mainWindow.webContents.send('status-update', { streaming: false });
        }
    });
    
    ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err);
        mainWindow.webContents.send('error', 'WebSocket error: ' + err.message);
        mainWindow.webContents.send('status-update', { websocket: 'error' });
        if (streaming) {
            console.log('⚠️ Connection error. Use "reconnect" to try again.');
            mainWindow.webContents.send('log', 'Connection error. Use reconnect to try again.');
            streaming = false;
            wsConfirmed = false;
            mainWindow.webContents.send('status-update', { streaming: false });
        }
    });
}

function stopStreaming() {
    console.log('🛑 Stopping streaming...');
    mainWindow.webContents.send('log', 'Stopping streaming...');
    streaming = false;
    
    try {
        stopMicCapture();
        console.log('✅ Microphone stopped');
        mainWindow.webContents.send('log', 'Microphone stopped');
        micStarted = false;
        mainWindow.webContents.send('status-update', { mic: false });
    } catch (err) {
        console.error('❌ Error stopping microphone:', err);
        mainWindow.webContents.send('error', 'Error stopping microphone: ' + err.message);
    }
    
    try {
        stopLoopbackCapture();
        console.log('✅ System audio stopped');
        mainWindow.webContents.send('log', 'System audio stopped');
        systemStarted = false;
        mainWindow.webContents.send('status-update', { system: false });
    } catch (err) {
        console.error('❌ Error stopping system audio:', err);
        mainWindow.webContents.send('error', 'Error stopping system audio: ' + err.message);
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ status: 'disconnect' }));
        ws.close();
    }
    
    console.log('✅ Streaming stopped');
    mainWindow.webContents.send('log', 'Streaming stopped');
    mainWindow.webContents.send('status-update', { streaming: false });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'electron-preload.js')
        },
        title: 'Audio Streamer v1.0',
        icon: path.join(__dirname, 'assets', 'icon.ico'),
        resizable: true,
        show: false
    });

    mainWindow.loadFile('electron-renderer.html');

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// IPC handlers
ipcMain.handle('start-streaming', async () => {
    if (!streaming) {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            connectWebSocket();
        } else {
            streaming = true;
            mainWindow.webContents.send('log', 'Streaming resumed!');
            mainWindow.webContents.send('status-update', { streaming: true });
        }
    }
    return { success: true };
});

ipcMain.handle('stop-streaming', async () => {
    if (streaming) {
        stopStreaming();
    }
    return { success: true };
});

ipcMain.handle('reconnect', async () => {
    console.log('🔄 Reconnecting...');
    mainWindow.webContents.send('log', 'Reconnecting...');
    if (ws) {
        ws.close();
    }
    wsConfirmed = false;
    streaming = false;
    micChunkCount = 0;
    sysChunkCount = 0;
    mainWindow.webContents.send('status-update', { 
        streaming: false, 
        websocket: 'disconnected',
        mic: false,
        system: false
    });
    mainWindow.webContents.send('chunk-update', { mic: 0, system: 0 });
    setTimeout(connectWebSocket, 1000);
    return { success: true };
});

ipcMain.handle('get-status', async () => {
    return {
        mic: micStarted,
        system: systemStarted,
        websocket: wsConfirmed ? 'connected' : (ws ? 'connecting' : 'disconnected'),
        streaming: streaming,
        micChunks: micChunkCount,
        systemChunks: sysChunkCount
    };
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        stopStreaming();
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    stopStreaming();
});
