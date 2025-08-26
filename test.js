// const { startLoopbackCapture, stopLoopbackCapture, writeWav } = require('./index');

// let recordedSamples = [];
// let channels = 0;
// let sampleRate = 0;

// console.log("🎙 Starting system loopback capture for 10 seconds...");

// startLoopbackCapture((samples, ch, sr) => {
//   channels = ch;
//   sampleRate = sr;
//   // Push all chunks into one big array
//   recordedSamples.push(...samples);
// }, -1); // -1 = default device

// setTimeout(() => {
//   console.log("🛑 Stopping capture...");
//   stopLoopbackCapture();

//   if (recordedSamples.length === 0) {
//     console.error("❌ No audio was captured. Check if system is playing audio.");
//     process.exit(1);
//   }

//   const all = Int16Array.from(recordedSamples);
//   const filename = "test.wav";
//   writeWav(filename, all, channels, sampleRate);
//   console.log(`✅ Saved system audio to ${filename} (${(all.length / channels / sampleRate).toFixed(1)} sec)`);
//   process.exit(0);
// }, 10000);

// const { 
//   startLoopbackCapture, 
//   stopLoopbackCapture, 
//   startMicCapture, 
//   stopMicCapture, 
//   writeWav 
// } = require('./index');

// let micSamples = [];
// let loopSamples = [];
// let micCh = 0, micRate = 0;
// let loopCh = 0, loopRate = 0;

// console.log("🎙 Starting MIC (Agent) capture for 15s...");
// console.log("👉 Please SPEAK into your microphone now...");

// startMicCapture((samples, ch, sr) => {
//   micCh = ch; micRate = sr;
//   micSamples.push(...samples);
// }, -1);

// setTimeout(() => {
//   console.log("🛑 Stopping mic...");
//   stopMicCapture();

//   if (micSamples.length > 0) {
//     const allMic = Int16Array.from(micSamples);
//     writeWav("agent.wav", allMic, micCh, micRate);
//     console.log(`✅ Saved mic audio -> agent.wav (${(allMic.length / micCh / micRate).toFixed(1)} sec)`);
//   } else {
//     console.error("❌ No mic audio captured.");
//   }

//   // === Next: system loopback
//   console.log("\n🎧 Starting SYSTEM (Customer) capture for 15s...");
//   console.log("👉 Please PLAY some audio on your system (YouTube, music, etc.)...");

//   startLoopbackCapture((samples, ch, sr) => {
//     loopCh = ch; loopRate = sr;
//     loopSamples.push(...samples);
//   }, -1);

//   setTimeout(() => {
//     console.log("🛑 Stopping system audio...");
//     stopLoopbackCapture();

//     if (loopSamples.length > 0) {
//       const allLoop = Int16Array.from(loopSamples);
//       writeWav("customer.wav", allLoop, loopCh, loopRate);
//       console.log(`✅ Saved system audio -> customer.wav (${(allLoop.length / loopCh / loopRate).toFixed(1)} sec)`);
//     } else {
//       console.error("❌ No system audio captured.");
//     }

//     console.log("\n🎯 Test finished (Mic then System). You should now have:");
//     console.log("   - agent.wav (your mic recording)");
//     console.log("   - customer.wav (your system playback recording)");

//     process.exit(0);
//   }, 15000);

// }, 15000);

const { 
  startLoopbackCapture, 
  stopLoopbackCapture, 
  startMicCapture, 
  stopMicCapture, 
  writeWav 
} = require('./index');

let micSamples = [];
let loopSamples = [];
let micCh = 0, micRate = 0;
let loopCh = 0, loopRate = 0;

console.log("🎙 Starting MIC (Agent) capture for 15s...");
console.log("👉 Please SPEAK into your microphone now...");

startMicCapture((samples, ch, sr) => {
  micCh = ch;
  micRate = sr;
  micSamples.push(...samples);
}, -1);

setTimeout(() => {
  console.log("🛑 Stopping mic...");
  stopMicCapture();

  if (micSamples.length > 0) {
    const allMic = Int16Array.from(micSamples);
    writeWav("agent.wav", allMic, micCh, micRate);
    console.log(`✅ Saved mic audio -> agent.wav (${(allMic.length / micCh / micRate).toFixed(1)} sec)`);
  } else {
    console.error("❌ No mic audio captured.");
  }

  // === Next: system loopback
  console.log("\n🎧 Starting SYSTEM (Customer) capture for 15s...");
  console.log("👉 Please PLAY some audio on your system (YouTube, music, etc.)...");

  startLoopbackCapture((samples, ch, sr) => {
    loopCh = ch;
    loopRate = sr;
    loopSamples.push(...samples);
  }, -1);

  setTimeout(() => {
    console.log("🛑 Stopping system audio...");
    stopLoopbackCapture();

    if (loopSamples.length > 0) {
      const allLoop = Int16Array.from(loopSamples);
      writeWav("customer.wav", allLoop, loopCh, loopRate);
      console.log(`✅ Saved system audio -> customer.wav (${(allLoop.length / loopCh / loopRate).toFixed(1)} sec)`);
    } else {
      console.error("❌ No system audio captured.");
    }

    console.log("\n🎯 Test finished (Mic then System). You should now have:");
    console.log("   - agent.wav (your mic recording)");
    console.log("   - customer.wav (your system playback recording)");

    process.exit(0);
  }, 15000);

}, 15000);
