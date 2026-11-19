import { useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'

export default function Entrar() {
  const [modo, setModo] = useState<'entrar' | 'criar' | 'esqueci'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [msg, setMsg] = useState<{ tom: 'ok' | 'erro'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true); setMsg(null)
    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
        if (error) throw error
      } else if (modo === 'criar') {
        const { error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: window.location.origin } })
        if (error) throw error
        setMsg({ tom: 'ok', texto: 'Conta criada. Se a confirmação por e-mail estiver ligada, confirme pelo link enviado e depois entre.' })
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/redefinir-senha' })
        if (error) throw error
        setMsg({ tom: 'ok', texto: 'Enviamos um link para redefinir a senha.' })
      }
    } catch (err) {
      const t = (err as Error).message
      setMsg({ tom: 'erro', texto: t.includes('Invalid login') ? 'E-mail ou senha incorretos.' : t })
    } finally { setEnviando(false) }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-chao p-4">
      <form onSubmit={enviar} className="cartao flex w-full max-w-sm flex-col gap-4 p-7">
        <div className="flex flex-col gap-1">
          <span className="font-marca text-xl text-ouro-escuro">Método Mário Santana</span>
          <h1 className="text-2xl font-bold">{modo === 'entrar' ? 'Entrar no painel' : modo === 'criar' ? 'Criar acesso' : 'Recuperar senha'}</h1>
        </div>
        {modo === 'criar' && (
          <label className="flex flex-col gap-1.5"><span className="rotulo">Nome</span>
            <input id="nome" className="campo" value={nome} onChange={e => setNome(e.target.value)} required /></label>
        )}
        <label className="flex flex-col gap-1.5"><span className="rotulo">E-mail</span>
          <input id="email" type="email" className="campo" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
        {modo !== 'esqueci' && (
          <label className="flex flex-col gap-1.5"><span className="rotulo">Senha</span>
            <input id="senha" type="password" className="campo" value={senha} onChange={e => setSenha(e.target.value)} required minLength={6} autoComplete={modo === 'criar' ? 'new-password' : 'current-password'} /></label>
        )}
        {msg && <p className={msg.tom === 'ok' ? 'rounded-lg bg-bom-fundo p-3 text-bom-texto' : 'rounded-lg bg-ruim-fundo p-3 text-ruim-texto'}>{msg.texto}</p>}
        <button className="btn-primario" disabled={enviando}>{enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar acesso' : 'Enviar link'}</button>
        <div className="flex justify-between text-[13px]">
          {modo !== 'entrar' ? <button type="button" className="text-ouro-escuro" onClick={() => setModo('entrar')}>Já tenho acesso</button>
            : <button type="button" className="text-ouro-escuro" onClick={() => setModo('criar')}>Criar acesso</button>}
          {modo === 'entrar' && <button type="button" className="text-cinza" onClick={() => setModo('esqueci')}>Esqueci a senha</button>}
        </div>
      </form>
    </div>
  )
}
