// // // systemCapture/index.js
// // const addon = require('bindings')('wasapi_capture');
// // const fs = require('fs');

// // /**
// //  * List available loopback (render) devices via WASAPI addon.
// //  */
// // function listDevices() {
// //   try {
// //     // The C++ addon doesn't have listDevices implemented yet
// //     // Return a default loopback device for now
// //     return [{
// //       index: -1,
// //       name: 'Default System Audio (Loopback)',
// //       channels: 2,
// //       defaultSampleRate: 48000,
// //       isDefault: true
// //     }];
// //   } catch (err) {
// //     console.error("⚠️ Failed to list WASAPI devices:", err);
// //     return [];
// //   }
// // }

// // /**
// //  * Start loopback capture.
// //  * @param {function} callback - Called with (samples: Int16Array, channels: number, sampleRate: number).
// //  * @param {number} [deviceIndex=-1] - Device index (-1 = default).
// //  */
// // function startLoopbackCapture(callback, deviceIndex = -1) {
// //   try {
// //     addon.startLoopbackCapture((buffer, channels, sampleRate) => {
// //       try {
// //         const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
// //         callback(samples, channels, sampleRate);
// //       } catch (cbErr) {
// //         console.error("⚠️ Error in loopback callback:", cbErr);
// //       }
// //     }, deviceIndex);
// //     console.log(`✅ WASAPI loopback capture started (device=${deviceIndex})`);
// //   } catch (err) {
// //     console.error("❌ Failed to start WASAPI loopback capture:", err);
// //   }
// // }

// // /**
// //  * Stop loopback capture.
// //  */
// // function stopLoopbackCapture() {
// //   try {
// //     addon.stopLoopbackCapture();
// //     console.log("🛑 WASAPI loopback capture stopped");
// //   } catch (err) {
// //     console.error("⚠️ Failed to stop WASAPI loopback capture:", err);
// //   }
// // }

// // /**
// //  * Write PCM Int16 samples to a .wav file.
// //  */
// // function writeWav(filename, samples, channels = 1, sampleRate = 16000) {
// //   if (!samples || samples.length === 0) {
// //     console.warn("⚠️ No samples to write");
// //     return;
// //   }

// //   const byteRate = sampleRate * channels * 2;
// //   const blockAlign = channels * 2;
// //   const dataSize = samples.length * 2;
// //   const buffer = Buffer.alloc(44 + dataSize);

// //   // WAV header
// //   buffer.write('RIFF', 0);
// //   buffer.writeUInt32LE(36 + dataSize, 4);
// //   buffer.write('WAVE', 8);
// //   buffer.write('fmt ', 12);
// //   buffer.writeUInt32LE(16, 16);
// //   buffer.writeUInt16LE(1, 20); // PCM
// //   buffer.writeUInt16LE(channels, 22);
// //   buffer.writeUInt32LE(sampleRate, 24);
// //   buffer.writeUInt32LE(byteRate, 28);
// //   buffer.writeUInt16LE(blockAlign, 32);
// //   buffer.writeUInt16LE(16, 34); // bits per sample
// //   buffer.write('data', 36);
// //   buffer.writeUInt32LE(dataSize, 40);

// //   // PCM data
// //   for (let i = 0; i < samples.length; i++) {
// //     let s = samples[i];
// //     if (s > 32767) s = 32767;
// //     if (s < -32768) s = -32768;
// //     buffer.writeInt16LE(s, 44 + i * 2);
// //   }

// //   fs.writeFileSync(filename, buffer);
// //   console.log(`💾 WAV file written: ${filename} (${samples.length} samples @ ${sampleRate}Hz, ${channels}ch)`);
// // }

// // module.exports = {
// //   listDevices,
// //   startLoopbackCapture,
// //   stopLoopbackCapture,
// //   writeWav
// // };

// function startMicCapture(callback, deviceIndex = -1) {
//   try {
//     addon.startMicCapture((buffer, channels, sampleRate) => {
//       try {
//         const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
//         callback(samples, channels, sampleRate);
//       } catch (cbErr) {
//         console.error("⚠️ Error in mic callback:", cbErr);
//       }
//     }, deviceIndex);
//     console.log(`🎙️ WASAPI mic capture started (device=${deviceIndex})`);
//   } catch (err) {
//     console.error("❌ Failed to start mic capture:", err);
//   }
// }

// function stopMicCapture() {
//   try {
//     addon.stopMicCapture();
//     console.log("🛑 Mic capture stopped");
//   } catch (err) {
//     console.error("⚠️ Failed to stop mic capture:", err);
//   }
// }

// module.exports = {
//   listDevices,
//   startLoopbackCapture,
//   stopLoopbackCapture,
//   startMicCapture,
//   stopMicCapture,
//   writeWav
// };


// const addon = require('bindings')('wasapi_capture');
// const fs = require('fs');

// /**
//  * List devices (stub for now).
//  */
// function listDevices() {
//   return [
//     {
//       index: -1,
//       name: 'Default Device',
//       channels: 2,
//       defaultSampleRate: 48000,
//       isDefault: true
//     }
//   ];
// }

// /**
//  * Start system loopback capture.
//  */
// function startLoopbackCapture(callback, deviceIndex = -1) {
//   addon.startLoopbackCapture((buffer, channels, sampleRate) => {
//     const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
//     callback(samples, channels, sampleRate);
//   }, deviceIndex);
//   console.log(`✅ WASAPI loopback capture started (device=${deviceIndex})`);
// }

