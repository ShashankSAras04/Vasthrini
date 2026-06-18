// =============================================================
// set-customer-active/index.ts
// Vasthrini — Phase 3: Customer deactivation Edge Function
//
// Deploy: supabase functions deploy set-customer-active
//
// This function holds the SERVICE_ROLE key and is the only way
// to truly ban/unban a user from GoTrue (Layer 3 deactivation).
// Called by the admin Users page when toggling active/inactive.
//
// Caller (admin SPA):
//   await supabase.functions.invoke('set-customer-active', {
//     body: { userId: '...', active: false }
//   })
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Verify caller is an admin ──────────────────────────────
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser()
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check caller is admin via profiles table
    const { data: callerProfile } = await anonClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Parse body ─────────────────────────────────────────────
    const { userId, active } = await req.json() as { userId: string; active: boolean }

    if (!userId || typeof active !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Missing userId or active' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ── Use service_role for admin operations ──────────────────
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Layer 1: update profiles.is_active
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ is_active: active })
      .eq('id', userId)

    if (profileError) {
      throw new Error(`Profile update failed: ${profileError.message}`)
    }

    // Layer 3: ban/unban in GoTrue (actually blocks token issuance)
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: active ? 'none' : '876000h'  // ~100 years = effectively permanent
    })

    if (banError) {
      throw new Error(`Auth ban failed: ${banError.message}`)
    }

    return new Response(
      JSON.stringify({ ok: true, userId, active }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
