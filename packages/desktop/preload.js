'use strict';

const { contextBridge, ipcRenderer } = require('electron');

/**
 * preload.js — IPC bridge
 *
 * SECURITY: contextIsolation=true, nodeIntegration=false.
 * Only the APIs listed here are accessible to the renderer.
 *
 * License APIs removed. TTS/ASR go through sidecar HTTP (not IPC).
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings:    ()         => ipcRenderer.invoke('get-settings'),
  saveSettings:   (settings) => ipcRenderer.invoke('save-settings', settings),

  // Sidecar
  getSidecarPort: ()         => ipcRenderer.invoke('sidecar-port'),

  // File system dialogs (main-process gated, renderer cannot open arbitrary paths)
  openFileDialog: (opts)     => ipcRenderer.invoke('open-file-dialog', opts),
  saveFileDialog: (opts)     => ipcRenderer.invoke('save-file-dialog', opts),
});
