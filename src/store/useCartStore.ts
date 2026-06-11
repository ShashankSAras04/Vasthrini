import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { CartItem } from '../types/database'

interface CartState {
  items: CartItem[]
  loading: boolean
  fetchCart: (userId: string) => Promise<void>
  addToCart: (userId: string, variantId: string, quantity?: number) => Promise<void>
  updateQuantity: (userId: string, itemId: string, quantity: number) => Promise<void>
  removeFromCart: (userId: string, itemId: string) => Promise<void>
  clearCart: (userId: string) => Promise<void>
  getTotalItems: () => number
  getTotalPrice: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,

      fetchCart: async (userId: string) => {
        set({ loading: true })
        try {
          const { data, error } = await supabase
            .from('cart')
            .select(`
              *,
              product:products(
                *,
                images:product_images(*),
                sizes:product_sizes(*)
              )
            `)
            .eq('user_id', userId)

          if (error) throw error

          const mappedItems: CartItem[] = (data || []).map((item: any) => {
            const product = item.product
            const sizes = product?.sizes || []
            const sizeInfo = sizes.find((s: any) => s.size === item.size)

            return {
              id: item.id,
              user_id: item.user_id,
              variant_id: sizeInfo?.id || item.size,
              quantity: item.quantity,
              created_at: item.created_at,
              updated_at: item.updated_at,
              variant: {
                id: sizeInfo?.id || item.size,
                product_id: item.product_id,
                size: item.size,
                color: product?.color || 'Default',
                color_hex: null,
                sku: product?.sku || '',
                stock_qty: sizeInfo?.quantity ?? 0,
                extra_price: 0,
                is_active: true,
                created_at: item.created_at,
                updated_at: item.updated_at,
                product: product
              }
            }
          })

          set({ items: mappedItems })
        } catch (err) {
          console.error('Error fetching cart:', err)
        } finally {
          set({ loading: false })
        }
      },

      addToCart: async (userId: string, variantId: string, quantity = 1) => {
        try {
          // Check if item already in cart in local state
          const existing = get().items.find((i) => i.variant_id === variantId)
          if (existing) {
            await get().updateQuantity(userId, existing.id, existing.quantity + quantity)
            return
          }

          // Fetch size details to get product_id and size
          const { data: sizeInfo, error: sizeError } = await supabase
            .from('product_sizes')
            .select('*, product:products(*, images:product_images(*), sizes:product_sizes(*))')
            .eq('id', variantId)
            .single()

          if (sizeError || !sizeInfo) throw sizeError || new Error('Size variant not found')

          const { data: cartData, error: cartError } = await supabase
            .from('cart')
            .insert({
              user_id: userId,
              product_id: sizeInfo.product_id,
              size: sizeInfo.size,
              quantity
            })
            .select()
            .single()

          if (cartError) throw cartError

          const product = sizeInfo.product
          const newItem: CartItem = {
            id: cartData.id,
            user_id: cartData.user_id,
            variant_id: variantId,
            quantity: cartData.quantity,
            created_at: cartData.created_at,
            updated_at: cartData.updated_at,
            variant: {
              id: variantId,
              product_id: sizeInfo.product_id,
              size: sizeInfo.size,
              color: product?.color || 'Default',
              color_hex: null,
              sku: product?.sku || '',
              stock_qty: sizeInfo.quantity,
              extra_price: 0,
              is_active: true,
              created_at: sizeInfo.created_at,
              updated_at: sizeInfo.created_at,
              product: product
            }
          }

          set({ items: [...get().items, newItem] })
        } catch (err) {
          console.error('Error adding to cart:', err)
          throw err
        }
      },

      updateQuantity: async (userId: string, itemId: string, quantity: number) => {
        try {
          if (quantity <= 0) {
            await get().removeFromCart(userId, itemId)
            return
          }

          const { error } = await supabase
            .from('cart')
            .update({ quantity })
            .eq('id', itemId)
            .eq('user_id', userId)

          if (error) throw error
          set({
            items: get().items.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          })
        } catch (err) {
          console.error('Error updating cart:', err)
          throw err
        }
      },

      removeFromCart: async (userId: string, itemId: string) => {
        try {
          const { error } = await supabase
            .from('cart')
            .delete()
            .eq('id', itemId)
            .eq('user_id', userId)

          if (error) throw error
          set({ items: get().items.filter((i) => i.id !== itemId) })
        } catch (err) {
          console.error('Error removing from cart:', err)
          throw err
        }
      },

      clearCart: async (userId: string) => {
        try {
          const { error } = await supabase
            .from('cart')
            .delete()
            .eq('user_id', userId)

          if (error) throw error
          set({ items: [] })
        } catch (err) {
          console.error('Error clearing cart:', err)
        }
      },

      getTotalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getTotalPrice: () =>
        get().items.reduce((sum, i) => {
          const variant = i.variant
          const product = variant?.product
          const price = product?.discount_price ?? product?.price ?? 0
          const extra = variant?.extra_price ?? 0
          return sum + (price + extra) * i.quantity
        }, 0),
    }),
    {
      name: 'vastrini-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
)
