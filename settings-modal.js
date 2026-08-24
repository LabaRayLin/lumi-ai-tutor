/**
 * Santa AI Tutor - Standalone Settings Modal & Control Center with Real-time Error Logger
 * 1. Dynamic API Key management (BYOK: Groq / OpenAI / Gemini / Ollama)
 * 2. Speech recognition testing (Microphone STT & GEC)
 * 3. User profile & Database reset/backup
 * 4. Real-time Error & Network Request Logger
 */

(function () {
  'use strict';

  // ==========================================
  // 1. Global Error & Log Collector
  // ==========================================
  window.__SANTA_LOGS__ = window.__SANTA_LOGS__ || [];
  let errorCount = 0;

  function addLog(type, message, details = null) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString(),
      type: type, // 'error' | 'warn' | 'info' | 'api'
      message: typeof message === 'object' ? JSON.stringify(message) : String(message),
      details: details ? (typeof details === 'object' ? JSON.stringify(details, null, 2) : String(details)) : null
    };

    window.__SANTA_LOGS__.unshift(entry);
    if (window.__SANTA_LOGS__.length > 200) window.__SANTA_LOGS__.pop();

    if (type === 'error') {
      errorCount++;
      updateErrorBadge();
    }

    renderLogsToUI();
  }

  // Intercept Global Errors
  window.addEventListener('error', (e) => {
    addLog('error', e.message || 'JavaScript Error', `${e.filename}:${e.lineno}:${e.colno}\n${e.error?.stack || ''}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    addLog('error', 'Unhandled Promise Rejection: ' + (e.reason?.message || e.reason || ''), e.reason?.stack || null);
  });

  // Hook Console Warn & Error
  const origWarn = console.warn;
  console.warn = function () {
    const msg = Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    addLog('warn', msg);
    origWarn.apply(console, arguments);
  };

  const origError = console.error;
  console.error = function () {
    const msg = Array.from(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    addLog('error', msg);
    origError.apply(console, arguments);
  };

  // Expose Log API for mock-api.js
  window.__SANTA_RECORD_API_LOG__ = function (method, url, status, note = '') {
    const cleanUrl = url.replace(window.location.origin, '');
    addLog('api', `${method} ${cleanUrl} -> HTTP ${status}`, note);
  };

  // ==========================================
  // 2. Settings Modal & UI
  // ==========================================
  function initSettingsUI() {
    if (document.getElementById('santa-settings-root')) return;

    // Inject Styles
    const style = document.createElement('style');
    style.textContent = `
      #santa-modal-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.48);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        z-index: 1000000;
        align-items: center;
        justify-content: center;
        padding: 16px;
        font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans TC", sans-serif;
      }
      #santa-modal-container {
        background: #FFFFFF;
        color: #0F172A;
        border: 1px solid #E2DDD4;
        border-radius: 24px;
        width: 100%;
        max-width: 620px;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.16), 0 4px 16px rgba(0, 0, 0, 0.06);
        animation: santaFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes santaFadeIn {
        from { opacity: 0; transform: translateY(12px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .santa-modal-header {
        padding: 18px 24px;
        background: #FAF9F6;
        border-bottom: 1px solid #E8E4DC;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .santa-modal-header h3 {
        margin: 0;
        font-size: 16.5px;
        font-weight: 900;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #0F172A;
        letter-spacing: -0.3px;
      }
      .santa-close-btn {
        background: #F1EFE9;
        border: 1px solid #E2DDD4;
        color: #64748B;
        font-size: 18px;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
      }
      .santa-close-btn:hover { color: #E11D48; background: #FFF1F2; border-color: #FECDD3; transform: scale(1.05); }
      
      .santa-modal-tabs {
        display: flex;
        background: #FAF9F6;
        padding: 12px 20px;
        gap: 8px;
        border-bottom: 1px solid #E8E4DC;
        overflow-x: auto;
        flex-wrap: nowrap;
        scrollbar-width: none;
        align-items: center;
      }
      .santa-modal-tabs::-webkit-scrollbar { display: none; }
      .santa-modal-tab {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        height: 34px;
        padding: 0 16px;
        font-size: 13px;
        font-weight: 800;
        color: #475569;
        background: #F1EFE9;
        border: 1px solid #E2DDD4;
        border-radius: 9999px;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        line-height: 1;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .santa-modal-tab:hover {
        background: #E5E0D5;
        color: #0F172A;
        border-color: #CBD5E1;
      }
      .santa-modal-tab.active {
        background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
        color: #FFFFFF;
        border-color: #4338CA;
        box-shadow: 0 3px 12px rgba(79, 70, 229, 0.28);
      }
      
      .santa-modal-body {
        padding: 20px 24px;
        overflow-y: auto;
        flex: 1;
        background: #FFFFFF;
      }
      .santa-m-form-group {
        margin-bottom: 16px;
      }
      .santa-m-label {
        display: block;
        font-size: 12px;
        font-weight: 800;
        color: #475569;
        margin-bottom: 6px;
        letter-spacing: 0.3px;
      }
      .santa-m-input, .santa-m-select {
        width: 100%;
        background: #FFFFFF;
        border: 1.5px solid #E2DDD4;
        border-radius: 12px;
        padding: 11px 14px;
        color: #0F172A;
        font-size: 13.5px;
        box-sizing: border-box;
        transition: all 0.2s;
        font-family: inherit;
      }
      .santa-m-input:focus, .santa-m-select:focus {
        outline: none;
        border-color: #4F46E5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14);
      }
      .santa-m-btn {
        background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
        color: #ffffff;
        border: none;
        border-radius: 9999px;
        padding: 11px 20px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 3px 12px rgba(79, 70, 229, 0.25);
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .santa-m-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 5px 16px rgba(79, 70, 229, 0.35);
        filter: brightness(1.05);
      }
      .santa-m-btn-danger {
        background: #FFF1F2;
        color: #E11D48;
        border: 1.5px solid #FECDD3;
        box-shadow: none;
      }
      .santa-m-btn-danger:hover {
        background: #FFE4E6;
        border-color: #FDA4AF;
        transform: translateY(-1px);
      }
      .santa-m-btn-outline {
        background: #FFFFFF;
        border: 1.5px solid #E2DDD4;
        color: #334155;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .santa-m-btn-outline:hover {
        background: #F8F6F0;
        color: #0F172A;
        border-color: #CBD5E1;
        transform: translateY(-1px);
      }
      .santa-m-card {
        background: #FBF9F5;
        border: 1px solid #E8E4DC;
        border-radius: 16px;
        padding: 14px 18px;
        margin-bottom: 14px;
      }
      
      /* Provider Grid Cards */
      .santa-provider-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 14px;
      }
      .santa-provider-card {
        background: #FFFFFF;
        border: 1.5px solid #E2DDD4;
        border-radius: 16px;
        padding: 14px 12px;
        cursor: pointer;
        text-align: center;
        color: #0F172A;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
      }
      .santa-provider-card:hover {
        border-color: #4F46E5;
        background: #F8F6F0;
        transform: translateY(-1px);
      }
      .santa-provider-card.selected {
        border-color: #4F46E5;
        background: #EEF2FF;
        box-shadow: 0 2px 12px rgba(79, 70, 229, 0.16);
      }
      
      /* Logs UI */
      .santa-log-item {
        background: #FAF9F6;
        border-left: 3px solid #4F46E5;
        padding: 8px 12px;
        border-radius: 8px;
        margin-bottom: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 11.5px;
        line-height: 1.45;
        border: 1px solid #E8E4DC;
        color: #334155;
      }
      .santa-log-error { border-left: 3px solid #E11D48; background: #FFF1F2; color: #9F1239; }
      .santa-log-warn { border-left: 3px solid #D97706; background: #FEF3C7; color: #92400E; }
      .santa-log-api { border-left: 3px solid #0284C7; background: #EFF6FF; color: #075985; }
    `;
    document.head.appendChild(style);

    // Create Modal
    const backdrop = document.createElement('div');
    backdrop.id = 'santa-modal-backdrop';
    backdrop.innerHTML = `
      <div id="santa-modal-container">
        <div class="santa-modal-header">
          <h3>✨ Lumi 系統控制中心 (Settings & Sync)</h3>
          <button class="santa-close-btn" id="santa-modal-close">&times;</button>
        </div>
        
        <div class="santa-modal-tabs">
          <div class="santa-modal-tab active" data-tab="sync">☁️ 雲端同步 (E2EE)</div>
          <div class="santa-modal-tab" data-tab="profile">📊 學習紀錄與目標</div>
          <div class="santa-modal-tab" data-tab="audio">🎙️ 語音朗讀測試</div>
          <div class="santa-modal-tab" data-tab="logs">📋 系統日誌</div>
          <div class="santa-modal-tab" data-tab="privacy">🛡️ 隱私與端點</div>
        </div>

        <div class="santa-modal-body">

          <!-- TAB: E2EE Cloud Sync -->
          <div id="santa-tab-sync" class="santa-modal-tab-content" style="display: block;">
            <div class="santa-m-card" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; margin-bottom: 12px;">
              <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; color: #15803D;">🔒 零知識端到端加密同步 (E2EE)</div>
              <div style="font-size: 12px; color: #334155; line-height: 1.55;">
                所有錯題本、能力曲線與單字庫進度在離開瀏覽器前皆已在本地以 AES-GCM 完全加密。在 iPhone、iPad 或電腦登入即可即時雙向無縫同步。
              </div>
            </div>

            <div class="santa-m-card" style="background: #FFFFFF; border: 1px solid #E2DDD4;">
              <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="font-size: 11.5px; font-weight: 700; color: #64748B;">目前同步狀態</div>
                  <div id="settings-sync-status" style="font-size: 13.5px; font-weight: 800; color: #0F172A; margin-top: 2px;">⚪ 未登入 (僅保存在此裝置)</div>
                </div>
                <div id="sync-last-time" style="font-size: 11.5px; color: #64748B; font-weight: 600;"></div>
              </div>
            </div>

            <!-- Sync Mode Selector -->
            <div class="santa-m-form-group">
              <label class="santa-m-label">選擇同步方式</label>
              <div class="santa-provider-grid">
                <div id="sync-mode-gist" class="santa-provider-card selected" onclick="selectSyncMode('gist')">
                  <div style="font-weight: 800; font-size: 13.5px; color: #0F172A;">🐙 GitHub Gist</div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">推薦 (免費個人雲端槽)</div>
                </div>
                <div id="sync-mode-server" class="santa-provider-card" onclick="selectSyncMode('server')">
                  <div style="font-weight: 800; font-size: 13.5px; color: #0F172A;">🏠 本機伺服器</div>
                  <div style="font-size: 11px; color: #64748B; margin-top: 2px;">帳號密碼登入</div>
                </div>
              </div>
            </div>

            <!-- Mode A: GitHub Gist Form -->
            <div id="sync-gist-form">
              <div class="santa-m-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <label class="santa-m-label" style="margin: 0;">GitHub Token (需勾選 Gist 權限)</label>
                  <a href="https://github.com/settings/tokens/new?scopes=gist&description=SantaAI_Sync" target="_blank" style="font-size: 12px; color: #4F46E5; font-weight: 800; text-decoration: none;">產生 Token &rarr;</a>
                </div>
                <input type="password" id="sync-gist-token" class="santa-m-input" placeholder="ghp_..." />
              </div>

              <div class="santa-m-form-group">
                <label class="santa-m-label">Gist ID (初次建立可留空，由系統自動產生)</label>
                <input type="text" id="sync-gist-id" class="santa-m-input" placeholder="例如：a1b2c3d4e5f6..." />
              </div>

              <div class="santa-m-form-group">
                <label class="santa-m-label">端到端加密密碼 (Passphrase)</label>
                <input type="password" id="sync-gist-pass" class="santa-m-input" placeholder="請設定安全密碼（用於解密本機資料）" />
              </div>

              <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
                <button id="sync-btn-gist-save" class="santa-m-btn" style="flex: 1; min-width: 180px;">🚀 建立 Gist 同步 / 首次上傳</button>
                <button id="sync-btn-gist-pull" class="santa-m-btn santa-m-btn-outline" style="flex: 1; min-width: 160px;">📥 從 Gist 下載還原</button>
              </div>
            </div>

            <!-- Mode B: Server Form -->
            <div id="sync-server-form" style="display: none;">
              <div class="santa-m-form-group">
                <label class="santa-m-label">同步帳號 (Email / 使用者名稱)</label>
                <input type="text" id="sync-input-user" class="santa-m-input" placeholder="例如：my_santa_account" />
              </div>

              <div class="santa-m-form-group">
                <label class="santa-m-label">端到端加密密碼 (Passphrase)</label>
                <input type="password" id="sync-input-pass" class="santa-m-input" placeholder="請輸入安全密碼" />
              </div>

              <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap;">
                <button id="sync-btn-login" class="santa-m-btn" style="flex: 1; min-width: 160px;">🔑 登入並解密拉取</button>
                <button id="sync-btn-register" class="santa-m-btn santa-m-btn-outline" style="flex: 1; min-width: 140px;">📝 註冊新帳號</button>
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 10px; border-top: 1px solid #E8E4DC; padding-top: 12px; flex-wrap: wrap;">
              <button id="sync-btn-push" class="santa-m-btn santa-m-btn-outline" style="flex: 1; font-size: 12px; padding: 8px 14px;">☁️ 立即手動上傳同步</button>
              <button id="sync-btn-logout" class="santa-m-btn santa-m-btn-danger" style="flex: 1; font-size: 12px; padding: 8px 14px;">🚪 登出同步</button>
            </div>

            <div id="sync-result-msg" style="margin-top: 10px; font-size: 12.5px; line-height: 1.45;"></div>
          </div>

          <!-- TAB 2: Audio STT Tester -->
          <div id="santa-tab-audio" class="santa-modal-tab-content" style="display: none;">
            <div class="santa-m-card">
              <div style="font-weight: 800; font-size: 13.5px; margin-bottom: 4px; color: #0F172A;">🎙️ 即時麥克風錄音與語音測試</div>
              <div style="font-size: 12px; color: #64748B; margin-bottom: 12px;">
                點擊開始錄音並朗讀英文，測試麥克風收音與本機音訊管線。
              </div>
              <div style="display: flex; gap: 10px; align-items: center;">
                <button id="santa-record-btn" class="santa-m-btn" style="background: #E11D48;">🔴 開始錄音 (Record)</button>
                <span id="santa-record-status" style="font-size: 12px; color: #64748B; font-weight: 600;">待命</span>
              </div>
              <audio id="santa-audio-preview" controls style="width: 100%; margin-top: 12px; display: none; border-radius: 9999px;"></audio>
            </div>
            <div id="santa-stt-output" class="santa-m-card" style="display: none; background: #F8F6F0;">
              <div style="font-size: 12px; font-weight: 800; color: #4F46E5; margin-bottom: 4px;">轉錄結果 (Transcription):</div>
              <div id="santa-stt-text" style="font-size: 13.5px; color: #0F172A; line-height: 1.5; margin-bottom: 8px;"></div>
              <div id="santa-eval-details" style="font-size: 12px; color: #64748B;"></div>
            </div>
          </div>

          <!-- TAB 3: Profile & DB -->
          <div id="santa-tab-profile" class="santa-modal-tab-content" style="display: none;">
            <div class="santa-m-card">
              <div style="font-weight: 800; font-size: 13.5px; margin-bottom: 8px; color: #0F172A;">👤 本機學習者狀態</div>
              <div id="santa-profile-summary" style="font-size: 12.5px; line-height: 1.8; color: #334155;"></div>
            </div>

            <div style="margin-top: 16px; border-top: 1px solid #E8E4DC; padding-top: 14px;">
              <div style="font-weight: 800; font-size: 12.5px; margin-bottom: 8px; color: #E11D48;">資料管理</div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button id="santa-export-btn" class="santa-m-btn santa-m-btn-outline" style="flex: 1; min-width: 140px;">匯出紀錄 (JSON)</button>
                <button id="santa-reset-db-btn" class="santa-m-btn santa-m-btn-danger" style="flex: 1; min-width: 140px;">重設本機資料庫</button>
              </div>
            </div>
          </div>

          <!-- TAB 4: Error & System Logs -->
          <div id="santa-tab-logs" class="santa-modal-tab-content" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; gap: 6px;">
                <button class="santa-m-btn santa-m-btn-outline santa-log-filter active" data-filter="all" style="padding: 4px 10px; font-size: 11.5px;">全部 (<span id="santa-log-count-all">0</span>)</button>
                <button class="santa-m-btn santa-m-btn-outline santa-log-filter" data-filter="error" style="padding: 4px 10px; font-size: 11.5px; color: #E11D48;">僅錯誤 (<span id="santa-log-count-err">0</span>)</button>
                <button class="santa-m-btn santa-m-btn-outline santa-log-filter" data-filter="api" style="padding: 4px 10px; font-size: 11.5px; color: #0284C7;">API 攔截 (<span id="santa-log-count-api">0</span>)</button>
              </div>
              <div style="display: flex; gap: 6px;">
                <button id="santa-copy-logs-btn" class="santa-m-btn santa-m-btn-outline" style="padding: 4px 10px; font-size: 11.5px;">📋 複製</button>
                <button id="santa-clear-logs-btn" class="santa-m-btn santa-m-btn-danger" style="padding: 4px 10px; font-size: 11.5px;">清空</button>
              </div>
            </div>

            <div id="santa-log-list-container" style="max-height: 44vh; overflow-y: auto; padding-right: 2px;">
              <div style="font-size: 12px; color: #64748B; text-align: center; padding: 24px;">尚無日誌記錄</div>
            </div>
          </div>

          <!-- TAB 5: Privacy & Log -->
          <div id="santa-tab-privacy" class="santa-modal-tab-content" style="display: none;">
            <div class="santa-m-card" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; margin-bottom: 12px;">
              <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; color: #15803D;">🛡️ 隱私優先架構運作中</div>
              <div style="font-size: 12px; color: #334155; line-height: 1.55;">
                所有遙測追蹤（Sentry, Facebook Pixel, Google Tag Manager, Datadog）均已在瀏覽器端完全攔截並靜默 200 回應，確保所有學習資料 100% 留存在本地或您個人的加密空間。
              </div>
            </div>
            <div class="santa-m-card">
              <div style="font-size: 12px; color: #334155; line-height: 1.7;">
                <div>🔒 <b>本機端點</b>: 離線純淨運行模式</div>
                <div>📚 <b>內建題庫</b>: 2,500+ 擬真多益題目全收錄</div>
                <div>📖 <b>內建單字</b>: 4,000+ 核心詞彙即時檢索</div>
                <div>💽 <b>持久化引擎</b>: IndexedDB / LocalStorage 本機快照</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    // Event Handlers
    const openModal = () => {
      loadSettingsToUI();
      loadProfileToUI();
      renderLogsToUI();
      backdrop.style.display = 'flex';
    };
    const closeModal = () => { backdrop.style.display = 'none'; };

    window.openSettingsModal = openModal;
    window.closeSettingsModal = closeModal;

    document.getElementById('santa-modal-close').addEventListener('click', closeModal);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Tab Switching
    const tabs = backdrop.querySelectorAll('.santa-modal-tab');
    tabs.forEach(t => {
      t.addEventListener('click', () => {
        tabs.forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const tabName = t.dataset.tab;
        backdrop.querySelectorAll('.santa-modal-tab-content').forEach(c => c.style.display = 'none');
        const targetTab = document.getElementById(`santa-tab-${tabName}`);
        if (targetTab) targetTab.style.display = 'block';
        if (tabName === 'logs') renderLogsToUI();
      });
    });

    // Sync Mode Switcher
    window.selectSyncMode = function (mode) {
      document.getElementById('sync-mode-gist').classList.toggle('selected', mode === 'gist');
      document.getElementById('sync-mode-server').classList.toggle('selected', mode === 'server');
      document.getElementById('sync-gist-form').style.display = mode === 'gist' ? 'block' : 'none';
      document.getElementById('sync-server-form').style.display = mode === 'server' ? 'block' : 'none';
    };

    // E2EE Sync Handlers
    const syncUserInp = document.getElementById('sync-input-user');
    const syncPassInp = document.getElementById('sync-input-pass');
    const syncMsgEl = document.getElementById('sync-result-msg');
    const gistTokenInp = document.getElementById('sync-gist-token');
    const gistIdInp = document.getElementById('sync-gist-id');
    const gistPassInp = document.getElementById('sync-gist-pass');

    // Pre-fill existing session
    if (window.SantaSync) {
      const sess = window.SantaSync.getSession();
      if (sess && sess.mode === 'gist') {
        if (sess.githubToken) gistTokenInp.value = sess.githubToken;
        if (sess.gistId) gistIdInp.value = sess.gistId;
      }
    }

    // Gist Mode Handlers
    document.getElementById('sync-btn-gist-save').addEventListener('click', async () => {
      const t = gistTokenInp.value.trim();
      const gId = gistIdInp.value.trim();
      const p = gistPassInp.value.trim();
      syncMsgEl.innerHTML = `<span style="color: #4da2ff;">⏳ 正在本機生成 AES-GCM 金鑰並建立/更新 GitHub Gist...</span>`;
      try {
        if (window.SantaSync) {
          const res = await window.SantaSync.createOrUpdateGistSync(t, p, gId);
          gistIdInp.value = res.gistId;
          syncMsgEl.innerHTML = `<span style="color: #34d399; font-weight: 700;">${res.message}</span>`;
        }
      } catch (err) {
        syncMsgEl.innerHTML = `<span style="color: #ff3b5c; font-weight: 700;">❌ Gist 同步失敗: ${err.message}</span>`;
      }
    });

    document.getElementById('sync-btn-gist-pull').addEventListener('click', async () => {
      const t = gistTokenInp.value.trim();
      const gId = gistIdInp.value.trim();
      const p = gistPassInp.value.trim();
      syncMsgEl.innerHTML = `<span style="color: #4da2ff;">⏳ 正在從 GitHub Gist 下載密文並進行本機解密...</span>`;
      try {
        if (window.SantaSync) {
          const res = await window.SantaSync.pullFromGist(t, gId, p);
          syncMsgEl.innerHTML = `<span style="color: #34d399; font-weight: 700;">${res.message}</span>`;
        }
      } catch (err) {
        syncMsgEl.innerHTML = `<span style="color: #ff3b5c; font-weight: 700;">${err.message}</span>`;
      }
    });

    // Server Mode Handlers
    document.getElementById('sync-btn-register').addEventListener('click', async () => {
      const u = syncUserInp.value.trim();
      const p = syncPassInp.value.trim();
      syncMsgEl.innerHTML = `<span style="color: #4da2ff;">⏳ 正在本機生成 AES-GCM 金鑰並加密上傳...</span>`;
      try {
        if (window.SantaSync) {
          const res = await window.SantaSync.register(u, p);
          syncMsgEl.innerHTML = `<span style="color: #34d399; font-weight: 700;">${res.message}</span>`;
        }
      } catch (err) {
        syncMsgEl.innerHTML = `<span style="color: #ff3b5c; font-weight: 700;">❌ 註冊失敗: ${err.message}</span>`;
      }
    });

    document.getElementById('sync-btn-login').addEventListener('click', async () => {
      const u = syncUserInp.value.trim();
      const p = syncPassInp.value.trim();
      syncMsgEl.innerHTML = `<span style="color: #4da2ff;">⏳ 正在拉取雲端密文並進行端到端解密...</span>`;
      try {
        if (window.SantaSync) {
          const res = await window.SantaSync.login(u, p);
          syncMsgEl.innerHTML = `<span style="color: #34d399; font-weight: 700;">${res.message}</span>`;
        }
      } catch (err) {
        syncMsgEl.innerHTML = `<span style="color: #ff3b5c; font-weight: 700;">${err.message}</span>`;
      }
    });

    document.getElementById('sync-btn-push').addEventListener('click', async () => {
      syncMsgEl.innerHTML = `<span style="color: #4da2ff;">⏳ 正在加密推播最新記憶資料...</span>`;
      try {
        if (window.SantaSync) {
          await window.SantaSync.push();
          syncMsgEl.innerHTML = `<span style="color: #34d399; font-weight: 700;">✅ 雲端記憶已成功更新！</span>`;
        }
      } catch (err) {
        syncMsgEl.innerHTML = `<span style="color: #ff3b5c;">❌ 同步失敗: ${err.message}</span>`;
      }
    });

    document.getElementById('sync-btn-logout').addEventListener('click', () => {
      if (window.SantaSync) {
        window.SantaSync.logout();
        syncMsgEl.innerHTML = `<span style="color: #94a3b8;">已登出同步帳號。</span>`;
      }
    });

    // Audio Recorder Test
    let mediaRecorder = null;
    let audioChunks = [];
    const recordBtn = document.getElementById('santa-record-btn');
    const recordStatus = document.getElementById('santa-record-status');
    const audioPreview = document.getElementById('santa-audio-preview');

    recordBtn.addEventListener('click', async () => {
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordBtn.innerHTML = `🔴 開始錄音 (Record)`;
        recordBtn.style.background = '#ff3b5c';
        recordStatus.innerText = '轉錄處理中...';
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
          audioPreview.src = URL.createObjectURL(audioBlob);
          audioPreview.style.display = 'block';

          if (window.SantaAIService) {
            recordStatus.innerText = '🤖 AI 正在辨識轉錄中...';
            try {
              const res = await window.SantaAIService.transcribeAndEvaluateAudio(audioBlob);
              document.getElementById('santa-stt-output').style.display = 'block';
              document.getElementById('santa-stt-text').innerText = res.transcription || '(未識別到語音)';
              document.getElementById('santa-eval-details').innerHTML = `
                <div>📊 發音評分: <b>${res.evaluation.pronunciation}</b> / 100 | 流暢度: <b>${res.evaluation.fluency}</b> / 100</div>
                <div>💡 診斷建議: ${res.explanation}</div>
              `;
              recordStatus.innerText = '✅ 辨識完成';
            } catch (err) {
              recordStatus.innerText = '❌ 辨識失敗: ' + err.message;
            }
          }
        };

        mediaRecorder.start();
        recordBtn.innerHTML = `⏹️ 停止錄音 (Stop)`;
        recordBtn.style.background = '#475569';
        recordStatus.innerText = '🎙️ 正在錄音中...請朗讀英文';
      } catch (err) {
        recordStatus.innerText = '❌ 無法存取麥克風: ' + err.message;
      }
    });

    // Export & Reset
    document.getElementById('santa-export-btn').addEventListener('click', () => {
      if (window.SantaDB) {
        const p = window.SantaDB.getProfile();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(p, null, 2));
        const a = document.createElement('a');
        a.setAttribute("href", dataStr);
        a.setAttribute("download", "santa_learning_profile.json");
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    });

    document.getElementById('santa-reset-db-btn').addEventListener('click', () => {
      if (confirm('確定要清空本機學習資料庫並重置回預設狀態嗎？')) {
        localStorage.clear();
        alert('本機資料已重設，將重新整理頁面。');
        window.location.reload();
      }
    });

    // Log Controls
    document.querySelectorAll('.santa-log-filter').forEach(f => {
      f.addEventListener('click', () => {
        document.querySelectorAll('.santa-log-filter').forEach(x => x.classList.remove('active'));
        f.classList.add('active');
        renderLogsToUI(f.dataset.filter);
      });
    });

    document.getElementById('santa-copy-logs-btn').addEventListener('click', () => {
      const text = window.__SANTA_LOGS__.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.message} ${l.details || ''}`).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('📋 日誌已成功複製至剪貼簿！');
      });
    });

    document.getElementById('santa-clear-logs-btn').addEventListener('click', () => {
      window.__SANTA_LOGS__ = [];
      errorCount = 0;
      updateErrorBadge();
      renderLogsToUI();
    });
  }

  function loadSettingsToUI() {
    // UI loaded
  }

  function loadProfileToUI() {
    if (!window.SantaDB) return;
    const p = window.SantaDB.getProfile();
    const sumEl = document.getElementById('santa-profile-summary');
    if (sumEl) {
      sumEl.innerHTML = `
        <div>👤 <b>學習者 ID</b>: ${p.userId || 'santa-offline-user'}</div>
        <div>🎯 <b>學習領域</b>: ${p.learningDomain || 'TOEIC 多益測驗'}</div>
        <div>📚 <b>擬真題庫</b>: <span style="color: #38bdf8; font-weight: 700;">2,000 題 (Part 1, 5, 6, 7 各 500 題)</span></div>
        <div>🎙️ <b>口說題庫</b>: <span style="color: #c084fc; font-weight: 700;">500 題 (Part 1~5 滿分朗讀)</span></div>
        <div>📖 <b>核心單字</b>: <span style="color: #34d399; font-weight: 700;">4,000 字 (750高頻+900高分)</span></div>
      `;
    }
  }

  function renderLogsToUI(filter = 'all') {
    const listContainer = document.getElementById('santa-log-list-container');
    if (!listContainer) return;

    const logs = window.__SANTA_LOGS__ || [];
    const countAll = logs.length;
    const countErr = logs.filter(l => l.type === 'error').length;
    const countApi = logs.filter(l => l.type === 'api').length;

    const allEl = document.getElementById('santa-log-count-all');
    const errEl = document.getElementById('santa-log-count-err');
    const apiEl = document.getElementById('santa-log-count-api');
    if (allEl) allEl.innerText = countAll;
    if (errEl) errEl.innerText = countErr;
    if (apiEl) apiEl.innerText = countApi;

    const filtered = logs.filter(l => {
      if (filter === 'all') return true;
      return l.type === filter;
    });

    if (filtered.length === 0) {
      listContainer.innerHTML = `<div style="font-size: 12px; color: #64748b; text-align: center; padding: 20px;">無符合條件的日誌記錄</div>`;
      return;
    }

    listContainer.innerHTML = filtered.map(l => {
      let cls = '';
      if (l.type === 'error') cls = 'santa-log-error';
      else if (l.type === 'warn') cls = 'santa-log-warn';
      else if (l.type === 'api') cls = 'santa-log-api';

      return `
        <div class="santa-log-item ${cls}">
          <span style="color: #9da5b4;">[${l.time}]</span> <b>${l.message}</b>
          ${l.details ? `<pre style="margin: 4px 0 0 0; font-size: 10.5px; opacity: 0.85; white-space: pre-wrap;">${l.details}</pre>` : ''}
        </div>
      `;
    }).join('');
  }

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsUI);
  } else {
    initSettingsUI();
  }
})();
