import { useState, useRef, useEffect } from 'react'
import audioApiService from '../services/audioApi.js'
import Button from './Button.jsx'
import MicrophoneIcon from './MicrophoneIcon.jsx'
import PauseIcon from './PauseIcon.jsx'
import StopIcon from './StopIcon.jsx'
import AudioWaves from './AudioWaves.jsx'
import './AudioRecorder.css'

function AudioRecorder({ onAudioData, onRecordingStateChange, audioData, onAudioBlobChange }) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [error, setError] = useState(null)
  const [transcriptionId, setTranscriptionId] = useState(null)
  const [transcription, setTranscription] = useState(null)
  const [isLoadingTranscription, setIsLoadingTranscription] = useState(false)
  const [transcriptionStatus, setTranscriptionStatus] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showTranscriptionReady, setShowTranscriptionReady] = useState(false)
  const [showCopyNotification, setShowCopyNotification] = useState(false)
  const [editableTranscriptionText, setEditableTranscriptionText] = useState('')

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const statusCheckTimerRef = useRef(null) // Таймер для проверки статуса
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const dataArrayRef = useRef(null)
  const animationFrameRef = useRef(null)
  const isRecordingRef = useRef(false) // Ref для проверки состояния записи
  const isPausedRef = useRef(false) // Ref для проверки состояния паузы
  const audioPlayerRef = useRef(null) // Ref для audio элемента
  const fileInputRef = useRef(null) // Ref для input файла

  // Форматирование времени в MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Анализ аудио для эквалайзера
  const analyzeAudio = () => {
    if (!analyserRef.current || isPausedRef.current) {
      if (onAudioData) {
        onAudioData(null)
      }
      return
    }

    // Проверяем состояние записи через ref, чтобы избежать проблем с замыканиями
    if (!isRecordingRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      return
    }

    analyserRef.current.getByteFrequencyData(dataArrayRef.current)
    
    // Преобразуем данные в массив для 20 полос эквалайзера
    const barCount = 20
    const dataLength = dataArrayRef.current.length
    const step = Math.floor(dataLength / barCount)
    const audioLevels = []
    
    // Берем средние значения для более плавной визуализации
    for (let i = 0; i < barCount; i++) {
      const startIndex = i * step
      const endIndex = Math.min(startIndex + step, dataLength)
      let sum = 0
      let count = 0
      
      for (let j = startIndex; j < endIndex; j++) {
        sum += dataArrayRef.current[j] || 0
        count++
      }
      
      const avgValue = count > 0 ? sum / count : 0
      // Используем максимальное значение в диапазоне для более яркой реакции
      let maxValue = 0
      for (let j = startIndex; j < endIndex; j++) {
        maxValue = Math.max(maxValue, dataArrayRef.current[j] || 0)
      }
      // Нормализуем и значительно увеличиваем чувствительность
      // Используем более агрессивное усиление для яркой реакции
      const normalized = Math.min(1.2, (maxValue / 255) * 3.5) // Множитель 3.5, максимум 1.2 для переполнения
      audioLevels.push(Math.max(0.15, normalized)) // Минимум 15% для видимости
    }
    
    if (onAudioData) {
      onAudioData(audioLevels)
    }
    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }

  // Определение поддерживаемого MIME-типа для MediaRecorder
  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/aac',
      'audio/wav'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        console.log('Поддерживаемый MIME-тип:', type)
        return type
      }
    }
    
    // Если ничего не поддерживается, возвращаем пустую строку (браузер выберет сам)
    console.warn('Не найден поддерживаемый MIME-тип, используется формат по умолчанию')
    return ''
  }

  // Проверка доступности API
  const checkMediaDevicesSupport = () => {
    if (!navigator.mediaDevices) {
      throw new Error('MediaDevices API не поддерживается в этом браузере')
    }
    
    if (!navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia не поддерживается в этом браузере')
    }
    
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder API не поддерживается в этом браузере')
    }
  }

  // Запрос доступа к микрофону и начало записи
  const startRecording = async () => {
    try {
      setError(null)
      
      // Проверяем доступность API
      checkMediaDevicesSupport()
      
      // Запрашиваем доступ к микрофону
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        })
      } catch (getUserMediaError) {
        console.error('Ошибка getUserMedia:', getUserMediaError)
        
        // Детальная обработка различных типов ошибок
        if (getUserMediaError.name === 'NotAllowedError' || getUserMediaError.name === 'PermissionDeniedError') {
          throw new Error('Доступ к микрофону запрещен. Пожалуйста, разрешите доступ в настройках браузера.')
        } else if (getUserMediaError.name === 'NotFoundError' || getUserMediaError.name === 'DevicesNotFoundError') {
          throw new Error('Микрофон не найден. Убедитесь, что устройство подключено.')
        } else if (getUserMediaError.name === 'NotReadableError' || getUserMediaError.name === 'TrackStartError') {
          throw new Error('Микрофон занят другим приложением. Закройте другие приложения, использующие микрофон.')
        } else if (getUserMediaError.name === 'OverconstrainedError') {
          throw new Error('Запрошенные параметры микрофона не поддерживаются.')
        } else {
          throw new Error(`Ошибка доступа к микрофону: ${getUserMediaError.message || 'Неизвестная ошибка'}`)
        }
      }
      
      // Проверяем, что stream активен и содержит аудио треки
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop())
        throw new Error('Не удалось получить аудио трек из потока')
      }
      
      // Проверяем состояние первого трека
      const firstTrack = audioTracks[0]
      if (firstTrack.readyState === 'ended') {
        stream.getTracks().forEach(track => track.stop())
        throw new Error('Аудио трек уже завершен')
      }
      
      // Создаем AudioContext для анализа звука
      let audioContext
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)()
        
        // Некоторые браузеры требуют резюмирования AudioContext после пользовательского взаимодействия
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }
      } catch (audioContextError) {
        stream.getTracks().forEach(track => track.stop())
        console.error('Ошибка создания AudioContext:', audioContextError)
        throw new Error('Не удалось инициализировать аудио контекст. Попробуйте обновить страницу.')
      }
      
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)
      
      analyser.fftSize = 512 // Увеличиваем для лучшего разрешения
      analyser.smoothingTimeConstant = 0.2 // Уменьшаем для более быстрой реакции
      analyser.minDecibels = -100 // Более чувствительный диапазон
      analyser.maxDecibels = -5 // Более высокий максимум
      source.connect(analyser)
      
      audioContextRef.current = audioContext
      analyserRef.current = analyser
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
      
      // Определяем поддерживаемый MIME-тип
      const mimeType = getSupportedMimeType()
      const options = mimeType ? { mimeType } : {}
      
      // Создаем MediaRecorder с поддерживаемым форматом
      let mediaRecorder
      try {
        mediaRecorder = new MediaRecorder(stream, options)
      } catch (mediaRecorderError) {
        stream.getTracks().forEach(track => track.stop())
        audioContext.close()
        console.error('Ошибка создания MediaRecorder:', mediaRecorderError)
        throw new Error('Не удалось создать записывающее устройство. Ваш браузер может не поддерживать запись аудио.')
      }
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorder.onerror = (event) => {
        console.error('Ошибка MediaRecorder:', event.error)
        setError(`Ошибка записи: ${event.error?.message || 'Неизвестная ошибка'}`)
        stopRecording()
      }

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm'
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        setAudioBlob(audioBlob)
        if (onAudioBlobChange) {
          onAudioBlobChange(true)
        }
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        // Сбрасываем состояние плеера
        setIsPlaying(false)
        setCurrentTime(0)
        setDuration(0)
        
        // Останавливаем анализ
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        if (onAudioData) {
          onAudioData(null)
        }
        
        // Закрываем AudioContext
        if (audioContextRef.current) {
          audioContextRef.current.close()
          audioContextRef.current = null
        }
        
        // Останавливаем все треки потока
        stream.getTracks().forEach(track => track.stop())
      }

      // Запускаем запись с обработкой ошибок
      try {
        mediaRecorder.start()
      } catch (startError) {
        stream.getTracks().forEach(track => track.stop())
        audioContext.close()
        console.error('Ошибка запуска MediaRecorder:', startError)
        throw new Error('Не удалось начать запись. Попробуйте еще раз.')
      }
      
      isRecordingRef.current = true
      setIsRecording(true)
      if (onRecordingStateChange) {
        onRecordingStateChange(true)
      }
      setRecordingTime(0)

      // Запускаем таймер
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Запускаем анализ аудио с небольшой задержкой, чтобы состояние успело обновиться
      setTimeout(() => {
        analyzeAudio()
      }, 50)

    } catch (err) {
      console.error('Ошибка при записи:', err)
      
      // Очищаем состояние при ошибке
      isRecordingRef.current = false
      setIsRecording(false)
      if (onRecordingStateChange) {
        onRecordingStateChange(false)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      // Показываем понятное сообщение об ошибке
      const errorMessage = err.message || 'Не удалось получить доступ к микрофону. Проверьте разрешения.'
      setError(errorMessage)
    }
  }

  // Пауза записи
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause()
      isPausedRef.current = true
      setIsPaused(true)
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      // Останавливаем анализ
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (onAudioData) {
        onAudioData(null)
      }
    }
  }

  // Возобновление записи
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume()
      isPausedRef.current = false
      setIsPaused(false)
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      // Возобновляем анализ с небольшой задержкой для обновления состояния
      setTimeout(() => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        analyzeAudio()
      }, 50)
    }
  }

  // Остановка записи
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      isRecordingRef.current = false
      isPausedRef.current = false
      setIsRecording(false)
      setIsPaused(false)
      if (onRecordingStateChange) {
        onRecordingStateChange(false)
      }
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      // Останавливаем анализ
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (onAudioData) {
        onAudioData(null)
      }
    }
  }

  // Отмена записи
  const cancelRecording = () => {
    stopRecording()
    stopStatusCheck() // Останавливаем проверку статуса
    setAudioBlob(null)
    if (onAudioBlobChange) {
      onAudioBlobChange(false)
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
    }
    setRecordingTime(0)
    setError(null)
    setTranscription(null)
    setEditableTranscriptionText('')
    setTranscriptionId(null)
    setTranscriptionStatus(null)
    setIsLoadingTranscription(false)
    setUploadStatus(null)
  }

  // Копирование транскрипции в буфер обмена
  const copyTranscription = async () => {
    // Используем редактируемый текст, если он есть, иначе оригинальный
    const transcriptionText = editableTranscriptionText || transcription?.transcriptionResult || transcription?.text || transcription?.transcription || transcription?.result || transcription?.transcribedText || ''
    
    if (transcriptionText) {
      try {
        // Используем современный Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(transcriptionText)
        } else {
          // Fallback для старых браузеров
          const textArea = document.createElement('textarea')
          textArea.value = transcriptionText
          textArea.style.position = 'fixed'
          textArea.style.left = '-999999px'
          textArea.style.top = '-999999px'
          document.body.appendChild(textArea)
          textArea.focus()
          textArea.select()
          document.execCommand('copy')
          document.body.removeChild(textArea)
        }
        
        // Показываем уведомление о копировании
        setShowCopyNotification(true)
        setTimeout(() => {
          setShowCopyNotification(false)
        }, 2000)
      } catch (err) {
        console.error('Ошибка при копировании текста:', err)
        setError('Не удалось скопировать текст. Попробуйте еще раз.')
      }
    }
  }

  // Новая запись
  const startNewRecording = () => {
    cancelRecording()
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setEditableTranscriptionText('')
  }

  // Обработка выбора файла
  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Проверяем, что это аудио файл
    if (!file.type.startsWith('audio/')) {
      setError('Пожалуйста, выберите аудио файл')
      return
    }

    try {
      setIsUploading(true)
      setError(null)
      setUploadStatus(null)
      setTranscription(null)
      setTranscriptionId(null)
      setEditableTranscriptionText('')

      console.log('Подготовка файла для отправки:', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileSizeKB: (file.size / 1024).toFixed(2) + ' KB'
      })

      const response = await audioApiService.uploadAudio(file)
      
      console.log('Ответ от сервера при загрузке:', response)
      
      // Получаем ID записи из ответа
      const uploadData = response?.value || response
      const id = uploadData?.id
      
      if (id) {
        // Сохраняем ID записи
        setTranscriptionId(id)
        console.log('ID записи сохранен:', id)
        
        // Не показываем промежуточные статусы
        setUploadStatus(null)
        
        // Даем время бекенду создать задачу транскрипции перед первой проверкой
        statusCheckTimerRef.current = setTimeout(() => {
          console.log('Начинаем проверку статуса транскрипции для ID:', id)
          setIsLoadingTranscription(true) // Начинаем проверку статуса
          setIsUploading(false) // Загрузка завершена
          checkTranscriptionStatus(id)
        }, 2000) // Ждем 2 секунды перед первой проверкой
      } else {
        setUploadStatus(null)
        console.error('ID записи не найден в ответе:', response)
        setIsUploading(false)
      }

    } catch (err) {
      console.error('Ошибка при загрузке файла:', err)
      setError(err.message || 'Ошибка при загрузке аудио файла на сервер')
      setUploadStatus(null)
      setIsUploading(false)
    }

    // Сбрасываем input, чтобы можно было выбрать тот же файл снова
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Открытие диалога выбора файла
  const handleFileButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Отправка аудио на бекенд
  const uploadAudio = async () => {
    if (!audioBlob) return

    try {
      setIsUploading(true)
      setError(null)
      setUploadStatus(null)
      setTranscription(null)
      setTranscriptionId(null)

      // Конвертируем Blob в File
      const audioFile = new File([audioBlob], 'recording.webm', {
        type: 'audio/webm'
      })

      console.log('Подготовка файла для отправки:', {
        fileName: audioFile.name,
        fileType: audioFile.type,
        fileSize: audioFile.size,
        fileSizeKB: (audioFile.size / 1024).toFixed(2) + ' KB',
        blobSize: audioBlob.size
      })

      const response = await audioApiService.uploadAudio(audioFile)
      
      console.log('Ответ от сервера при загрузке:', response)
      
      // Получаем ID записи из ответа
      // Структура ответа: { value: { id: 5, status: "completed", ... }, isSuccess: true, error: null }
      const uploadData = response?.value || response
      const id = uploadData?.id
      
      if (id) {
        // Сохраняем ID записи
        setTranscriptionId(id)
        console.log('ID записи сохранен:', id)
        
        // Проверяем статус в ответе
        const uploadStatus = uploadData?.status
        console.log('Статус загрузки:', uploadStatus)
        
        // Не показываем промежуточные статусы
        setUploadStatus(null)
        
        // Даем время бекенду создать задачу транскрипции перед первой проверкой
        statusCheckTimerRef.current = setTimeout(() => {
          console.log('Начинаем проверку статуса транскрипции для ID:', id)
          setIsLoadingTranscription(true) // Начинаем проверку статуса
          setIsUploading(false) // Загрузка завершена
          checkTranscriptionStatus(id)
        }, 2000) // Ждем 2 секунды перед первой проверкой
      } else {
        setUploadStatus(null)
        console.error('ID записи не найден в ответе:', response)
        setIsUploading(false)
      }

    } catch (err) {
      console.error('Ошибка при загрузке:', err)
      setError(err.message || 'Ошибка при загрузке аудио на сервер')
      setUploadStatus(null)
      setIsUploading(false)
    }
  }

  // Остановка проверки статуса
  const stopStatusCheck = () => {
    if (statusCheckTimerRef.current) {
      clearTimeout(statusCheckTimerRef.current)
      statusCheckTimerRef.current = null
    }
  }

  // Проверка статуса транскрипции
  const checkTranscriptionStatus = async (id) => {
    if (!id) {
      console.warn('Попытка проверить статус без ID')
      return
    }

    try {
      setIsLoadingTranscription(true)
      console.log('Запрос статуса транскрипции для ID:', id)
      const response = await audioApiService.getTranscription(id)
      
      console.log('Ответ от сервера при проверке статуса:', response)
      
      // Обрабатываем структуру ответа: может быть { value: {...}, isSuccess: true } или прямой объект
      const data = response?.value || response
      
      // Проверяем наличие транскрипции в transcriptionResult
      const transcriptionResult = data?.transcriptionResult
      const progressPercent = data?.progressPercent
      const transcriptionStatus = data?.transcriptionStatus
      
      // Если есть результат транскрипции или прогресс 100%
      if (transcriptionResult || progressPercent === 100 || transcriptionStatus === 2) {
        // Останавливаем проверку статуса
        stopStatusCheck()
        
        // Сохраняем данные транскрипции
        const transcriptionText = transcriptionResult || data?.text || data?.transcription || data?.result || data?.transcribedText || ''
        setTranscription({
          text: transcriptionText,
          ...data
        })
        // Устанавливаем редактируемый текст
        setEditableTranscriptionText(transcriptionText)
        setIsLoadingTranscription(false)
        setIsUploading(false)
        console.log('Транскрипция получена:', transcriptionResult)
        
        // Показываем уведомление
        setShowTranscriptionReady(true)
        
        // Скрываем уведомление через 3 секунды с плавной анимацией
        setTimeout(() => {
          setShowTranscriptionReady(false)
        }, 3000)
        
        return // Прекращаем дальнейшие проверки
      }
      
      // Если транскрипция еще обрабатывается
      if (progressPercent !== undefined && progressPercent < 100) {
        setUploadStatus(null)
        // Продолжаем проверку
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 3000)
      } else if (transcriptionStatus === 1 || transcriptionStatus === 0) {
        // Статус: в обработке или ожидании
        setUploadStatus(null)
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 3000)
      } else {
        // Неизвестный статус, продолжаем проверять
        setUploadStatus(null)
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 3000)
      }
    } catch (err) {
      console.error('Ошибка при получении статуса:', err)
      
      // Получаем статус ошибки
      const errorStatus = err.status || (err.message?.includes('404') ? 404 : null) || (err.message?.includes('400') ? 400 : null)
      
      // Если ошибка 404 или 400 - это может означать, что транскрипция еще не создана
      // или еще обрабатывается. Продолжаем проверять без показа ошибки
      if (errorStatus === 404 || errorStatus === 400) {
        setUploadStatus(null)
        setError(null)
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 3000)
      } else {
        // Для других ошибок тоже пробуем еще раз, но с большей задержкой
        setUploadStatus(null)
        setError(null)
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 5000)
      }
    }
  }

  // Ручная проверка транскрипции
  const refreshTranscription = () => {
    if (transcriptionId) {
      checkTranscriptionStatus(transcriptionId)
    }
  }

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      stopStatusCheck() // Останавливаем проверку статуса
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop())
      }
    }
  }, [audioUrl])

  return (
    <div className="audio-recorder">
      {error && (
        <div className="audio-recorder-error">
          {error}
        </div>
      )}

      {showTranscriptionReady && (
        <div className="audio-recorder-notification show">
          Транскрипция готова!
        </div>
      )}

      {showCopyNotification && (
        <div className="audio-recorder-notification show">
          Текст скопирован!
        </div>
      )}

      {!isRecording && !audioBlob && !isUploading && !isLoadingTranscription && !transcription && (
        <div className="audio-recorder-main-section">
          <h2 className="audio-recorder-title">Запись голосового сообщения</h2>
          <div className="audio-recorder-control-wrapper">
            <div className="sound-waves-container">
              <div className="sound-wave sound-wave-1"></div>
              <div className="sound-wave sound-wave-2"></div>
              <div className="sound-wave sound-wave-3"></div>
              <Button
                variant="record"
                icon={<MicrophoneIcon />}
                onClick={startRecording}
                disabled={isUploading}
                circular
              />
            </div>
            {/* Временно скрыта кнопка загрузки файла */}
            {/* <div className="audio-recorder-file-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <Button
                variant="upload"
                icon={<img src="/audiopush.svg" alt="Загрузить файл" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                onClick={handleFileButtonClick}
                disabled={isUploading}
                circular
              />
            </div> */}
            <div className="audio-recorder-equalizer-container">
              <AudioWaves audioData={null} isRecording={false} />
            </div>
          </div>
        </div>
      )}

      {isRecording && (
        <>
          <h2 className="audio-recorder-title">Идет запись</h2>
          <div className="audio-recorder-timer">
            {formatTime(recordingTime)}
          </div>
          <div className="audio-recorder-equalizer-container">
            <AudioWaves audioData={audioData} isRecording={isRecording} />
          </div>
        </>
      )}

      {(isUploading || isLoadingTranscription) && !transcription && (
        <>
          <h2 className="audio-recorder-title">Ожидание обработки</h2>
          <div className="audio-recorder-equalizer-container">
            <AudioWaves audioData={null} isRecording={false} />
          </div>
          <div className="audio-recorder-loading">
            <div className="loading-spinner"></div>
            <p>
              {isUploading ? 'Загрузка файла...' : 'Получение транскрипции...'}
            </p>
          </div>
        </>
      )}

      {audioUrl && !isRecording && !transcription && !isUploading && !isLoadingTranscription && (
        <>
          <h2 className="audio-recorder-title">Прослушайте запись</h2>
          <div className="audio-recorder-preview">
          <audio 
            ref={audioPlayerRef}
            src={audioUrl} 
            onTimeUpdate={() => {
              if (audioPlayerRef.current) {
                setCurrentTime(audioPlayerRef.current.currentTime)
              }
            }}
            onLoadedMetadata={() => {
              if (audioPlayerRef.current) {
                setDuration(audioPlayerRef.current.duration)
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false)
              setCurrentTime(0)
            }}
          />
          <div className="audio-player">
            <div className="audio-player-main">
              <button 
                className={`audio-player-play-btn ${isPlaying ? 'audio-player-pause-btn' : 'audio-player-play-btn-active'}`}
                onClick={() => {
                  if (audioPlayerRef.current) {
                    if (isPlaying) {
                      audioPlayerRef.current.pause()
                      setIsPlaying(false)
                    } else {
                      audioPlayerRef.current.play()
                      setIsPlaying(true)
                    }
                  }
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <div className="audio-player-time">
                {formatTime(Math.floor(currentTime))} / {formatTime(Math.floor(duration))}
              </div>
            </div>
            <div 
              className="audio-player-progress-container"
              onClick={(e) => {
                if (audioPlayerRef.current && duration && !isDragging) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  const newTime = percent * duration
                  audioPlayerRef.current.currentTime = newTime
                  setCurrentTime(newTime)
                }
              }}
              onMouseDown={(e) => {
                if (audioPlayerRef.current && duration) {
                  setIsDragging(true)
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  const newTime = percent * duration
                  audioPlayerRef.current.currentTime = newTime
                  setCurrentTime(newTime)
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && audioPlayerRef.current && duration) {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                  const newTime = percent * duration
                  audioPlayerRef.current.currentTime = newTime
                  setCurrentTime(newTime)
                }
              }}
              onMouseUp={() => {
                setIsDragging(false)
              }}
              onMouseLeave={() => {
                setIsDragging(false)
              }}
              onTouchStart={(e) => {
                if (audioPlayerRef.current && duration) {
                  setIsDragging(true)
                  const rect = e.currentTarget.getBoundingClientRect()
                  const touch = e.touches[0]
                  const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                  const newTime = percent * duration
                  audioPlayerRef.current.currentTime = newTime
                  setCurrentTime(newTime)
                }
              }}
              onTouchMove={(e) => {
                if (isDragging && audioPlayerRef.current && duration) {
                  e.preventDefault()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const touch = e.touches[0]
                  const percent = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
                  const newTime = percent * duration
                  audioPlayerRef.current.currentTime = newTime
                  setCurrentTime(newTime)
                }
              }}
              onTouchEnd={() => {
                setIsDragging(false)
              }}
            >
              <div 
                className="audio-player-progress-bar"
                style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
        </>
      )}

      {/* Отображение транскрипции */}
      {transcription && (
        <>
          <h2 className="audio-recorder-title">Транскрипция</h2>
          <div className="audio-recorder-transcription">
            <textarea
              className="transcription-content"
              value={editableTranscriptionText}
              onChange={(e) => setEditableTranscriptionText(e.target.value)}
              placeholder="Текст транскрипции не найден"
              rows={6}
            />
          </div>
        </>
      )}


      <div className="audio-recorder-controls">

        {isRecording && (
          <div className="audio-recorder-controls-group">
            {!isPaused ? (
              <Button
                variant="pause"
                icon={<PauseIcon />}
                onClick={pauseRecording}
                circular
              />
            ) : (
              <Button
                variant="resume"
                icon="▶"
                onClick={resumeRecording}
                circular
              />
            )}
            <Button
              variant="stop"
              icon={<StopIcon />}
              onClick={stopRecording}
              circular
            />
          </div>
        )}

        {audioBlob && !isRecording && !transcription && !isUploading && !isLoadingTranscription && (
          <>
            <Button
              variant="upload"
              onClick={uploadAudio}
              disabled={isUploading}
            >
              Отправить
            </Button>
            <Button
              variant="cancel"
              onClick={cancelRecording}
              disabled={isUploading}
            >
              Отменить
            </Button>
          </>
        )}

        {transcription && (
          <>
            <Button
              variant="cancel"
              onClick={startNewRecording}
            >
              Новая запись
            </Button>
            <Button
              variant="upload"
              onClick={copyTranscription}
            >
              Скопировать текст
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default AudioRecorder

