import './AudioWaves.css'

function AudioWaves({ audioData, isRecording }) {
  // Массив из 20 полос для эквалайзера
  const bars = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="audio-waves-container">
      <div className="audio-equalizer">
        {bars.map((index) => {
          // Если идет запись и есть реальные данные аудио, используем их
          // Иначе показываем анимацию (только когда не записываем)
          const useRealData = isRecording && audioData && Array.isArray(audioData) && audioData[index] !== undefined
          const height = useRealData
            ? Math.max(0.15, audioData[index]) // Минимум 15% высоты, данные уже усилены
            : null
          
          // Если идет запись, всегда отключаем анимацию
          const shouldAnimate = !isRecording
          
          return (
            <div
              key={index}
              className="equalizer-bar"
              style={{
                ...(height !== null 
                  ? {
                      transform: `scaleY(${height})`,
                      animation: 'none',
                      opacity: 0.6 + (height * 0.4)
                    }
                  : shouldAnimate
                  ? {
                      animationDelay: `${index * 0.1}s`,
                      animationDuration: `${1.2 + (index % 3) * 0.3}s`
                    }
                  : {
                      animation: 'none',
                      transform: 'scaleY(0.3)',
                      opacity: 0.5
                    }
                )
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default AudioWaves

