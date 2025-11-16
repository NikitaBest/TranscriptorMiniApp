import { useEffect, useState } from 'react'
import './App.css'
import { testUserData, isLocalDevelopment } from './config/testData.js'
import AudioRecorder from './components/AudioRecorder.jsx'

function App() {
  const [userName, setUserName] = useState(null)
  const [userPhoto, setUserPhoto] = useState(null)
  const [audioData, setAudioData] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [hasAudioBlob, setHasAudioBlob] = useState(false)

  useEffect(() => {
    // Проверяем, локальная ли это разработка
    const isLocal = isLocalDevelopment()
    
    // Инициализация Telegram Web App (если доступен)
    if (window.Telegram?.WebApp) {
      const telegram = window.Telegram.WebApp
      
      // Отключаем вертикальные свайпы для закрытия приложения
      if (telegram.disableVerticalSwipes) {
        telegram.disableVerticalSwipes()
      }
      
      // Настройка темы приложения
      if (telegram.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark')
      } else {
        document.documentElement.setAttribute('data-theme', 'light')
      }
      
      // Обработчик изменения темы
      telegram.onEvent('themeChanged', () => {
        if (telegram.colorScheme === 'dark') {
          document.documentElement.setAttribute('data-theme', 'dark')
        } else {
          document.documentElement.setAttribute('data-theme', 'light')
        }
      })
    }
    
    // Получаем данные пользователя
    if (isLocal) {
      // Используем тестовые данные для локальной разработки
      setUserName(testUserData.first_name)
      setUserPhoto(testUserData.photo_url)
    } else {
      // Используем реальные данные из Telegram Web App
      if (window.Telegram?.WebApp) {
        const user = window.Telegram.WebApp.initDataUnsafe?.user
        if (user) {
          // Получаем имя пользователя
          if (user.first_name) {
            setUserName(user.first_name)
          }
          // Получаем фото пользователя
          if (user.photo_url) {
            setUserPhoto(user.photo_url)
          }
        }
      }
    }
  }, [])

  return (
    <div className="app">
      <div className={`app-content ${isRecording ? 'recording-active' : ''}`}>
        {!isRecording && !hasAudioBlob && userPhoto && (
          <div className="user-avatar-container">
            <img 
              src={userPhoto} 
              alt="User avatar" 
              className="user-avatar"
            />
          </div>
        )}
        {!isRecording && !hasAudioBlob && userName && (
          <div className="user-info">
            <p>Привет, {userName}</p>
          </div>
        )}
        <AudioRecorder 
          onAudioData={setAudioData} 
          onRecordingStateChange={setIsRecording}
          onAudioBlobChange={setHasAudioBlob}
          audioData={audioData}
        />
      </div>
    </div>
  )
}

export default App
