import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store/useSettingsStore'

/**
 * Subscribes to ALL relevant database tables via Supabase Realtime.
 * When any row changes, the relevant TanStack Query cache keys are
 * invalidated so every visitor sees the update within ~1 second
 * WITHOUT a page refresh.
 *
 * Tables covered:
 *  products, product_sizes  → storefront product listings & detail
 *  categories               → nav, filters, homepage grids
 *  site_settings            → header/footer/announcement bar
 *  banners                  → homepage hero/banners
 *  coupons                  → checkout coupon validation
 *  orders, order_items      → customer order status + admin orders
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    const channel = supabase
      .channel('public-db-changes-v2')
      // ── Products ──────────────────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['product'] })
        // also covers sub-keys like ['products', 'featured']
        queryClient.invalidateQueries({ queryKey: ['products', 'featured'] })
      })
      // ── Product sizes (stock) ─────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_sizes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['product'] })
        queryClient.invalidateQueries({ queryKey: ['products', 'featured'] })
      })
      // ── Categories ───────────────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        queryClient.invalidateQueries({ queryKey: ['categories'] })
        queryClient.invalidateQueries({ queryKey: ['categories', 'active'] })
      })
      // ── Site settings ─────────────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
        queryClient.invalidateQueries({ queryKey: ['site_settings'] })
        fetchSettings().catch(console.error)
      })
      // ── Banners ───────────────────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banners' }, () => {
        queryClient.invalidateQueries({ queryKey: ['banners'] })
      })
      // ── Coupons ───────────────────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons' }, () => {
        queryClient.invalidateQueries({ queryKey: ['coupons'] })
      })
      // ── Orders (customer order status live updates) ───────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        // Invalidate all orders lists
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        // Also invalidate specific order detail if we know the ID
        if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
          queryClient.invalidateQueries({ queryKey: ['order', (payload.new as any).id] })
        }
      })
      // ── Order items ───────────────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        if (payload.new && typeof payload.new === 'object' && 'order_id' in payload.new) {
          queryClient.invalidateQueries({ queryKey: ['order', (payload.new as any).order_id] })
        }
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('⚡ Realtime: Connected — live updates enabled for products, categories, orders & more.')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('⚡ Realtime: Channel error:', err)
        } else if (status === 'TIMED_OUT') {
          console.warn('⚡ Realtime: Connection timed out — updates may be delayed.')
        } else if (status === 'CLOSED') {
          console.log('⚡ Realtime: Connection closed.')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [queryClient, fetchSettings])
}
