/**
 * Santa AI Tutor - Standalone Offline AI Service Engine (BYOK)
 * Supports Groq Whisper & LLaMA 3.3 (ultra-fast & free tier), OpenAI Whisper & GPT-4o, Gemini 1.5 / 2.0 Flash (with Auto-Discovery), and Ollama.
 * Features:
 * 1. Audio STT Transcription & MediaRecorder
 * 2. Speaking Evaluation & Grammar Error Correction (GEC)
 * 3. AI Tutor Lumi Interactive Chat
 * 4. AI Infinite Dynamic Question Generator (Categorized Part 1~7 Bank + Live AI Item Generation)
 */

(function () {
  'use strict';

  console.log('🤖 [Santa AI Service] Initializing BYOK AI Service Engine...');

  const DEFAULT_SETTINGS = {
    provider: 'gemini', // 'gemini' | 'groq' | 'openai' | 'ollama' | 'mock'
    groqApiKey: '',
    groqSttModel: 'whisper-large-v3',
    groqChatModel: 'llama-3.3-70b-versatile',
    openaiApiKey: '',
    openaiSttModel: 'whisper-1',
    openaiChatModel: 'gpt-4o-mini',
    geminiApiKey: '',
    geminiChatModel: 'models/gemini-3.6-flash',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaChatModel: 'llama3.2',
    enableAiStreaming: false
  };

  function getSettings() {
    try {
      const saved = localStorage.getItem('santa_ai_custom_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.geminiChatModel && (parsed.geminiChatModel.includes('2.0') || parsed.geminiChatModel.includes('gemini-pro') || parsed.geminiChatModel.includes('3.1-pro'))) {
          parsed.geminiChatModel = 'models/gemini-3.6-flash';
          localStorage.setItem('santa_ai_custom_settings', JSON.stringify(parsed));
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch (e) { }
    return DEFAULT_SETTINGS;
  }

  function saveSettings(newSettings) {
    const current = getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem('santa_ai_custom_settings', JSON.stringify(updated));
    return updated;
  }

  function hasConfiguredKey() {
    const s = getSettings();
    if (s.provider === 'gemini' && s.geminiApiKey) return true;
    if (s.provider === 'groq' && s.groqApiKey) return true;
    if (s.provider === 'openai' && s.openaiApiKey) return true;
    if (s.provider === 'ollama') return true;
    return false;
  }

  // ==========================================
  // 0. Intelligent Gemini API Engine (Strictly Flash & Flash-Lite Only)
  // ==========================================
  let cachedGeminiModel = null;

  async function discoverGeminiModel(apiKey) {
    if (cachedGeminiModel && !cachedGeminiModel.includes('2.0')) return cachedGeminiModel;
    const s = getSettings();
    if (s.geminiChatModel && s.geminiChatModel.includes('flash') && !s.geminiChatModel.includes('2.0')) {
      cachedGeminiModel = s.geminiChatModel;
      return cachedGeminiModel;
    }

    try {
      const res = await window.fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey.trim()}`);
      if (res.ok) {
        const data = await res.json();
        const available = data.models || [];
        const generateModels = available.filter(m => (m.supportedGenerationMethods || []).includes('generateContent'));
        
        // Priority order: 3.6-flash > 3.7-flash > 1.5-flash > any flash model
        // CRITICAL: NEVER AUTO-FALLBACK TO EXPENSIVE PRO MODELS!
        const flash36 = generateModels.find(m => m.name.includes('3.6-flash') && !m.name.includes('lite'));
        if (flash36) {
          cachedGeminiModel = flash36.name;
          return cachedGeminiModel;
        }
        const flash37 = generateModels.find(m => m.name.includes('3.7-flash'));
        if (flash37) {
          cachedGeminiModel = flash37.name;
          return cachedGeminiModel;
        }
        const flash36Lite = generateModels.find(m => m.name.includes('3.6-flash-lite') || m.name.includes('flash-lite'));
        if (flash36Lite) {
          cachedGeminiModel = flash36Lite.name;
          return cachedGeminiModel;
        }
        const flash15 = generateModels.find(m => m.name.includes('1.5-flash'));
        if (flash15) {
          cachedGeminiModel = flash15.name;
          return cachedGeminiModel;
        }
        const anyFlash = generateModels.find(m => m.name.toLowerCase().includes('flash'));
        if (anyFlash) {
          cachedGeminiModel = anyFlash.name;
          return cachedGeminiModel;
        }
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error?.message && (err.error.message.includes('API key not valid') || err.error.message.includes('API_KEY_INVALID'))) {
          throw new Error('Gemini API Key 無效，請檢查 Google AI Studio 金鑰是否複製完整。');
        }
      }
    } catch (e) {
      if (e.message && e.message.includes('API Key 無效')) throw e;
      console.warn('[Lumi AI] Error discovering Gemini models:', e);
    }

    // Default to current supported flash model
    cachedGeminiModel = 'models/gemini-3.6-flash';
    return cachedGeminiModel;
  }

  async function callGeminiApi(apiKey, userPrompt, isJsonExpected = false) {
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey) throw new Error('請先輸入 Google Gemini API Key');

    const s = getSettings();
    let preferredModel = s.geminiChatModel || 'models/gemini-3.6-flash';
    if (preferredModel.includes('2.0')) preferredModel = 'models/gemini-3.6-flash';

    const candidateModels = [
      preferredModel,
      'models/gemini-3.6-flash',
      'models/gemini-3.7-flash',
      'models/gemini-1.5-flash',
      'models/gemini-flash'
    ].filter((v, i, a) => a.indexOf(v) === i);

    let lastError = null;

    for (const model of candidateModels) {
      const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${cleanKey}`;

      const requestBody = {
        contents: [
          {
            role: "user",
            parts: [
              { text: userPrompt }
            ]
          }
        ]
      };

      if (isJsonExpected) {
        requestBody.generationConfig = {
          temperature: 0.7
        };
      }

      try {
        const res = await window.fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            cachedGeminiModel = cleanModel;
            return text;
          }
        }

        const errMsg = data.error?.message || `HTTP ${res.status}`;
        if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID')) {
          throw new Error('Gemini API Key 無效，請確認金鑰是否完整複製。');
        }
        lastError = new Error(errMsg);
      } catch (err) {
        if (err.message && err.message.includes('API Key 無效')) throw err;
        lastError = err;
      }
    }

    throw lastError || new Error('Gemini 呼叫失敗，請檢查 API Key 或切換為 Groq API。');
  }

  // ==========================================
  // 1. Audio Transcription (STT)
  // ==========================================
  // Helper: Blob to Base64 for Multimodal Audio API
  // ==========================================
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result || '').split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ==========================================
  // 1. Audio STT & Multimodal Speaking Evaluation Engine
  // ==========================================
  async function transcribeAudio(audioBlob) {
    const s = getSettings();
    console.log(`[Santa AI] Transcribing audio with provider: ${s.provider}, size: ${audioBlob.size} bytes`);

    // --- Groq Whisper API ---
    if (s.provider === 'groq' && s.groqApiKey) {
      const formData = new FormData();
      formData.append('file', audioBlob, 'speaking_response.wav');
      formData.append('model', s.groqSttModel || 'whisper-large-v3');
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', '0.0');

      const res = await window.fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${s.groqApiKey.trim()}` },
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Groq Whisper API Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      return {
        text: data.text || '',
        segments: data.segments || [],
        duration: data.duration || 0,
        words: data.words || []
      };
    }

    // --- OpenAI Whisper API ---
    if (s.provider === 'openai' && s.openaiApiKey) {
      const formData = new FormData();
      formData.append('file', audioBlob, 'speaking_response.wav');
      formData.append('model', s.openaiSttModel || 'whisper-1');
      formData.append('response_format', 'verbose_json');

      const res = await window.fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${s.openaiApiKey.trim()}` },
        body: formData
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI Whisper API Error (${res.status}): ${errText}`);
      }

      const data = await res.json();
      return {
        text: data.text || '',
        segments: data.segments || [],
        duration: data.duration || 0,
        words: data.words || []
      };
    }

    return { text: '', segments: [], duration: 0, words: [] };
  }

  // ==========================================
  // 2. Speaking Evaluation & GEC via LLM / Gemini Audio
  // ==========================================
  async function transcribeAndEvaluateAudio(audioBlob, referenceText = "") {
    const s = getSettings();

    // Check for empty or micro-short audio (< 500 bytes or 0.2s)
    if (!audioBlob || audioBlob.size < 500) {
      return {
        transcription: "(未偵測到清晰語音)",
        speechAmount: { myAnswer: 0, alAnswer: referenceText ? referenceText.split(/\s+/).length : 40 },
        evaluation: { pronunciation: 0, fluency: 0, grammar: 0 },
        explanation: "⚠️ 錄音時間過短或未偵測到聲音訊號，請重新朗讀。",
        gec: { corrections: [] },
        segments: []
      };
    }

    // --- CASE A: Gemini Native Multimodal Audio (Direct Listening) ---
    if (s.provider === 'gemini' && s.geminiApiKey) {
      const model = await discoverGeminiModel(s.geminiApiKey);
      const base64Audio = await blobToBase64(audioBlob);
      const cleanMime = (audioBlob.type || 'audio/webm').split(';')[0];

      const promptText = `You are a certified ETS TOEIC Speaking Examiner.
Carefully listen to this user's recorded audio response for this reference text:
Reference Passage: "${referenceText || 'General business English speech'}"

CRITICAL INSTRUCTIONS:
1. Listen to the audio. Transcribe EXACTLY what the user actually said word-for-word in English.
2. SILENCE / NO-SPEECH DETECTION: If the user remained silent, did not speak in English, or if the audio contains only background static, breath, or non-speech noise:
   - "transcription": ""
   - "isSilence": true
   - "pronunciation": 0, "fluency": 0, "grammar": 0, "wordCount": 0
   - "explanation": "⚠️ 未偵測到清晰語音（錄音內容為靜音或未說話），請確認麥克風已開啟並靠近大聲朗讀。"
   - "gec": []
3. REAL SPEECH EVALUATION: If the user actually spoke:
   - "transcription": "<exact words transcribed from audio>"
   - "isSilence": false
   - "wordCount": <number of words spoken>
   - Compare with reference text. Calculate genuine pronunciation (0-100), fluency (0-100), grammar (0-100).
   - In "explanation" (in Traditional Chinese 繁體中文), give constructive feedback: mention accurate words and note any missing or mispronounced words.
   - In "gec", list specific phrases that differed.

Output JSON ONLY (no markdown backticks):
{
  "isSilence": boolean,
  "transcription": string,
  "pronunciation": number,
  "fluency": number,
  "grammar": number,
  "wordCount": number,
  "explanation": string,
  "gec": [
    { "original": string, "corrected": string, "reason": string }
  ]
}`;

      const res = await window.fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${s.geminiApiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: base64Audio
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gemini 語音評測失敗: ${err.error?.message || res.statusText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      let parsed = {};
      try {
        parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (e) {
        parsed = { isSilence: true, explanation: "無法解析 AI 語音診斷回應。" };
      }

      const isSilent = parsed.isSilence || !parsed.transcription || parsed.transcription.trim().length === 0;

      return {
        transcription: isSilent ? "(未偵測到清晰語音)" : parsed.transcription,
        speechAmount: {
          myAnswer: isSilent ? 0 : (parsed.wordCount || parsed.transcription.split(/\s+/).length),
          alAnswer: referenceText ? referenceText.split(/\s+/).length : 40
        },
        evaluation: {
          pronunciation: isSilent ? 0 : (parsed.pronunciation || 0),
          fluency: isSilent ? 0 : (parsed.fluency || 0),
          grammar: isSilent ? 0 : (parsed.grammar || 0)
        },
        explanation: isSilent ? "⚠️ 未偵測到清晰語音（錄音內容為靜音或未說話），請靠近麥克風大聲朗讀。" : (parsed.explanation || "發音評測完成。"),
        gec: { corrections: isSilent ? [] : (parsed.gec || []) },
        segments: []
      };
    }

    // --- CASE B: Groq / OpenAI Whisper STT + LLM Evaluation ---
    if ((s.provider === 'groq' && s.groqApiKey) || (s.provider === 'openai' && s.openaiApiKey)) {
      const sttResult = await transcribeAudio(audioBlob);
      const text = (sttResult.text || '').trim();

      const silenceTokens = ['', '[music]', '[silence]', '[applause]', '.', 'thank you', 'thanks for watching'];
      if (!text || silenceTokens.includes(text.toLowerCase()) || text.length < 2) {
        return {
          transcription: "(未偵測到清晰語音)",
          speechAmount: { myAnswer: 0, alAnswer: referenceText ? referenceText.split(/\s+/).length : 40 },
          evaluation: { pronunciation: 0, fluency: 0, grammar: 0 },
          explanation: "⚠️ 未偵測到清晰語音（錄音內容為靜音或音量過小），請靠近麥克風並大聲朗讀。",
          gec: { corrections: [] },
          segments: []
        };
      }

      const evalResult = await evaluateSpeaking(text, referenceText);
      return {
        transcription: text,
        speechAmount: {
          myAnswer: evalResult.wordCount || text.split(/\s+/).length,
          alAnswer: referenceText ? referenceText.split(/\s+/).length : 50
        },
        evaluation: {
          pronunciation: evalResult.pronunciation || 70,
          fluency: evalResult.fluency || 70,
          grammar: evalResult.grammar || 70
        },
        explanation: evalResult.explanation || "發音評測完成！",
        gec: { corrections: evalResult.gec || [] },
        segments: sttResult.segments || []
      };
    }

    // --- CASE C: No Key Configured ---
    return {
      transcription: "(尚未設定 AI STT 語音轉錄金鑰)",
      speechAmount: { myAnswer: 0, alAnswer: referenceText ? referenceText.split(/\s+/).length : 40 },
      evaluation: { pronunciation: 0, fluency: 0, grammar: 0 },
      explanation: "⚠️ 請點擊右下角 ⚙️ 控制中心設定 Gemini 或 Groq API Key，以啟用即時真實語音轉錄與發音診斷！",
      gec: { corrections: [] },
      segments: []
    };
  }

  async function evaluateSpeaking(transcription, referenceText = "") {
    const s = getSettings();
    const prompt = `You are the Lumi AI TOEIC Speaking Examiner. Analyze this student's spoken transcription for a TOEIC Speaking exam.
Student transcription: "${transcription}"
Target/Reference passage: "${referenceText || 'General business English response'}"

Evaluate and output ONLY a valid JSON object with the following schema:
{
  "pronunciation": <number 0-100>,
  "fluency": <number 0-100>,
  "grammar": <number 0-100>,
  "wordCount": <number>,
  "explanation": "<brief constructive feedback in Traditional Chinese / English>",
  "gec": [
    { "original": "<error phrase>", "corrected": "<fixed phrase>", "reason": "<explanation in Traditional Chinese>" }
  ]
}`;

    let rawText = '';
    if (s.provider === 'groq' && s.groqApiKey) {
      const res = await window.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${s.groqApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: s.groqChatModel || 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: 'You are a TOEIC Speaking Evaluator. Output raw valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });
      const data = await res.json();
      rawText = data.choices?.[0]?.message?.content || '';
    } else if (s.provider === 'openai' && s.openaiApiKey) {
      const res = await window.fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${s.openaiApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: s.openaiChatModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You output ONLY raw valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        })
      });
      const data = await res.json();
      rawText = data.choices?.[0]?.message?.content || '';
    }

    try {
      return JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
    } catch (e) {
      return {
        pronunciation: 70,
        fluency: 70,
        grammar: 70,
        explanation: "評測完成。",
        gec: []
      };
    }
  }

  // ==========================================
  // 3. AI Tutor Lumi Interactive Chat
  // ==========================================
  async function chatWithLumi(userMessage, chatHistory = []) {
    const s = getSettings();
    const systemPrompt = `You are Lumi, the AI Tutor for Lumi AI 智慧英文家教.
You are a friendly, encouraging, and highly knowledgeable English tutor specializing in TOEIC and TOEFL test preparation.
- Keep explanations clear, actionable, and encouraging.
- When explaining grammar or vocabulary, provide both English examples and Traditional Chinese (繁體中文) explanations.
- Help students analyze their weaknesses in Part 1~7 and speaking tests.`;

    if (!hasConfiguredKey()) {
      return "Hello! 我是 Lumi 導師。（如欲體驗即時 AI 智能對話與解析，請點擊右下角 ⚙️ 設定並填入 Gemini 或 Groq 金鑰即可啟用！）請問今天想練習哪一個 TOEIC 題型呢？";
    }

    if (s.provider === 'gemini' && s.geminiApiKey) {
      return await callGeminiApi(s.geminiApiKey, `${systemPrompt}\n\nUser: ${userMessage}`);
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.map(m => ({ role: m.role.toLowerCase() === 'assistant' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: userMessage }
    ];

    if (s.provider === 'groq' && s.groqApiKey) {
      const res = await window.fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${s.groqApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: s.groqChatModel || 'llama-3.3-70b-versatile',
          messages: messages,
          temperature: 0.7
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Groq API 錯誤');
      return data.choices?.[0]?.message?.content || '抱歉，暫時無法取得回應。';
    }

    if (s.provider === 'openai' && s.openaiApiKey) {
      const res = await window.fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${s.openaiApiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: s.openaiChatModel || 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'OpenAI API 錯誤');
      return data.choices?.[0]?.message?.content || '抱歉，暫時無法取得回應。';
    }

    return "Lumi 正在準備您的學習建議！";
  }

  // ==========================================
  // 4. Multi-Category Rich Offline Question Bank
  // ==========================================
  const OFFLINE_QUESTION_BANK = {
    part1: [
      {
        part: "Part 1 - Photographs",
        difficulty: "750",
        title: "Part 1 - Photographs (照片描述題)",
        passage: "",
        question: "Look at the picture of the logistics warehouse. Which statement best describes what is taking place?",
        options: [
          { key: "A", text: "Workers are inspecting merchandise on elevated metal shelves." },
          { key: "B", text: "Heavy machinery is being assembled on the sidewalk." },
          { key: "C", text: "Packages are being loaded directly onto a cargo airplane." },
          { key: "D", text: "A presentation is being delivered in an auditorium." }
        ],
        correct: "A",
        explanation: "畫面顯示倉庫員工正站在走道中檢視高架金屬貨架上的貨物。故選 (A)。",
        skill: "Visual Detail Identification"
      }
    ],
    part5: [
      {
        part: "Part 5 - Incomplete Sentences",
        difficulty: "900",
        title: "Part 5 - Incomplete Sentences (單句填空)",
        passage: "",
        question: "Although the quarterly negotiations were exceptionally challenging, the lead representative _______ managed to secure a favorable contract.",
        options: [
          { key: "A", text: "eventual" },
          { key: "B", text: "eventually" },
          { key: "C", text: "eventuality" },
          { key: "D", text: "events" }
        ],
        correct: "B",
        explanation: "空格修飾動詞 managed，需使用副詞 eventually（最終地、終於）。(A) 為形容詞，(C)(D) 為名詞，故選 (B)。",
        skill: "Adverb Modifying Verbs"
      },
      {
        part: "Part 5 - Incomplete Sentences",
        difficulty: "900",
        title: "Part 5 - Incomplete Sentences (單句填空)",
        passage: "",
        question: "The director urgently requested that all regional branch managers _______ their revised expenditure forecasts by Friday afternoon.",
        options: [
          { key: "A", text: "submit" },
          { key: "B", text: "submits" },
          { key: "C", text: "submitted" },
          { key: "D", text: "submitting" }
        ],
        correct: "A",
        explanation: "動詞 requested 具有要求/建議之語氣，後接 that 子句時助動詞 should 省略，動詞需使用原形 (submit)。故正確答案為 (A)。",
        skill: "Subjunctive Mood"
      },
      {
        part: "Part 5 - Incomplete Sentences",
        difficulty: "750",
        title: "Part 5 - Incomplete Sentences (單句填空)",
        passage: "",
        question: "Due to an unexpected surge in consumer demand, the semiconductor fabrication plant operated _______ maximum capacity throughout October.",
        options: [
          { key: "A", text: "at" },
          { key: "B", text: "on" },
          { key: "C", text: "with" },
          { key: "D", text: "from" }
        ],
        correct: "A",
        explanation: "固定介系詞搭配「at maximum capacity」表示「以最大產能運轉」。故選 (A)。",
        skill: "Prepositional Collocations"
      },
      {
        part: "Part 5 - Incomplete Sentences",
        difficulty: "900",
        title: "Part 5 - Incomplete Sentences (單句填空)",
        passage: "",
        question: "Neither the newly appointed chief executive officer nor the senior committee members _______ satisfied with the preliminary audit results.",
        options: [
          { key: "A", text: "was" },
          { key: "B", text: "were" },
          { key: "C", text: "is" },
          { key: "D", text: "be" }
        ],
        correct: "B",
        explanation: "由「Neither A nor B」連接主詞時，動詞單複數須依最靠近的主詞 (members，複數) 決定，過去式複數動詞選 (B) were。",
        skill: "Subject-Verb Agreement"
      }
    ],
    part6: [
      {
        part: "Part 6 - Text Completion",
        difficulty: "900",
        title: "Part 6 - Text Completion (篇章克漏字)",
        passage: "Notice to All Personnel: In order to maintain strict compliance with updated global cybersecurity directives, all employees are instructed to update their network authentication keys by this Friday. Failure to comply will result in temporary system _______ until credentials are authenticated by IT security.",
        question: "Which word best completes the notice?",
        options: [
          { key: "A", text: "suspension" },
          { key: "B", text: "expansion" },
          { key: "C", text: "progression" },
          { key: "D", text: "exemption" }
        ],
        correct: "A",
        explanation: "文中指出未能在期限內更新認證將導致系統權限遭到暫時「停權/中止 (suspension)」。故選 (A)。",
        skill: "Contextual Vocabulary"
      },
      {
        part: "Part 6 - Text Completion",
        difficulty: "750",
        title: "Part 6 - Text Completion (篇章克漏字)",
        passage: "Dear valued subscriber, your annual subscription to Global Logistics Quarterly is set to expire on December 1. To ensure uninterrupted access to our exclusive market analyses, please renew your membership before November 20. Renewing early _______ you to a 20% discount on all upcoming webinars.",
        question: "Select the correct form to complete the sentence.",
        options: [
          { key: "A", text: "entitles" },
          { key: "B", text: "entitling" },
          { key: "C", text: "entitled" },
          { key: "D", text: "entitlement" }
        ],
        correct: "A",
        explanation: "動名詞片語「Renewing early」做主詞，視為單數，主要動詞需用現在式單數動詞 entitles（使...有資格）。搭配「entitle sb to sth」。故選 (A)。",
        skill: "Gerund Subject Agreement"
      }
    ],
    part7: [
      {
        part: "Part 7 - Reading Comprehension",
        difficulty: "900",
        title: "Part 7 - Reading Comprehension (閱讀理解 - 會議通知)",
        passage: "Email Subject: Confirmation of Keynote Address & Travel Schedule\nDear Dr. Arisawa, We are honored to confirm your keynote presentation at the International Renewable Power Symposium on October 18. Your presentation, 'Next-Generation Solid-State Battery Storage,' is scheduled for 9:30 AM in Hall C. We have reserved executive lodging for you at the Harbor View Hotel beginning October 17. A chauffeured vehicle will pick you up from Airport Terminal 2 at 3:00 PM on October 17.",
        question: "According to the email, what is scheduled to happen on October 17?",
        options: [
          { key: "A", text: "Dr. Arisawa will deliver his keynote presentation." },
          { key: "B", text: "Dr. Arisawa's hotel accommodation and airport pickup will take place." },
          { key: "C", text: "The Renewable Power Symposium will officially conclude." },
          { key: "D", text: "Hall C will undergo audio equipment inspection." }
        ],
        correct: "B",
        explanation: "信件明確指出「Harbor View Hotel lodging beginning October 17」且「chauffeur will pick you up on October 17」，故 (B) 為正確答案。",
        skill: "Fact Retrieval & Schedule Interpretation"
      },
      {
        part: "Part 7 - Reading Comprehension",
        difficulty: "900",
        title: "Part 7 - Reading Comprehension (閱讀理解 - 商業物流公告)",
        passage: "Apex Express Courier Service Advisory:\nDue to essential runway maintenance at the Central Incheon Cargo Hub, all standard air shipments dispatched between August 22 and August 25 may experience transit delays of 24 to 48 hours. Priority overnight shipments will be rerouted via Gimpo International Airport without incurring supplementary freight charges. Clients requiring urgent re-routing should contact their dedicated account executive before 5:00 PM today.",
        question: "What is indicated about priority overnight shipments?",
        options: [
          { key: "A", text: "They are completely canceled during the maintenance period." },
          { key: "B", text: "They will be transported through an alternative airport at no extra cost." },
          { key: "C", text: "They will be subject to a 20% surcharge." },
          { key: "D", text: "They can only be scheduled after August 25." }
        ],
        correct: "B",
        explanation: "公告第二句載明「Priority overnight shipments will be rerouted via Gimpo International Airport without incurring supplementary freight charges（將經由金浦機場轉運且不加收額外運費）」，故 (B) 正確。",
        skill: "Inference & Condition Analysis"
      },
      {
        part: "Part 7 - Reading Comprehension",
        difficulty: "750",
        title: "Part 7 - Reading Comprehension (閱讀理解 - 產品保固與退換條款)",
        passage: "Warranty & Return Policy - Vertex Audio Technologies:\nAll Vertex wireless acoustic devices are covered by a comprehensive 24-month manufacturer warranty covering internal electronic defects. Customers who wish to return an item for a full monetary refund must submit their original sales receipt within 30 calendar days of initial purchase. Items must be returned in their original packaging with all included accessories. Customized engraving units are strictly non-refundable.",
        question: "Which item is NOT eligible for a monetary refund under any circumstances?",
        options: [
          { key: "A", text: "Devices returned after 14 days with original packaging." },
          { key: "B", text: "Headphones experiencing electronic defect within 24 months." },
          { key: "C", text: "Acoustic devices featuring customized engraving." },
          { key: "D", text: "Units purchased during seasonal promotional campaigns." }
        ],
        correct: "C",
        explanation: "條款最後一句註明「Customized engraving units are strictly non-refundable（客製化雷射雕刻商品一律不得退費）」，故 (C) 為正確答案。",
        skill: "Negative Fact Questions (NOT eligible)"
      },
      {
        part: "Part 7 - Reading Comprehension",
        difficulty: "900",
        title: "Part 7 - Reading Comprehension (閱讀理解 - 雙篇招聘與履歷詢問)",
        passage: "Job Posting - Senior Data Architect (BioHealth Analytics):\nWe are seeking an experienced Senior Data Architect to lead our clinical trial data infrastructure team. Candidates must possess a minimum of 7 years in cloud data pipeline engineering (AWS or GCP) and a proven record with healthcare compliance standards (HIPAA). Experience in machine learning deployment is strongly favored.\n\nEmail Inquiry From Candidate:\nDear Hiring Team, I am writing to submit my dossier for the Senior Data Architect role. Having served as Lead Infrastructure Engineer at MedTech Systems for the past eight years, I successfully architected AWS HIPAA-compliant data lakes handling over 50 million patient records.",
        question: "Why does the candidate consider himself well-qualified for the position?",
        options: [
          { key: "A", text: "He designed software exclusively for hospital emergency rooms." },
          { key: "B", text: "He exceeds the required years of HIPAA-compliant AWS infrastructure experience." },
          { key: "C", text: "He published academic papers on healthcare economics." },
          { key: "D", text: "He is available to commence employment immediately." }
        ],
        correct: "B",
        explanation: "職缺要求 7 年以上 AWS/GCP 與 HIPAA 經驗，應徵者在信中提及具備 8 年 MedTech Systems 的 AWS HIPAA 系統建置經驗，完全符合並超過要求。故選 (B)。",
        skill: "Cross-Text Evidence Synthesis"
      }
    ]
  };

  let lastGeneratedIndex = -1;

  async function generateQuestion({ part = 'part5', difficulty = '900', domain = 'TOEIC' } = {}) {
    const s = getSettings();
    const cleanPart = (part || 'part5').toLowerCase();

    // 1. If user has active AI key (Gemini / Groq / OpenAI), generate 100% brand new dynamic questions
    if (hasConfiguredKey()) {
      const prompt = `You are a certified ETS TOEIC test author.
Generate 1 completely UNIQUE, realistic, brand-new ${domain} question for ${part.toUpperCase()} at difficulty ${difficulty}+.

Requirements:
- Part 7 must provide a complete, well-structured business passage (email, memo, notice, schedule, or policy, around 70-110 words) followed by an insightful comprehension question.
- Part 6 must provide a 50-70 word paragraph with a single clear blank ______.
- Part 5 must provide a single realistic workplace sentence with a single clear blank ______.
- Provide 4 distinct options (A), (B), (C), (D) with ONLY ONE unambiguous correct answer.
- Provide a rich, professional explanation in Traditional Chinese (繁體中文) breaking down why the correct option is right and explaining grammar rules and distractors.

Output ONLY valid JSON matching this schema without any markdown formatting:
{
  "part": "${part.toUpperCase()}",
  "difficulty": "${difficulty}",
  "title": "${part.toUpperCase()}",
  "passage": "<reading text if Part 6 or Part 7, otherwise empty string>",
  "question": "<the question text>",
  "options": [
    { "key": "A", "text": "<choice A>" },
    { "key": "B", "text": "<choice B>" },
    { "key": "C", "text": "<choice C>" },
    { "key": "D", "text": "<choice D>" }
  ],
  "correct": "<A, B, C, or D>",
  "explanation": "<detailed explanation in Traditional Chinese>",
  "skill": "<targeted grammar/skill>"
}`;

      try {
        let rawText = '';
        if (s.provider === 'gemini' && s.geminiApiKey) {
          rawText = await callGeminiApi(s.geminiApiKey, prompt, true);
        } else if (s.provider === 'groq' && s.groqApiKey) {
          const res = await window.fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${s.groqApiKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: s.groqChatModel || 'llama-3.3-70b-versatile',
              messages: [
                { role: 'system', content: 'You are a professional TOEIC test item author. You output ONLY raw valid JSON.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.8,
              response_format: { type: "json_object" }
            })
          });
          const data = await res.json();
          rawText = data.choices?.[0]?.message?.content || '';
        } else if (s.provider === 'openai' && s.openaiApiKey) {
          const res = await window.fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${s.openaiApiKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: s.openaiChatModel || 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'You output ONLY raw valid JSON.' },
                { role: 'user', content: prompt }
              ],
              temperature: 0.8,
              response_format: { type: "json_object" }
            })
          });
          const data = await res.json();
          rawText = data.choices?.[0]?.message?.content || '';
        }

        if (rawText) {
          const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
          if (parsed.question && parsed.options && parsed.correct) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn('[Santa AI] Live generation fallback to rich offline pool:', err);
      }
    }

    // 2. High-Yield Categorized Offline Pool (Non-repeating)
    let pool = [];
    if (cleanPart.includes('7')) pool = OFFLINE_QUESTION_BANK.part7;
    else if (cleanPart.includes('6')) pool = OFFLINE_QUESTION_BANK.part6;
    else if (cleanPart.includes('1')) pool = OFFLINE_QUESTION_BANK.part1;
    else pool = OFFLINE_QUESTION_BANK.part5;

    if (!pool || pool.length === 0) pool = OFFLINE_QUESTION_BANK.part5;

    let newIndex = Math.floor(Math.random() * pool.length);
    if (pool.length > 1 && newIndex === lastGeneratedIndex) {
      newIndex = (newIndex + 1) % pool.length;
    }
    lastGeneratedIndex = newIndex;

    return { ...pool[newIndex], generatedBy: 'Offline-Bank-Engine' };
  }

  // ==========================================
  // Expose Global Service
  // ==========================================
  window.SantaAIService = {
    getSettings,
    saveSettings,
    hasConfiguredKey,
    transcribeAudio,
    evaluateSpeaking,
    transcribeAndEvaluateAudio,
    chatWithLumi,
    generateQuestion
  };

  console.log('🤖 [Santa AI Service] AI Service Engine Ready with Dynamic Discovery & BYOK.');
})();
