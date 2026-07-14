const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const Store = require('electron-store');
const { machineId } = require('node-machine-id');
const crypto = require('crypto');
const log = require('electron-log/main');

log.initialize();
log.info('CincoScribe Desktop App starting...');
// fetch is built-in for Node 18+ which Electron uses

const store = new Store({
  encryptionKey: process.env.STORE_ENCRYPTION_KEY || 'default-dev-key',
  schema: {
    key: { type: 'string' },
    fingerprint: { type: 'string' },
    activatedAt: { type: 'string' },
    firstLaunchAt: { type: 'string' }
  }
});

let mainWindow;
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3001';

async function generateFingerprint() {
  const id = await machineId();
  return crypto.createHash('sha256').update(id).digest('hex');
}

async function validateWithRetry(key, fingerprint, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${SERVER_URL}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, fingerprint, action: 'check' })
      });
      return await res.json();
    } catch (err) {
      if (i === retries - 1) {
        log.error('Validation failed after retries: ' + err.message);
        throw err;
      }
      log.warn(`Validation retry ${i+1} due to: ` + err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

function createWindow(htmlFile, width, height, resizable = true) {
  const win = new BrowserWindow({
    width,
    height,
    resizable,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(htmlFile);
  return win;
}

app.whenReady().then(async () => {
  // Securely intercept and open external links in default browser
  app.on('web-contents-created', (e, contents) => {
    contents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });
  });

  // Setup Auto-Updater
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of CincoScribe is ready to install. Restart now to apply the updates?',
      buttons: ['Restart', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  const key = store.get('key');
  const fingerprint = store.get('fingerprint');
  const activatedAt = store.get('activatedAt');
  let firstLaunchAt = store.get('firstLaunchAt');

  if (!firstLaunchAt) {
    firstLaunchAt = new Date().toISOString();
    store.set('firstLaunchAt', firstLaunchAt);
  }

  const now = new Date();
  const launchDate = new Date(firstLaunchAt);
  const hoursSinceLaunch = (now - launchDate) / (1000 * 60 * 60);

  if (!key || !fingerprint) {
    if (hoursSinceLaunch < 24) {
      mainWindow = createWindow('index.html', 1200, 800, true);
    } else {
      mainWindow = createWindow('activation.html', 400, 500, false);
    }
  } else {
    try {
      const result = await validateWithRetry(key, fingerprint);
      if (result.valid) {
        mainWindow = createWindow('index.html', 1200, 800, true);
      } else if (result.reason === 'fingerprint_mismatch') {
        mainWindow = createWindow('invalid.html', 400, 500, false);
      } else {
        mainWindow = createWindow('activation.html', 400, 500, false);
      }
    } catch (err) {
      const now = new Date();
      const activatedDate = new Date(activatedAt);
      const daysSince = (now - activatedDate) / (1000 * 60 * 60 * 24);
      log.error('License validation failed or server unreachable: ' + err.message);
      if (daysSince < 7) {
        mainWindow = createWindow('index.html', 1200, 800, true);
      } else {
        mainWindow = createWindow('offline-expired.html', 400, 500, false);
      }
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('validate', async (event, key) => {
  const fingerprint = await generateFingerprint();
  try {
    const res = await fetch(`${SERVER_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fingerprint, action: 'activate' })
    });
    return await res.json();
  } catch (err) {
    log.error('IPC validation error: ' + err.message);
    return { valid: false, reason: 'server_error' };
  }
});

ipcMain.handle('deactivate', async (event, key) => {
  const fingerprint = await generateFingerprint();
  try {
    const res = await fetch(`${SERVER_URL}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, fingerprint, action: 'deactivate' })
    });
    return await res.json();
  } catch (err) {
    log.error('IPC deactivation error: ' + err.message);
    return { valid: false, reason: 'server_error' };
  }
});

ipcMain.handle('get-fingerprint', async () => {
  return await generateFingerprint();
});

ipcMain.on('store-activation', (event, key, fingerprint) => {
  store.set('key', key);
  store.set('fingerprint', fingerprint);
  store.set('activatedAt', new Date().toISOString());
});

ipcMain.handle('get-stored-activation', () => {
  return {
    key: store.get('key'),
    fingerprint: store.get('fingerprint'),
    activatedAt: store.get('activatedAt')
  };
});

ipcMain.on('activation-complete', () => {
  if (mainWindow) mainWindow.close();
  mainWindow = createWindow('index.html', 1200, 800, true);
});

ipcMain.on('clear-activation', () => {
  store.delete('key');
  store.delete('fingerprint');
  store.delete('activatedAt');
});

ipcMain.on('deactivation-complete', () => {
  if (mainWindow) mainWindow.close();
  mainWindow = createWindow('activation.html', 400, 500, false);
});

ipcMain.handle('generate-speech', async (event, { text, voice, speed, modelSize }) => {
  const fs = require('fs');
  const { spawn } = require('child_process');
  
  const modelNameMap = {
    nano: 'KittenML/kitten-tts-nano-0.8',
    micro: 'KittenML/kitten-tts-micro-0.8',
    mini: 'KittenML/kitten-tts-mini-0.8'
  };
  const modelName = modelNameMap[modelSize] || modelNameMap.nano;

  const tempWavPath = path.join(app.getPath('temp'), `tts_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.wav`);
  const scriptPath = path.join(__dirname, 'tts_generate.py');

  return new Promise((resolve) => {
    // Per rules: "Always run python using the command py instead of python"
    const pythonExe = process.platform === 'win32' ? 'py' : 'python3';
    const child = spawn(pythonExe, ['-u', scriptPath]);

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        log.error(`TTS process exited with code ${code}. Stderr: ${stderrData}`);
        resolve({ success: false, error: stderrData || `Process exited with code ${code}` });
        return;
      }
      try {
        const result = JSON.parse(stdoutData.trim());
        if (result.success && result.output_path) {
          const audioBuffer = fs.readFileSync(result.output_path);
          const base64Audio = audioBuffer.toString('base64');
          try {
            fs.unlinkSync(result.output_path);
          } catch (e) {
            log.error(`Failed to delete temp file: ${result.output_path}`, e);
          }
          resolve({
            success: true,
            duration: result.duration,
            word_count: result.word_count,
            audioData: base64Audio
          });
        } else {
          resolve(result);
        }
      } catch (err) {
        log.error(`Failed to parse TTS stdout: ${stdoutData}. Error: ${err.message}`);
        resolve({ success: false, error: `Invalid output from generator script: ${stdoutData}` });
      }
    });

    child.on('error', (err) => {
      log.error(`Failed to start TTS process: ${err.message}`);
      if (err.code === 'ENOENT' && pythonExe === 'py') {
        log.info('py not found, retrying with python...');
        const retryChild = spawn('python', ['-u', scriptPath]);
        let retryStdout = '';
        let retryStderr = '';

        retryChild.stdout.on('data', (data) => { retryStdout += data.toString(); });
        retryChild.stderr.on('data', (data) => { retryStderr += data.toString(); });

        retryChild.on('close', (code) => {
          if (code !== 0) {
            resolve({ success: false, error: retryStderr || `Process exited with code ${code}` });
            return;
          }
          try {
            const result = JSON.parse(retryStdout.trim());
            if (result.success && result.output_path) {
              const audioBuffer = fs.readFileSync(result.output_path);
              const base64Audio = audioBuffer.toString('base64');
              try {
                fs.unlinkSync(result.output_path);
              } catch (e) {
                log.error(`Failed to delete temp file: ${result.output_path}`, e);
              }
              resolve({
                success: true,
                duration: result.duration,
                word_count: result.word_count,
                audioData: base64Audio
              });
            } else {
              resolve(result);
            }
          } catch (e) {
            resolve({ success: false, error: `Invalid output: ${retryStdout}` });
          }
        });

        retryChild.on('error', (retryErr) => {
          resolve({ success: false, error: `Python not found: ${retryErr.message}` });
        });

        retryChild.stdin.write(JSON.stringify({ text, voice, speed, model_name: modelName, output_path: tempWavPath }));
        retryChild.stdin.end();
        return;
      }
      resolve({ success: false, error: `Failed to start Python process: ${err.message}` });
    });

    child.stdin.write(JSON.stringify({ text, voice, speed, model_name: modelName, output_path: tempWavPath }));
    child.stdin.end();
  });
});

