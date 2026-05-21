'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Product } from '@/types'
import { productsApi } from '@/lib/api'
import {
  getStoredFavoriteIds,
  getStoredFavoriteProducts,
  normalizeFavoriteProductId,
  removeStoredFavoriteProduct,
  setStoredFavoriteIds,
  setStoredFavoriteProducts,
  upsertStoredFavoriteProduct,
} from '@/lib/local-favorites'

interface FavoritesContextType {
  favorites: string[]
  favoriteProducts: Product[]
  addToFavorites: (productId: string | number, product?: Product) => void
  removeFromFavorites: (productId: string | number) => void
  toggleFavorite: (productId: string | number, product?: Product) => void
  isFavorite: (productId: string | number) => boolean
  favoritesCount: number
  isLoadingProducts: boolean
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([])
  const [productsById, setProductsById] = useState<Record<string, Product>>({})
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const productsByIdRef = useRef(productsById)
  productsByIdRef.current = productsById

  useEffect(() => {
    setFavorites(getStoredFavoriteIds())
    setProductsById(getStoredFavoriteProducts())
    setIsInitialized(true)
  }, [])

  useEffect(() => {
    if (!isInitialized) return
    setStoredFavoriteIds(favorites)
  }, [favorites, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    setStoredFavoriteProducts(productsById)
  }, [productsById, isInitialized])

  useEffect(() => {
    if (!isInitialized || favorites.length === 0) {
      setIsLoadingProducts(false)
      return
    }

    const missingIds = favorites.filter((id) => !productsByIdRef.current[id])
    if (missingIds.length === 0) {
      setIsLoadingProducts(false)
      return
    }

    let cancelled = false
    setIsLoadingProducts(true)

    ;(async () => {
      const loaded = await Promise.all(
        missingIds.map(async (id) => {
          try {
            const response = await productsApi.getById(id)
            return response.data
          } catch {
            return null
          }
        })
      )

      if (cancelled) return

      setProductsById((prev) => {
        const next = { ...prev }
        for (const product of loaded) {
          if (!product) continue
          const id = normalizeFavoriteProductId(product.id)
          next[id] = { ...product, id }
        }
        return next
      })
      setIsLoadingProducts(false)
    })()

    return () => {
      cancelled = true
    }
  }, [favorites, isInitialized])

  const addToFavorites = useCallback((productId: string | number, product?: Product) => {
    const id = normalizeFavoriteProductId(productId)
    setFavorites((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (product) {
      const normalized = { ...product, id: normalizeFavoriteProductId(product.id) }
      setProductsById((prev) => ({ ...prev, [id]: normalized }))
      upsertStoredFavoriteProduct(normalized)
    }
  }, [])

  const removeFromFavorites = useCallback((productId: string | number) => {
    const id = normalizeFavoriteProductId(productId)
    setFavorites((prev) => prev.filter((item) => item !== id))
    setProductsById((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
    removeStoredFavoriteProduct(id)
  }, [])

  const toggleFavorite = useCallback(
    (productId: string | number, product?: Product) => {
      const id = normalizeFavoriteProductId(productId)
      if (favorites.includes(id)) {
        removeFromFavorites(id)
      } else {
        addToFavorites(id, product)
      }
    },
    [addToFavorites, favorites, removeFromFavorites]
  )

  const isFavorite = useCallback(
    (productId: string | number) => favorites.includes(normalizeFavoriteProductId(productId)),
    [favorites]
  )

  const favoriteProducts = useMemo(
    () => favorites.map((id) => productsById[id]).filter((product): product is Product => Boolean(product)),
    [favorites, productsById]
  )

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteProducts,
        addToFavorites,
        removeFromFavorites,
        toggleFavorite,
        isFavorite,
        favoritesCount: favorites.length,
        isLoadingProducts,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider')
  }
  return context
}
