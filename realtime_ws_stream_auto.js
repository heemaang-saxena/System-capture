// realtime_ws_stream_auto.js
// Streams real-time mic and system audio to websocket, auto-converting to mono 16kHz 16bit PCM

const { startMicCapture, stopMicCapture, startLoopbackCapture, stopLoopbackCapture } = require('./index');
const WebSocket = require('ws');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');

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

// Stream both mic and system audio in parallel to the same websocket
console.log('🎤 Starting real-time audio streaming...');
console.log('📡 Connecting to WebSocket server...');

const ws = new WebSocket(buildWsUrl());
let wsConfirmed = false;
let micStarted = false;
let systemStarted = false;

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
                
                // Start audio captures after WebSocket confirmation
                startAudioCaptures();
            }
        } catch (e) {
            console.log('📨 Received message:', data.toString());
        }
    }
});

function startAudioCaptures() {
    console.log('🎙️ Starting microphone capture...');
    try {
        startMicCapture((samples, ch, rate) => {
            if (!micStarted) {
                console.log(`🎤 Microphone started: ${ch}ch, ${rate}Hz`);
                micStarted = true;
            }
            if (wsConfirmed && !stopped) {
                sendChunk('mic', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
            }
        }, -1); // Use default microphone
        console.log('✅ Microphone capture initiated');
    } catch (err) {
        console.error('❌ Failed to start microphone capture:', err);
    }

    console.log('🎧 Starting system audio capture...');
    try {
        startLoopbackCapture((samples, ch, rate) => {
            if (!systemStarted) {
                console.log(`🔊 System audio started: ${ch}ch, ${rate}Hz`);
                systemStarted = true;
            }
            if (wsConfirmed && !stopped) {
                sendChunk('system', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
            }
        }, -1); // Use default system audio
        console.log('✅ System audio capture initiated');
    } catch (err) {
        console.error('❌ Failed to start system audio capture:', err);
    }
}

let stopped = false;
let micChunkCount = 0;
let sysChunkCount = 0;

function sendChunk(source, chunk, ch, rate) {
    try {
        // Downsample to mono 16kHz 16bit
        const buf = downsampleBuffer(chunk, ch, rate, 1, 16000);
        
        // Send as binary data (more efficient than base64)
        ws.send(buf);
        
        if (source === 'mic') {
            micChunkCount++;
            if (micChunkCount % 10 === 0) { // Log every 10th chunk
                console.log(`🎤 Mic chunk #${micChunkCount} (${buf.length} bytes)`);
            }
        } else if (source === 'system') {
            sysChunkCount++;
            if (sysChunkCount % 10 === 0) { // Log every 10th chunk
                console.log(`🔊 System chunk #${sysChunkCount} (${buf.length} bytes)`);
            }
        }
    } catch (err) {
        console.error(`❌ Error sending ${source} chunk:`, err);
    }
}

// Session timeout - 30 minutes
setTimeout(() => {
    console.log('⏰ Session timeout reached. Stopping captures...');
    stopped = true;
    
    try {
        stopMicCapture();
        console.log('🛑 Microphone capture stopped');
    } catch (err) {
        console.error('❌ Error stopping microphone:', err);
    }
    
    try {
        stopLoopbackCapture();
        console.log('🛑 System audio capture stopped');
    } catch (err) {
        console.error('❌ Error stopping system audio:', err);
    }
    
    ws.send(JSON.stringify({ status: 'disconnect' }));
    ws.close();
    console.log('🔌 WebSocket disconnected');
}, 1800000); // 30 minutes

ws.on('close', () => {
    console.log('🔌 WebSocket connection closed');
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('❌ WebSocket error:', err);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Cleaning up...');
    stopped = true;
    stopMicCapture();
    stopLoopbackCapture();
    ws.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM. Cleaning up...');
    stopped = true;
    stopMicCapture();
    stopLoopbackCapture();
    ws.close();
    process.exit(0);
});
