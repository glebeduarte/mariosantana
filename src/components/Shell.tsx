import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { useFrentes } from '@/lib/dados'
import { supabase } from '@/lib/supabase'
import { hojeISO } from '@/lib/util'
import { Ponto } from './ui'

const GRUPOS = [
  { nome: 'Operação', itens: [
    { to: '/', nome: 'Início', fim: true },
    { to: '/tarefas', nome: 'Tarefas', conta: 'atrasadas' as const },
    { to: '/agenda', nome: 'Agenda' },
    { to: '/reunioes', nome: 'Reuniões' },
    { to: '/documentos', nome: 'Documentos' },
  ] },
  { nome: 'Mentoria', itens: [{ to: '/mentorados', nome: 'Mentorados' }] },
  { nome: 'Área de membros', itens: [{ to: '/membros', nome: 'Cursos e alunos' }] },
  { nome: 'Comercial', itens: [
    { to: '/leads', nome: 'Leads', conta: 'leads' as const },
    { to: '/financeiro', nome: 'Financeiro', conta: 'parcelas' as const },
  ] },
]

function useContagens() {
  return useQuery({
    queryKey: ['contagens-menu'],
    queryFn: async () => {
      const hoje = hojeISO()
      const [t, l, p, a] = await Promise.all([
        supabase.from('tarefas').select('id', { count: 'exact', head: true }).neq('status', 'concluida').lt('prazo', hoje),
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('etapa', 'novo'),
        supabase.from('parcelas').select('id', { count: 'exact', head: true }).eq('status', 'pendente').lt('vencimento', hoje),
        supabase.from('tarefas').select('frente_id').neq('status', 'concluida'),
      ])
      const porFrente: Record<string, number> = {}
      for (const r of (a.data ?? []) as { frente_id: string | null }[]) if (r.frente_id) porFrente[r.frente_id] = (porFrente[r.frente_id] ?? 0) + 1
      return { atrasadas: t.count ?? 0, leads: l.count ?? 0, parcelas: p.count ?? 0, porFrente }
    },
    refetchInterval: 60_000,
  })
}

export default function Shell() {
  const { perfil, papeis, sair } = useAuth()
  const { data: frentes } = useFrentes()
  const { data: c } = useContagens()
  const [aberto, setAberto] = useState(false)

  const menu = (
    <nav aria-label="Menu principal" className="flex h-full flex-col gap-5 px-3 py-5">
      <Link to="/" className="flex items-center gap-2.5 px-2" onClick={() => setAberto(false)}>
        <span aria-hidden className="grid h-[34px] w-[34px] place-items-center rounded-full border-[1.5px] border-ouro font-marca text-sm text-ouro-escuro">MS</span>
        <span className="flex flex-col"><b>Método Mário Santana</b><span className="text-xs text-cinza">Painel do negócio</span></span>
      </Link>
      {GRUPOS.map(g => (
        <div key={g.nome} className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1.5 text-xs text-cinza">{g.nome}</span>
          {g.itens.map(it => {
            const n = 'conta' in it && it.conta && c ? c[it.conta] : 0
            return (
              <NavLink key={it.to} to={it.to} end={'fim' in it} onClick={() => setAberto(false)}
                className={({ isActive }) => `flex items-center gap-2 rounded-lg px-2.5 py-2 ${isActive ? 'bg-[#E3E1DA] font-semibold' : 'hover:bg-[#E9E7E1]'}`}>
                <span className="flex-1">{it.nome}</span>
                {n > 0 && <span className="rounded-full bg-ruim-fundo px-1.5 text-xs font-semibold text-ruim-texto">{n}</span>}
              </NavLink>
            )
          })}
        </div>
      ))}
      <div className="flex flex-col gap-0.5">
        <span className="px-2.5 pb-1.5 text-xs text-cinza">Frentes</span>
        {frentes?.map(f => (
          <NavLink key={f.id} to={`/tarefas?frente=${f.slug}`} onClick={() => setAberto(false)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 hover:bg-[#E9E7E1]">
            <Ponto cor={f.cor} /><span className="flex-1">{f.nome}</span><span className="text-xs text-cinza">{c?.porFrente[f.id] ?? 0}</span>
          </NavLink>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2.5 rounded-xl bg-white p-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-ouro-claro text-xs font-bold text-ouro-escuro">{(perfil?.nome ?? '?').slice(0, 2).toUpperCase()}</span>
        <div className="flex min-w-0 flex-1 flex-col"><span className="truncate font-semibold">{perfil?.nome}</span><span className="text-xs text-cinza">{papeis.join(', ') || 'sem papel'}</span></div>
        <button onClick={sair} className="text-xs text-cinza hover:text-tinta">Sair</button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 overflow-y-auto lg:block">{menu}</aside>
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setAberto(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside className="absolute inset-y-0 left-0 w-[272px] overflow-y-auto bg-chao" onClick={e => e.stopPropagation()}>{menu}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 px-4 py-3 lg:hidden">
          <button className="btn-secundario h-9 px-3" onClick={() => setAberto(true)} aria-label="Abrir menu">Menu</button>
          <span className="font-semibold">Método Mário Santana</span>
        </div>
        <main className="m-2 flex min-w-0 flex-1 flex-col gap-6 rounded-[14px] border border-linha bg-white p-5 lg:ml-0 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
