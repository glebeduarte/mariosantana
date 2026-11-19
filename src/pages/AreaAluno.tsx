import { Link, NavLink, Route, Routes, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Aula, Curso, Modulo } from '@/lib/membros'
import { urlIncorporavel } from '@/lib/membros'
import type { EtapaItem, Mentorado } from '@/lib/tipos'
import { Barra, Carregando, Vazio } from '@/components/ui'

/** Área do mentorado e do aluno: tema claro em creme, separado do painel de gestão. */
export default function AreaAluno() {
  const { perfil, papeis, sair } = useAuth()
  const eMentorado = papeis.includes('mentorado')
  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DED2] bg-white px-5 py-4 lg:px-10">
        <Link to="/" className="font-marca text-xl">Método Mário Santana</Link>
        <nav aria-label="Área do aluno" className="flex flex-wrap gap-5">
          {eMentorado && <NavLink to="/" end className={({ isActive }) => isActive ? 'font-semibold' : 'text-ouro-escuro'}>Minha jornada</NavLink>}
          <NavLink to={eMentorado ? '/cursos' : '/'} end className={({ isActive }) => isActive ? 'font-semibold' : 'text-ouro-escuro'}>Cursos</NavLink>
          <NavLink to="/biblioteca" className={({ isActive }) => isActive ? 'font-semibold' : 'text-ouro-escuro'}>Biblioteca</NavLink>
        </nav>
        <div className="flex items-center gap-3"><span className="text-[13px] text-cinza">{perfil?.nome}</span><button className="text-[13px] text-cinza hover:text-tinta" onClick={sair}>Sair</button></div>
      </header>
      <main className="mx-auto flex max-w-[1120px] flex-col gap-8 px-5 py-8 text-[15px] lg:px-10">
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
  const { data: alunoId } = useMeuAluno()
  const { data } = useQuery({
    queryKey: ['meus-cursos', alunoId],
    enabled: alunoId !== undefined,
    queryFn: async () => {
      const [m, c, mo, a, p] = await Promise.all([
        supabase.from('matriculas').select('curso_id'),
        supabase.from('cursos').select('*').order('ordem_vitrine', { nullsFirst: false }),
        supabase.from('modulos').select('id,curso_id'),
        supabase.from('aulas').select('id,modulo_id'),
        supabase.from('progresso_aulas').select('aula_id').eq('concluida', true),
      ])
      const ids = new Set((m.data ?? []).map(x => x.curso_id as string))
      return { cursos: ((c.data ?? []) as Curso[]).filter(x => ids.has(x.id)), modulos: mo.data ?? [], aulas: a.data ?? [], feitas: new Set((p.data ?? []).map(x => x.aula_id as string)) }
    },
  })
  if (!data) return <Carregando />
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-marca text-[34px] font-semibold">Seus cursos</h1>
      {data.cursos.length === 0 ? <Vazio>Você ainda não tem cursos liberados. Se já comprou, fale com a equipe do Dr. Mário.</Vazio> : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.cursos.map(c => {
            const mods = new Set(data.modulos.filter(m => m.curso_id === c.id).map(m => m.id))
            const aulas = data.aulas.filter(a => mods.has(a.modulo_id))
            const pct = aulas.length ? Math.round(aulas.filter(a => data.feitas.has(a.id)).length / aulas.length * 100) : 0
            return (
              <Link key={c.id} to={`/curso/${c.id}`} className="flex flex-col overflow-hidden rounded-xl border border-[#E4DED2] bg-white hover:border-[#C9C1AE]">
                {c.capa_url ? <img src={c.capa_url} alt="" className="aspect-video w-full object-cover" /> : <div className="aspect-video bg-[#F2EDE1]" />}
                <div className="flex flex-col gap-2 p-4">
                  <b className="text-[17px]">{c.titulo}</b>
                  <div className="flex items-center gap-2"><Barra pct={pct} /><span className="text-[13px] text-cinza">{pct}%</span></div>
                  <span className="text-[13px] text-cinza">{aulas.length} aulas</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

function CursoAluno() {
  const { id, aulaId } = useParams()
  const qc = useQueryClient()
  const { data: alunoId } = useMeuAluno()
  const { data } = useQuery({
    queryKey: ['curso-aluno', id],
    queryFn: async () => {
      const [c, m] = await Promise.all([supabase.from('cursos').select('*').eq('id', id!).single(), supabase.from('modulos').select('*').eq('curso_id', id!).order('ordem')])
      const mods = (m.data ?? []) as Modulo[]
      const a = mods.length ? await supabase.from('aulas').select('*').in('modulo_id', mods.map(x => x.id)).order('ordem') : { data: [] }
      const p = await supabase.from('progresso_aulas').select('aula_id').eq('concluida', true)
      return { curso: c.data as Curso, modulos: mods, aulas: (a.data ?? []) as Aula[], feitas: new Set((p.data ?? []).map(x => x.aula_id as string)) }
    },
  })
  if (!data) return <Carregando />
  const ordenadas = data.modulos.flatMap(m => data.aulas.filter(a => a.modulo_id === m.id).sort((x, y) => x.ordem - y.ordem))
  const atual = ordenadas.find(a => a.id === aulaId) ?? ordenadas.find(a => !data.feitas.has(a.id)) ?? ordenadas[0]
  const idx = atual ? ordenadas.indexOf(atual) : -1
  const embed = atual?.video_tipo === 'pdf' ? (atual.pdf_url ? atual.pdf_url : null) : urlIncorporavel(atual?.video_url ?? null)

  async function concluir() {
    if (!atual || !alunoId) return
    await supabase.from('progresso_aulas').upsert({ aluno_id: alunoId, aula_id: atual.id, concluida: true, atualizado_em: new Date().toISOString() }, { onConflict: 'aluno_id,aula_id' })
    qc.invalidateQueries({ queryKey: ['curso-aluno', id] }); qc.invalidateQueries({ queryKey: ['meus-cursos'] })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <section className="flex min-w-0 flex-col gap-4">
        <Link to="/cursos" className="text-[13px] text-ouro-escuro">{data.curso.titulo}</Link>
        {atual ? (
          <>
            <h1 className="font-marca text-[28px] font-semibold leading-tight">{atual.titulo}</h1>
            {embed ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe src={embed} title={atual.titulo} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
              </div>
            ) : atual.video_url ? <a href={atual.video_url} target="_blank" rel="noreferrer" className="btn-primario self-start">Abrir conteúdo</a> : null}
            {atual.descricao && <p className="max-w-[65ch] whitespace-pre-wrap leading-relaxed text-[#4A463F]">{atual.descricao}</p>}
            <div className="flex flex-wrap gap-2">
              {data.feitas.has(atual.id) ? <span className="btn bg-bom-fundo text-bom-texto">Aula concluída</span> : <button className="btn-primario" onClick={concluir}>Marcar como concluída</button>}
              {idx > 0 && <Link to={`/curso/${id}/aula/${ordenadas[idx - 1].id}`} className="btn-secundario">Anterior</Link>}
              {idx < ordenadas.length - 1 && <Link to={`/curso/${id}/aula/${ordenadas[idx + 1].id}`} className="btn-secundario">Próxima aula</Link>}
            </div>
          </>
        ) : <Vazio>Este curso ainda não tem aulas.</Vazio>}
      </section>
      <aside className="flex flex-col gap-4">
        {data.modulos.map(m => (
          <div key={m.id} className="flex flex-col">
            <b className="pb-1">{m.titulo}</b>
            {data.aulas.filter(a => a.modulo_id === m.id).sort((x, y) => x.ordem - y.ordem).map(a => (
              <Link key={a.id} to={`/curso/${id}/aula/${a.id}`} className={`flex items-center gap-2 border-t border-[#E4DED2] py-2 text-[14px] ${a.id === atual?.id ? 'font-semibold' : ''}`}>
                <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded text-[11px] ${data.feitas.has(a.id) ? 'bg-[#2F8A55] text-white' : 'border-[1.5px] border-[#C9C6BD]'}`}>{data.feitas.has(a.id) ? '✓' : ''}</span>
                <span className="min-w-0 flex-1">{a.titulo}</span>
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </div>
  )
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
