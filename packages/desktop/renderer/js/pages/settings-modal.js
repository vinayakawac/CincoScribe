/* ===== Settings Page — CincoScribe (free, MIT) ===== */
/* All license, activation, and LemonSqueezy code removed.  */

async function renderSettingsPage(container) {
  // Load current settings from main process
  let settings = { openAiKey: '', language: 'auto', whisperMode: 'fast' };

  if (window.electronAPI && window.electronAPI.getSettings) {
    try {
      settings = await window.electronAPI.getSettings();
    } catch (e) {
      console.warn('[Settings] Could not load settings:', e.message);
    }
  }

  let openAiKey = settings.openAiKey || '';
  let language = settings.language || 'auto';
  let whisperMode = settings.whisperMode || 'fast';

  function render() {
    container.innerHTML = `
      <div class="page-container" style="max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; animation: fade-up 280ms cubic-bezier(0.16,1,0.3,1) both;">

        <!-- Header -->
        <div>
          <h1 style="font-size: 24px; font-weight: 700; font-family: var(--ff-display); margin: 0; color: var(--clr-text);">Settings</h1>
          <p style="font-size: 13px; color: var(--clr-text-muted); margin: 4px 0 0 0;">Configure your transcription and speech preferences.</p>
        </div>

        <!-- OpenAI API Key (optional) -->
        <div style="border: 1px solid var(--clr-border); border-radius: var(--radius-lg); padding: 24px; background: var(--clr-bg-subtle);">
          <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 4px 0; color: var(--clr-text);">OpenAI API Key (Optional)</h3>
          <p style="font-size: 12px; color: var(--clr-text-muted); margin: 0 0 16px 0;">
            Leave blank to use local ONNX Whisper (no key required). Add a key to use the OpenAI Whisper API for faster cloud transcription.
          </p>
          <input
            id="settings-openai-key"
            type="password"
            value="${escapeHtml(openAiKey)}"
            placeholder="sk-..."
            style="width: 100%; padding: 8px 12px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text); border-radius: var(--radius); font-size: 13px; box-sizing: border-box;"
          />
        </div>

        <!-- Language -->
        <div style="border: 1px solid var(--clr-border); border-radius: var(--radius-lg); padding: 24px; background: var(--clr-bg-subtle);">
          <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 4px 0; color: var(--clr-text);">Default Transcription Language</h3>
          <select id="settings-language" style="width: 100%; padding: 8px 12px; background: var(--clr-bg); border: 1px solid var(--clr-border); color: var(--clr-text); border-radius: var(--radius); font-size: 13px; margin-top: 8px;">
            ${[
              ['auto', 'Auto Detect'],
              ['en', 'English'],
              ['hi', 'Hindi'],
              ['ar', 'Arabic'],
              ['zh', 'Chinese'],
              ['es', 'Spanish'],
              ['fr', 'French'],
              ['de', 'German'],
              ['pt', 'Portuguese'],
              ['ru', 'Russian'],
              ['ja', 'Japanese'],
              ['ko', 'Korean'],
            ].map(([val, label]) =>
              `<option value="${val}" ${language === val ? 'selected' : ''}>${label}</option>`
            ).join('')}
          </select>
        </div>

        <!-- Whisper Mode -->
        <div style="border: 1px solid var(--clr-border); border-radius: var(--radius-lg); padding: 24px; background: var(--clr-bg-subtle);">
          <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 4px 0; color: var(--clr-text);">Local Whisper Mode</h3>
          <div style="display: flex; gap: 12px; margin-top: 12px;">
            <label style="flex: 1; cursor: pointer;">
              <input type="radio" name="whisper-mode" value="fast" ${whisperMode === 'fast' ? 'checked' : ''} style="margin-right: 8px;" />
              <strong>Fast</strong> (whisper-tiny, ~75MB)
            </label>
            <label style="flex: 1; cursor: pointer;">
              <input type="radio" name="whisper-mode" value="accuracy" ${whisperMode === 'accuracy' ? 'checked' : ''} style="margin-right: 8px;" />
              <strong>Accurate</strong> (whisper-base, ~145MB)
            </label>
          </div>
        </div>

        <!-- Ko-fi -->
        <div style="border: 1px solid var(--clr-border); border-radius: var(--radius-lg); padding: 24px; background: var(--clr-bg-subtle); text-align: center;">
          <p style="font-size: 13px; color: var(--clr-text-muted); margin: 0 0 12px 0;">
            CincoScribe is free and open-source. If it's useful to you, consider supporting development.
          </p>
          <a href="https://ko-fi.com/vinayaka" target="_blank" rel="noopener noreferrer"
             style="display: inline-flex; align-items: center; gap: 8px; background: #FF5E5B; color: white; padding: 8px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Support on Ko-fi
          </a>
        </div>

        <!-- Save -->
        <div style="display: flex; justify-content: flex-end;">
          <button id="btn-save-settings" class="btn btn-primary">Save Settings</button>
          <span id="save-status" style="display: none; margin-left: 12px; align-self: center; font-size: 13px; color: #10b981;">Saved!</span>
        </div>

      </div>
    `;
    bindEvents();
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function bindEvents() {
    document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
      openAiKey = document.getElementById('settings-openai-key')?.value || '';
      language = document.getElementById('settings-language')?.value || 'auto';
      whisperMode = document.querySelector('input[name="whisper-mode"]:checked')?.value || 'fast';

      if (window.electronAPI?.saveSettings) {
        await window.electronAPI.saveSettings({ openAiKey, language, whisperMode });
      }

      const statusEl = document.getElementById('save-status');
      if (statusEl) {
        statusEl.style.display = 'inline';
        setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
      }
    });
  }

  render();
}

Router.register('dashboard/settings', renderSettingsPage);
