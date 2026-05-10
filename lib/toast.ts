import { toast as sonnerToast } from 'sonner'

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
    })
  },
  
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
    })
  },
  
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
    })
  },
  
  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
    })
  },

  // Специальные уведомления для магазина
  addedToCart: (productName: string) => {
    sonnerToast.success('Добавлено в корзину', {
      description: productName,
    })
  },

  removedFromCart: (productName: string) => {
    sonnerToast.info('Удалено из корзины', {
      description: productName,
    })
  },

  addedToFavorites: (productName: string) => {
    sonnerToast.success('Добавлено в избранное', {
      description: productName,
    })
  },

  removedFromFavorites: (productName: string) => {
    sonnerToast.info('Удалено из избранного', {
      description: productName,
    })
  },

  orderCreated: (orderNumber: number) => {
    sonnerToast.success('Заказ оформлен', {
      description: `Номер заказа: ${orderNumber}`,
    })
  },

  orderStatusChanged: (status: string) => {
    sonnerToast.success('Статус заказа изменен', {
      description: `Новый статус: ${status}`,
    })
  },

  productSaved: () => {
    sonnerToast.success('Товар сохранен', {
      description: 'Изменения успешно применены',
    })
  },

  productDeleted: () => {
    sonnerToast.success('Товар удален', {
      description: 'Товар успешно удален из каталога',
    })
  },

  reviewApproved: () => {
    sonnerToast.success('Отзыв одобрен', {
      description: 'Отзыв опубликован на сайте',
    })
  },

  reviewDeleted: () => {
    sonnerToast.info('Отзыв удален')
  },

  loginSuccess: () => {
    sonnerToast.success('Добро пожаловать!', {
      description: 'Вы успешно вошли в систему',
    })
  },

  logoutSuccess: () => {
    sonnerToast.info('Вы вышли из системы')
  },

  settingsSaved: () => {
    sonnerToast.success('Настройки сохранены', {
      description: 'Изменения вступили в силу',
    })
  },

  networkError: () => {
    sonnerToast.error('Ошибка сети', {
      description: 'Проверьте подключение к интернету',
    })
  },

  serverError: () => {
    sonnerToast.error('Ошибка сервера', {
      description: 'Попробуйте позже',
    })
  },
}
