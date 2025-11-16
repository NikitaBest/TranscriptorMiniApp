import './AudioWaves.css'

function AudioWaves() {
  // Массив из 20 полос для эквалайзера
  const bars = Array.from({ length: 20 }, (_, i) => i)

  return (
    <div className="audio-waves-container">
      <div className="audio-equalizer">
        {bars.map((index) => (
          <div
            key={index}
            className="equalizer-bar"
            style={{
              animationDelay: `${index * 0.1}s`,
              animationDuration: `${1.2 + (index % 3) * 0.3}s`
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default AudioWaves

