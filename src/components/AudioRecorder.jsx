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

  // Запрос доступа к микрофону и начало записи
  const startRecording = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Создаем AudioContext для анализа звука
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        if (onAudioBlobChange) {
          onAudioBlobChange(true)
        }
        const url = URL.createObjectURL(audioBlob)
        setAudioUrl(url)
        
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

      mediaRecorder.start()
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
      setError('Не удалось получить доступ к микрофону. Проверьте разрешения.')
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
    setTranscriptionId(null)
    setTranscriptionStatus(null)
    setIsLoadingTranscription(false)
    setUploadStatus(null)
  }

  // Отправка аудио на бекенд
  const uploadAudio = async () => {
    if (!audioBlob) return

    try {
      setIsUploading(true)
      setError(null)
      setUploadStatus('Загрузка...')
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
        
        if (uploadStatus === 'completed') {
          // Файл загружен, но транскрипция может еще не начаться
          setUploadStatus('Файл загружен, ожидание начала обработки транскрипции...')
        } else {
          setUploadStatus('Файл загружен, ожидание начала обработки...')
        }
        
        setIsUploading(false) // Загрузка завершена, начинаем проверку статуса
        // Даем время бекенду создать задачу транскрипции перед первой проверкой
        statusCheckTimerRef.current = setTimeout(() => {
          console.log('Начинаем проверку статуса транскрипции для ID:', id)
          checkTranscriptionStatus(id)
        }, 2000) // Ждем 2 секунды перед первой проверкой
      } else {
        setUploadStatus('Успешно загружено!')
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
        setTranscription({
          text: transcriptionResult || data?.text || data?.transcription || '',
          ...data
        })
        setUploadStatus('Транскрипция готова!')
        setIsLoadingTranscription(false)
        setIsUploading(false)
        console.log('Транскрипция получена:', transcriptionResult)
        return // Прекращаем дальнейшие проверки
      }
      
      // Если транскрипция еще обрабатывается
      if (progressPercent !== undefined && progressPercent < 100) {
        setUploadStatus(`Обработка транскрипции... (${progressPercent}%)`)
        // Продолжаем проверку
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 3000)
      } else if (transcriptionStatus === 1 || transcriptionStatus === 0) {
        // Статус: в обработке или ожидании
        setUploadStatus('Обработка транскрипции...')
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 3000)
      } else {
        // Неизвестный статус, продолжаем проверять
        setUploadStatus('Ожидание обработки...')
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
        setUploadStatus('Ожидание обработки транскрипции...')
        setError(null)
        statusCheckTimerRef.current = setTimeout(() => {
          checkTranscriptionStatus(id)
        }, 3000)
      } else {
        // Для других ошибок тоже пробуем еще раз, но с большей задержкой
        setUploadStatus('Повторная попытка получения статуса...')
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

      {uploadStatus && (
        <div className="audio-recorder-status">
          {uploadStatus}
        </div>
      )}

      {!isRecording && !audioBlob && (
        <div className="audio-recorder-main-section">
          <div className="audio-recorder-timer">
            {formatTime(recordingTime)}
          </div>
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
            <p className="audio-recorder-hint">Запись голосового сообщения</p>
            <div className="audio-recorder-equalizer-container">
              <AudioWaves audioData={null} isRecording={false} />
            </div>
          </div>
        </div>
      )}

      {isRecording && (
        <>
          <div className="audio-recorder-timer">
            {formatTime(recordingTime)}
          </div>
          <div className="audio-recorder-equalizer-container">
            <AudioWaves audioData={audioData} isRecording={isRecording} />
          </div>
        </>
      )}

      {audioUrl && !isRecording && (
        <div className="audio-recorder-preview">
          <audio src={audioUrl} controls />
        </div>
      )}

      {/* Отображение транскрипции */}
      {transcription && (
        <div className="audio-recorder-transcription">
          <div className="transcription-header">
            <h3>Транскрипция</h3>
            {transcriptionId && (
              <Button
                variant="default"
                icon="🔄"
                onClick={refreshTranscription}
                disabled={isLoadingTranscription}
                className="transcription-refresh-btn"
                title="Обновить"
              />
            )}
          </div>
          <div className="transcription-content">
            {transcription?.transcriptionResult || transcription?.text || transcription?.transcription || transcription?.result || transcription?.transcribedText || 'Текст транскрипции не найден'}
          </div>
          {transcription.progressPercent !== undefined && (
            <div className="transcription-progress">
              Прогресс: {transcription.progressPercent}%
            </div>
          )}
        </div>
      )}

      {/* Индикатор загрузки транскрипции */}
      {isLoadingTranscription && transcriptionId && !transcription && (
        <div className="audio-recorder-loading">
          <div className="loading-spinner"></div>
          <p>Получение транскрипции...</p>
          {process.env.NODE_ENV === 'development' && (
            <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
              ID: {transcriptionId}
            </p>
          )}
        </div>
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

        {audioBlob && !isRecording && (
          <>
            <Button
              variant="upload"
              onClick={uploadAudio}
              disabled={isUploading}
            >
              {isUploading ? 'Загрузка...' : 'Отправить'}
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
      </div>
    </div>
  )
}

export default AudioRecorder

