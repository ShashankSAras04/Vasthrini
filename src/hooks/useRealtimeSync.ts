import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useSettingsStore } from '../store/useSettingsStore'

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    const channel = supabase
      .channel('public-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          queryClient.invalidateQueries({ queryKey: ['product'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_sizes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] })
          queryClient.invalidateQueries({ queryKey: ['product'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['categories'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['site_settings'] })
          fetchSettings().catch(console.error)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banners' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['banners'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coupons' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['coupons'] })
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('⚡ Supabase Realtime: Subscribed successfully to database changes.')
        } else if (status === 'CLOSED') {
          console.log('⚡ Supabase Realtime: Connection closed.')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('⚡ Supabase Realtime: Channel subscription error:', err)
        } else if (status === 'TIMED_OUT') {
          console.warn('⚡ Supabase Realtime: Subscription timed out.')
        }
      })

    return () => {
      supabase.removeChannel(channel).catch(console.error)
    }
  }, [queryClient, fetchSettings])
}
