// stream_wav_auto.js
// Streams any WAV file to the websocket, auto-converting to mono 16kHz 16bit PCM if needed

const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const child_process = require('child_process');

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

function parseWavHeader(buffer) {
    const channels = buffer.readUInt16LE(22);
    const sampleRate = buffer.readUInt32LE(24);
    const bitsPerSample = buffer.readUInt16LE(34);
    return { channels, sampleRate, bitsPerSample };
}

function convertWav(inputPath, outputPath, cb) {
    // Use ffmpeg to convert to mono 16kHz 16bit PCM
    const cmd = `ffmpeg -y -i "${inputPath}" -ac 1 -ar 16000 -sample_fmt s16 "${outputPath}"`;
    child_process.exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error('ffmpeg conversion error:', err);
            cb(err);
        } else {
            cb(null);
        }
    });
}

function streamWav(wavPath) {
    const ws = new WebSocket(buildWsUrl());
    ws.on('open', () => {
        console.log('WebSocket connected, waiting for confirmation...');
    });
    let wsConfirmed = false;
    ws.on('message', (data) => {
        if (!wsConfirmed) {
            try {
                const msg = JSON.parse(data);
                if (msg.status === 'connected') {
                    wsConfirmed = true;
                    console.log('Server confirmed connection:', msg);
                    streamFile();
                }
            } catch (e) { }
        }
    });
    function streamFile() {
        fs.open(wavPath, 'r', (err, fd) => {
            if (err) {
                console.error('Error opening file:', err);
                ws.close();
                return;
            }
            const headerBuf = Buffer.alloc(44);
            fs.read(fd, headerBuf, 0, 44, 0, (err, bytesRead) => {
                if (err || bytesRead < 44) {
                    console.error('Error reading WAV header:', err);
                    ws.close();
                    return;
                }
                const { channels, sampleRate, bitsPerSample } = parseWavHeader(headerBuf);
                const bytesPerSample = bitsPerSample / 8;
                const chunkSize = Math.floor(sampleRate * channels * bytesPerSample * 0.5); // 0.5s chunks
                console.log(`WAV: ${channels}ch, ${sampleRate}Hz, ${bitsPerSample}bit, chunkSize=${chunkSize}`);
                let filePos = 44;
                let chunkCount = 0;
                function sendNextChunk() {
                    const buf = Buffer.alloc(chunkSize);
                    fs.read(fd, buf, 0, chunkSize, filePos, (err, bytesRead) => {
                        if (err) {
                            console.error('Error reading chunk:', err);
                            fs.close(fd, () => { });
                            ws.close();
                            return;
                        }
                        if (bytesRead > 0) {
                            ws.send(buf.slice(0, bytesRead));
                            chunkCount++;
                            filePos += bytesRead;
                            console.log(`Sent chunk #${chunkCount} (${bytesRead} bytes)`);
                            setTimeout(sendNextChunk, 500);
                        } else {
                            ws.send(JSON.stringify({ status: 'disconnect' }));
                            ws.close();
                            fs.close(fd, () => { });
                            console.log('Finished streaming file and sent disconnect');
                        }
                    });
                }
                sendNextChunk();
            });
        });
    }
    ws.on('close', () => {
        console.log('WebSocket closed');
        process.exit(0);
    });
    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        process.exit(1);
    });
}

function autoStream(wavPath) {
    fs.open(wavPath, 'r', (err, fd) => {
        if (err) {
            console.error('Error opening file:', err);
            return;
        }
        const headerBuf = Buffer.alloc(44);
        fs.read(fd, headerBuf, 0, 44, 0, (err, bytesRead) => {
            fs.close(fd, () => { });
            if (err || bytesRead < 44) {
                console.error('Error reading WAV header:', err);
                return;
            }
            const { channels, sampleRate, bitsPerSample } = parseWavHeader(headerBuf);
            if (channels === 1 && sampleRate === 16000 && bitsPerSample === 16) {
                // Already correct format
                streamWav(wavPath);
            } else {
                // Convert first
                const outPath = wavPath.replace(/\.wav$/, '_converted.wav');
                console.log(`Converting ${wavPath} to mono 16kHz 16bit...`);
                convertWav(wavPath, outPath, (err) => {
                    if (!err) {
                        streamWav(outPath);
                    }
                });
            }
        });
    });
}

// Usage: node stream_wav_auto.js agent.wav
const inputWav = process.argv[2] || path.join(__dirname, 'customer.wav');
autoStream(inputWav);
