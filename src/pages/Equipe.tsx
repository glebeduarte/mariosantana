import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Papel, Perfil } from '@/lib/tipos'
import { dataCurta } from '@/lib/util'
import { Avatar, Cabecalho, Carregando, Pilula, Vazio } from '@/components/ui'

const PAPEIS: { id: Papel; nome: string; desc: string }[] = [
  { id: 'admin', nome: 'Admin', desc: 'tudo, inclusive equipe e configurações' },
  { id: 'mentor', nome: 'Mentor', desc: 'mentoria, jornadas e conteúdos' },
  { id: 'equipe', nome: 'Equipe', desc: 'operação do dia a dia' },
  { id: 'mentorado', nome: 'Mentorado', desc: 'vê a própria jornada' },
  { id: 'aluno', nome: 'Aluno', desc: 'vê os cursos em que está matriculado' },
]

export default function Equipe() {
  const qc = useQueryClient()
  const { papeis: meus } = useAuth()
  const eAdmin = meus.includes('admin') || meus.includes('mentor')
  const [msg, setMsg] = useState<string | null>(null)
  const { data } = useQuery({
    queryKey: ['equipe'],
    queryFn: async () => {
      const [p, r, c] = await Promise.all([
        supabase.from('perfis').select('id,nome,email,cor').order('nome'),
        supabase.from('papeis_usuario').select('user_id,papel'),
        supabase.from('convites').select('*').is('aceito_em', null).order('criado_em', { ascending: false }),
      ])
      return { perfis: (p.data ?? []) as Perfil[], papeis: (r.data ?? []) as { user_id: string; papel: Papel }[], convites: (c.data ?? []) as { id: string; email: string; papel: Papel; criado_em: string }[] }
    },
  })
  const recarregar = () => qc.invalidateQueries({ queryKey: ['equipe'] })

  async function convidar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const email = String(f.get('email')).toLowerCase().trim(), papel = String(f.get('papel')) as Papel
    const existente = data?.perfis.find(p => p.email?.toLowerCase() === email)
    const { error } = existente
      ? await supabase.from('papeis_usuario').insert({ user_id: existente.id, papel })
      : await supabase.from('convites').insert({ email, papel })
    setMsg(error ? `Não foi possível salvar: ${error.message}` : existente ? `Papel ${papel} aplicado a ${existente.nome}.` : `Convite registrado. Quando ${email} criar acesso, o papel ${papel} é aplicado.`)
    ;(e.target as HTMLFormElement).reset(); recarregar()
  }
  async function tirar(userId: string, papel: Papel) { await supabase.from('papeis_usuario').delete().eq('user_id', userId).eq('papel', papel); recarregar() }
  async function cancelar(id: string) { await supabase.from('convites').delete().eq('id', id); recarregar() }

  if (!data) return <Carregando />
  return (
    <>
      <Cabecalho titulo="Equipe e acessos" frase="Quem usa o painel e com qual papel. Para dar acesso, registre o e-mail e o papel; ao criar a conta, a pessoa já entra com ele." />
      {eAdmin && (
        <form onSubmit={convidar} className="cartao grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-[1fr_220px_auto]">
          <label className="flex flex-col gap-1"><span className="rotulo">E-mail</span><input id="cv-email" name="email" type="email" className="campo" required /></label>
          <label className="flex flex-col gap-1"><span className="rotulo">Papel</span>
            <select id="cv-papel" name="papel" className="campo" defaultValue="equipe">{PAPEIS.map(p => <option key={p.id} value={p.id}>{p.nome}: {p.desc}</option>)}</select></label>
          <button className="btn-primario">Dar acesso</button>
          {msg && <p className="text-[13px] text-[#4A4943] sm:col-span-3">{msg}</p>}
        </form>
      )}
      <section className="flex flex-col">
        <h2 className="pb-2 text-[17px] font-bold">Pessoas com acesso</h2>
        {data.perfis.map(p => {
          const ps = data.papeis.filter(r => r.user_id === p.id)
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 border-t border-[#F0EEE9] py-2.5">
              <Avatar id={p.id} nome={p.nome} tamanho={32} />
              <div className="flex min-w-[200px] flex-1 flex-col"><b>{p.nome}</b><span className="text-xs text-cinza">{p.email}</span></div>
              <div className="flex flex-wrap gap-1.5">
                {ps.length === 0 ? <Pilula tom="alerta">Sem papel</Pilula> : ps.map(r => (
                  <span key={r.papel} className="inline-flex items-center gap-1 rounded-full bg-[#EEECE6] px-2.5 py-0.5 text-xs font-semibold">
                    {PAPEIS.find(x => x.id === r.papel)?.nome}
                    {eAdmin && <button aria-label={`Tirar papel ${r.papel}`} className="text-cinza hover:text-ruim" onClick={() => tirar(p.id, r.papel)}>×</button>}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </section>
      <section className="flex flex-col">
        <h2 className="pb-2 text-[17px] font-bold">Convites aguardando cadastro</h2>
        {data.convites.length === 0 ? <Vazio>Nenhum convite pendente.</Vazio> : data.convites.map(c => (
          <div key={c.id} className="flex items-center gap-3 border-t border-[#F0EEE9] py-2.5">
            <span className="flex-1">{c.email}</span><Pilula>{PAPEIS.find(x => x.id === c.papel)?.nome}</Pilula>
            <span className="text-xs text-cinza">{dataCurta(c.criado_em)}</span>
            {eAdmin && <button className="text-[13px] text-ruim-texto" onClick={() => cancelar(c.id)}>Cancelar</button>}
          </div>
        ))}
      </section>
    </>
  )
}
