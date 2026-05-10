'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (phone: string) => Promise<{ success: boolean; message: string }>
  verifyCode: (phone: string, code: string) => Promise<{ success: boolean; message?: string }>
  adminLogin: (login: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizeUser(user: any): User {
  return {
    id: String(user.id),
    phone: user.phone || '',
    email: user.email || '',
    name: user.name || 'Пользователь',
    role: user.role || 'customer',
    favorites: (user.favorites || []).map((id: any) => String(id)),
    createdAt: user.createdAt || user.created_at || new Date().toISOString(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Проверка авторизации при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('auth_user')
        
        if (token && savedUser) {
          const response = await api.users.getMe()
          const normalized = normalizeUser(response.data)
          setUser(normalized)
          localStorage.setItem('auth_user', JSON.stringify(normalized))
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Запрос SMS кода
  const login = useCallback(async (phone: string): Promise<{ success: boolean; message: string }> => {
    try {
      const response = await api.auth.login(phone)
      return { 
        success: true, 
        message: response.message || ('SMS код отправлен на номер ' + phone),
      }
    } catch (error) {
      return { 
        success: false, 
        message: 'Ошибка отправки SMS. Попробуйте позже.' 
      }
    }
  }, [])

  // Подтверждение SMS кода
  const verifyCode = useCallback(async (phone: string, code: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.auth.verifyCode(phone, code)
      const token = response.data?.token
      const backendUser = response.data?.user
      if (!token || !backendUser) {
        return { success: false, message: 'Сервер вернул некорректный ответ' }
      }
      const normalized = normalizeUser(backendUser)
      
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(normalized))
      setUser(normalized)

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: 'Ошибка верификации. Попробуйте позже.' 
      }
    }
  }, [])

  // Вход в админку (логин + пароль)
  const adminLogin = useCallback(async (login: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await api.auth.adminLogin(login, password)
      const token = response.data?.token
      const backendUser = response.data?.user
      if (!token || !backendUser) {
        return { success: false, message: 'Сервер вернул некорректный ответ' }
      }
      const normalized = normalizeUser(backendUser)

      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify(normalized))
      setUser(normalized)

      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        message: 'Ошибка авторизации. Попробуйте позже.' 
      }
    }
  }, [])

  // Выход
  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    setUser(null)
  }, [])

  // Обновление профиля
  const updateProfile = useCallback(async (data: { name?: string; email?: string }) => {
    if (!user) return

    const response = await api.users.updateProfile(data)
    const updatedUser = normalizeUser(response.data)
    localStorage.setItem('auth_user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }, [user])

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    login,
    verifyCode,
    adminLogin,
    logout,
    updateProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
