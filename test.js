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
//   micCh = ch;
//   micRate = sr;
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
//     loopCh = ch;
//     loopRate = sr;
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

let allSamples = [];
let globalCh = 0, globalRate = 0;

function appendSamples(samples, ch, sr) {
  if (!globalRate) {
    globalCh = ch;
    globalRate = sr;
  }
  // If mismatch, resampling would be needed (not handled here for simplicity)
  allSamples.push(...samples);
}

function runTest() {
  console.log("🎙 Step 1: MIC (Agent) capture for 10s...");

  startMicCapture((samples, ch, sr) => {
    appendSamples(samples, ch, sr);
  }, -1);

  setTimeout(() => {
    stopMicCapture();
    console.log("🛑 Mic stopped");

    console.log("🎧 Step 2: LOOPBACK (Customer) capture for 10s...");
    startLoopbackCapture((samples, ch, sr) => {
      appendSamples(samples, ch, sr);
    }, -1);

    setTimeout(() => {
      stopLoopbackCapture();
      console.log("🛑 Loopback stopped");

      console.log("🎙 Step 3: MIC (Agent again) capture for 10s...");
      startMicCapture((samples, ch, sr) => {
        appendSamples(samples, ch, sr);
      }, -1);

      setTimeout(() => {
        stopMicCapture();
        console.log("🛑 Mic stopped (again)");

        console.log("🎧 Step 4: LOOPBACK (Customer again) capture for 10s...");
        startLoopbackCapture((samples, ch, sr) => {
          appendSamples(samples, ch, sr);
        }, -1);

        setTimeout(() => {
          stopLoopbackCapture();
          console.log("🛑 Loopback stopped (again)");

          // === Final WAV ===
          if (allSamples.length > 0) {
            const finalAudio = Int16Array.from(allSamples);
            writeWav("conversation.wav", finalAudio, globalCh, globalRate);
            console.log(`✅ Saved merged audio -> conversation.wav`);
          } else {
            console.error("❌ No audio captured.");
          }
          process.exit(0);

        }, 10000);

      }, 10000);

    }, 10000);

  }, 10000);
}

runTest();
