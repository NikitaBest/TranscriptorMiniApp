// Базовый конфиг для работы с API
import { API_CONFIG } from '../config/apiConfig.js'

const API_BASE_URL = API_CONFIG.BASE_URL

/**
 * Базовый класс для работы с API
 */
class ApiService {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL
  }

  /**
   * Выполняет HTTP запрос
   * @param {string} endpoint - endpoint API
   * @param {object} options - опции для fetch
   * @returns {Promise<Response>}
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    
    const defaultHeaders = {}
    
    // Content-Type добавляем только для запросов с телом (POST, PUT, PATCH)
    // Для GET и DELETE запросов не нужно отправлять Content-Type
    const method = options.method || 'GET'
    const hasBody = options.body !== undefined && options.body !== null
    
    if (hasBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      // Если тело уже FormData, не добавляем Content-Type (браузер установит сам)
      if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json'
      }
    }

    // Добавляем заголовки авторизации, если есть токен
    const token = this.getAuthToken()
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    }

    // Логирование для отладки
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${method} ${url}`, {
        headers: config.headers,
        hasBody: hasBody
      })
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: `HTTP error! status: ${response.status}` }
        }
        
        // Извлекаем сообщение об ошибке из различных форматов ответа
        const errorMessage = errorData.message || 
                            errorData.error?.message || 
                            errorData.errors?.serializerErrors?.[0] ||
                            `HTTP error! status: ${response.status}`
        
        const error = new Error(errorMessage)
        error.status = response.status
        error.data = errorData
        throw error
      }

      return await response.json()
    } catch (error) {
      console.error('API request error:', error)
      // Если это уже наша ошибка, просто пробрасываем дальше
      if (error.status) {
        throw error
      }
      // Иначе создаем новую ошибку
      throw new Error(error.message || 'Ошибка при выполнении запроса')
    }
  }

  /**
   * GET запрос
   * @param {string} endpoint - endpoint API
   * @param {object} params - query параметры
   * @returns {Promise<any>}
   */
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    
    return this.request(url, {
      method: 'GET',
    })
  }

  /**
   * POST запрос
   * @param {string} endpoint - endpoint API
   * @param {object} data - данные для отправки
   * @param {object} options - дополнительные опции
   * @returns {Promise<any>}
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    })
  }

  /**
   * PUT запрос
   * @param {string} endpoint - endpoint API
   * @param {object} data - данные для отправки
   * @returns {Promise<any>}
   */
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * DELETE запрос
   * @param {string} endpoint - endpoint API
   * @returns {Promise<any>}
   */
  async delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }

  /**
   * POST запрос с FormData (для загрузки файлов)
   * @param {string} endpoint - endpoint API
   * @param {FormData} formData - данные формы
   * @returns {Promise<any>}
   */
  async postFormData(endpoint, formData) {
    const token = this.getAuthToken()
    const headers = {}
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const url = `${this.baseURL}${endpoint}`
    
    // Логирование для отладки
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] POST FormData ${url}`, {
        headers,
        formDataKeys: Array.from(formData.keys()),
        hasFile: formData.has('file')
      })
      
      // Проверяем размер файла
      const file = formData.get('file')
      if (file instanceof File) {
        console.log('Файл для отправки:', {
          name: file.name,
          type: file.type,
          size: file.size,
          sizeKB: (file.size / 1024).toFixed(2) + ' KB'
        })
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Ошибка загрузки файла' }))
      console.error('Ошибка при загрузке файла:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Успешная загрузка файла, ответ сервера:', result)
    }
    
    return result
  }

  /**
   * Получает токен авторизации (из localStorage или Telegram Web App)
   * @returns {string|null}
   */
  getAuthToken() {
    // Можно получать токен из localStorage
    const token = localStorage.getItem('auth_token')
    if (token) return token

    // Или из Telegram Web App initData
    if (window.Telegram?.WebApp?.initData) {
      // Здесь можно извлечь токен из initData если нужно
      return null
    }

    return null
  }

  /**
   * Устанавливает токен авторизации
   * @param {string} token - токен
   */
  setAuthToken(token) {
    localStorage.setItem('auth_token', token)
  }

  /**
   * Удаляет токен авторизации
   */
  removeAuthToken() {
    localStorage.removeItem('auth_token')
  }
}

// Создаем экземпляр API сервиса
const apiService = new ApiService()

export default apiService

