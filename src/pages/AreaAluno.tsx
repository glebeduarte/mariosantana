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
  const link = ({ isActive }: { isActive: boolean }) => `transition ${isActive ? 'font-semibold text-white' : 'text-white/60 hover:text-white'}`
  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#F3EEE3]">
      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 bg-gradient-to-b from-[#0E0D0B] via-[#0E0D0B]/85 to-transparent px-5 lg:px-12">
        <Link to="/" className="font-marca text-[22px] font-semibold text-white">Método <span className="texto-ouro">Mário Santana</span></Link>
        <nav aria-label="Área de membros" className="flex items-center gap-6 text-[14px]">
          <NavLink to={eMentorado ? '/cursos' : '/'} end className={link}>Cursos</NavLink>
          {eMentorado && <NavLink to="/" end className={link}>Minha jornada</NavLink>}
          <span className="hidden items-center gap-2 text-white/70 sm:flex"><span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#E8CC8C] to-[#9A7A30] text-xs font-bold text-[#1F1D18]">{(perfil?.nome ?? '?').slice(0, 2).toUpperCase()}</span></span>
          <button className="text-white/60 hover:text-white" onClick={sair}>Sair</button>
        </nav>
      </header>
      <main>
        <Routes>
          <Route index element={eMentorado ? <Painel><Jornada /></Painel> : <MeusCursos />} />
          <Route path="cursos" element={<MeusCursos />} />
          <Route path="curso/:id" element={<CursoAluno />} />
          <Route path="curso/:id/aula/:aulaId" element={<CursoAluno />} />
          <Route path="*" element={eMentorado ? <Painel><Jornada /></Painel> : <MeusCursos />} />
        </Routes>
      </main>
    </div>
  )
}

/** Moldura clara para a jornada sobre o fundo escuro da área de membros. */
function Painel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-16 pt-4 lg:px-12">
      <div className="entrar mx-auto flex max-w-[1240px] flex-col gap-8 rounded-3xl bg-[#FAF8F3] p-6 text-[15px] text-tinta shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)] ring-1 ring-[#C9A453]/30 sm:p-10">{children}</div>
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
