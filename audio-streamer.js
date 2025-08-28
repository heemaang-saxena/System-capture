#!/usr/bin/env node
// audio-streamer.js
// Main executable file for audio streaming with start/stop controls

const { startMicCapture, stopMicCapture, startLoopbackCapture, stopLoopbackCapture } = require('./index');
const WebSocket = require('ws');
const readline = require('readline');

const WS_URL = "wss://omrealtime.cur8.in/ws/audio-stream";
const USER_PARAMS = {
    user_id: "user.abcd@darwix.ai",
    manager_id: "4248",
    company_id: "31",
    team_id: "23",
    full_name: "User Abcd"
};

// Global state
let ws = null;
let wsConfirmed = false;
let micStarted = false;
let systemStarted = false;
let streaming = false;
let micChunkCount = 0;
let sysChunkCount = 0;

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
            }
            if (wsConfirmed && streaming) {
                sendChunk('mic', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
            }
        }, -1);
        console.log('✅ Microphone capture initiated');
    } catch (err) {
        console.error('❌ Failed to start microphone capture:', err);
    }

    console.log('🎧 Starting system audio capture...');
    try {
        startLoopbackCapture((samples, ch, rate) => {
            if (!systemStarted) {
                console.log(`✅ System audio started: ${ch}ch, ${rate}Hz`);
                systemStarted = true;
            }
            if (wsConfirmed && streaming) {
                sendChunk('system', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
            }
        }, -1);
        console.log('✅ System audio capture initiated');
    } catch (err) {
        console.error('❌ Failed to start system audio capture:', err);
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
            if (micChunkCount % 100 === 0) { // Log every 100th chunk
                console.log(`🎤 Mic chunks: ${micChunkCount}`);
            }
        } else if (source === 'system') {
            sysChunkCount++;
            if (sysChunkCount % 100 === 0) { // Log every 100th chunk
                console.log(`🔊 System chunks: ${sysChunkCount}`);
            }
        }
    } catch (err) {
        console.error(`❌ Error sending ${source} chunk:`, err);
    }
}

function connectWebSocket() {
    console.log('📡 Connecting to WebSocket server...');
    
    ws = new WebSocket(buildWsUrl());
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected, waiting for server confirmation...');
    });
    
    ws.on('message', (data) => {
        if (!wsConfirmed) {
            try {
                const msg = JSON.parse(data);
                if (msg.status === 'connected') {
                    wsConfirmed = true;
                    console.log('✅ Server confirmed connection. Starting audio captures...');
                    startAudioCaptures();
                    streaming = true;
                    console.log('🎯 STREAMING STARTED! Audio is being sent to server.');
                    showMenu();
                }
            } catch (e) {
                console.log('📨 Received message:', data.toString());
            }
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
        if (streaming) {
            console.log('⚠️ Connection lost. Use "reconnect" to try again.');
            streaming = false;
            wsConfirmed = false;
        }
    });
    
    ws.on('error', (err) => {
        console.error('❌ WebSocket error:', err);
        if (streaming) {
            console.log('⚠️ Connection error. Use "reconnect" to try again.');
            streaming = false;
            wsConfirmed = false;
        }
    });
}

function stopStreaming() {
    console.log('🛑 Stopping streaming...');
    streaming = false;
    
    try {
        stopMicCapture();
        console.log('✅ Microphone stopped');
        micStarted = false;
    } catch (err) {
        console.error('❌ Error stopping microphone:', err);
    }
    
    try {
        stopLoopbackCapture();
        console.log('✅ System audio stopped');
        systemStarted = false;
    } catch (err) {
        console.error('❌ Error stopping system audio:', err);
    }
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ status: 'disconnect' }));
        ws.close();
    }
    
    console.log('✅ Streaming stopped');
    showMenu();
}

function showStatus() {
    console.log('\n📊 Current Status:');
    console.log(`🎤 Microphone: ${micStarted ? '✅ Active' : '❌ Inactive'}`);
    console.log(`🔊 System Audio: ${systemStarted ? '✅ Active' : '❌ Inactive'}`);
    console.log(`📡 WebSocket: ${wsConfirmed ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`🎯 Streaming: ${streaming ? '✅ Active' : '❌ Inactive'}`);
    console.log(`📈 Mic chunks sent: ${micChunkCount}`);
    console.log(`📈 System chunks sent: ${sysChunkCount}`);
}

function showMenu() {
    console.log('\n🎛️ Audio Streamer Controls:');
    console.log('1. start    - Start streaming audio');
    console.log('2. stop     - Stop streaming audio');
    console.log('3. status   - Show current status');
    console.log('4. reconnect- Reconnect to server');
    console.log('5. quit     - Exit application');
    console.log('Enter command:');
}

function handleCommand(command) {
    switch (command.toLowerCase().trim()) {
        case 'start':
        case '1':
            if (!streaming) {
                if (!ws || ws.readyState !== WebSocket.OPEN) {
                    connectWebSocket();
                } else {
                    streaming = true;
                    console.log('🎯 Streaming resumed!');
                }
            } else {
                console.log('⚠️ Streaming is already active');
            }
            break;
            
        case 'stop':
        case '2':
            if (streaming) {
                stopStreaming();
            } else {
                console.log('⚠️ Streaming is not active');
            }
            break;
            
        case 'status':
        case '3':
            showStatus();
            break;
            
        case 'reconnect':
        case '4':
            console.log('🔄 Reconnecting...');
            if (ws) {
                ws.close();
            }
            wsConfirmed = false;
            streaming = false;
            micChunkCount = 0;
            sysChunkCount = 0;
            setTimeout(connectWebSocket, 1000);
            break;
            
        case 'quit':
        case 'exit':
        case '5':
            console.log('👋 Goodbye!');
            stopStreaming();
            process.exit(0);
            break;
            
        default:
            console.log('❌ Unknown command. Type "help" for available commands.');
            break;
    }
}

// Main application
function main() {
    console.log('🎤 Audio Streamer v1.0');
    console.log('=====================');
    console.log('This application streams microphone and system audio to a WebSocket server.');
    console.log('Make sure your microphone is working and you have permission to access it.');
    
    // Create readline interface
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Handle user input
    rl.on('line', (input) => {
        handleCommand(input);
        if (input.toLowerCase().trim() !== 'quit' && input.toLowerCase().trim() !== 'exit') {
            setTimeout(() => {
                if (streaming) {
                    console.log('\n🎯 Streaming active... (type "stop" to stop, "status" for info)');
                } else {
                    showMenu();
                }
            }, 1000);
        }
    });
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT. Cleaning up...');
        stopStreaming();
        rl.close();
        process.exit(0);
    });
    
    // Show initial menu
    showMenu();
    
    // Auto-start option
    console.log('\n💡 Tip: Type "start" to begin streaming automatically');
}

// Start the application
if (require.main === module) {
    main();
}

module.exports = {
    connectWebSocket,
    stopStreaming,
    showStatus
};
