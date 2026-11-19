import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Aula, Curso, Modulo } from '@/lib/membros'
import { urlIncorporavel } from '@/lib/membros'
import Icone from './Icone'

/*
 * Vitrine da área de membros, em tema escuro com detalhes dourados.
 * Serve ao aluno logado e à prévia do painel: `alunoId` define de quem são as matrículas e o progresso;
 * `base` é o prefixo dos links.
 */

export function useVitrine(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['vitrine', alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      const [c, m, mo, a, p, b] = await Promise.all([
        supabase.from('cursos').select('*').eq('publicado', true).order('ordem_vitrine', { nullsFirst: false }),
        supabase.from('matriculas').select('curso_id').eq('aluno_id', alunoId!),
        supabase.from('modulos').select('id,curso_id,titulo,ordem'),
        supabase.from('aulas').select('id,modulo_id,titulo,ordem'),
        supabase.from('progresso_aulas').select('aula_id,atualizado_em').eq('aluno_id', alunoId!).eq('concluida', true),
        supabase.from('biblioteca').select('id,titulo,autor,descricao,capa_url,download_url').eq('publicado', true).order('ordem'),
      ])
      const liberados = new Set((m.data ?? []).map(x => x.curso_id as string))
      const modulos = (mo.data ?? []) as Pick<Modulo, 'id' | 'curso_id' | 'titulo' | 'ordem'>[]
      const aulas = (a.data ?? []) as Pick<Aula, 'id' | 'modulo_id' | 'titulo' | 'ordem'>[]
      const feitas = new Map(((p.data ?? []) as { aula_id: string; atualizado_em: string }[]).map(x => [x.aula_id, x.atualizado_em]))
      const cursos = ((c.data ?? []) as Curso[]).map(curso => {
        const mods = modulos.filter(x => x.curso_id === curso.id).sort((x, y) => x.ordem - y.ordem)
        const lista = mods.flatMap(md => aulas.filter(x => x.modulo_id === md.id).sort((x, y) => x.ordem - y.ordem))
        const vistas = lista.filter(x => feitas.has(x.id))
        const ultima = vistas.map(x => feitas.get(x.id)!).sort().pop() ?? null
        return { curso, liberado: liberados.has(curso.id), total: lista.length, modulos: mods.length, vistas: vistas.length,
          pct: lista.length ? Math.round(vistas.length / lista.length * 100) : 0, proxima: lista.find(x => !feitas.has(x.id)) ?? null, ultima }
      })
      return { cursos, biblioteca: (b.data ?? []) as { id: string; titulo: string; autor: string | null; descricao: string | null; capa_url: string | null; download_url: string | null }[] }
    },
  })
}

type ItemVitrine = NonNullable<ReturnType<typeof useVitrine>['data']>['cursos'][number]

