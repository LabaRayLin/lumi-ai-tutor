/**
 * Santa AI Tutor - Pure Offline AI Service Stub
 * All questions, speaking simulation, and vocabulary are 100% built-in locally.
 * Zero external API calls, zero token consumption, 100% privacy and offline operation.
 */

(function () {
  'use strict';

  console.log('📴 [Lumi Offline Core] Initialized in 100% pure offline mode.');

  window.SantaAIService = {
    isOfflineMode: true,
    hasConfiguredKey: function() { return false; },
    getSettings: function() { return { provider: 'offline' }; },
    saveSettings: function(s) { return s; },
    chatWithLumi: async function() { return '所有題庫與語音功能均在本地瞬時運行。'; },
    evaluateSpeaking: async function() { return null; },
    generateQuestion: async function() { return null; },
    transcribeAudio: async function() { return null; },
    transcribeAndEvaluateAudio: async function() { return null; },
    getQuestionBankStats: function() { return { total: 2500 }; }
  };
})();
