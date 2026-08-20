/**
 * Santa AI Tutor - End-to-End Encrypted (E2EE) Cloud Sync Engine
 * Dual-Mode Synchronization:
 * 1. Mode A: GitHub Private Gist (Zero-Server, 100% Free, Perfect for GitHub Pages)
 * 2. Mode B: Local Server / Custom Backend API (/api/sync/*)
 * 
 * Security:
 * - PBKDF2 (SHA-256, 100,000 iterations) + AES-GCM (256-bit)
 * - Encrypted locally in browser before uploading to GitHub Gist or Server
 */

(function () {
  'use strict';

  console.log('🔒 [Santa E2EE Sync] Initializing Dual-Mode E2EE Sync Engine (Gist & Server)...');

  const SYNC_STORAGE_KEY = 'santa_e2ee_account_session';
  let syncDebounceTimer = null;
  let isSyncing = false;

  // ==========================================
  // 1. Web Crypto Cryptographic Primitives
  // ==========================================
  function buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
  }

  function hex2buf(hexString) {
    const bytes = new Uint8Array(Math.ceil(hexString.length / 2));
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hexString.substr(i * 2, 2), 16);
    return bytes.buffer;
  }

  async function deriveKey(password, saltHex) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    const salt = saltHex ? hex2buf(saltHex) : crypto.getRandomValues(new Uint8Array(16));
    const saltHexOutput = buf2hex(salt);

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );

    return { key, saltHex: saltHexOutput };
  }

  async function encryptData(plainText, key) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipherBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(plainText)
    );

    return {
      ciphertext: buf2hex(cipherBuffer),
      ivHex: buf2hex(iv)
    };
  }

  async function decryptData(ciphertextHex, ivHex, key) {
    const cipherBuffer = hex2buf(ciphertextHex);
    const iv = hex2buf(ivHex);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      cipherBuffer
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  }

  // ==========================================
  // 2. Session Management
  // ==========================================
  function getSession() {
    try {
      const s = localStorage.getItem(SYNC_STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch (e) { }
    return null;
  }

  function setSession(session) {
    if (!session) {
      localStorage.removeItem(SYNC_STORAGE_KEY);
    } else {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(session));
    }
    updateSyncUIStatus();
  }

  // ==========================================
  // 3. Memory Snapshot Builder & Restorer
  // ==========================================
  function exportFullMemorySnapshot() {
    const profile = window.SantaDB ? window.SantaDB.getProfile() : {};
    const mistakes = window.SantaDB ? window.SantaDB.getMistakes() : [];
    const vocabularyProgress = window.SantaDB ? window.SantaDB.getVocabularyProgress() : {};
    const settings = window.SantaAIService ? window.SantaAIService.getSettings() : {};
    const speakingHistory = [];
    const lumiHistory = [];

    try {
      const savedSpeaking = localStorage.getItem('santa_speaking_history');
      if (savedSpeaking) speakingHistory.push(...JSON.parse(savedSpeaking));
    } catch (e) { }

    return {
      version: '1.5',
      timestamp: Date.now(),
      profile,
      mistakes,
      vocabularyProgress,
      speakingHistory,
      lumiHistory,
      settings
    };
  }

  function restoreFullMemorySnapshot(snapshot) {
    if (!snapshot) return;
    console.log('[Santa E2EE Sync] 📥 Restoring decrypted memory snapshot into local storage...', snapshot);

    if (snapshot.profile && window.SantaDB) {
      window.SantaDB.saveProfile(snapshot.profile);
    }

    if (snapshot.mistakes && window.SantaDB) {
      window.SantaDB.saveMistakes(snapshot.mistakes);
    }

    if (snapshot.vocabularyProgress && window.SantaDB) {
      window.SantaDB.saveVocabularyProgress(snapshot.vocabularyProgress);
    }

    if (snapshot.settings && window.SantaAIService) {
      window.SantaAIService.saveSettings(snapshot.settings);
    }

    if (window.renderCourseDashboard) window.renderCourseDashboard();
    if (window.renderMistakesView) window.renderMistakesView();
    if (window.renderVocaWordbook) window.renderVocaWordbook();
    updateSyncUIStatus();
  }

  // ==========================================
  // 4. GitHub Gist Sync Engine (Zero-Server Cloud)
  // ==========================================
  async function createOrUpdateGistSync(githubToken, password, existingGistId = '') {
    const token = (githubToken || '').trim();
    const pass = (password || '').trim();
    if (!token) throw new Error('請輸入 GitHub Personal Access Token (需具備 gist 權限)');
    if (!pass || pass.length < 4) throw new Error('加密密碼長度至少需 4 個字元');

    const { key, saltHex } = await deriveKey(pass);
    const snapshot = exportFullMemorySnapshot();
    const { ciphertext, ivHex } = await encryptData(JSON.stringify(snapshot), key);

    const payloadContent = JSON.stringify({
      saltHex,
      ivHex,
      ciphertext,
      updatedAt: Date.now()
    }, null, 2);

    let gistId = existingGistId.trim();

    if (gistId) {
      // Update existing Gist
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: 'Santa AI Tutor E2EE Sync Database',
          files: {
            'santa_ai_sync.json': { content: payloadContent }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '更新 Gist 失敗，請確認 Token 或 Gist ID 是否正確');
      }
    } else {
      // Create new private Gist
      const res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: 'Santa AI Tutor E2EE Sync Database',
          public: false,
          files: {
            'santa_ai_sync.json': { content: payloadContent }
          }
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || '建立私人 Gist 失敗，請檢查 GitHub Token 權限');
      }

      const data = await res.json();
      gistId = data.id;
    }

    setSession({
      mode: 'gist',
      githubToken: token,
      gistId: gistId,
      password: pass,
      saltHex: saltHex,
      lastSync: Date.now()
    });

    return {
      success: true,
      gistId: gistId,
      message: `🎉 GitHub Gist 同步成功！您的專屬 Gist ID 為：${gistId}（在其他裝置輸入此 ID 與密碼即可同步）`
    };
  }

  async function pullFromGist(githubToken, gistId, password) {
    const token = (githubToken || '').trim();
    const gId = (gistId || '').trim();
    const pass = (password || '').trim();
    if (!gId) throw new Error('請輸入 Gist ID');
    if (!pass) throw new Error('請輸入解密密碼');

    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/gists/${gId}`, { headers });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || '無法取得 Gist 資料，請檢查 Gist ID 或 Token');
    }

    const data = await res.json();
    const file = data.files['santa_ai_sync.json'];
    if (!file || !file.content) throw new Error('Gist 中找不到 santa_ai_sync.json 同步檔');

    const syncPayload = JSON.parse(file.content);
    const { key } = await deriveKey(pass, syncPayload.saltHex);

    try {
      const decryptedJson = await decryptData(syncPayload.ciphertext, syncPayload.ivHex, key);
      const snapshot = JSON.parse(decryptedJson);
      restoreFullMemorySnapshot(snapshot);

      setSession({
        mode: 'gist',
        githubToken: token,
        gistId: gId,
        password: pass,
        saltHex: syncPayload.saltHex,
        lastSync: Date.now()
      });

      return { success: true, message: '✅ 成功從 GitHub Gist 下載並解密還原所有學習記憶！' };
    } catch (e) {
      throw new Error('❌ 解密失敗！密碼不正確，無法解開 Gist 中的端到端加密資料');
    }
  }

  // ==========================================
  // 5. Local / Custom Server API Sync
  // ==========================================
  async function registerAccount(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    if (!cleanUser || cleanUser.length < 3) throw new Error('使用者帳號長度至少需 3 個字元');
    if (!cleanPass || cleanPass.length < 4) throw new Error('密碼長度至少需 4 個字元');

    const { key, saltHex } = await deriveKey(cleanPass);
    const snapshot = exportFullMemorySnapshot();
    const { ciphertext, ivHex } = await encryptData(JSON.stringify(snapshot), key);

    const res = await fetch('/api/sync/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUser,
        saltHex: saltHex,
        ivHex: ivHex,
        ciphertext: ciphertext,
        timestamp: Date.now()
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '註冊失敗');

    setSession({
      mode: 'server',
      username: cleanUser,
      password: cleanPass,
      saltHex: saltHex,
      lastSync: Date.now()
    });

    return { success: true, message: '🎉 帳號建立成功，且已完成首次端到端加密同步！' };
  }

  async function loginAccount(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();
    if (!cleanUser || !cleanPass) throw new Error('請輸入帳號與密碼');

    const res = await fetch('/api/sync/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUser
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '登入失敗 (帳號不存在)');

    const { key } = await deriveKey(cleanPass, data.saltHex);

    try {
      const decryptedJson = await decryptData(data.ciphertext, data.ivHex, key);
      const snapshot = JSON.parse(decryptedJson);
      restoreFullMemorySnapshot(snapshot);

      setSession({
        mode: 'server',
        username: cleanUser,
        password: cleanPass,
        saltHex: data.saltHex,
        lastSync: Date.now()
      });

      return { success: true, message: '✅ 登入成功！已從雲端解密同步完整錯題本與學習進度。' };
    } catch (e) {
      throw new Error('❌ 密碼錯誤，無法解密您的端到端加密資料庫！');
    }
  }

  async function pushMemory() {
    const session = getSession();
    if (!session || !session.password) return;
    if (isSyncing) return;
    isSyncing = true;

    try {
      if (session.mode === 'gist' && session.githubToken && session.gistId) {
        // Push to Gist
        await createOrUpdateGistSync(session.githubToken, session.password, session.gistId);
        console.log('[Santa E2EE Sync] ☁️ Pushed memory to GitHub Gist successfully at', new Date().toLocaleTimeString());
      } else if (session.username) {
        // Push to Server
        const { key, saltHex } = await deriveKey(session.password, session.saltHex);
        const snapshot = exportFullMemorySnapshot();
        const { ciphertext, ivHex } = await encryptData(JSON.stringify(snapshot), key);

        const res = await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: session.username,
            saltHex: saltHex,
            ivHex: ivHex,
            ciphertext: ciphertext,
            timestamp: Date.now()
          })
        });

        if (res.ok) {
          session.lastSync = Date.now();
          setSession(session);
          console.log('[Santa E2EE Sync] ☁️ Pushed memory to Local Server successfully at', new Date().toLocaleTimeString());
        }
      }
    } catch (err) {
      console.warn('[Santa E2EE Sync] Auto-push error:', err);
    } finally {
      isSyncing = false;
    }
  }

  async function pullMemory() {
    const session = getSession();
    if (!session || !session.password) return;

    try {
      if (session.mode === 'gist' && session.gistId) {
        await pullFromGist(session.githubToken, session.gistId, session.password);
      } else if (session.username) {
        const res = await fetch(`/api/sync/pull?username=${encodeURIComponent(session.username)}`);
        if (!res.ok) return;
        const data = await res.json();

        const { key } = await deriveKey(session.password, data.saltHex);
        const decryptedJson = await decryptData(data.ciphertext, data.ivHex, key);
        const snapshot = JSON.parse(decryptedJson);
        restoreFullMemorySnapshot(snapshot);

        session.lastSync = Date.now();
        setSession(session);
      }
    } catch (err) {
      console.warn('[Santa E2EE Sync] Pull error:', err);
    }
  }

  function scheduleAutoSync() {
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    syncDebounceTimer = setTimeout(() => {
      pushMemory();
    }, 1500);
  }

  function logoutAccount() {
    setSession(null);
    alert('已成功登出雲端同步。本機資料依然完整保留。');
  }

  function updateSyncUIStatus() {
    const session = getSession();
    const navBadge = document.getElementById('nav-sync-badge');
    const settingsBadge = document.getElementById('settings-sync-status');
    const lastSyncEl = document.getElementById('sync-last-time');

    if (session && (session.username || session.gistId)) {
      const displayName = session.mode === 'gist' ? `Gist: ${session.gistId.substr(0, 7)}...` : session.username;
      if (navBadge) {
        navBadge.innerHTML = `🟢 已同步 (${displayName})`;
        navBadge.style.display = 'inline-block';
      }
      if (settingsBadge) {
        settingsBadge.innerHTML = `<span style="color: #34d399; font-weight: 700;">🟢 雲端同步連線中 (${displayName})</span>`;
      }
      if (lastSyncEl) {
        const d = session.lastSync ? new Date(session.lastSync).toLocaleTimeString() : '剛才';
        lastSyncEl.innerText = `最後同步時間: ${d}`;
      }
    } else {
      if (navBadge) {
        navBadge.innerHTML = `☁️ 未登入同步`;
        navBadge.style.display = 'none';
      }
      if (settingsBadge) {
        settingsBadge.innerHTML = `<span style="color: #94a3b8;">⚪ 未登入 (僅保存在此裝置)</span>`;
      }
      if (lastSyncEl) {
        lastSyncEl.innerText = `尚未連線至雲端帳號`;
      }
    }
  }

  // ==========================================
  // Expose Global Service
  // ==========================================
  window.SantaSync = {
    register: registerAccount,
    login: loginAccount,
    createOrUpdateGistSync,
    pullFromGist,
    logout: logoutAccount,
    push: pushMemory,
    pull: pullMemory,
    scheduleAutoSync,
    getSession,
    updateSyncUIStatus
  };

  // Initial Sync Check & Lifecycle Auto-Sync
  window.addEventListener('DOMContentLoaded', () => {
    updateSyncUIStatus();
    if (getSession()) {
      pullMemory();
    }
  });

  // Auto-pull latest cloud memory when switching back to tab/app (e.g. mobile unlock or tab switch)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && getSession()) {
      pullMemory();
    }
  });

  window.addEventListener('focus', () => {
    if (getSession()) {
      pullMemory();
    }
  });

})();
