import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Papel, Perfil } from './tipos'

interface Ctx {
  sessao: Session | null
  perfil: Perfil | null
  papeis: Papel[]
  carregando: boolean
  eGestao: boolean
  sair: () => Promise<void>
}

const AuthCtx = createContext<Ctx>({ sessao: null, perfil: null, papeis: [], carregando: true, eGestao: false, sair: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [papeis, setPapeis] = useState<Papel[]>([])
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSessao(data.session); if (!data.session) setCarregando(false) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSessao(s); if (!s) { setPerfil(null); setPapeis([]); setCarregando(false) } })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!sessao) return
    const uid = sessao.user.id
    setCarregando(true)
    Promise.all([
      supabase.from('perfis').select('id,nome,email,cor').eq('id', uid).maybeSingle(),
      supabase.from('papeis_usuario').select('papel').eq('user_id', uid),
    ]).then(([p, r]) => {
      setPerfil(p.data as Perfil | null)
      setPapeis(((r.data ?? []) as { papel: Papel }[]).map(x => x.papel))
      setCarregando(false)
    })
  }, [sessao])

  const eGestao = papeis.some(p => p === 'admin' || p === 'mentor' || p === 'equipe')
  return (
    <AuthCtx.Provider value={{ sessao, perfil, papeis, carregando, eGestao, sair: async () => { await supabase.auth.signOut() } }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
