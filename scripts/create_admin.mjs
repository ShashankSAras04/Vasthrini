import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://lgbfzxjrqmnjawqnnaej.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxnYmZ6eGpycW1uamF3cW5uYWVqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE4Mjc1NCwiZXhwIjoyMDk2NzU4NzU0fQ.hGMEOIicYDKSlG0sjCMFXMu3gR7vDPpNYRFq7SvC8Wc'

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin@12345'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function main() {
  console.log('🔧 Creating admin user in Supabase...\n')

  // Step 1: Create the auth user (email pre-confirmed, no verification needed)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,  // skip email verification
    user_metadata: { first_name: 'Admin', last_name: 'Vastrini' }
  })

  if (authError) {
    if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
      console.log('ℹ️  Auth user already exists — fetching existing user...')
      // List users and find by email
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
      if (listError) throw listError
      const existing = listData.users.find(u => u.email === ADMIN_EMAIL)
      if (!existing) throw new Error('Could not find existing user')
      
      // Update their password
      const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, {
        password: ADMIN_PASSWORD,
        email_confirm: true
      })
      if (updateErr) throw updateErr
      console.log(`✅ Updated password for existing user: ${existing.id}`)
      
      // Upsert profile
      await upsertProfile(existing.id)
    } else {
      throw authError
    }
  } else {
    const userId = authData.user.id
    console.log(`✅ Auth user created: ${userId}`)
    await upsertProfile(userId)
  }

  console.log('\n🎉 Done! You can now log in at /auth with:')
  console.log(`   Email: ${ADMIN_EMAIL}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
  console.log('   → You will be directed to the Admin Panel automatically.')
}

async function upsertProfile(userId) {
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: ADMIN_EMAIL,
      first_name: 'Admin',
      last_name: 'Vastrini',
      role: 'admin',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('⚠️  Profile upsert error:', profileError.message)
    console.log('   Trying insert instead...')
    const { error: insertErr } = await supabase.from('profiles').insert({
      id: userId,
      email: ADMIN_EMAIL,
      first_name: 'Admin',
      last_name: 'Vastrini',
      role: 'admin',
    })
    if (insertErr) throw insertErr
  }
  console.log('✅ Profile set with role=admin in Supabase database')
}

main().catch(err => {
  console.error('❌ Error:', err.message || err)
  process.exit(1)
})
