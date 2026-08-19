/**
 * Santa AI Tutor - Standalone Offline Mock API & Persistence Engine
 * 1. Global Interceptor for window.fetch and window.XMLHttpRequest
 * 2. Privacy & Tracker Blocker (Sentry, Facebook Pixel, GA, Datadog, etc.)
 * 3. IndexedDB & localStorage Local Data Store
 * 4. Realistic Question Bank, Diagnosis, Vocabulary, and AI Speaking Mock Endpoints
 */

(function () {
  'use strict';

  console.log('🎅 [Santa AI Offline] Initializing Mock API & Privacy Layer...');

  // ==========================================
  // 1. IndexedDB Persistence Layer
  // ==========================================
  const DB_NAME = 'SantaOfflineDB';
  const DB_VERSION = 1;
  let dbInstance = null;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (dbInstance) return resolve(dbInstance);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        if (!db.objectStoreNames.contains('vocabularies')) db.createObjectStore('vocabularies', { keyPath: 'word' });
        if (!db.objectStoreNames.contains('chat_messages')) db.createObjectStore('chat_messages', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('exam_history')) db.createObjectStore('exam_history', { keyPath: 'id' });
      };
      req.onsuccess = (e) => {
        dbInstance = e.target.result;
        resolve(dbInstance);
      };
      req.onerror = (e) => reject(e);
    });
  }

  // Local Default Profile Store
  const DEFAULT_PROFILE = {
    id: 'local-learner-001',
    email: 'learner@lumi-ai.local',
    name: 'Lumi 學習者',
    registrationType: 'ANONYMOUS', // Default ANONYMOUS so /onboarding/intro renders GetStartedView
    learningDomain: 'TOEIC',
    targetScore: 900,
    predictedScore: 845,
    listeningScore: 435,
    readingScore: 410,
    targetExamDate: '2026-12-31T00:00:00Z',
    streakDays: 7,
    learningTimeMinutes: 180,
    onboardingStatus: 'PENDING',
    diagnosisStatus: 'AVAILABLE',
    permitType: 'VIP_PASS',
    passStatus: 'VALID',
    createdAt: '2026-01-01T00:00:00Z'
  };

  function getLocalProfile() {
    try {
      const saved = localStorage.getItem('santa_offline_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (!p.name || p.name.includes('Santa') || p.name === 'Santa Offline Learner') {
          p.name = 'Lumi 學習者';
          localStorage.setItem('santa_offline_profile', JSON.stringify(p));
        }
        // If user is currently on /onboarding/intro, ensure registrationType is ANONYMOUS
        if (window.location.pathname.includes('/onboarding/intro') || !p.registrationType) {
          p.registrationType = 'ANONYMOUS';
        }
        return p;
      }
    } catch (e) { }
    localStorage.setItem('santa_offline_profile', JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  }

  function saveLocalProfile(data) {
    const current = getLocalProfile();
    const updated = { ...current, ...data };
    localStorage.setItem('santa_offline_profile', JSON.stringify(updated));
    return updated;
  }

  // Auto clean stale local storage on intro page to guarantee instant render
  if (window.location.pathname.includes('/onboarding/intro')) {
    try {
      const current = getLocalProfile();
      if (current.registrationType !== 'ANONYMOUS') {
        current.registrationType = 'ANONYMOUS';
        localStorage.setItem('santa_offline_profile', JSON.stringify(current));
      }
    } catch (e) {}
  }

  // Mistake Notebook Store
  function getMistakes() {
    try {
      const saved = localStorage.getItem('santa_mistake_notebook');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return [];
  }

  function saveMistakes(list) {
    localStorage.setItem('santa_mistake_notebook', JSON.stringify(list || []));
    return list;
  }

  function addMistake(questionObj, myChoice) {
    const list = getMistakes();
    const existingIdx = list.findIndex(m => m.question === questionObj.question);
    if (existingIdx !== -1) {
      list[existingIdx].wrongCount = (list[existingIdx].wrongCount || 1) + 1;
      list[existingIdx].myChoice = myChoice;
      list[existingIdx].status = 'UNSOLVED';
      list[existingIdx].timestamp = Date.now();
    } else {
      list.unshift({
        id: 'wrong_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        part: questionObj.part || 'Part 5',
        title: questionObj.title || 'Incomplete Sentences',
        passage: questionObj.passage || '',
        question: questionObj.question,
        options: questionObj.options,
        myChoice: myChoice,
        correct: questionObj.correct,
        explanation: questionObj.explanation,
        skill: questionObj.skill || 'Grammar & Vocabulary',
        wrongCount: 1,
        status: 'UNSOLVED',
        timestamp: Date.now()
      });
    }
    saveMistakes(list);
    return list;
  }

  function resolveMistake(questionText) {
    const list = getMistakes();
    const target = list.find(m => m.question === questionText);
    if (target) {
      target.status = 'MASTERED';
      saveMistakes(list);
    }
    return list;
  }

  // ==========================================
  // Spaced Repetition System (SRS) for Vocabulary
  // ==========================================
  function getVocabularyProgress() {
    try {
      const saved = localStorage.getItem('santa_vocabulary_progress');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {};
  }

  function saveVocabularyProgress(progressMap) {
    localStorage.setItem('santa_vocabulary_progress', JSON.stringify(progressMap || {}));
    if (window.SantaSync) window.SantaSync.scheduleAutoSync();
    return progressMap;
  }

  function updateWordSRS(wordText, isCorrect) {
    const progress = getVocabularyProgress();
    const key = (wordText || '').toLowerCase().trim();
    const now = Date.now();
    const item = progress[key] || {
      masteryLevel: 0,
      wrongCount: 0,
      correctStreak: 0,
      lastReviewedAt: 0,
      nextReviewDue: 0
    };

    if (!isCorrect) {
      item.wrongCount = (item.wrongCount || 0) + 1;
      item.correctStreak = 0;
      item.masteryLevel = 1; // Level 1: Needs immediate review
      item.nextReviewDue = now; // Due immediately
      item.lastReviewedAt = now;
    } else {
      item.correctStreak = (item.correctStreak || 0) + 1;
      if (item.correctStreak === 1) {
        item.masteryLevel = 2; // Level 2: Familiar (1 day interval)
        item.nextReviewDue = now + 86400000;
      } else if (item.correctStreak === 2) {
        item.masteryLevel = 3; // Level 3: Mastered (3 days interval)
        item.nextReviewDue = now + 3 * 86400000;
      } else {
        item.masteryLevel = 4; // Level 4: Permanent Memory (7 days interval)
        item.nextReviewDue = now + 7 * 86400000;
      }
      item.lastReviewedAt = now;
    }

    progress[key] = item;
    saveVocabularyProgress(progress);
    return item;
  }

  // Expose Database APIs for Settings Modal & AI Service
  window.SantaDB = {
    getProfile: getLocalProfile,
    saveProfile: saveLocalProfile,
    getMistakes: getMistakes,
    saveMistakes: saveMistakes,
    addMistake: addMistake,
    resolveMistake: resolveMistake,
    getVocabularyProgress: getVocabularyProgress,
    saveVocabularyProgress: saveVocabularyProgress,
    updateWordSRS: updateWordSRS,
    resetDatabase: function () {
      localStorage.clear();
      localStorage.setItem('santa_offline_profile', JSON.stringify(DEFAULT_PROFILE));
      indexedDB.deleteDatabase(DB_NAME);
      console.log('🎅 [Santa AI Offline] Database reset to defaults.');
      window.location.reload();
    },
    exportData: function () {
      return JSON.stringify({
        profile: getLocalProfile(),
        vocabularyProgress: getVocabularyProgress(),
        settings: localStorage.getItem('santa_ai_custom_settings'),
        exportedAt: new Date().toISOString()
      }, null, 2);
    }
  };

  // ==========================================
  // 2. High Quality Offline Question Bank
  // ==========================================
  const SAMPLE_QUESTIONS = [
    {
      id: 'q-toeic-101',
      domain: 'TOEIC',
      part: 5,
      type: 'GRAMMAR',
      title: 'Part 5 - Incomplete Sentences',
      question: 'The marketing team worked tirelessly to ensure the product launch was _______ successful.',
      options: [
        { key: 'A', text: 'complete' },
        { key: 'B', text: 'completely' },
        { key: 'C', text: 'completing' },
        { key: 'D', text: 'completion' }
      ],
      correctAnswer: 'B',
      explanation: '修飾形容詞 successful 需要使用副詞 completely（完全地、極其）。選項 (B) 為正確答案。',
      translation: '行銷團隊不知疲倦地工作，以確保產品發布完全成功。',
      skill: 'Adverbs modifying adjectives'
    },
    {
      id: 'q-toeic-102',
      domain: 'TOEIC',
      part: 5,
      type: 'VOCABULARY',
      title: 'Part 5 - Incomplete Sentences',
      question: 'Please submit all travel reimbursement requests _______ five business days after returning from the trip.',
      options: [
        { key: 'A', text: 'within' },
        { key: 'B', text: 'during' },
        { key: 'C', text: 'between' },
        { key: 'D', text: 'along' }
      ],
      correctAnswer: 'A',
      explanation: '「within + 一段時間」表示「在...時間之內」。five business days 為時間段，因此選 (A) within。',
      translation: '請於出差歸來後五個工作日內提交所有差旅報銷申請。',
      skill: 'Prepositions of time'
    },
    {
      id: 'q-toeic-103',
      domain: 'TOEIC',
      part: 6,
      type: 'READING',
      title: 'Part 6 - Text Completion',
      passage: 'Notice to all employees: Starting next Monday, the cafeteria will undergo renovation. During this period, catering services will be provided on the 2nd floor terrace. We appreciate your patience and _______ as we upgrade our facilities.',
      question: 'What is the most suitable word for the blank?',
      options: [
        { key: 'A', text: 'cooperation' },
        { key: 'B', text: 'repetition' },
        { key: 'C', text: 'hesitation' },
        { key: 'D', text: 'distraction' }
      ],
      correctAnswer: 'A',
      explanation: '搭配詞 "patience and cooperation"（耐心與配合）為商業書信與公告常用語句，故選 (A)。',
      translation: '員工公告：自下週一起員工餐廳將進行裝修。裝修期間二樓露台將提供餐飲服務。感謝各位在設施升級期間的耐心與配合。',
      skill: 'Business Collocations'
    },
    {
      id: 'q-toeic-104',
      domain: 'TOEIC',
      part: 1,
      type: 'LISTENING',
      title: 'Part 1 - Photographs',
      audioUrl: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
      question: 'Look at the picture. Which statement best describes the situation?',
      options: [
        { key: 'A', text: 'A man is speaking at a podium.' },
        { key: 'B', text: 'Documents are being printed.' },
        { key: 'C', text: 'People are sitting in a conference room.' },
        { key: 'D', text: 'A projector is being repaired.' }
      ],
      correctAnswer: 'C',
      explanation: '畫面中多位與會者圍繞會議桌就座，故 (C) 為最適當的敘述。',
      translation: '人們正坐在會議室裡。',
      skill: 'Listening Comprehension'
    },
    {
      id: 'q-toeic-speaking-01',
      domain: 'TOEIC_SPEAKING',
      part: 1,
      type: 'READ_ALOUD',
      title: 'Question 1: Read a text aloud',
      passage: 'Welcome to the annual Green City Expo. Today, you will discover the latest innovations in solar energy, electric transportation, and sustainable living. Please remember to visit the interactive showcase on the second floor before the keynote session begins at two o\'clock.',
      prepTime: 45,
      responseTime: 45,
      alAnswer: 'Welcome to the annual Green City Expo. Today, you will discover the latest innovations in solar energy, electric transportation, and sustainable living. Please remember to visit the interactive showcase on the second floor before the keynote session begins at two o\'clock.',
      skill: 'Pronunciation & Intonation'
    }
  ];

  const SAMPLE_VOCABULARY = [
    {
      word: 'substantial',
      phonetic: '/səbˈstæn.ʃəl/',
      meaning: '大量的；實質的；重要的',
      definition: 'large in size, value, or importance',
      example: 'The company achieved a substantial increase in quarterly revenue.',
      exampleTranslation: '該公司季度營收實現了大幅成長。',
      partOfSpeech: 'adj.',
      memorized: false
    },
    {
      word: 'reimburse',
      phonetic: '/ˌriː.ɪmˈbɜːs/',
      meaning: '償還；報銷',
      definition: 'to pay back money to someone who has spent it for you',
      example: 'Travel expenses will be reimbursed within two weeks.',
      exampleTranslation: '差旅費用將在兩週內完成報銷。',
      partOfSpeech: 'v.',
      memorized: true
    },
    {
      word: 'preliminary',
      phonetic: '/prɪˈlɪm.ɪ.nər.i/',
      meaning: '初步的；預備的',
      definition: 'coming before the more important actions or events',
      example: 'The preliminary findings will be presented at the board meeting.',
      exampleTranslation: '初步調查結果將在董事會上報告。',
      partOfSpeech: 'adj.',
      memorized: false
    },
    {
      word: 'collaborate',
      phonetic: '/kəˈlæb.ə.reɪt/',
      meaning: '合作；協同工作',
      definition: 'to work jointly on an activity or project',
      example: 'Teams from design and engineering collaborated to launch the feature.',
      exampleTranslation: '設計與工程團隊緊密合作推出了此功能。',
      partOfSpeech: 'v.',
      memorized: true
    }
  ];

  // ==========================================
  // 3. Privacy & Telemetry Blocker
  // ==========================================
  const BLOCKED_DOMAINS = [
    'sentry.io',
    'facebook.net',
    'google-analytics.com',
    'analytics.google.com',
    'googletagmanager.com',
    'felmat.net',
    'crossees.com',
    'moshimo.com',
    'locize.com',
    'datadoghq.com',
    'mixpanel.com',
    'amplitude.com',
    'clarity.ms',
    'hotjar.com'
  ];

  function isBlockedUrl(url) {
    if (!url) return false;
    const str = String(url).toLowerCase();
    return BLOCKED_DOMAINS.some(d => str.includes(d));
  }

  // Nullify window Sentry and Analytics globals if present
  window.Sentry = {
    init: () => {},
    captureException: () => {},
    captureMessage: () => {},
    setUser: () => {},
    setTag: () => {},
    addBreadcrumb: () => {}
  };
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {};
  window.fbq = function () {};

  // ==========================================
  // 4. API Request Router & Mock Responses
  // ==========================================
  async function handleMockApi(url, options = {}) {
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname;
    const method = (options.method || 'GET').toUpperCase();
    const profile = getLocalProfile();

    console.log(`[Santa Mock API] 📡 ${method} ${path}`, options);
    if (window.__SANTA_RECORD_API_LOG__) {
      window.__SANTA_RECORD_API_LOG__(method, path, 200);
    }

    // Helpers
    const jsonResp = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status: status,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    // --- User & Profile Endpoints ---
    if (path === '/api/user/v1/user/me' || path.endsWith('/user/me')) {
      return jsonResp({
        user: {
          id: profile.id,
          registrationType: profile.registrationType || 'ANONYMOUS',
          status: 'ACTIVE',
          lastSelectedLearningDomain: profile.learningDomain || 'TOEIC',
          registeredAt: profile.createdAt || new Date().toISOString(),
          personalInfo: {
            email: profile.email,
            name: profile.name,
            phoneNumber: ''
          }
        }
      });
    }

    if (path === '/api/user/v1/profile/me' || path.endsWith('/profile/me')) {
      if (method === 'GET') {
        return jsonResp({
          profile: {
            id: profile.id,
            createdAt: profile.createdAt || new Date().toISOString(),
            currentEstimatedScore: profile.predictedScore || 845,
            diagnosisInfo: {
              status: profile.diagnosisStatus || 'AVAILABLE',
              completedAt: profile.createdAt
            },
            onboardingInfo: {
              status: profile.onboardingStatus || 'PENDING',
              hasExperience: true,
              targetScore: profile.targetScore || 900
            },
            targetExamDate: profile.targetExamDate || '2026-12-31T00:00:00Z',
            targetPartialScores: [
              { name: 'LISTENING', score: profile.listeningScore || 435 },
              { name: 'READING', score: profile.readingScore || 410 }
            ],
            lastSelectedCourseId: 'toeic-core-mastery-2026'
          }
        });
      }
      if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
        let body = {};
        try { body = JSON.parse(options.body || '{}'); } catch (e) {}
        const updated = saveLocalProfile(body);
        return jsonResp({
          profile: {
            id: updated.id,
            createdAt: updated.createdAt,
            currentEstimatedScore: updated.predictedScore,
            diagnosisInfo: { status: updated.diagnosisStatus || 'AVAILABLE' },
            onboardingInfo: { status: updated.onboardingStatus || 'DONE', targetScore: updated.targetScore },
            targetExamDate: updated.targetExamDate,
            targetPartialScores: [
              { name: 'LISTENING', score: updated.listeningScore },
              { name: 'READING', score: updated.readingScore }
            ],
            lastSelectedCourseId: 'toeic-core-mastery-2026'
          }
        });
      }
    }

    if (path.includes('/profile/me/onboarding-info/done') || path.includes('/onboarding-info/done')) {
      const updated = saveLocalProfile({ onboardingStatus: 'DONE', registrationType: 'EMAIL' });
      return jsonResp({ profile: updated });
    }

    if (path.includes('/profile/me/target-exam-date')) {
      let body = {};
      try { body = JSON.parse(options.body || '{}'); } catch (e) {}
      const updated = saveLocalProfile({ targetExamDate: body.targetExamDate || '2026-12-31T00:00:00Z' });
      return jsonResp({ profile: updated });
    }

    if (path.includes('/profile/me/target-partial-scores') || path.includes('/target-score')) {
      let body = {};
      try { body = JSON.parse(options.body || '{}'); } catch (e) {}
      const updated = saveLocalProfile({
        targetScore: body.targetScore || profile.targetScore,
        listeningScore: body.listeningScore || profile.listeningScore,
        readingScore: body.readingScore || profile.readingScore
      });
      return jsonResp({ profile: updated });
    }

    if (path.includes('/profile/me/last-selected-course-id')) {
      return jsonResp({ lastSelectedCourseId: 'toeic-core-mastery-2026' });
    }

    // --- Learning Domain & Exam Config ---
    if (path.includes('/learning-domain/v1/exam-dates')) {
      return jsonResp({
        examDates: [
          { date: '2026-09-27', title: '2026年9月 TOEIC 定期測驗' },
          { date: '2026-10-25', title: '2026年10月 TOEIC 定期測驗' },
          { date: '2026-11-29', title: '2026年11月 TOEIC 定期測驗' },
          { date: '2026-12-20', title: '2026年12月 TOEIC 定期測驗' }
        ]
      });
    }

    if (path.includes('/learning-domain/v1/exam-score-config')) {
      return jsonResp({
        minScore: 10,
        maxScore: 990,
        step: 5,
        targetScorePresets: [600, 700, 800, 850, 900, 950]
      });
    }

    // --- Permits & Passes ---
    if (path.includes('/api/permit/v2/pass/me') || path.includes('/permit/')) {
      return jsonResp({
        pass: {
          id: 'santa-unlimited-offline-pass',
          name: 'Santa AI Tutor VIP Unlimited (Offline Edition)',
          status: 'ACTIVE',
          type: 'VIP_PASS',
          expiresAt: '2030-12-31T23:59:59Z',
          isFreeTrial: false,
          features: ['ALL_ACCESS', 'AI_SPEAKING', 'VIRTUAL_EXAM', 'LUMI_AI_TUTOR', 'PREDICTION_SCORE']
        },
        hasActivePass: true,
        entitlements: ['TOEIC', 'TOEFL', 'TOEIC_SPEAKING', 'AI_TUTOR_LUMI']
      });
    }

    // --- Diagnosis & Virtual Exams ---
    if (path.includes('/diagnosis/config') || path.includes('/diagnosis/')) {
      return jsonResp({
        diagnosis: {
          id: 'diagnosis-test-01',
          domain: profile.learningDomain || 'TOEIC',
          totalQuestions: SAMPLE_QUESTIONS.length,
          questions: SAMPLE_QUESTIONS,
          durationMinutes: 15,
          status: 'AVAILABLE'
        }
      });
    }

    if (path.includes('/diagnosis-report')) {
      return jsonResp({
        report: {
          predictedScore: profile.predictedScore,
          targetScore: profile.targetScore,
          listeningScore: profile.listeningScore,
          readingScore: profile.readingScore,
          accuracyRate: 88.5,
          totalQuestionsSolved: 124,
          strengths: ['Part 1 Photographs', 'Part 5 Grammar collocations', 'Part 2 Short Question-Response'],
          weaknesses: ['Part 7 Double Passages inference', 'Part 3 Conversations with 3 speakers'],
          recommendedCourses: [
            { id: 'course-p5-master', title: 'TOEIC Part 5 & 6 高頻文法速攻班', progress: 45 },
            { id: 'course-p7-reading', title: 'TOEIC Part 7 多篇閱讀邏輯定位訓練', progress: 20 }
          ]
        }
      });
    }

    if (path.includes('/content-learning/v2/content/bulk') || path.includes('/content-learning/')) {
      return jsonResp({
        contents: SAMPLE_QUESTIONS.map(q => ({
          contentId: q.id,
          body: q,
          status: 'AVAILABLE'
        }))
      });
    }

    if (path.includes('/content-interaction-states')) {
      let body = {};
      try { body = JSON.parse(options.body || '{}'); } catch (e) {}
      return jsonResp({
        id: 'interaction-state-' + Date.now(),
        status: 'COMPLETED',
        userAnswer: body.userAnswer || 'B',
        isCorrect: true,
        score: 100,
        explanation: 'Excellent job! Correct answer selected.',
        recordedAt: new Date().toISOString()
      });
    }

    // --- Vocabulary & Wordbook ---
    if (path.includes('/vocabulary/todays-voca') || path.includes('/wordbook')) {
      return jsonResp({
        words: SAMPLE_VOCABULARY,
        totalCount: SAMPLE_VOCABULARY.length,
        learnedCount: 2,
        unlearnedCount: 2
      });
    }

    // --- AI Tutor Lumi Chat ---
    if (path.includes('/chat/rooms') || path.includes('/chat/')) {
      if (method === 'POST' && path.includes('/messages')) {
        let body = {};
        try { body = JSON.parse(options.body || '{}'); } catch (e) {}
        const userText = body.content || body.message || 'Hello Santa AI';

        // Call Custom AI Service if available
        let replyContent = "I'm Lumi, your Santa AI Tutor! How can I help you improve your TOEIC score today?";
        if (window.SantaAIService && window.SantaAIService.hasConfiguredKey()) {
          try {
            replyContent = await window.SantaAIService.chatWithLumi(userText);
          } catch (err) {
            console.warn('[Santa AI] AI Chat error, using fallback:', err);
          }
        }

        return jsonResp({
          messageId: 'msg-' + Date.now(),
          role: 'ASSISTANT',
          content: replyContent,
          createdAt: new Date().toISOString()
        });
      }

      return jsonResp({
        rooms: [
          {
            id: 'room-lumi-general',
            name: 'Lumi 英文學習專屬家教',
            lastMessage: '歡迎回來！今天想加強哪一個 TOEIC Part 呢？',
            updatedAt: new Date().toISOString()
          }
        ]
      });
    }

    // --- TOEIC / TOEFL Speaking & Audio Analysis ---
    if (path.includes('/speaking') || path.includes('/speaking-stt') || path.includes('/evaluation')) {
      let audioBlob = null;
      if (options.body instanceof FormData) {
        audioBlob = options.body.get('audio') || options.body.get('file');
      } else if (options.body instanceof Blob) {
        audioBlob = options.body;
      }

      let transcription = "Welcome to the annual Green City Expo. Today, you will discover the latest innovations in solar energy.";
      let speechAmount = { myAnswer: 48, alAnswer: 50 };
      let evaluation = { pronunciation: 92, fluency: 88, grammar: 90 };
      let gec = { corrections: [] };

      if (audioBlob && window.SantaAIService && window.SantaAIService.hasConfiguredKey()) {
        try {
          const aiResult = await window.SantaAIService.transcribeAndEvaluateAudio(audioBlob);
          if (aiResult) {
            transcription = aiResult.transcription || transcription;
            speechAmount = aiResult.speechAmount || speechAmount;
            evaluation = aiResult.evaluation || evaluation;
            gec = aiResult.gec || gec;
          }
        } catch (err) {
          console.warn('[Santa AI] Audio AI Evaluation error:', err);
        }
      }

      return jsonResp({
        transcription: transcription,
        speechAmount: speechAmount,
        evaluation: evaluation,
        gec: gec,
        score: Math.round((evaluation.pronunciation + evaluation.fluency + evaluation.grammar) / 3),
        status: 'SUCCESS'
      });
    }

    // --- Marketing / Config / Generic Fallback ---
    if (path.includes('/marketing/') || path.includes('/banners/') || path.includes('/popup/') || path.includes('/campaign/')) {
      return jsonResp({ active: true, banners: [], popups: [], campaigns: [] });
    }

    if (path.includes('/system-config/') || path.includes('/config')) {
      return jsonResp({ value: 'true', status: 'OK' });
    }

    // Default 200 OK for unhandled internal APIs
    return jsonResp({ success: true, message: 'Santa AI Offline Mock Response', path: path });
  }

  // ==========================================
  // 5. Override window.fetch
  // ==========================================
  const originalFetch = window.fetch;
  window.fetch = async function (input, init = {}) {
    let url = typeof input === 'string' ? input : (input instanceof Request ? input.url : '');

    // 1. Block Trackers & Telemetry
    if (isBlockedUrl(url)) {
      return new Response(JSON.stringify({ blocked: true, status: 200 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 1.5 Offline WASM & Asset Redirection
    if (url.includes('dotlottie-player.wasm') || url.includes('DotLottiePlayer.wasm')) {
      return originalFetch.call(this, '/wasm/dotlottie-player.wasm', init);
    }
    if (url.includes('img_onboarding_kv')) {
      return originalFetch.call(this, '/assets/img_onboarding_kv.bb65f35e.webp', init);
    }
    if (url.includes('img_favicon_black_32')) {
      return originalFetch.call(this, '/assets/favicon.webp', init);
    }

    // 2. Intercept API calls
    if (url.includes('/api/') || url.includes('api.aitutorsanta.com')) {
      try {
        return await handleMockApi(url, init);
      } catch (err) {
        console.error('[Santa Mock API] Error handling fetch:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // 3. Fallback to native fetch for local assets
    return originalFetch.apply(this, arguments);
  };

  // ==========================================
  // 6. Override window.XMLHttpRequest
  // ==========================================
  const OriginalXHR = window.XMLHttpRequest;
  function MockXMLHttpRequest() {
    const xhr = new OriginalXHR();
    let requestUrl = '';
    let requestMethod = 'GET';
    let requestHeaders = {};

    const origOpen = xhr.open;
    xhr.open = function (method, url) {
      requestMethod = method;
      requestUrl = url;
      return origOpen.apply(this, arguments);
    };

    const origSetHeader = xhr.setRequestHeader;
    xhr.setRequestHeader = function (name, value) {
      requestHeaders[name] = value;
      return origSetHeader.apply(this, arguments);
    };

    const origSend = xhr.send;
    xhr.send = function (body) {
      if (isBlockedUrl(requestUrl)) {
        Object.defineProperty(xhr, 'status', { value: 200, writable: false });
        Object.defineProperty(xhr, 'responseText', { value: JSON.stringify({ blocked: true }), writable: false });
        Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
        setTimeout(() => {
          if (xhr.onreadystatechange) xhr.onreadystatechange();
          if (xhr.onload) xhr.onload();
        }, 10);
        return;
      }

      if (requestUrl.includes('dotlottie-player.wasm') || requestUrl.includes('DotLottiePlayer.wasm')) {
        requestUrl = '/wasm/dotlottie-player.wasm';
      }
      if (requestUrl.includes('img_onboarding_kv')) {
        requestUrl = '/assets/img_onboarding_kv.bb65f35e.webp';
      }

      if (requestUrl.includes('/api/') || requestUrl.includes('api.aitutorsanta.com')) {
        handleMockApi(requestUrl, { method: requestMethod, body: body, headers: requestHeaders })
          .then(async (resp) => {
            const text = await resp.text();
            Object.defineProperty(xhr, 'status', { value: resp.status, writable: false });
            Object.defineProperty(xhr, 'responseText', { value: text, writable: false });
            Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
            if (xhr.onreadystatechange) xhr.onreadystatechange();
            if (xhr.onload) xhr.onload();
          })
          .catch((err) => {
            Object.defineProperty(xhr, 'status', { value: 500, writable: false });
            Object.defineProperty(xhr, 'responseText', { value: JSON.stringify({ error: err.message }), writable: false });
            if (xhr.onerror) xhr.onerror(err);
          });
        return;
      }

      return origSend.apply(this, arguments);
    };

    return xhr;
  }
  window.XMLHttpRequest = MockXMLHttpRequest;

  console.log('🎅 [Santa AI Offline] Mock API & Privacy Interceptor Activated.');
})();
