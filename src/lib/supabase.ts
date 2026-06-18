import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false
  if (url === 'undefined' || url === 'null' || url.trim() === '') return false
  return url.startsWith('http://') || url.startsWith('https://')
}

const isValidKey = (key: string | undefined): boolean => {
  if (!key) return false
  return key !== 'undefined' && key !== 'null' && key.trim() !== ''
}

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey)

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })



