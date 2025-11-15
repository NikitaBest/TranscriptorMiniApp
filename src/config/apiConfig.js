// Конфигурация API
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'https://transcribate-audio-api.odonta.burtimaxbot.ru',
  
  // Endpoints
  ENDPOINTS: {
    // Audio endpoints
    AUDIO_UPLOAD: '/audio/upload',
    AUDIO_TRANSCRIPTION: '/audio/transcription', // GET /audio/transcription/{id}
  },
  
  // Таймауты
  TIMEOUT: {
    DEFAULT: 30000, // 30 секунд
    UPLOAD: 60000, // 60 секунд для загрузки файлов
  },
}

