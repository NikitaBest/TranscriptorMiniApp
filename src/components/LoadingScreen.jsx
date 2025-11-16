import './LoadingScreen.css'

function LoadingScreen({ userName, userPhoto }) {
  return (
    <div className="loading-screen">
      <div className="loading-screen-content">
        {userPhoto && (
          <div className="loading-screen-avatar-container">
            <img 
              src={userPhoto} 
              alt="User avatar" 
              className="loading-screen-avatar"
            />
          </div>
        )}
        {userName && (
          <div className="loading-screen-greeting">
            <p>Привет, {userName}</p>
          </div>
        )}
        <div className="loading-screen-spinner">
          <div className="spinner-circle"></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen

