import { createClient } from '@supabase/supabase-js'

// A chave publicável é pública por natureza (o acesso é controlado pelas políticas RLS do banco).
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://muzencwphngtkrlrwjih.supabase.co'
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_y9f0PC0ZjLU4y5BibwAGNg_zN7RTok5'

export const supabase = createClient(url, chave, {
  auth: { persistSession: true, autoRefreshToken: true },
})
