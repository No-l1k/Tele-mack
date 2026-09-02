type ValidationIssue = {
  loc?: Array<string | number>
  msg?: string
  type?: string
  ctx?: Record<string, unknown>
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Имя',
  phone: 'Телефон',
  email: 'Email',
  message: 'Сообщение',
  subject: 'Тема',
  productId: 'Товар',
  quantity: 'Количество',
  comment: 'Комментарий',
  orderNumber: 'Номер заказа',
  items: 'Товары',
  password: 'Пароль',
  login: 'Логин',
  rating: 'Оценка',
  text: 'Текст отзыва',
  street: 'Улица',
  house: 'Дом',
  city: 'Город',
}

const DETAIL_TRANSLATIONS: Record<string, string> = {
  'Contact notifications are not configured': 'Отправка сообщений временно недоступна',
  'Too many requests. Please try again later.': 'Слишком много запросов. Попробуйте позже.',
  'Invalid credentials': 'Неверный логин или пароль',
  'Invalid payment method': 'Неверный способ оплаты',
  'Invalid delivery method': 'Неверный способ доставки',
  'Invalid token': 'Сессия истекла. Войдите снова',
  'User not found': 'Пользователь не найден',
  'Product not found': 'Товар не найден',
  'Order not found': 'Заказ не найден',
  'Phone is required': 'Укажите телефон',
  'Phone and code are required': 'Укажите телефон и код',
  'Phone and name are required': 'Укажите телефон и имя',
  'Quantity must be greater than 0': 'Количество должно быть больше 0',
  'Rating must be between 1 and 5': 'Оценка должна быть от 1 до 5',
  Forbidden: 'Доступ запрещён',
  'Admin access required': 'Требуются права администратора',
}

function fieldLabel(loc: Array<string | number> | undefined): string {
  if (!loc?.length) return 'Поле'
  for (let i = loc.length - 1; i >= 0; i -= 1) {
    const part = loc[i]
    if (typeof part === 'string' && part !== 'body' && part !== 'query' && part !== 'path') {
      return FIELD_LABELS[part] ?? part
    }
  }
  return 'Поле'
}

export function translateValidationIssue(issue: ValidationIssue): string {
  const errType = issue.type ?? ''
  const ctx = issue.ctx ?? {}
  const label = fieldLabel(issue.loc)

  if (errType === 'string_too_short') {
    return `«${label}»: минимум ${ctx.min_length} символов`
  }
  if (errType === 'string_too_long') {
    return `«${label}»: максимум ${ctx.max_length} символов`
  }
  if (errType === 'missing') {
    return `Заполните поле «${label}»`
  }
  if (errType === 'too_short') {
    return `«${label}»: минимум ${ctx.min_length} элементов`
  }
  if (errType === 'greater_than' || errType === 'greater_than_equal') {
    const limit = ctx.gt ?? ctx.ge
    return `«${label}»: значение должно быть больше ${limit}`
  }
  if (errType === 'less_than' || errType === 'less_than_equal') {
    const limit = ctx.lt ?? ctx.le
    return `«${label}»: значение должно быть не больше ${limit}`
  }
  if (errType === 'int_parsing') {
    return `«${label}»: введите целое число`
  }
  if (errType === 'value_error') {
    return String(issue.msg ?? 'Некорректное значение').replace(/^Value error,\s*/i, '')
  }

  const msg = String(issue.msg ?? '')
  if (msg.startsWith('String should have at least')) {
    return `«${label}»: минимум ${ctx.min_length ?? '?'} символов`
  }
  if (msg.startsWith('String should have at most')) {
    return `«${label}»: максимум ${ctx.max_length ?? '?'} символов`
  }
  if (msg.startsWith('Field required')) {
    return `Заполните поле «${label}»`
  }

  return msg || 'Ошибка валидации'
}

function translateDetailString(detail: string): string {
  return DETAIL_TRANSLATIONS[detail] ?? detail
}

export function formatApiErrorBody(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Ошибка сервера'
  const record = body as Record<string, unknown>
  if (typeof record.message === 'string') return translateDetailString(record.message)
  if (typeof record.detail === 'string') return translateDetailString(record.detail)
  if (Array.isArray(record.detail)) {
    return record.detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return translateValidationIssue(item as ValidationIssue)
        }
        return translateDetailString(String(item))
      })
      .join('; ')
  }
  return 'Ошибка сервера'
}
