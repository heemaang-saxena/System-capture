// record_combined_wav.js
// Captures system (loopback) and mic audio simultaneously and writes a combined WAV file

const fs = require('fs');
const path = require('path');
const { startMicCapture, stopMicCapture, startLoopbackCapture, stopLoopbackCapture } = require('./index');

const OUTPUT_PATH = path.join(__dirname, 'combined_output.wav');
const RECORD_SECONDS = 30; // Change as needed

let micChunks = [];
let loopbackChunks = [];
let channels = 1;
let sampleRate = 16000;
let recording = true;
let micInfo = {};
let loopInfo = {};

function flattenChunks(chunks) {
    return Buffer.concat(chunks);
}

function writeCombinedWav(filename, micBuf, loopbackBuf, channels, sampleRate) {
    // Interleave mic and loopback samples (simple stereo)
    const micSamples = new Int16Array(micBuf.buffer, micBuf.byteOffset, micBuf.length / 2);
    const loopSamples = new Int16Array(loopbackBuf.buffer, loopbackBuf.byteOffset, loopbackBuf.length / 2);
    const minLen = Math.min(micSamples.length, loopSamples.length);
    const stereoSamples = new Int16Array(minLen * 2);
    for (let i = 0; i < minLen; i++) {
        stereoSamples[i * 2] = micSamples[i];
        stereoSamples[i * 2 + 1] = loopSamples[i];
    }
    // Calculate expected duration
    const durationSec = minLen / sampleRate;
    // WAV header
    const byteRate = sampleRate * 2 * 2;
    const blockAlign = 2 * 2;
    const dataSize = stereoSamples.length * 2;
    const buffer = Buffer.alloc(44 + dataSize);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20); // PCM
    buffer.writeUInt16LE(2, 22); // stereo
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(16, 34); // bits per sample
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    for (let i = 0; i < stereoSamples.length; i++) {
        buffer.writeInt16LE(stereoSamples[i], 44 + i * 2);
    }
    fs.writeFileSync(filename, buffer);
    console.log(`💾 Combined WAV written: ${filename} (${stereoSamples.length} samples @ ${sampleRate}Hz, 2ch, ~${durationSec.toFixed(2)} sec)`);
}

function startRecording() {
    let micReady = false;
    let loopReady = false;
    let micMeta = {};
    let loopMeta = {};
    // micInfo and loopInfo are now global
    startMicCapture((samples, ch, rate) => {
        if (!micReady) {
            channels = ch;
            sampleRate = rate;
            micInfo = { channels: ch, sampleRate: rate };
            micReady = true;
            console.log(`[MIC] channels=${ch}, sampleRate=${rate}`);
        }
        const buf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
        micChunks.push(buf);
        // Removed mic chunk logging
    });
    startLoopbackCapture((samples, ch, rate) => {
        if (!loopReady) {
            loopInfo = { channels: ch, sampleRate: rate };
            loopReady = true;
            console.log(`[LOOPBACK] channels=${ch}, sampleRate=${rate}`);
        }
        const buf = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
        loopbackChunks.push(buf);
        // Removed loopback chunk logging
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
    // Check sample rate and channels match
    if (!micBuf.length || !loopBuf.length) {
        console.warn('⚠️ No audio captured from mic or system! WAV will be empty.');
    }
    if (micInfo.sampleRate !== loopInfo.sampleRate || micInfo.channels !== loopInfo.channels) {
        console.error(`❌ Sample rate or channel mismatch: mic(${micInfo.channels}ch, ${micInfo.sampleRate}Hz) vs loopback(${loopInfo.channels}ch, ${loopInfo.sampleRate}Hz)`);
        console.error('❌ Cannot combine audio. Please ensure both sources use the same format.');
        return;
    }
    try {
        console.log('Writing combined WAV file...');
        writeCombinedWav(OUTPUT_PATH, micBuf, loopBuf, micInfo.channels, micInfo.sampleRate);
        console.log('Combined WAV file write complete.');
    } catch (err) {
        console.error('❌ Error writing combined WAV:', err);
    }
}

startRecording();

// Keep process alive until after recording finishes
setTimeout(() => {
    // No-op, just keeps process alive
}, RECORD_SECONDS * 1000 + 2000);
