// record_separate_wav.js
// Captures system (loopback) and mic audio simultaneously and writes two separate WAV files

const fs = require('fs');
const path = require('path');
const { startMicCapture, stopMicCapture, startLoopbackCapture, stopLoopbackCapture } = require('./index');

const MIC_OUTPUT_PATH = path.join(__dirname, 'agent.wav');
const LOOPBACK_OUTPUT_PATH = path.join(__dirname, 'customer.wav');
const RECORD_SECONDS = 30; // Change as needed

let micChunks = [];
let loopbackChunks = [];
let micInfo = {};
let loopInfo = {};
let recording = true;

function flattenChunks(chunks) {
    return Buffer.concat(chunks);
}

function writeWav(filename, buf, channels, sampleRate) {
    const samples = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
    const byteRate = sampleRate * channels * 2;
    const blockAlign = channels * 2;
    const dataSize = samples.length * 2;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < samples.length; i++) {
        buffer.writeInt16LE(samples[i], 44 + i * 2);
    }
    fs.writeFileSync(filename, buffer);
    console.log(`💾 WAV written: ${filename} (${samples.length} samples @ ${sampleRate}Hz, ${channels}ch, ~${(samples.length / sampleRate).toFixed(2)} sec)`);
}

function startRecording() {
    let micReady = false;
    let loopReady = false;
    startMicCapture((samples, ch, rate) => {
        if (!micReady) {
            micInfo = { channels: ch, sampleRate: rate };
            micReady = true;
            console.log(`[MIC] channels=${ch}, sampleRate=${rate}`);
        }
        const buf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
        micChunks.push(buf);
    });
    startLoopbackCapture((samples, ch, rate) => {
        if (!loopReady) {
            loopInfo = { channels: ch, sampleRate: rate };
            loopReady = true;
            console.log(`[LOOPBACK] channels=${ch}, sampleRate=${rate}`);
        }
        const buf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
        loopbackChunks.push(buf);
    });
    console.log('Recording started...');
    setTimeout(stopRecording, RECORD_SECONDS * 1000);
}

function stopRecording() {
    if (!recording) return;
    recording = false;
    stopMicCapture();
    stopLoopbackCapture();
    console.log('Recording stopped. Processing...');
    // Flatten buffers
    const micBuf = flattenChunks(micChunks);
    const loopBuf = flattenChunks(loopbackChunks);
    console.log(`Mic buffer size: ${micBuf.length} bytes, Loopback buffer size: ${loopBuf.length} bytes`);
    try {
        writeWav(MIC_OUTPUT_PATH, micBuf, micInfo.channels, micInfo.sampleRate);
        writeWav(LOOPBACK_OUTPUT_PATH, loopBuf, loopInfo.channels, loopInfo.sampleRate);
        console.log('Separate WAV files written for agent and customer.');
    } catch (err) {
        console.error('❌ Error writing WAV files:', err);
    }
}

startRecording();

// Keep process alive until after recording finishes
setTimeout(() => {
    // No-op, just keeps process alive
}, RECORD_SECONDS * 1000 + 2000);