function Imagem({ url, titulo, className = '' }: { url: string | null; titulo: string; className?: string }) {
  return url ? <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
    : <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-[#2C2820] to-[#14120E] p-4 text-center font-marca text-lg text-[#E8CC8C] ${className}`}>{titulo}</div>
}

/** Fileira horizontal com setas para avançar e voltar, como num catálogo de streaming. */
function Fileira({ titulo, info, children }: { titulo: string; info?: string; children: ReactNode }) {
  const trilho = useRef<HTMLDivElement>(null)
  const [podeVoltar, setPodeVoltar] = useState(false)
  const [podeAvancar, setPodeAvancar] = useState(false)
  const medir = () => {
    const t = trilho.current
    if (!t) return
    setPodeVoltar(t.scrollLeft > 4)
    setPodeAvancar(t.scrollLeft + t.clientWidth < t.scrollWidth - 4)
  }
  useEffect(() => {
    medir()
    const t = trilho.current
    const ro = new ResizeObserver(medir)
    if (t) ro.observe(t)
    return () => ro.disconnect()
  }, [children])
  const rolar = (dir: 1 | -1) => trilho.current?.scrollBy({ left: dir * trilho.current.clientWidth * 0.85, behavior: 'smooth' })

  return (
    <section className="group/fileira flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4 px-5 lg:px-12">
        <h2 className="flex items-center gap-3 font-marca text-[22px] font-semibold text-[#F3EEE3] sm:text-[26px]">
          <span aria-hidden className="h-6 w-[3px] rounded-full bg-gradient-to-b from-[#E8CC8C] to-[#9A7A30]" />{titulo}
        </h2>
        <div className="flex items-center gap-3">
          {info && <span className="text-[13px] text-[#A39E93]">{info}</span>}
          <div className="hidden gap-1.5 sm:flex">
            <button aria-label={`Voltar em ${titulo}`} onClick={() => rolar(-1)} disabled={!podeVoltar}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#E8CC8C]/25 text-[#E8CC8C] transition hover:bg-[#E8CC8C]/10 disabled:opacity-25"><span className="rotate-180"><Icone nome="seta" tamanho={16} /></span></button>
            <button aria-label={`Avançar em ${titulo}`} onClick={() => rolar(1)} disabled={!podeAvancar}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#E8CC8C]/25 text-[#E8CC8C] transition hover:bg-[#E8CC8C]/10 disabled:opacity-25"><Icone nome="seta" tamanho={16} /></button>
          </div>
        </div>
      </div>
      <div className="relative">
        <div ref={trilho} onScroll={medir} className="trilho flex gap-4 overflow-x-auto scroll-px-5 px-5 pb-6 pt-2 lg:scroll-px-12 lg:px-12">{children}</div>
        {podeVoltar && <button aria-label={`Voltar em ${titulo}`} onClick={() => rolar(-1)} className="absolute inset-y-0 left-0 hidden w-14 place-items-center bg-gradient-to-r from-[#0E0D0B] to-transparent text-[#E8CC8C] opacity-0 transition group-hover/fileira:opacity-100 sm:grid"><span className="rotate-180"><Icone nome="seta" tamanho={28} /></span></button>}
        {podeAvancar && <button aria-label={`Avançar em ${titulo}`} onClick={() => rolar(1)} className="absolute inset-y-0 right-0 hidden w-14 place-items-center bg-gradient-to-l from-[#0E0D0B] to-transparent text-[#E8CC8C] opacity-0 transition group-hover/fileira:opacity-100 sm:grid"><Icone nome="seta" tamanho={28} /></button>}
      </div>
    </section>
  )
}

function CartaoCurso({ c, base, i, continuar }: { c: ItemVitrine; base: string; i: number; continuar?: boolean }) {
  const destino = `${base}/curso/${c.curso.id}${continuar && c.proxima ? `/aula/${c.proxima.id}` : ''}`
  return (
    <Link to={destino} style={{ animationDelay: `${i * 60}ms` }}
      className="entrar group relative aspect-video w-[78vw] shrink-0 overflow-hidden rounded-xl bg-[#1A1814] ring-1 ring-white/5 transition duration-300 hover:z-10 hover:scale-[1.04] hover:ring-2 hover:ring-[#C9A453]/70 hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.9),0_0_40px_-10px_rgba(201,164,83,0.35)] sm:w-[380px] lg:w-[420px]">
      <Imagem url={c.curso.capa_url} titulo={c.curso.titulo} className="transition duration-700 group-hover:scale-[1.06]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
      {c.pct === 100 && <span className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-[#E8CC8C] to-[#C9A453] px-2.5 py-0.5 text-xs font-bold text-[#1F1D18]">Concluído</span>}
      <span aria-hidden className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 scale-75 place-items-center rounded-full bg-gradient-to-br from-[#E8CC8C] to-[#9A7A30] pl-1 text-xl text-[#1F1D18] opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.6)] transition duration-300 group-hover:scale-100 group-hover:opacity-100">▶</span>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
        <b className="line-clamp-1 text-[16px] text-white drop-shadow">{c.curso.titulo}</b>
        <span className="line-clamp-1 text-[12px] text-white/65">{continuar && c.proxima ? `Próxima: ${c.proxima.titulo}` : `${c.total} aulas${c.modulos ? ` · ${c.modulos} módulos` : ''}`}</span>
        {c.total > 0 && <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/20"><div className="barra-anim h-full rounded-full bg-gradient-to-r from-[#E8CC8C] to-[#C9A453]" style={{ width: `${c.pct}%` }} /></div>}
      </div>
    </Link>
  )
}

export default function Vitrine({ alunoId, base, nome }: { alunoId: string | undefined; base: string; nome?: string }) {
  const { data, isLoading } = useVitrine(alunoId)
  if (!alunoId) return <p className="px-5 py-20 text-center text-[#A39E93] lg:px-12">Nenhum cadastro de aluno ligado a este acesso.</p>
  if (isLoading || !data) return <p className="px-5 py-20 text-center text-[#A39E93]">Carregando…</p>

  const meus = data.cursos.filter(c => c.liberado)
  const bloqueados = data.cursos.filter(c => !c.liberado)
  const continuar = meus.filter(c => c.vistas > 0 && c.pct < 100).sort((a, b) => ((a.ultima ?? '') < (b.ultima ?? '') ? 1 : -1))
  const destaque = continuar[0] ?? meus.find(c => c.curso.destaque) ?? meus[0]

  return (
    <div className="flex flex-col gap-8 pb-16">
      {destaque ? (
        <section className="relative isolate -mt-[72px] flex min-h-[78vh] items-end overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <Imagem url={destaque.curso.imagem_destaque_url ?? destaque.curso.capa_url} titulo="" className="object-[70%_20%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0E0D0B] via-[#0E0D0B]/80 to-[#0E0D0B]/10" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E0D0B] via-[#0E0D0B]/30 to-[#0E0D0B]/40" />
            <div className="absolute -left-40 bottom-0 h-[420px] w-[620px] rounded-full bg-[#C9A453]/10 blur-[120px]" />
          </div>
          <div className="entrar flex max-w-[680px] flex-col gap-5 px-5 pb-16 pt-40 lg:px-12">
            <span className="flex w-fit items-center gap-2 rounded-full border border-[#E8CC8C]/35 bg-black/30 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-[#E8CC8C] backdrop-blur">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#E8CC8C]" />
              {destaque.vistas > 0 ? 'Continue de onde parou' : nome ? `Bem-vindo(a), ${nome.split(' ')[0]}` : 'Comece por aqui'}
            </span>
            <h1 className="font-marca text-[40px] font-semibold leading-[1.02] text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] sm:text-[60px]">{destaque.curso.titulo}</h1>
            {destaque.curso.descricao_curta && <p className="line-clamp-3 max-w-[54ch] text-[16px] leading-relaxed text-white/75">{destaque.curso.descricao_curta}</p>}
            <div className="flex flex-wrap items-center gap-3 text-[13px] text-white/60">
              <span className="font-semibold text-[#E8CC8C]">{destaque.pct}% concluído</span><span aria-hidden>·</span>
              <span>{destaque.total} aulas</span>{destaque.modulos > 0 && <><span aria-hidden>·</span><span>{destaque.modulos} módulos</span></>}
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to={`${base}/curso/${destaque.curso.id}${destaque.proxima ? `/aula/${destaque.proxima.id}` : ''}`}
                className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-gradient-to-br from-[#F0D9A0] via-[#C9A453] to-[#9A7A30] px-7 text-[15px] font-bold text-[#1F1D18] shadow-[0_14px_40px_-12px_rgba(201,164,83,0.8)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-12px_rgba(201,164,83,0.9)]">
                <span aria-hidden>▶</span>{destaque.vistas > 0 ? 'Continuar assistindo' : 'Começar agora'}
              </Link>
              <Link to={`${base}/curso/${destaque.curso.id}`} className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/20">Ver módulos</Link>
            </div>
            {destaque.proxima && <span className="text-[13px] text-white/55">Próxima aula: <span className="text-white/80">{destaque.proxima.titulo}</span></span>}
          </div>
        </section>
      ) : <p className="px-5 pt-32 text-center text-[#A39E93] lg:px-12">Nenhum curso liberado ainda. Se já comprou, fale com a equipe do Dr. Mário.</p>}

      {continuar.length > 0 && (
        <Fileira titulo="Continue assistindo" info={`${continuar.length} em andamento`}>
          {continuar.map((c, i) => <CartaoCurso key={c.curso.id} c={c} base={base} i={i} continuar />)}
        </Fileira>
      )}

      {meus.length > 0 && (
        <Fileira titulo="Seus cursos" info={`${meus.length} liberados`}>
          {meus.map((c, i) => <CartaoCurso key={c.curso.id} c={c} base={base} i={i} />)}
        </Fileira>
      )}

      {bloqueados.length > 0 && (
        <Fileira titulo="Disponível para adquirir" info={`${bloqueados.length} conteúdos`}>
          {bloqueados.map(c => (
            <div key={c.curso.id} className="group relative aspect-video w-[78vw] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/5 sm:w-[380px] lg:w-[420px]">
              <Imagem url={c.curso.capa_url} titulo={c.curso.titulo} className="brightness-[0.45] grayscale-[50%] transition duration-700 group-hover:scale-[1.05] group-hover:brightness-[0.6]" />
              <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 bg-gradient-to-t from-black/90 to-transparent p-4">
                <span className="rounded-full border border-[#E8CC8C]/40 bg-black/50 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8CC8C]">Bloqueado</span>
                <b className="text-[16px] text-white">{c.curso.titulo}</b>
                {c.curso.checkout_url
                  ? <a href={c.curso.checkout_url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-[#E8CC8C] hover:underline">Quero ter acesso →</a>
                  : <span className="text-[13px] text-white/60">Fale com a equipe</span>}
              </div>
            </div>
          ))}
        </Fileira>
      )}

      {data.biblioteca.length > 0 && (
        <Fileira titulo="Biblioteca do método" info={`${data.biblioteca.length} livros`}>
          {data.biblioteca.map((l, i) => {
            const capa = (
              <>
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-[0_20px_40px_-18px_rgba(0,0,0,0.9)] ring-1 ring-white/10 transition duration-300 group-hover:-translate-y-2 group-hover:ring-2 group-hover:ring-[#C9A453]/70 group-hover:shadow-[0_30px_50px_-18px_rgba(0,0,0,0.95),0_0_30px_-8px_rgba(201,164,83,0.4)]">
                  <Imagem url={l.capa_url} titulo={l.titulo} className="object-contain bg-[#1A1814]" />
                  <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/35 to-transparent" />
                  {l.download_url && <span className="absolute bottom-2 right-2 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-[#E8CC8C] opacity-0 backdrop-blur transition group-hover:opacity-100">Ver resumo</span>}
                </div>
                <b className="line-clamp-2 text-[13px] capitalize leading-snug text-[#F3EEE3]">{l.titulo.toLowerCase()}</b>
                {l.autor && <span className="line-clamp-1 text-[12px] capitalize text-[#A39E93]">{l.autor.toLowerCase()}</span>}
              </>
            )
            const cls = 'entrar group flex w-[150px] shrink-0 flex-col gap-2.5 sm:w-[170px]'
            return l.download_url
              ? <a key={l.id} href={l.download_url} target="_blank" rel="noreferrer" className={cls} style={{ animationDelay: `${i * 50}ms` }}>{capa}</a>
              : <div key={l.id} className={cls} style={{ animationDelay: `${i * 50}ms` }}>{capa}</div>
          })}
        </Fileira>
      )}
    </div>
  )
}

/** Página do curso com o player, em tema escuro. Em prévia (`previa`), não marca progresso. */
export function CursoVitrine({ alunoId, base, previa }: { alunoId: string | undefined; base: string; previa?: boolean }) {
  const { id, aulaId } = useParams()
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['curso-vitrine', id, alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      const [c, m] = await Promise.all([supabase.from('cursos').select('*').eq('id', id!).single(), supabase.from('modulos').select('*').eq('curso_id', id!).order('ordem')])
      const mods = (m.data ?? []) as Modulo[]
      const a = mods.length ? await supabase.from('aulas').select('*').in('modulo_id', mods.map(x => x.id)).order('ordem') : { data: [] }
      const p = await supabase.from('progresso_aulas').select('aula_id').eq('aluno_id', alunoId!).eq('concluida', true)
      return { curso: c.data as Curso, modulos: mods, aulas: (a.data ?? []) as Aula[], feitas: new Set((p.data ?? []).map(x => x.aula_id as string)) }
    },
  })
  if (!data) return <p className="px-5 py-20 text-center text-[#A39E93]">Carregando…</p>
  const ordenadas = data.modulos.flatMap(m => data.aulas.filter(a => a.modulo_id === m.id).sort((x, y) => x.ordem - y.ordem))
  const atual = ordenadas.find(a => a.id === aulaId) ?? ordenadas.find(a => !data.feitas.has(a.id)) ?? ordenadas[0]
  const idx = atual ? ordenadas.indexOf(atual) : -1
  const embed = atual?.video_tipo === 'pdf' ? atual.pdf_url : urlIncorporavel(atual?.video_url ?? null)
  const pct = ordenadas.length ? Math.round(ordenadas.filter(a => data.feitas.has(a.id)).length / ordenadas.length * 100) : 0

  async function concluir() {
    if (!atual || !alunoId || previa) return
    await supabase.from('progresso_aulas').upsert({ aluno_id: alunoId, aula_id: atual.id, concluida: true, atualizado_em: new Date().toISOString() }, { onConflict: 'aluno_id,aula_id' })
    qc.invalidateQueries({ queryKey: ['curso-vitrine', id, alunoId] }); qc.invalidateQueries({ queryKey: ['vitrine', alunoId] })
  }

  return (
    <div className="relative isolate">
      <div aria-hidden className="absolute inset-x-0 -top-[72px] -z-10 h-[420px] overflow-hidden">
        {data.curso.imagem_destaque_url && <img src={data.curso.imagem_destaque_url} alt="" className="h-full w-full object-cover opacity-25 blur-sm" />}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0D0B]/40 to-[#0E0D0B]" />
      </div>
      <div className="grid grid-cols-1 gap-8 px-5 pb-16 pt-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-12">
        <section className="flex min-w-0 flex-col gap-5">
          <Link to={base || '/'} className="flex w-fit items-center gap-1.5 text-[13px] font-semibold text-[#E8CC8C] hover:underline"><span aria-hidden>←</span>Voltar para a vitrine</Link>
          {atual ? (
            <>
              {embed ? (
                <div className="entrar aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95)] ring-1 ring-[#C9A453]/25">
                  <iframe src={embed} title={atual.titulo} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
                </div>
              ) : (
                <div className="faixa-ouro grid aspect-video w-full place-items-center rounded-2xl p-8 text-center ring-1 ring-[#C9A453]/25">
                  <div className="flex flex-col items-center gap-4"><span className="text-white/70">Conteúdo em link externo</span>
                    {atual.video_url && <a href={atual.video_url} target="_blank" rel="noreferrer" className="btn-ouro">Abrir conteúdo</a>}</div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] text-[#A39E93]">{data.curso.titulo} · aula {idx + 1} de {ordenadas.length}</span>
                <h1 className="font-marca text-[30px] font-semibold leading-tight text-white">{atual.titulo}</h1>
              </div>
              {atual.descricao && <p className="max-w-[65ch] whitespace-pre-wrap leading-relaxed text-white/70">{atual.descricao}</p>}
              <div className="flex flex-wrap gap-2.5">
                {data.feitas.has(atual.id)
                  ? <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#2F8A55]/20 px-4 font-semibold text-[#7BD3A0] ring-1 ring-[#2F8A55]/40"><Icone nome="check" tamanho={16} />Aula concluída</span>
                  : <button onClick={concluir} disabled={previa} title={previa ? 'Na prévia o progresso não é alterado' : undefined}
                      className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-br from-[#F0D9A0] via-[#C9A453] to-[#9A7A30] px-5 font-bold text-[#1F1D18] shadow-[0_12px_30px_-12px_rgba(201,164,83,0.8)] transition hover:-translate-y-0.5 disabled:opacity-60"><Icone nome="check" tamanho={16} />Marcar como concluída</button>}
                {idx > 0 && <Link to={`${base}/curso/${id}/aula/${ordenadas[idx - 1].id}`} className="inline-flex h-11 items-center rounded-xl border border-white/15 bg-white/5 px-5 font-semibold text-white hover:bg-white/10">Anterior</Link>}
                {idx < ordenadas.length - 1 && <Link to={`${base}/curso/${id}/aula/${ordenadas[idx + 1].id}`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#E8CC8C]/40 bg-[#E8CC8C]/10 px-5 font-semibold text-[#E8CC8C] hover:bg-[#E8CC8C]/20">Próxima aula<Icone nome="seta" tamanho={16} /></Link>}
              </div>
            </>
          ) : <p className="text-[#A39E93]">Este curso ainda não tem aulas.</p>}
        </section>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="flex flex-col gap-2.5 rounded-2xl bg-[#1A1814] p-4 ring-1 ring-white/5">
            <span className="text-[13px] text-[#A39E93]">Seu progresso no curso</span>
            <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10"><div className="barra-anim h-full rounded-full bg-gradient-to-r from-[#E8CC8C] to-[#C9A453]" style={{ width: `${pct}%` }} /></div><b className="num text-[#E8CC8C]">{pct}%</b></div>
          </div>
          {data.modulos.map(m => (
            <div key={m.id} className="flex flex-col rounded-2xl bg-[#1A1814] p-3 ring-1 ring-white/5">
              <b className="px-1 pb-2 text-[#F3EEE3]">{m.titulo}</b>
              {data.aulas.filter(a => a.modulo_id === m.id).sort((x, y) => x.ordem - y.ordem).map(a => (
                <Link key={a.id} to={`${base}/curso/${id}/aula/${a.id}`}
                  className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-[14px] transition ${a.id === atual?.id ? 'bg-gradient-to-r from-[#C9A453]/20 to-transparent font-semibold text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${data.feitas.has(a.id) ? 'bg-gradient-to-br from-[#E8CC8C] to-[#9A7A30] text-[#1F1D18]' : a.id === atual?.id ? 'border-2 border-[#E8CC8C]' : 'border-[1.5px] border-white/25'}`}>{data.feitas.has(a.id) ? '✓' : ''}</span>
                  <span className="min-w-0 flex-1">{a.titulo}</span>
                </Link>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </div>
  )
}
