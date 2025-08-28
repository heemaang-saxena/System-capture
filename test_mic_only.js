// test_mic_only.js
// Simple microphone test to verify the microphone indicator shows up

const { startMicCapture, stopMicCapture } = require('./index');

console.log('🎤 Testing microphone capture only...');
console.log('📝 Speak into your microphone - you should see the microphone indicator active');
console.log('⏰ This will run for 30 seconds...');

let micSamples = [];
let micStarted = false;

// Test microphone capture
console.log('\n🎙️ Starting microphone capture...');
try {
    startMicCapture((samples, ch, rate) => {
        if (!micStarted) {
            console.log(`✅ Microphone started: ${ch}ch, ${rate}Hz`);
            console.log('🎤 MICROPHONE INDICATOR SHOULD NOW BE ACTIVE!');
            micStarted = true;
        }
        micSamples.push(...samples);
        
        // Log audio levels every 2 seconds
        if (micSamples.length % 32000 === 0) { // ~2 seconds at 16kHz
            const recentSamples = micSamples.slice(-32000);
            let maxLevel = 0;
            for (let i = 0; i < recentSamples.length; i++) {
                const absLevel = Math.abs(recentSamples[i]);
                if (absLevel > maxLevel) maxLevel = absLevel;
            }
            console.log(`📊 Audio level: ${maxLevel} (max possible: 32767)`);
        }
    }, -1);
    console.log('✅ Microphone capture initiated');
} catch (err) {
    console.error('❌ Failed to start microphone capture:', err);
}

// Stop after 30 seconds
setTimeout(() => {
    console.log('\n🛑 Stopping microphone capture...');
    
    try {
        stopMicCapture();
        console.log('✅ Microphone stopped');
        console.log('🎤 MICROPHONE INDICATOR SHOULD NOW BE INACTIVE!');
    } catch (err) {
        console.error('❌ Error stopping microphone:', err);
    }
    
    console.log('\n📊 Results:');
    console.log(`🎤 Total microphone samples: ${micSamples.length}`);
    
    if (micSamples.length > 0) {
        // Use a more efficient method to find max level
        let maxLevel = 0;
        let sumLevel = 0;
        for (let i = 0; i < micSamples.length; i++) {
            const absLevel = Math.abs(micSamples[i]);
            if (absLevel > maxLevel) maxLevel = absLevel;
            sumLevel += absLevel;
        }
        const avgLevel = sumLevel / micSamples.length;
        
        console.log(`📊 Max audio level: ${maxLevel}`);
        console.log(`📊 Average audio level: ${avgLevel.toFixed(0)}`);
        console.log('✅ Microphone capture is working!');
    } else {
        console.log('❌ No microphone audio captured');
    }
    
    process.exit(0);
}, 30000);

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT. Stopping...');
    stopMicCapture();
    process.exit(0);
});
