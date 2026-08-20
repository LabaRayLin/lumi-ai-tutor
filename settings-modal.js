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

  function updateErrorBadge() {
    const btn = document.getElementById('santa-floating-btn');
    if (!btn) return;
    const badgeEl = btn.querySelector('.santa-error-count-badge');
    if (errorCount > 0) {
      if (badgeEl) {
        badgeEl.innerText = `${errorCount} 錯誤`;
      } else {
        const span = document.createElement('span');
        span.className = 'santa-error-count-badge';
        span.style.cssText = 'background: #ff3b5c; color: #fff; padding: 2px 7px; border-radius: 10px; font-size: 11px; margin-left: 4px; font-weight: 700;';
        span.innerText = `${errorCount} 錯誤`;
        btn.appendChild(span);
      }
    }
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
      #santa-floating-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 10px;
        background: #FFFFFF;
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        color: #1E293B;
        border: 1px solid #E2DDD4;
        border-radius: 9999px;
        padding: 9px 18px;
        font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04);
        transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      #santa-floating-btn:hover {
        transform: translateY(-2px) scale(1.02);
        background: #FAF8F5;
        border-color: #4F46E5;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
      }
      #santa-modal-backdrop {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(30, 41, 59, 0.45);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 1000000;
        align-items: center;
        justify-content: center;
        font-family: Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      #santa-modal-container {
        background: #FFFFFF;
        color: #1E293B;
        border: 1px solid #E8E4DC;
        border-radius: 24px;
        width: 92%;
        max-width: 660px;
        max-height: 88vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.05);
        animation: santaFadeIn 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes santaFadeIn {
        from { opacity: 0; transform: translateY(12px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .santa-modal-header {
        padding: 16px 22px;
        background: #FAF8F5;
        border-bottom: 1px solid #E8E4DC;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .santa-modal-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #1E293B;
      }
      .santa-close-btn {
        background: #F0ECE4;
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
      }
      .santa-close-btn:hover { color: #E11D48; background: #FFF1F2; border-color: #FECDD3; }
      
      .santa-modal-tabs {
        display: flex;
        background: #FAF8F5;
        padding: 10px 16px;
        gap: 8px;
        border-bottom: 1px solid #E8E4DC;
        overflow-x: auto;
        flex-wrap: nowrap;
        scrollbar-width: none;
      }
      .santa-modal-tabs::-webkit-scrollbar { display: none; }
      .santa-modal-tab {
        padding: 7px 16px;
        font-size: 12.5px;
        font-weight: 700;
        color: #64748B;
        background: #F0ECE4;
        border: 1px solid #E2DDD4;
        border-radius: 9999px;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .santa-modal-tab:hover {
        background: #E5E0D5;
        color: #1E293B;
        border-color: #D8D2C5;
      }
      .santa-modal-tab.active {
        background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
        color: #FFFFFF;
        border-color: #4338CA;
        box-shadow: 0 2px 10px rgba(79, 70, 229, 0.25);
      }
      
      .santa-modal-body {
        padding: 18px 22px;
        overflow-y: auto;
        flex: 1;
      }
      .santa-m-form-group {
        margin-bottom: 14px;
      }
      .santa-m-label {
        display: block;
        font-size: 11.5px;
        font-weight: 800;
        color: #64748B;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.8px;
      }
      .santa-m-input, .santa-m-select {
        width: 100%;
        background: #FBF9F5;
        border: 1px solid #E2DDD4;
        border-radius: 14px;
        padding: 10px 14px;
        color: #1E293B;
        font-size: 13px;
        box-sizing: border-box;
        transition: all 0.2s;
      }
      .santa-m-input:focus, .santa-m-select:focus {
        outline: none;
        border-color: #4F46E5;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
      }
      .santa-m-btn {
        background: linear-gradient(135deg, #4F46E5 0%, #6366F1 100%);
        color: #ffffff;
        border: none;
        border-radius: 9999px;
        padding: 10px 18px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 10px rgba(79, 70, 229, 0.2);
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .santa-m-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);
        filter: brightness(1.05);
      }
      .santa-m-btn-danger {
        background: linear-gradient(135deg, #E11D48 0%, #F43F5E 100%);
        box-shadow: 0 2px 10px rgba(225, 29, 72, 0.2);
      }
      .santa-m-btn-danger:hover {
        box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35);
      }
      .santa-m-btn-outline {
        background: #FFFFFF;
        border: 1px solid #E2DDD4;
        color: #475569;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      }
      .santa-m-btn-outline:hover {
        background: #F5F2EB;
        color: #1E293B;
        border-color: #CBD5E1;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }
      .santa-m-badge {
        display: inline-block;
        padding: 3px 9px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
        background: rgba(22, 163, 74, 0.1);
        color: #16A34A;
        border: 1px solid rgba(22, 163, 74, 0.25);
      }
      .santa-m-card {
        background: #F8F6F0;
        border: 1px solid #E8E4DC;
        border-radius: 18px;
        padding: 14px 16px;
        margin-bottom: 12px;
      }
      
      /* Provider Grid Cards */
      .santa-provider-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 8px;
        margin-bottom: 12px;
      }
      .santa-provider-card {
        background: #F8F6F0;
        border: 1.5px solid #E2DDD4;
        border-radius: 16px;
        padding: 12px 10px;
        cursor: pointer;
        text-align: center;
        color: #1E293B;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .santa-provider-card:hover {
        border-color: #4F46E5;
        background: #F2EFE9;
        transform: translateY(-2px);
      }
      .santa-provider-card.selected {
        border-color: #4F46E5;
        background: #EFF6FF;
        color: #1E40AF;
        box-shadow: 0 2px 10px rgba(79, 70, 229, 0.15);
      }
      
      /* Logs UI */
      .santa-log-item {
        background: #F8F6F0;
        border-left: 3px solid #4F46E5;
        padding: 8px 12px;
        border-radius: 10px;
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

    // Create Floating Trigger
    const btn = document.createElement('div');
    btn.id = 'santa-floating-btn';
    btn.innerHTML = `⚙️ <span>Lumi 控制中心</span>`;
    document.body.appendChild(btn);

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
            <div class="santa-m-card" style="border-left: 3px solid #10b981; margin-bottom: 8px;">
              <div style="font-weight: 700; font-size: 12.5px; margin-bottom: 2px; color: #6ee7b7;">🔒 零知識端到端加密同步 (E2EE)</div>
              <div style="font-size: 11.5px; color: #9da5b4; line-height: 1.45;">
                所有錯題本、能力曲線、單字庫與 API 金鑰在離開瀏覽器前皆已在本地以 AES-GCM 完全加密。在 iPhone、iPad 或電腦登入即可即時雙向同步。
              </div>
            </div>

            <div class="santa-m-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 11px; color: #9da5b4;">目前同步狀態</div>
                  <div id="settings-sync-status" style="font-size: 13px; font-weight: 700; margin-top: 2px;">⚪ 未登入 (僅保存在此裝置)</div>
                </div>
                <div id="sync-last-time" style="font-size: 10.5px; color: #64748b;"></div>
              </div>
            </div>

            <!-- Sync Mode Selector -->
            <div class="santa-m-form-group">
              <label class="santa-m-label">選擇同步方式</label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <div id="sync-mode-gist" class="santa-provider-card selected" onclick="selectSyncMode('gist')">
                  <div style="font-weight: 700; font-size: 12.5px;">🐙 GitHub Gist</div>
                  <div style="font-size: 10px; color: #9da5b4;">推薦 (免費雲端槽)</div>
                </div>
                <div id="sync-mode-server" class="santa-provider-card" onclick="selectSyncMode('server')">
                  <div style="font-weight: 700; font-size: 12.5px;">🏠 本機伺服器</div>
                  <div style="font-size: 10px; color: #9da5b4;">帳號密碼登入</div>
                </div>
              </div>
            </div>

            <!-- Mode A: GitHub Gist Form -->
            <div id="sync-gist-form">
              <div class="santa-m-form-group">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <label class="santa-m-label" style="margin: 0;">GitHub Token (需勾選 gist 權限)</label>
                  <a href="https://github.com/settings/tokens/new?scopes=gist&description=SantaAI_Sync" target="_blank" style="font-size: 11px; color: #4da2ff; text-decoration: none;">產生 Token &rarr;</a>
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

              <div style="display: flex; gap: 6px; margin-top: 10px;">
                <button id="sync-btn-gist-save" class="santa-m-btn" style="flex: 1;">🚀 建立 Gist 同步 / 首次上傳</button>
                <button id="sync-btn-gist-pull" class="santa-m-btn santa-m-btn-outline" style="flex: 1;">📥 從 Gist 下載還原</button>
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

              <div style="display: flex; gap: 6px; margin-top: 10px;">
                <button id="sync-btn-login" class="santa-m-btn" style="flex: 1;">🔑 登入並解密拉取</button>
                <button id="sync-btn-register" class="santa-m-btn santa-m-btn-outline" style="flex: 1;">📝 註冊新帳號</button>
              </div>
            </div>

            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <button id="sync-btn-push" class="santa-m-btn santa-m-btn-outline" style="flex: 1; font-size: 11.5px;">☁️ 立即手動上傳同步</button>
              <button id="sync-btn-logout" class="santa-m-btn santa-m-btn-danger" style="flex: 1; font-size: 11.5px;">🚪 登出同步</button>
            </div>

            <div id="sync-result-msg" style="margin-top: 8px; font-size: 12px; line-height: 1.4;"></div>
          </div>

          <!-- TAB 2: Audio STT Tester -->
          <div id="santa-tab-audio" class="santa-modal-tab-content" style="display: none;">
            <div class="santa-m-card">
              <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">🎙️ 即時麥克風錄音與語音辨識測試</div>
              <div style="font-size: 11.5px; color: #9da5b4; margin-bottom: 10px;">
                點擊開始錄音並朗讀英文，測試 Whisper STT 語音轉錄與文法評分。
              </div>
              <div style="display: flex; gap: 8px; align-items: center;">
                <button id="santa-record-btn" class="santa-m-btn" style="background: #ff3b5c;">🔴 開始錄音 (Record)</button>
                <span id="santa-record-status" style="font-size: 11.5px; color: #9da5b4;">待命</span>
              </div>
              <audio id="santa-audio-preview" controls style="width: 100%; margin-top: 10px; display: none;"></audio>
            </div>
            <div id="santa-stt-output" class="santa-m-card" style="display: none; background: #14161f;">
              <div style="font-size: 11.5px; font-weight: 700; color: #4da2ff; margin-bottom: 4px;">轉錄結果 (Transcription):</div>
              <div id="santa-stt-text" style="font-size: 13px; color: #ffffff; line-height: 1.45; margin-bottom: 8px;"></div>
              <div id="santa-eval-details" style="font-size: 11.5px; color: #9da5b4;"></div>
            </div>
          </div>

          <!-- TAB 3: Profile & DB -->
          <div id="santa-tab-profile" class="santa-modal-tab-content" style="display: none;">
            <div class="santa-m-card">
              <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">👤 本機學習者狀態</div>
              <div id="santa-profile-summary" style="font-size: 12px; line-height: 1.7; color: #cbd5e1;"></div>
            </div>

            <div style="margin-top: 16px; border-top: 1px solid #2c3040; padding-top: 12px;">
              <div style="font-weight: 700; font-size: 12px; margin-bottom: 8px; color: #ff6b84;">資料管理</div>
              <div style="display: flex; gap: 8px;">
                <button id="santa-export-btn" class="santa-m-btn santa-m-btn-outline" style="flex: 1;">匯出紀錄 (JSON)</button>
                <button id="santa-reset-db-btn" class="santa-m-btn santa-m-btn-danger" style="flex: 1;">重設本機資料庫</button>
              </div>
            </div>
          </div>

          <!-- TAB 4: Error & System Logs -->
          <div id="santa-tab-logs" class="santa-modal-tab-content" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; gap: 4px;">
                <button class="santa-m-btn santa-m-btn-outline santa-log-filter active" data-filter="all" style="padding: 3px 8px; font-size: 11px;">全部 (<span id="santa-log-count-all">0</span>)</button>
                <button class="santa-m-btn santa-m-btn-outline santa-log-filter" data-filter="error" style="padding: 3px 8px; font-size: 11px; color: #ff6b84;">僅錯誤 (<span id="santa-log-count-err">0</span>)</button>
                <button class="santa-m-btn santa-m-btn-outline santa-log-filter" data-filter="api" style="padding: 3px 8px; font-size: 11px; color: #38bdf8;">API 攔截 (<span id="santa-log-count-api">0</span>)</button>
              </div>
              <div style="display: flex; gap: 4px;">
                <button id="santa-copy-logs-btn" class="santa-m-btn santa-m-btn-outline" style="padding: 3px 8px; font-size: 11px;">📋 複製</button>
                <button id="santa-clear-logs-btn" class="santa-m-btn santa-m-btn-danger" style="padding: 3px 8px; font-size: 11px;">清空</button>
              </div>
            </div>

            <div id="santa-log-list-container" style="max-height: 48vh; overflow-y: auto; padding-right: 2px;">
              <div style="font-size: 12px; color: #64748b; text-align: center; padding: 20px;">尚無日誌記錄</div>
            </div>
          </div>

          <!-- TAB 5: Privacy & Log -->
          <div id="santa-tab-privacy" class="santa-modal-tab-content" style="display: none;">
            <div class="santa-m-card" style="border-left: 3px solid #10b981;">
              <div style="font-weight: 700; font-size: 12.5px; margin-bottom: 2px; color: #6ee7b7;">🛡️ 隱私優先架構運作中</div>
              <div style="font-size: 11.5px; color: #9da5b4; line-height: 1.45;">
                所有遙測追蹤（Sentry, Facebook Pixel, Google Tag Manager, Datadog）均已在瀏覽器端完全攔截並靜默 200 回應，確保所有資料 100% 留存在本地。
              </div>
            </div>
            <div class="santa-m-card">
              <div style="font-size: 11.5px; color: #9da5b4; line-height: 1.6;">
                <div>🔒 <b>本地服務端點</b>: http://127.0.0.1:8080</div>
                <div>📦 <b>本地快取 Chunks 數量</b>: 268+ 模組完整加載</div>
                <div>💽 <b>持久化引擎</b>: IndexedDB (SantaOfflineDB)</div>
                <div>🚀 <b>SPA Fallback</b>: 啟用</div>
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

    btn.addEventListener('click', openModal);
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
        <div>📖 <b>核心單字</b>: <span style="color: #34d399; font-weight: 700;">4,000 字 (750高頻+900金證)</span></div>
        <div>👑 <b>VIP 會員</b>: <span style="color: #fbbf24; font-weight: 700;">永久暢讀無限制</span></div>
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
