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

function streamRealtime(source, label) {
    const ws = new WebSocket(buildWsUrl());
    ws.on('open', () => {
        console.log(`[${label}] WebSocket connected, waiting for confirmation...`);
    });
    let wsConfirmed = false;
    ws.on('message', (data) => {
        if (!wsConfirmed) {
            try {
                const msg = JSON.parse(data);
                if (msg.status === 'connected') {
                    wsConfirmed = true;
                    console.log(`[${label}] Server confirmed connection.`);
                }
            } catch (e) { }
        }
    });
    let stopped = false;
    let chunkCount = 0;
    function sendChunk(chunk, ch, rate) {
        // Downsample to mono 16kHz 16bit
        const buf = downsampleBuffer(chunk, ch, rate, 1, 16000);
        ws.send(buf);
        chunkCount++;
        console.log(`[${label}] Sent chunk #${chunkCount} (${buf.length} bytes)`);
    }
    source((samples, ch, rate) => {
        if (!stopped && wsConfirmed) {
            sendChunk(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
        }
    });
    setTimeout(() => {
        stopped = true;
        if (label === 'Mic') stopMicCapture();
        if (label === 'System') stopLoopbackCapture();
        ws.send(JSON.stringify({ status: 'disconnect' }));
        ws.close();
        console.log(`[${label}] Stopped and disconnected.`);
    }, 3000000); // 30s
    ws.on('close', () => {
        process.exit(0);
    });
    ws.on('error', (err) => {
        console.error(`[${label}] WebSocket error:`, err);
        process.exit(1);
    });
}

// Stream both mic and system audio in parallel to the same websocket
const ws = new WebSocket(buildWsUrl());
let wsConfirmed = false;
ws.on('open', () => {
    console.log('[Call] WebSocket connected, waiting for confirmation...');
});
ws.on('message', (data) => {
    if (!wsConfirmed) {
        try {
            const msg = JSON.parse(data);
            if (msg.status === 'connected') {
                wsConfirmed = true;
                console.log('[Call] Server confirmed connection. Streaming mic and system audio...');
            }
        } catch (e) { }
    }
});
let stopped = false;
let micChunkCount = 0;
let sysChunkCount = 0;
function sendChunk(source, chunk, ch, rate) {
    // Downsample to mono 16kHz 16bit
    const buf = downsampleBuffer(chunk, ch, rate, 1, 16000);
    // Tag the source
    ws.send(JSON.stringify({ source, data: buf.toString('base64') }));
    // Removed logging for sent chunks
}
startMicCapture((samples, ch, rate) => {
    if (!stopped && wsConfirmed) {
        sendChunk('mic', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
    }
});
startLoopbackCapture((samples, ch, rate) => {
    if (!stopped && wsConfirmed) {
        sendChunk('system', Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), ch, rate);
    }
});
// Only one timeout should control the session. Set to 30 minutes (1800000 ms) for long calls.
setTimeout(() => {
    stopped = true;
    stopMicCapture();
    stopLoopbackCapture();
    ws.send(JSON.stringify({ status: 'disconnect' }));
    ws.close();
    console.log('[Call] Stopped and disconnected.');
}, 1800000); // 30 minutes
ws.on('close', () => {
    process.exit(0);
});
ws.on('error', (err) => {
    console.error('[Call] WebSocket error:', err);
    process.exit(1);
});
