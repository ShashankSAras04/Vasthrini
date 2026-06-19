import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface SettingsState {
  settings: any | null
  loading: boolean
  fetchSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: false,
  fetchSettings: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (error) throw error
      set({ settings: data })
    } catch (err) {
      console.error('Error fetching site settings:', err)
    } finally {
      set({ loading: false })
    }
  }
}))
