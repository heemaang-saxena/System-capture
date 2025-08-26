# System Audio Capture

A Node.js native addon for capturing system audio on Windows using WASAPI.

## Features

- **Microphone Capture**: Capture audio from microphone devices
- **Loopback Capture**: Capture system audio output (what you hear)
- **Modern Node.js API**: Uses N-API for compatibility with latest Node.js versions
- **Cross-platform Ready**: Configured for Windows with WASAPI

## Requirements

- Node.js 18.0.0 or higher
- Windows 10/11
- Visual Studio Build Tools 2019 or later
- Python 3.x

## Installation

```bash
npm install
```

The native addon will be automatically built during installation.

## Usage

```javascript
const wasapiCapture = require('./index.js');

// Start microphone capture
wasapiCapture.startMicCapture((audioBuffer, channels, sampleRate) => {
    console.log(`Received ${audioBuffer.length} samples, ${channels} channels, ${sampleRate}Hz`);
}, deviceIndex); // deviceIndex is optional, -1 for default

// Start loopback capture (system audio)
wasapiCapture.startLoopbackCapture((audioBuffer, channels, sampleRate) => {
    console.log(`Received ${audioBuffer.length} samples, ${channels} channels, ${sampleRate}Hz`);
}, deviceIndex); // deviceIndex is optional, -1 for default

// Stop captures
wasapiCapture.stopMicCapture();
wasapiCapture.stopLoopbackCapture();
```

## Build Commands

```bash
# Clean build artifacts
npm run clean

# Configure build
npm run configure

# Build only
npm run build

# Rebuild everything
npm run rebuild
```

## Testing

```bash
node test.js
```

## Troubleshooting

### Build Issues

1. **Python not found**: Install Python 3.x and ensure it's in your PATH
2. **Visual Studio not found**: Install Visual Studio Build Tools 2019 or later
3. **Node.js version**: Ensure you're using Node.js 18.0.0 or higher

### Runtime Issues

1. **Permission denied**: Run as administrator for system audio capture
2. **Device not found**: Check available devices in the console output
3. **Audio quality issues**: Ensure proper audio drivers are installed

## Architecture

- **N-API**: Modern Node.js native addon API for better compatibility
- **WASAPI**: Windows Audio Session API for low-latency audio capture
- **Thread-safe Functions**: Safe communication between C++ and JavaScript threads
- **Event-driven**: Asynchronous audio capture with callbacks

## License

MIT
