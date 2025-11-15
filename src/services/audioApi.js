// API для работы с аудио транскрипцией
import apiService from './api.js'
import { API_CONFIG } from '../config/apiConfig.js'

/**
 * Сервис для работы с аудио API
 */
class AudioApiService {
  /**
   * Загружает аудио файл для транскрипции
   * @param {File} file - аудио файл
   * @param {object} options - дополнительные опции
   * @returns {Promise<any>}
   */
  async uploadAudio(file, options = {}) {
    // Проверяем, что файл существует
    if (!file) {
      throw new Error('Файл не предоставлен')
    }

    console.log('Подготовка к загрузке файла:', {
      name: file.name,
      type: file.type,
      size: file.size,
      sizeKB: (file.size / 1024).toFixed(2) + ' KB'
    })

    const formData = new FormData()
    formData.append('file', file)

    // Добавляем дополнительные параметры если есть
    if (options.language) {
      formData.append('language', options.language)
    }
    if (options.model) {
      formData.append('model', options.model)
    }

    // Проверяем содержимое FormData (для отладки)
    if (process.env.NODE_ENV === 'development') {
      console.log('FormData подготовлен:', {
        hasFile: formData.has('file'),
        endpoint: API_CONFIG.ENDPOINTS.AUDIO_UPLOAD,
        fullUrl: API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.AUDIO_UPLOAD
      })
    }

    return apiService.postFormData(API_CONFIG.ENDPOINTS.AUDIO_UPLOAD, formData)
  }

  /**
   * Получает статус и результат транскрипции
   * @param {string|number} transcriptionId - ID транскрипции
   * @returns {Promise<any>}
   */
  async getTranscription(transcriptionId) {
    return apiService.get(`${API_CONFIG.ENDPOINTS.AUDIO_TRANSCRIPTION}/${transcriptionId}`)
  }
}

// Создаем экземпляр сервиса
const audioApiService = new AudioApiService()

export default audioApiService

