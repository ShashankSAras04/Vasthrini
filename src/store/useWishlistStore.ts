import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { WishlistItem } from '../types/database'

interface WishlistState {
  items: WishlistItem[]
  loading: boolean
  fetchWishlist: (userId: string) => Promise<void>
  addToWishlist: (userId: string, productId: string) => Promise<void>
  removeFromWishlist: (userId: string, productId: string) => Promise<void>
  isWishlisted: (productId: string) => boolean
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  items: [],
  loading: false,

  fetchWishlist: async (userId: string) => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          *,
          product:products(
            *,
            images:product_images(*),
            category:categories(*),
            brand:brands(*)
          )
        `)
        .eq('user_id', userId)

      if (error) throw error
      set({ items: data || [] })
    } catch (err) {
      console.error('Error fetching wishlist:', err)
    } finally {
      set({ loading: false })
    }
  },

  addToWishlist: async (userId: string, productId: string) => {
    if (get().isWishlisted(productId)) return
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .insert({ user_id: userId, product_id: productId })
        .select(`
          *,
          product:products(*, images:product_images(*))
        `)
        .single()

      if (error) throw error
      set({ items: [...get().items, data] })
    } catch (err) {
      console.error('Error adding to wishlist:', err)
      throw err
    }
  },

  removeFromWishlist: async (userId: string, productId: string) => {
    try {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId)

      if (error) throw error
      set({ items: get().items.filter((i) => i.product_id !== productId) })
    } catch (err) {
      console.error('Error removing from wishlist:', err)
      throw err
    }
  },

  isWishlisted: (productId: string) =>
    get().items.some((i) => i.product_id === productId),
}))
