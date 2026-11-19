import { useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { useFrentes } from '@/lib/dados'
import { supabase } from '@/lib/supabase'
import { hojeISO } from '@/lib/util'
import { Ponto } from './ui'
import Icone from './Icone'

type Conta = 'atrasadas' | 'leads' | 'parcelas'
interface Item { to: string; nome: string; icone: string; fim?: boolean; conta?: Conta }

const GRUPOS: { nome: string; itens: Item[] }[] = [
  { nome: 'Operação', itens: [
    { to: '/', nome: 'Início', icone: 'inicio', fim: true },
    { to: '/tarefas', nome: 'Tarefas', icone: 'tarefas', conta: 'atrasadas' },
    { to: '/agenda', nome: 'Agenda', icone: 'agenda' },
    { to: '/reunioes', nome: 'Reuniões', icone: 'reunioes' },
    { to: '/documentos', nome: 'Documentos', icone: 'documentos' },
  ] },
  { nome: 'Mentoria', itens: [
    { to: '/mentorados', nome: 'Mentorados', icone: 'mentorados' },
    { to: '/membros', nome: 'Área de membros', icone: 'membros' },
  ] },
  { nome: 'Comercial', itens: [
    { to: '/leads', nome: 'Leads', icone: 'leads', conta: 'leads' },
    { to: '/financeiro', nome: 'Financeiro', icone: 'financeiro', conta: 'parcelas' },
  ] },
]

const TITULOS: Record<string, string> = {
  '': 'Início', tarefas: 'Tarefas', agenda: 'Agenda', reunioes: 'Reuniões', documentos: 'Documentos', mentorados: 'Mentorados',
  membros: 'Área de membros', leads: 'Leads', financeiro: 'Financeiro', equipe: 'Equipe e acessos',
}

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
  const loc = useLocation()
  const secao = loc.pathname.split('/')[1] ?? ''
  const eAdmin = papeis.includes('admin') || papeis.includes('mentor')
  const fechar = () => setAberto(false)

  const menu = (
    <nav aria-label="Menu principal" className="flex h-full flex-col gap-6 px-3 py-5">
      <Link to="/" onClick={fechar} className="flex items-center gap-3 px-2">
        <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-tinta font-marca text-[15px] text-[#E8CC8C]">MS</span>
        <span className="flex flex-col leading-tight"><b className="text-[15px]">Mário Santana</b><span className="text-xs text-cinza">Painel do negócio</span></span>
      </Link>

      {GRUPOS.map(g => (
        <div key={g.nome} className="flex flex-col gap-0.5">
          <span className="px-3 pb-1.5 text-xs font-medium text-[#8A887F]">{g.nome}</span>
          {g.itens.map(it => {
            const n = it.conta && c ? c[it.conta] : 0
            return (
              <NavLink key={it.to} to={it.to} end={it.fim} onClick={fechar}
                className={({ isActive }) => `group flex items-center gap-3 rounded-xl px-3 py-2 transition ${isActive ? 'bg-white font-semibold text-tinta shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[#4A4943] hover:bg-[#E9E7E1]'}`}>
                {({ isActive }) => (<>
                  <Icone nome={it.icone} className={isActive ? 'text-ouro-escuro' : 'text-[#8A887F] group-hover:text-tinta'} />
                  <span className="flex-1">{it.nome}</span>
                  {n > 0 && <span className="num rounded-full bg-ruim px-1.5 text-[11px] font-bold leading-5 text-white">{n}</span>}
                </>)}
              </NavLink>
            )
          })}
        </div>
      ))}

      <div className="flex flex-col gap-0.5">
        <span className="px-3 pb-1.5 text-xs font-medium text-[#8A887F]">Frentes</span>
        {frentes?.map(f => (
          <NavLink key={f.id} to={`/tarefas?frente=${f.slug}`} onClick={fechar} className="flex items-center gap-3 rounded-xl px-3 py-1.5 text-[#4A4943] hover:bg-[#E9E7E1]">
            <Ponto cor={f.cor} /><span className="flex-1">{f.nome}</span><span className="num text-xs text-cinza">{c?.porFrente[f.id] ?? 0}</span>
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1">
        {eAdmin && (
          <NavLink to="/equipe" onClick={fechar} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2 ${isActive ? 'bg-white font-semibold' : 'text-[#4A4943] hover:bg-[#E9E7E1]'}`}>
            <Icone nome="equipe" className="text-[#8A887F]" /><span>Equipe e acessos</span>
          </NavLink>
        )}
        <div className="flex items-center gap-2.5 rounded-xl bg-white p-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ouro-claro text-xs font-bold text-ouro-escuro">{(perfil?.nome ?? '?').slice(0, 2).toUpperCase()}</span>
          <div className="flex min-w-0 flex-1 flex-col"><span className="truncate font-semibold">{perfil?.nome}</span><span className="truncate text-xs capitalize text-cinza">{papeis.join(', ') || 'sem papel'}</span></div>
          <button onClick={sair} aria-label="Sair" className="grid h-8 w-8 place-items-center rounded-lg text-cinza hover:bg-bandeja hover:text-tinta"><Icone nome="sair" tamanho={16} /></button>
        </div>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 overflow-y-auto lg:block">{menu}</aside>
      {aberto && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={fechar}>
          <div className="absolute inset-0 bg-black/30" />
          <aside className="absolute inset-y-0 left-0 w-[280px] overflow-y-auto bg-chao" onClick={e => e.stopPropagation()}>{menu}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:py-2 lg:pr-2">
        <div className="flex min-h-full flex-1 flex-col bg-white lg:rounded-[18px] lg:border lg:border-linha">
          <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-linha bg-white/95 px-4 backdrop-blur lg:rounded-t-[18px] lg:px-8">
            <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-bandeja lg:hidden" onClick={() => setAberto(true)} aria-label="Abrir menu"><Icone nome="menu" /></button>
            <span className="text-[13px] text-cinza">Método Mário Santana</span>
            <Icone nome="seta" tamanho={14} className="text-[#C9C6BD]" />
            <span className="text-[13px] font-semibold">{TITULOS[secao] ?? 'Painel'}</span>
            <div className="ml-auto flex items-center gap-2">
              <Link to="/tarefas" className="btn-primario h-9 px-3 text-[13px]"><Icone nome="mais" tamanho={16} /><span className="hidden sm:inline">Nova tarefa</span></Link>
            </div>
          </div>
          <main className="flex min-w-0 flex-1 flex-col gap-7 p-4 sm:p-6 lg:px-8 lg:py-7">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
