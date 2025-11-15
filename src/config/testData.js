// Тестовые данные для локальной разработки
// В продакшене используются реальные данные из Telegram Web App

export const testUserData = {
  id: 123456789,
  photo_url: '/testavatar.jpeg',
  first_name: 'Тестовый',
  last_name: 'Пользователь',
  username: 'testuser',
  language_code: 'ru'
}

// Функция для проверки, находимся ли мы в локальной разработке
export const isLocalDevelopment = () => {
  // Проверяем, есть ли Telegram Web App
  // Если нет - значит локальная разработка
  return !window.Telegram?.WebApp || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1'
}

