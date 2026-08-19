# ✨ Lumi AI 智慧英文家教 (PWA 獨立跨平台版本)

本專案打造 **100% 獨立運作、支援 PWA 安裝、自適應跨裝置（電腦、iPhone、iPad）、E2EE 端到端加密雲端同步、錯題本與自備 AI 服務（BYOK: Groq / OpenAI / Gemini）** 的次世代英語學習 Web App。

---

## 🌟 核心功能亮點

1. **📱 全方位 PWA 跨裝置自適應 (Responsive PWA)**
   - 支援 **電腦寬螢幕 (PC/Mac)**、**平板 (iPad)** 與 **智慧型手機 (iPhone / iOS Safe Area)**。
   - 支援「一鍵安裝至主畫面 / 獨立桌面 App 視窗」，具備完整 Service Worker 離線快取引擎。

2. **🔒 零知識端到端加密同步 (E2EE Cloud & Gist Sync)**
   - 採用 **PBKDF2 (100,000 次疊代) + 256-bit AES-GCM** 本機加密。
   - 支援 **GitHub Private Gist 私人同步（免費推薦）** 與 **本地/自建伺服器同步**。
   - 換到任何裝置輸入帳號密碼，瞬間還原完整錯題本、單字庫與學習進度！

3. **❌ 專屬錯題本與弱點強化 (Mistake Notebook & Retake)**
   - 作答時答錯的題目自動即時歸檔。
   - 支援分類篩選與 **`🔄 錯題重練`**，重新答對即標記攻克掌握。

4. **⚡ AI 即時動態出題與背景預載 (Zero-Latency AI Question Engine)**
   - 內建背景預載佇列（Prefetch Buffer），答題過程自動於背景生成 2~3 題，享受 0 毫秒秒切題體驗。
   - 支援 Part 1 / 5 / 6 / 7 多篇章與不同難度（600 / 750 / 900+）。

5. **📖 TOEIC 必考高頻核心單字庫 (ETS 13大商務情境)**
   - 收錄 50+ 核心商務高頻單字、音標、釋義、例句與真人 TTS 發音。
   - 支援 **`✨ AI 擴充單字`**，一鍵由 AI 導師生成全新必考詞彙。

6. **🤖 Lumi AI 專屬英文導師 & 自備金鑰 (BYOK: Bring Your Own Key)**
   - 支援 Google Gemini 1.5/2.0 Flash、Groq Whisper、OpenAI GPT-4o。
   - 金鑰僅保留於本機瀏覽器，直接與官方 API 通訊，100% 隱私無痕。

---

## 🚀 快速啟動指南

### 本地執行：
雙擊執行 `start_server.bat`，或在終端機中執行：
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1 -Port 8080
```
在瀏覽器打開 `http://127.0.0.1:8080/` 即可開始學習。

### 上傳至 GitHub Pages：
直接將本專案 push 至您的 GitHub 儲存庫，並在 **Settings $\rightarrow$ Pages** 開啟 GitHub Pages 即可享受免費雲端託管！