// /**
//  * Stop system loopback capture.
//  */
// function stopLoopbackCapture() {
//   addon.stopLoopbackCapture();
//   console.log("🛑 WASAPI loopback capture stopped");
// }

// /**
//  * Start microphone capture.
//  */
// function startMicCapture(callback, deviceIndex = -1) {
//   addon.startMicCapture((buffer, channels, sampleRate) => {
//     const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
//     callback(samples, channels, sampleRate);
//   }, deviceIndex);
//   console.log(`🎙️ WASAPI mic capture started (device=${deviceIndex})`);
// }

// /**
//  * Stop microphone capture.
//  */
// function stopMicCapture() {
//   addon.stopMicCapture();
//   console.log("🛑 Mic capture stopped");
// }

// /**
//  * Write PCM Int16 samples to WAV.
//  */
// function writeWav(filename, samples, channels = 1, sampleRate = 16000) {
//   if (!samples || samples.length === 0) return;

//   const byteRate = sampleRate * channels * 2;
//   const blockAlign = channels * 2;
//   const dataSize = samples.length * 2;
//   const buffer = Buffer.alloc(44 + dataSize);

//   // WAV header
//   buffer.write('RIFF', 0);
//   buffer.writeUInt32LE(36 + dataSize, 4);
//   buffer.write('WAVE', 8);
//   buffer.write('fmt ', 12);
//   buffer.writeUInt32LE(16, 16);
//   buffer.writeUInt16LE(1, 20); // PCM
//   buffer.writeUInt16LE(channels, 22);
//   buffer.writeUInt32LE(sampleRate, 24);
//   buffer.writeUInt32LE(byteRate, 28);
//   buffer.writeUInt16LE(blockAlign, 32);
//   buffer.writeUInt16LE(16, 34); // bits per sample
//   buffer.write('data', 36);
//   buffer.writeUInt32LE(dataSize, 40);

//   // PCM data
//   for (let i = 0; i < samples.length; i++) {
//     buffer.writeInt16LE(samples[i], 44 + i * 2);
//   }

//   fs.writeFileSync(filename, buffer);
//   console.log(`💾 WAV written: ${filename} (${samples.length} samples @ ${sampleRate}Hz, ${channels}ch)`);
// }

// module.exports = {
//   listDevices,
//   startLoopbackCapture,
//   stopLoopbackCapture,
//   startMicCapture,
//   stopMicCapture,
//   writeWav
// };

const addon = require('bindings')('wasapi_capture');
const fs = require('fs');

/**
 * List devices (stub for now).
 */
function listDevices() {
  return [
    {
      index: -1,
      name: 'Default Device',
      channels: 2,
      defaultSampleRate: 48000,
      isDefault: true
    }
  ];
}

/**
 * Start system loopback capture (Customer).
 */
function startLoopbackCapture(callback, deviceIndex = -1) {
  try {
    addon.startLoopbackCapture((buffer, channels, sampleRate) => {
      try {
        if (!buffer || buffer.length === 0) {
          return;
        }
        let samples;
        if (Buffer.isBuffer(buffer)) {
          samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
        } else if (buffer instanceof Int16Array) {
          samples = buffer;
        } else {
          return;
        }
        callback(samples, channels, sampleRate);
      } catch (err) {
        console.error("⚠️ Error in loopback callback:", err);
      }
    }, deviceIndex);
    console.log(`✅ WASAPI loopback capture started (device=${deviceIndex})`);
  } catch (err) {
    console.error("❌ Failed to start WASAPI loopback capture:", err);
  }
}

/**
 * Stop system loopback capture.
 */
function stopLoopbackCapture() {
  try {
    addon.stopLoopbackCapture();
    console.log("🛑 WASAPI loopback capture stopped");
  } catch (err) {
    console.error("⚠️ Failed to stop loopback capture:", err);
  }
}

/**
 * Start microphone capture (Agent).
 */
function startMicCapture(callback, deviceIndex = -1) {
  try {
    addon.startMicCapture((buffer, channels, sampleRate) => {
      try {
        if (!buffer || buffer.length === 0) {
          return;
        }
        let samples;
        if (Buffer.isBuffer(buffer)) {
          samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
        } else if (buffer instanceof Int16Array) {
          samples = buffer;
        } else {
          return;
        }
        callback(samples, channels, sampleRate);
      } catch (err) {
        console.error("⚠️ Error in mic callback:", err);
      }
    }, deviceIndex);
    console.log(`🎙️ WASAPI mic capture started (device=${deviceIndex})`);
  } catch (err) {
    console.error("❌ Failed to start mic capture:", err);
  }
}

/**
 * Stop microphone capture.
 */
function stopMicCapture() {
  try {
    addon.stopMicCapture();
    console.log("🛑 Mic capture stopped");
  } catch (err) {
    console.error("⚠️ Failed to stop mic capture:", err);
  }
}

/**
 * Write PCM Int16 samples to WAV.
 */
function writeWav(filename, samples, channels = 1, sampleRate = 16000) {
  if (!samples || samples.length === 0) {
    console.warn("⚠️ No samples to write for", filename);
    return;
  }

  const byteRate = sampleRate * channels * 2;
  const blockAlign = channels * 2;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // WAV header
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

  // PCM data
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], 44 + i * 2);
  }

  fs.writeFileSync(filename, buffer);
  console.log(
    `💾 WAV written: ${filename} (${samples.length} samples @ ${sampleRate}Hz, ${channels}ch)`
  );
}

module.exports = {
  listDevices,
  startLoopbackCapture,
  stopLoopbackCapture,
  startMicCapture,
  stopMicCapture,
  writeWav
};
