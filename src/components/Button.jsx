import './Button.css'

/**
 * Универсальный компонент кнопки с округлыми краями и прозрачностью
 * @param {string} variant - вариант кнопки: 'record', 'pause', 'resume', 'stop', 'upload', 'cancel', 'default'
 * @param {string} icon - иконка/эмодзи для отображения
 * @param {React.ReactNode} children - содержимое кнопки
 * @param {boolean} disabled - отключена ли кнопка
 * @param {function} onClick - обработчик клика
 * @param {string} className - дополнительные CSS классы
 * @param {object} ...props - остальные пропсы
 */
function Button({ 
  variant = 'default', 
  icon, 
  children, 
  disabled = false, 
  onClick,
  className = '',
  ...props 
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children && <span className="btn-text">{children}</span>}
    </button>
  )
}

export default Button

