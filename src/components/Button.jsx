import './Button.css'

/**
 * Универсальный компонент кнопки с округлыми краями и прозрачностью
 * @param {string} variant - вариант кнопки: 'record', 'pause', 'resume', 'stop', 'upload', 'cancel', 'default'
 * @param {string|React.ReactNode} icon - иконка/эмодзи/SVG для отображения
 * @param {React.ReactNode} children - содержимое кнопки
 * @param {boolean} disabled - отключена ли кнопка
 * @param {function} onClick - обработчик клика
 * @param {string} className - дополнительные CSS классы
 * @param {boolean} circular - круглая кнопка-иконка (без текста)
 * @param {object} ...props - остальные пропсы
 */
function Button({ 
  variant = 'default', 
  icon, 
  children, 
  disabled = false, 
  onClick,
  className = '',
  circular = false,
  ...props 
}) {
  const buttonClass = circular 
    ? `btn btn-circular btn-${variant} ${className}` 
    : `btn btn-${variant} ${className}`
  
  return (
    <button
      className={buttonClass}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children && !circular && <span className="btn-text">{children}</span>}
    </button>
  )
}

export default Button

