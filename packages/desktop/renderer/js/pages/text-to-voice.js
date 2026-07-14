/* ===== Text to Voice Page ===== */

function renderTextToVoicePage(container) {
  let text = '';
  let selectedVoice = 'Bruno';
  let speed = 1.0;
  let modelSize = 'nano'; // 'nano' | 'micro' | 'mini'
  let isGenerating = false;
  let progressPct = 0;
  let statusMessage = '';
  let generatedAudioBase64 = null;
  let generatedAudioDuration = 0;

  const voices = [
    { name: 'Bella', gender: 'Female', tag: 'Clear' },
    { name: 'Jasper', gender: 'Male', tag: 'Warm' },
    { name: 'Luna', gender: 'Female', tag: 'Soft' },
    { name: 'Bruno', gender: 'Male', tag: 'Deep' },
    { name: 'Rosie', gender: 'Female', tag: 'Expressive' },
    { name: 'Hugo', gender: 'Male', tag: 'Formal' },
    { name: 'Kiki', gender: 'Female', tag: 'Energetic' },
    { name: 'Leo', gender: 'Male', tag: 'Friendly' }
  ];

  function render() {
    container.innerHTML = `
      <div class="page-container page-sections">
        ${renderHeader()}
        ${renderTextInputZone()}
        ${renderSettingsGrid()}
        ${renderVoiceGrid()}
        ${renderActionRow()}
        ${isGenerating ? renderProgress() : ''}
        ${generatedAudioBase64 ? renderAudioPlayer() : ''}
      </div>
    `;
    bindEvents();
  }

  function renderHeader() {
    return `
      <div class="page-header">
        <h1 class="page-title">Turn Text Into <span class="page-title-sub">Natural Voice</span></h1>
        <p class="page-subtitle">Type or paste any text to generate high-quality voice output using KittenTTS</p>
      </div>
    `;
  }

  function renderTextInputZone() {
    return `
      <div class="card" style="display:flex; flex-direction:column; gap:var(--sp-3);">
        <label class="form-label">Input Text</label>
        <textarea class="textarea" id="tts-text-input" placeholder="Type or paste your text here to convert it to speech..." maxlength="2000">${escapeHtml(text)}</textarea>
        <div style="display:flex; justify-content:space-between; font-size:var(--fs-xs); color:var(--clr-text-faint);">
          <span>Max 2,000 characters</span>
          <span id="char-counter">${text.length} / 2,000</span>
        </div>
      </div>
    `;
  }

  function renderSettingsGrid() {
    return `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:var(--sp-4);">
        <!-- Model Selection -->
        <div class="card" style="display:flex; flex-direction:column; gap:var(--sp-3);">
          <label class="form-label">Voice Synthesis Engine</label>
          <div style="display:flex; flex-direction:column; gap:var(--sp-2);">
            <button class="mode-card ${modelSize === 'nano' ? 'selected' : ''}" data-model-size="nano" style="padding:10px 14px;">
              <div class="mode-card-header">
                <span class="mode-card-title">${Utils.icons.bolt} KittenTTS Nano</span>
                <div class="mode-radio"></div>
              </div>
              <p class="mode-card-desc">15M parameters. Tiny (~25MB), ultra-fast generation.</p>
            </button>
            <button class="mode-card ${modelSize === 'micro' ? 'selected' : ''}" data-model-size="micro" style="padding:10px 14px;">
              <div class="mode-card-header">
                <span class="mode-card-title">${Utils.icons.target} KittenTTS Micro</span>
                <div class="mode-radio"></div>
              </div>
              <p class="mode-card-desc">40M parameters. Balanced speed and quality.</p>
            </button>
            <button class="mode-card ${modelSize === 'mini' ? 'selected' : ''}" data-model-size="mini" style="padding:10px 14px;">
              <div class="mode-card-header">
                <span class="mode-card-title">${Utils.icons.sparkles} KittenTTS Mini</span>
                <div class="mode-radio"></div>
              </div>
              <p class="mode-card-desc">80M parameters. Highest speech naturalness &amp; quality.</p>
            </button>
          </div>
        </div>

        <!-- Speed control -->
        <div class="card" style="display:flex; flex-direction:column; gap:var(--sp-3);">
          <label class="form-label">Speech Speed: <span id="speed-val" style="color:var(--clr-primary-text);">${speed.toFixed(1)}x</span></label>
          <div style="display:flex; align-items:center; gap:var(--sp-3); height:100%;">
            <span style="font-size:var(--fs-xs); color:var(--clr-text-faint);">0.5x</span>
            <input type="range" id="speed-slider" min="0.5" max="2.0" step="0.1" value="${speed}" style="flex:1; accent-color:var(--clr-primary);">
            <span style="font-size:var(--fs-xs); color:var(--clr-text-faint);">2.0x</span>
          </div>
          <div class="info-strip" style="margin-top:auto;">
            <span class="info-strip-icon">${Utils.icons.info}</span>
            <span>Speed value adjusts the pace of the generated speaker voice dynamically.</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderVoiceGrid() {
    return `
      <div style="display:flex; flex-direction:column; gap:var(--sp-3);">
        <label class="form-label">Select Voice Profile</label>
        <div class="voice-grid">
          ${voices.map(voice => `
            <div class="voice-card ${selectedVoice === voice.name ? 'selected' : ''}" data-voice-name="${voice.name}">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div class="voice-card-icon">${Utils.icons.volumeHigh}</div>
                <div class="mode-radio"></div>
              </div>
              <div>
                <p class="voice-card-name">${voice.name}</p>
                <p class="voice-card-meta">${voice.gender}</p>
              </div>
              <div class="voice-card-tags">
                <span class="voice-tag">${voice.tag}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderActionRow() {
    const disabled = !text.trim() || isGenerating;
    return `
      <div class="action-row" style="justify-content:flex-end;">
        <button class="btn btn-primary" id="btn-generate-speech" ${disabled ? 'disabled' : ''}>
          Generate Voice
        </button>
      </div>
    `;
  }

  function renderProgress() {
    return `
      <div class="transcript-panel">
        <div class="progress-container">
          <div class="progress-bar-wrapper">
            <div class="progress-bar-fill" id="progress-bar" style="width:${progressPct}%"></div>
          </div>
          <p class="progress-label" id="progress-status">${statusMessage || 'Preparing...'}</p>
          <p class="progress-percent" id="progress-pct">${Math.round(progressPct)}%</p>
        </div>
      </div>
    `;
  }

  function renderAudioPlayer() {
    return `
      <div class="audio-player-wrap">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="transcript-title" style="margin:0;">Generated Speech Output</div>
          <div class="transcript-actions">
            <button class="btn-ghost" id="btn-download-speech">${Utils.icons.download} Download .wav</button>
          </div>
        </div>
        <audio id="tts-audio-player" controls src="data:audio/wav;base64,${generatedAudioBase64}"></audio>
        <div class="transcript-stats" style="border:none; background:none; padding:0; margin-top:var(--sp-2);">
          <span><span class="stat-label">Duration </span><span class="stat-value">${Utils.formatDuration(generatedAudioDuration)}</span></span>
          <span><span class="stat-label">Voice Profile </span><span class="stat-value">${selectedVoice}</span></span>
          <span><span class="stat-label">Speed </span><span class="stat-value">${speed.toFixed(1)}x</span></span>
        </div>
      </div>
    `;
  }

  function updateProgress(msg, pct) {
    statusMessage = msg;
    progressPct = pct;
    const bar = document.getElementById('progress-bar');
    const status = document.getElementById('progress-status');
    const pctEl = document.getElementById('progress-pct');
    if (bar) bar.style.width = progressPct + '%';
    if (status) status.textContent = statusMessage;
    if (pctEl) pctEl.textContent = Math.round(progressPct) + '%';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function bindEvents() {
    const textInput = document.getElementById('tts-text-input');
    if (textInput) {
      textInput.addEventListener('input', () => {
        text = textInput.value;
        const charCounter = document.getElementById('char-counter');
        if (charCounter) {
          charCounter.textContent = `${text.length} / 2,000`;
        }
        const generateBtn = document.getElementById('btn-generate-speech');
        if (generateBtn) {
          generateBtn.disabled = !text.trim() || isGenerating;
        }
      });
    }

    document.querySelectorAll('[data-model-size]').forEach(card => {
      card.addEventListener('click', () => {
        modelSize = card.getAttribute('data-model-size');
        render();
      });
    });

    const speedSlider = document.getElementById('speed-slider');
    if (speedSlider) {
      speedSlider.addEventListener('input', () => {
        speed = parseFloat(speedSlider.value);
        const speedVal = document.getElementById('speed-val');
        if (speedVal) speedVal.textContent = `${speed.toFixed(1)}x`;
      });
    }

    document.querySelectorAll('[data-voice-name]').forEach(card => {
      card.addEventListener('click', () => {
        selectedVoice = card.getAttribute('data-voice-name');
        render();
      });
    });

    const generateBtn = document.getElementById('btn-generate-speech');
    if (generateBtn) {
      generateBtn.addEventListener('click', startSpeechGeneration);
    }

    const downloadBtn = document.getElementById('btn-download-speech');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (!generatedAudioBase64) return;
        const raw = window.atob(generatedAudioBase64);
        const rawLength = raw.length;
        const array = new Uint8Array(new ArrayBuffer(rawLength));
        for (let i = 0; i < rawLength; i++) {
          array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([array], { type: 'audio/wav' });
        Utils.downloadBlob(blob, `speech_${selectedVoice.toLowerCase()}_${Date.now()}.wav`);
      });
    }
  }

  async function startSpeechGeneration() {
    if (!text.trim() || isGenerating) return;

    isGenerating = true;
    generatedAudioBase64 = null;
    progressPct = 0;
    statusMessage = 'Initializing KittenTTS AI engine...';
    render();

    try {
      updateProgress('Loading voice model and synthesis pipeline...', 25);

      // GATE 4: Call sidecar HTTP endpoint — no raw Python spawn via IPC.
      const sidecarPort = await window.electronAPI.getSidecarPort();
      const fetchRes = await fetch(`http://127.0.0.1:${sidecarPort}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          voice: selectedVoice,
          speed: speed,
        }),
      });

      if (!fetchRes.ok) {
        const errBody = await fetchRes.json().catch(() => ({}));
        throw new Error(errBody.detail || `Sidecar error ${fetchRes.status}`);
      }

      // Sidecar returns audio/wav bytes directly
      const wavBytes = await fetchRes.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(wavBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Build a response object matching the old shape so the rest of the handler works
      const response = {
        success: true,
        audioData: base64Audio,
        duration: null,     // sidecar doesn't return duration in this version
        word_count: text.trim().split(/\s+/).length,
      };

      if (response && response.success && response.audioData) {
        updateProgress('Processing synthesized audio...', 90);
        
        generatedAudioBase64 = response.audioData;
        generatedAudioDuration = response.duration || 0;

        // Add to history
        AppState.addHistory({
          name: `Voice: ${text.trim().substring(0, 30)}${text.trim().length > 30 ? '...' : ''}`,
          mode: `KittenTTS ${modelSize.charAt(0).toUpperCase() + modelSize.slice(1)}`,
          language: 'en',
          duration: generatedAudioDuration,
          wordCount: response.word_count || text.trim().split(/\s+/).length,
          segmentCount: 1,
          text: `[Speech Synthesis - Voice: ${selectedVoice}, Speed: ${speed}x]\n\n${text.trim()}`
        });

        Utils.showToast('Speech generation complete!');
      } else {
        throw new Error(response ? response.error : 'Invalid response from engine');
      }

    } catch (err) {
      console.error('Speech generation error:', err);
      Utils.showToast('Speech generation failed: ' + (err.message || 'Unknown error'));
    }

    isGenerating = false;
    progressPct = 100;
    render();
  }

  render();
}

Router.register('dashboard/text-to-voice', renderTextToVoicePage);
