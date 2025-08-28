// test_mic_loopback.js
// Simple test to verify microphone and loopback capture are working

const { startMicCapture, stopMicCapture, startLoopbackCapture, stopLoopbackCapture } = require('./index');

console.log('🎤 Testing microphone and loopback capture...');
console.log('📝 This will capture 10 seconds of audio from both sources');

let micSamples = [];
let loopbackSamples = [];
let micStarted = false;
let loopbackStarted = false;

// Test microphone capture
console.log('\n🎙️ Starting microphone capture...');
try {
    startMicCapture((samples, ch, rate) => {
        if (!micStarted) {
            console.log(`✅ Microphone started: ${ch}ch, ${rate}Hz`);
            micStarted = true;
        }
        micSamples.push(...samples);
    }, -1);
    console.log('✅ Microphone capture initiated');
} catch (err) {
    console.error('❌ Failed to start microphone capture:', err);
}

// Test loopback capture
console.log('\n🎧 Starting system audio capture...');
try {
    startLoopbackCapture((samples, ch, rate) => {
        if (!loopbackStarted) {
            console.log(`✅ System audio started: ${ch}ch, ${rate}Hz`);
            loopbackStarted = true;
        }
        loopbackSamples.push(...samples);
    }, -1);
    console.log('✅ System audio capture initiated');
} catch (err) {
    console.error('❌ Failed to start system audio capture:', err);
}

// Stop after 10 seconds
setTimeout(() => {
    console.log('\n🛑 Stopping captures...');
    
    try {
        stopMicCapture();
        console.log('✅ Microphone stopped');
    } catch (err) {
        console.error('❌ Error stopping microphone:', err);
    }
    
    try {
        stopLoopbackCapture();
        console.log('✅ System audio stopped');
    } catch (err) {
        console.error('❌ Error stopping system audio:', err);
    }
    
    console.log('\n📊 Results:');
    console.log(`🎤 Microphone samples: ${micSamples.length}`);
    console.log(`🔊 System audio samples: ${loopbackSamples.length}`);
    
    if (micSamples.length > 0) {
        console.log('✅ Microphone capture is working!');
    } else {
        console.log('❌ No microphone audio captured');
    }
    
    if (loopbackSamples.length > 0) {
        console.log('✅ System audio capture is working!');
    } else {
        console.log('❌ No system audio captured');
    }
    
    process.exit(0);
}, 10000);

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Stopping...');
    stopMicCapture();
    stopLoopbackCapture();
    process.exit(0);
});
