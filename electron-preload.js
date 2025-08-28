const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    startStreaming: () => ipcRenderer.invoke('start-streaming'),
    stopStreaming: () => ipcRenderer.invoke('stop-streaming'),
    reconnect: () => ipcRenderer.invoke('reconnect'),
    getStatus: () => ipcRenderer.invoke('get-status'),
    
    // Listeners
    onStatusUpdate: (callback) => ipcRenderer.on('status-update', callback),
    onChunkUpdate: (callback) => ipcRenderer.on('chunk-update', callback),
    onLog: (callback) => ipcRenderer.on('log', callback),
    onError: (callback) => ipcRenderer.on('error', callback),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
