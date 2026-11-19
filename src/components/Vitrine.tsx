import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Aula, Curso, Modulo } from '@/lib/membros'
import { urlIncorporavel } from '@/lib/membros'
import { Carregando, Vazio } from './ui'
import Icone from './Icone'

/**
 * Vitrine da área de membros. A mesma tela serve ao aluno logado e à prévia do painel:
 * `alunoId` define de quem são as matrículas e o progresso; `base` é o prefixo dos links.
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
        supabase.from('biblioteca').select('id,titulo,autor,capa_url,download_url').eq('publicado', true).order('ordem'),
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
        return { curso, liberado: liberados.has(curso.id), total: lista.length, vistas: vistas.length,
          pct: lista.length ? Math.round(vistas.length / lista.length * 100) : 0, proxima: lista.find(x => !feitas.has(x.id)) ?? null, ultima }
      })
      return { cursos, biblioteca: (b.data ?? []) as { id: string; titulo: string; autor: string | null; capa_url: string | null; download_url: string | null }[] }
    },
  })
}

function Capa({ url, titulo, className = '' }: { url: string | null; titulo: string; className?: string }) {
  return url ? <img src={url} alt="" className={`h-full w-full object-cover ${className}`} loading="lazy" />
    : <div className={`grid h-full w-full place-items-center bg-gradient-to-br from-[#2C2820] to-[#5A4A26] p-4 text-center font-marca text-lg text-[#E8CC8C] ${className}`}>{titulo}</div>
}

export default function Vitrine({ alunoId, base, nome }: { alunoId: string | undefined; base: string; nome?: string }) {
  const { data, isLoading } = useVitrine(alunoId)
  if (!alunoId) return <Vazio>Nenhum cadastro de aluno ligado a este acesso.</Vazio>
  if (isLoading || !data) return <Carregando />

  const meus = data.cursos.filter(c => c.liberado)
  const bloqueados = data.cursos.filter(c => !c.liberado)
  const continuar = meus.filter(c => c.vistas > 0 && c.pct < 100).sort((a, b) => ((a.ultima ?? '') < (b.ultima ?? '') ? 1 : -1))
  const destaque = continuar[0] ?? meus.find(c => c.curso.destaque) ?? meus[0]
  const categorias = [...new Set(meus.map(c => c.curso.categoria ?? 'Conteúdos'))]

  return (
    <div className="flex flex-col gap-10">
      {destaque && (
        <section className="entrar relative isolate overflow-hidden rounded-3xl bg-[#1F1D18] shadow-[0_30px_60px_-30px_rgba(28,27,24,0.6)]">
          <div className="absolute inset-0 -z-10">
            <Capa url={destaque.curso.imagem_destaque_url ?? destaque.curso.capa_url} titulo="" className="scale-105 opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#14120E] via-[#14120E]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#14120E]/90 via-transparent to-transparent" />
          </div>
          <div className="flex min-h-[360px] max-w-[620px] flex-col justify-end gap-4 p-7 sm:p-10">
            <span className="w-fit rounded-full border border-[#E8CC8C]/40 bg-[#E8CC8C]/10 px-3 py-1 text-xs font-semibold text-[#E8CC8C] backdrop-blur">
              {destaque.vistas > 0 ? 'Continue de onde parou' : nome ? `Bem-vindo(a), ${nome.split(' ')[0]}` : 'Comece por aqui'}
            </span>
            <h1 className="font-marca text-[34px] font-semibold leading-[1.08] text-white sm:text-[44px]">{destaque.curso.titulo}</h1>
            {destaque.curso.descricao_curta && <p className="line-clamp-3 max-w-[52ch] text-[15px] leading-relaxed text-white/75">{destaque.curso.descricao_curta}</p>}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <Link to={`${base}/curso/${destaque.curso.id}${destaque.proxima ? `/aula/${destaque.proxima.id}` : ''}`} className="btn-ouro h-12 px-6 text-[15px]">
                <span aria-hidden>▶</span>{destaque.vistas > 0 ? 'Continuar' : 'Começar'}
              </Link>
              <div className="flex min-w-[180px] flex-col gap-1.5">
                <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="barra-anim h-full rounded-full bg-gradient-to-r from-[#E8CC8C] to-[#C9A453]" style={{ width: `${destaque.pct}%` }} /></div>
                <span className="text-xs text-white/60">{destaque.vistas} de {destaque.total} aulas · {destaque.pct}%</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {meus.length === 0 && <Vazio>Nenhum curso liberado ainda. Se já comprou, fale com a equipe do Dr. Mário.</Vazio>}

      {continuar.length > 0 && <Trilho titulo="Continue assistindo" itens={continuar} base={base} progresso />}
      {categorias.map(cat => <Trilho key={cat} titulo={cat} itens={meus.filter(c => (c.curso.categoria ?? 'Conteúdos') === cat)} base={base} />)}

      {bloqueados.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-marca text-[22px] font-semibold">Disponível para adquirir</h2>
          <div className="trilho -mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
            {bloqueados.map(c => (
              <div key={c.curso.id} className="group relative w-[260px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(28,27,24,0.5)]">
                <div className="relative aspect-video overflow-hidden"><Capa url={c.curso.capa_url} titulo={c.curso.titulo} className="grayscale-[40%] transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 grid place-items-center bg-black/35"><span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">Bloqueado</span></div></div>
                <div className="flex flex-col gap-2 p-4"><b className="leading-snug">{c.curso.titulo}</b>
                  {c.curso.checkout_url ? <a href={c.curso.checkout_url} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-ouro-escuro">Quero ter acesso →</a> : <span className="text-[13px] text-cinza">Fale com a equipe</span>}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.biblioteca.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><h2 className="font-marca text-[22px] font-semibold">Biblioteca do método</h2><span className="text-[13px] text-cinza">{data.biblioteca.length} livros</span></div>
          <div className="trilho -mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
            {data.biblioteca.map(l => {
              const conteudo = (
                <>
                  <div className="aspect-[2/3] overflow-hidden rounded-xl shadow-[0_14px_30px_-16px_rgba(28,27,24,0.6)] transition duration-300 group-hover:-translate-y-1.5 group-hover:shadow-[0_22px_40px_-16px_rgba(28,27,24,0.7)]">
                    <Capa url={l.capa_url} titulo={l.titulo} /></div>
                  <b className="line-clamp-2 text-[14px] leading-snug">{l.titulo}</b>
                  {l.autor && <span className="truncate text-xs text-cinza">{l.autor}</span>}
                </>
              )
              return l.download_url
                ? <a key={l.id} href={l.download_url} target="_blank" rel="noreferrer" className="group flex w-[150px] shrink-0 flex-col gap-2">{conteudo}</a>
                : <div key={l.id} className="group flex w-[150px] shrink-0 flex-col gap-2">{conteudo}</div>
            })}
          </div>
        </section>
      )}
    </div>
  )
}

type ItemVitrine = NonNullable<ReturnType<typeof useVitrine>['data']>['cursos'][number]

function Trilho({ titulo, itens, base, progresso }: { titulo: string; itens: ItemVitrine[]; base: string; progresso?: boolean }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between"><h2 className="font-marca text-[22px] font-semibold">{titulo}</h2><span className="text-[13px] text-cinza">{itens.length} {itens.length === 1 ? 'curso' : 'cursos'}</span></div>
      <div className="trilho -mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
        {itens.map((c, i) => (
          <Link key={c.curso.id} to={`${base}/curso/${c.curso.id}${progresso && c.proxima ? `/aula/${c.proxima.id}` : ''}`} style={{ animationDelay: `${i * 70}ms` }}
            className="entrar group relative w-[300px] shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_10px_30px_-18px_rgba(28,27,24,0.45)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_44px_-20px_rgba(28,27,24,0.55)]">
            <div className="relative aspect-video overflow-hidden">
              <Capa url={c.curso.capa_url} titulo={c.curso.titulo} className="transition duration-700 group-hover:scale-[1.06]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="absolute bottom-3 left-3 grid h-10 w-10 translate-y-2 place-items-center rounded-full bg-white/95 text-tinta opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100" aria-hidden>▶</span>
              {c.pct === 100 && <span className="absolute right-3 top-3 rounded-full bg-[#2F8A55] px-2.5 py-0.5 text-xs font-semibold text-white">Concluído</span>}
            </div>
            <div className="flex flex-col gap-2 p-4">
              <b className="line-clamp-1 text-[15px]">{c.curso.titulo}</b>
              {progresso && c.proxima ? <span className="line-clamp-1 text-[13px] text-cinza">Próxima: {c.proxima.titulo}</span>
                : <span className="text-[13px] text-cinza">{c.total} aulas</span>}
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEECE6]"><div className="barra-anim h-full rounded-full bg-gradient-to-r from-[#C9A453] to-[#9A7A30]" style={{ width: `${c.pct}%` }} /></div>
                <span className="num text-xs text-cinza">{c.pct}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Página do curso com o player. Em prévia (`previa`), não marca progresso. */
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
  if (!data) return <Carregando />
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
    <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex min-w-0 flex-col gap-4">
        <Link to={base || '/'} className="flex w-fit items-center gap-1.5 text-[13px] text-ouro-escuro"><span aria-hidden>←</span>{data.curso.titulo}</Link>
        {atual ? (
          <>
            {embed ? (
              <div className="entrar aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]">
                <iframe src={embed} title={atual.titulo} className="h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
              </div>
            ) : (
              <div className="faixa-ouro grid aspect-video w-full place-items-center rounded-2xl p-8 text-center">
                <div className="flex flex-col items-center gap-4"><span className="text-white/70">Conteúdo em link externo</span>
                  {atual.video_url && <a href={atual.video_url} target="_blank" rel="noreferrer" className="btn-ouro">Abrir conteúdo</a>}</div>
              </div>
            )}
            <div className="flex flex-col gap-1"><span className="text-[13px] text-cinza">Aula {idx + 1} de {ordenadas.length}</span>
              <h1 className="font-marca text-[28px] font-semibold leading-tight">{atual.titulo}</h1></div>
            {atual.descricao && <p className="max-w-[65ch] whitespace-pre-wrap leading-relaxed text-[#4A463F]">{atual.descricao}</p>}
            <div className="flex flex-wrap gap-2">
              {data.feitas.has(atual.id) ? <span className="btn bg-bom-fundo text-bom-texto"><Icone nome="check" tamanho={16} />Aula concluída</span>
                : <button className="btn-ouro" onClick={concluir} disabled={previa} title={previa ? 'Na prévia o progresso não é alterado' : undefined}><Icone nome="check" tamanho={16} />Marcar como concluída</button>}
              {idx > 0 && <Link to={`${base}/curso/${id}/aula/${ordenadas[idx - 1].id}`} className="btn-secundario">Anterior</Link>}
              {idx < ordenadas.length - 1 && <Link to={`${base}/curso/${id}/aula/${ordenadas[idx + 1].id}`} className="btn-primario">Próxima aula</Link>}
            </div>
          </>
        ) : <Vazio>Este curso ainda não tem aulas.</Vazio>}
      </section>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
        <div className="cartao flex flex-col gap-2 p-4">
          <span className="text-[13px] text-cinza">Seu progresso</span>
          <div className="flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEECE6]"><div className="barra-anim h-full rounded-full bg-gradient-to-r from-[#C9A453] to-[#9A7A30]" style={{ width: `${pct}%` }} /></div><b className="num">{pct}%</b></div>
        </div>
        {data.modulos.map(m => (
          <div key={m.id} className="cartao flex flex-col p-3">
            <b className="px-1 pb-1.5">{m.titulo}</b>
            {data.aulas.filter(a => a.modulo_id === m.id).sort((x, y) => x.ordem - y.ordem).map(a => (
              <Link key={a.id} to={`${base}/curso/${id}/aula/${a.id}`}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-[14px] transition ${a.id === atual?.id ? 'bg-gradient-to-r from-[#F6EEDB] to-transparent font-semibold' : 'hover:bg-[#FBFAF7]'}`}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${data.feitas.has(a.id) ? 'bg-[#2F8A55] text-white' : a.id === atual?.id ? 'border-2 border-ouro' : 'border-[1.5px] border-[#C9C6BD]'}`}>{data.feitas.has(a.id) ? '✓' : ''}</span>
                <span className="min-w-0 flex-1">{a.titulo}</span>
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </div>
  )
}
