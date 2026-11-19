import { Link, NavLink, Route, Routes } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import Vitrine, { CursoVitrine } from '@/components/Vitrine'
import type { EtapaItem, Mentorado } from '@/lib/tipos'
import { Barra, Carregando, Vazio } from '@/components/ui'

/** Área do mentorado e do aluno: tema claro em creme, separado do painel de gestão. */
export default function AreaAluno() {
  const { perfil, papeis, sair } = useAuth()
  const eMentorado = papeis.includes('mentorado')
  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DED2] bg-white/85 px-5 py-4 backdrop-blur lg:px-10">
        <Link to="/" className="font-marca text-xl">Método Mário Santana</Link>
        <nav aria-label="Área do aluno" className="flex flex-wrap gap-5">
          {eMentorado && <NavLink to="/" end className={({ isActive }) => isActive ? 'font-semibold' : 'text-ouro-escuro'}>Minha jornada</NavLink>}
          <NavLink to={eMentorado ? '/cursos' : '/'} end className={({ isActive }) => isActive ? 'font-semibold' : 'text-ouro-escuro'}>Cursos</NavLink>
          <NavLink to="/biblioteca" className={({ isActive }) => isActive ? 'font-semibold' : 'text-ouro-escuro'}>Biblioteca</NavLink>
        </nav>
        <div className="flex items-center gap-3"><span className="text-[13px] text-cinza">{perfil?.nome}</span><button className="text-[13px] text-cinza hover:text-tinta" onClick={sair}>Sair</button></div>
      </header>
      <main className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 py-8 text-[15px] lg:px-10">
        <Routes>
          <Route index element={eMentorado ? <Jornada /> : <MeusCursos />} />
          <Route path="cursos" element={<MeusCursos />} />
          <Route path="curso/:id" element={<CursoAluno />} />
          <Route path="curso/:id/aula/:aulaId" element={<CursoAluno />} />
          <Route path="biblioteca" element={<BibliotecaAluno />} />
          <Route path="*" element={eMentorado ? <Jornada /> : <MeusCursos />} />
        </Routes>
      </main>
    </div>
  )
}

function useMeuAluno() {
  return useQuery({ queryKey: ['meu-aluno'], queryFn: async () => (await supabase.from('alunos').select('id').maybeSingle()).data?.id as string | undefined })
}

function MeusCursos() {
  const { perfil } = useAuth()
  const { data: alunoId, isLoading } = useMeuAluno()
  if (isLoading) return <Carregando />
  return <Vitrine alunoId={alunoId} base="" nome={perfil?.nome} />
}

function CursoAluno() {
  const { data: alunoId } = useMeuAluno()
  return <CursoVitrine alunoId={alunoId} base="" />
}

function Jornada() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['minha-jornada'],
    queryFn: async () => {
      const m = await supabase.from('mentorados').select('*').maybeSingle()
      const [e, i, p] = await Promise.all([
        supabase.from('etapas').select('*').order('ordem'),
        supabase.from('etapa_itens').select('*').eq('ativo', true).order('ordem'),
        supabase.from('mentorado_itens').select('item_id'),
      ])
      return { m: m.data as Mentorado | null, etapas: (e.data ?? []) as { id: string; ordem: number; nome: string; descricao: string | null }[],
        itens: (i.data ?? []) as (EtapaItem & { mentorado_marca: boolean })[], feitos: new Set((p.data ?? []).map(x => x.item_id as string)) }
    },
  })
  if (!data) return <Carregando />
  if (!data.m) return <MeusCursos />
  const atual = data.etapas.find(e => e.id === data.m!.etapa_id) ?? data.etapas[0]
  const itens = data.itens.filter(i => i.etapa_id === atual.id)
  const feitos = itens.filter(i => data.feitos.has(i.id)).length
  const pct = itens.length ? Math.round(feitos / itens.length * 100) : 0
  async function marcar(item: EtapaItem) {
    if (data!.feitos.has(item.id)) return
    await supabase.from('mentorado_itens').insert({ mentorado_id: data!.m!.id, item_id: item.id })
    qc.invalidateQueries({ queryKey: ['minha-jornada'] })
  }
  const GRUPOS: [string, string][] = [['aula', 'Aulas'], ['workbook', 'Ferramentas'], ['sessao', 'Sessões'], ['marco', 'Marcos da etapa']]

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <span className="text-[13px] text-cinza">Etapa {atual.ordem} de {data.etapas.length - 1}</span>
        <h1 className="font-marca text-[42px] font-semibold leading-tight">{atual.nome}</h1>
        {atual.descricao && <p className="max-w-[62ch] text-[#4A463F]">{atual.descricao}</p>}
        <div className="flex max-w-[520px] items-center gap-3"><Barra pct={pct} /><span className="text-[13px] text-cinza">{feitos} de {itens.length}</span></div>
      </section>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col gap-5">
          {GRUPOS.map(([tipo, nome]) => {
            const g = itens.filter(i => i.tipo === tipo)
            if (!g.length) return null
            return (
              <div key={tipo} className="flex flex-col">
                <h2 className="pb-1 font-marca text-[20px] font-semibold">{nome}</h2>
                {g.map(i => {
                  const f = data.feitos.has(i.id)
                  return (
                    <label key={i.id} className="flex items-center gap-3 border-t border-[#E4DED2] py-2.5">
                      <input type="checkbox" id={`j-${i.id}`} checked={f} disabled={f || !i.mentorado_marca} onChange={() => marcar(i)} className="h-4 w-4 accent-[#2F8A55]" />
                      <span className={f ? 'text-cinza line-through' : ''}>{i.titulo}</span>
                      {!i.mentorado_marca && !f && <span className="ml-auto text-xs text-cinza">o mentor marca</span>}
                    </label>
                  )
                })}
              </div>
            )
          })}
        </section>
        <aside className="flex flex-col">
          <h2 className="pb-1 font-marca text-[20px] font-semibold">As etapas do método</h2>
          {data.etapas.map(e => (
            <div key={e.id} className={`flex gap-3 border-t border-[#E4DED2] py-3 ${e.id === atual.id ? 'font-semibold' : 'text-cinza'}`}>
              <span className="w-5">{e.ordem}</span><span>{e.nome}</span>{e.id === atual.id && <span className="ml-auto text-[13px] text-ouro-escuro">em andamento</span>}
            </div>
          ))}
          <Link to="/cursos" className="btn-primario mt-4 self-start">Ir para os cursos</Link>
        </aside>
      </div>
    </>
  )
}

function BibliotecaAluno() {
  const { data } = useQuery({
    queryKey: ['biblioteca-aluno'],
    queryFn: async () => (await supabase.from('biblioteca').select('*').eq('publicado', true).order('ordem')).data as { id: string; titulo: string; autor: string | null; descricao: string | null; capa_url: string | null; download_url: string | null }[],
  })
  if (!data) return <Carregando />
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-marca text-[34px] font-semibold">Biblioteca</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {data.map(l => (
          <div key={l.id} className="flex flex-col gap-2">
            {l.capa_url ? <img src={l.capa_url} alt="" className="aspect-[2/3] w-full rounded-lg object-cover" /> : <div className="aspect-[2/3] rounded-lg bg-[#F2EDE1]" />}
            <b className="leading-snug">{l.titulo}</b>
            {l.autor && <span className="text-[13px] text-cinza">{l.autor}</span>}
            {l.download_url && <a href={l.download_url} target="_blank" rel="noreferrer" className="text-[13px] text-ouro-escuro">Ver resumo</a>}
          </div>
        ))}
      </div>
    </section>
  )
}
