import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useFrentes, usePerfis, mapaPor } from '@/lib/dados'
import type { StatusTarefa, Tarefa } from '@/lib/tipos'
import { STATUS, diasAte, textoPrazo } from '@/lib/util'
import { Avatar, Cabecalho, Carregando, Erro, EtiquetaFrente, Ponto } from '@/components/ui'
import TarefaPainel from '@/components/TarefaPainel'

export function useTarefas() {
  return useQuery({
    queryKey: ['tarefas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tarefas').select('*, tarefa_checklist(id,feito)').order('ordem')
      if (error) throw error
      return data as Tarefa[]
    },
  })
}

export function estaAtrasada(t: Tarefa) {
  return t.status !== 'concluida' && !!t.prazo && diasAte(t.prazo) < 0
}

export default function Tarefas() {
  const [params, setParams] = useSearchParams()
  const frenteSlug = params.get('frente') ?? 'todas'
  const [soAtrasadas, setSoAtrasadas] = useState(false)
  const [responsavel, setResponsavel] = useState('todos')
  const [aberta, setAberta] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data: tarefas, isLoading, error } = useTarefas()
  const { data: frentes } = useFrentes()
  const { data: perfis } = usePerfis()
  const { data: limites } = useQuery({
    queryKey: ['limites'],
    queryFn: async () => (await supabase.from('limites_quadro').select('*')).data as { status: StatusTarefa; limite: number | null }[],
  })
  const mFrentes = mapaPor(frentes)
  const mPerfis = mapaPor(perfis)
  const frenteSel = frentes?.find(f => f.slug === frenteSlug)

  const mover = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusTarefa }) => {
      const { error } = await supabase.from('tarefas').update({ status, ordem: Date.now() }).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tarefas'] })
      const antes = qc.getQueryData<Tarefa[]>(['tarefas'])
      qc.setQueryData<Tarefa[]>(['tarefas'], old => old?.map(t => (t.id === id ? { ...t, status, ordem: Date.now() } : t)))
      return { antes }
    },
    onError: (_e, _v, ctx) => ctx?.antes && qc.setQueryData(['tarefas'], ctx.antes),
    onSettled: () => { qc.invalidateQueries({ queryKey: ['tarefas'] }); qc.invalidateQueries({ queryKey: ['contagens-menu'] }) },
  })

  const criar = useMutation({
    mutationFn: async (status: StatusTarefa) => {
      const { data, error } = await supabase.from('tarefas').insert({ titulo: 'Nova tarefa', status, frente_id: frenteSel?.id ?? null, ordem: Date.now() }).select('id').single()
      if (error) throw error
      return data.id as string
    },
    onSuccess: id => { qc.invalidateQueries({ queryKey: ['tarefas'] }); setAberta(id) },
  })

  const filtradas = useMemo(() => (tarefas ?? []).filter(t =>
    (!frenteSel || t.frente_id === frenteSel.id) &&
    (responsavel === 'todos' || (responsavel === 'ninguem' ? !t.responsavel_id : t.responsavel_id === responsavel)) &&
    (!soAtrasadas || estaAtrasada(t))
  ), [tarefas, frenteSel, responsavel, soAtrasadas])

  if (isLoading) return <Carregando />
  if (error) return <Erro erro={error} />

  const abertas = (tarefas ?? []).filter(t => t.status !== 'concluida')
  const atrasadas = abertas.filter(estaAtrasada).length
  const limiteDe = (s: StatusTarefa) => limites?.find(l => l.status === s)?.limite ?? null

  return (
    <>
      <Cabecalho titulo="Tarefas"
        frase={abertas.length === 0 ? 'Nenhuma tarefa aberta. Crie a primeira em qualquer coluna.' : `${abertas.length} abertas${atrasadas ? `, ${atrasadas} atrasada${atrasadas > 1 ? 's' : ''}` : ', nenhuma atrasada'}.`}
        acoes={<button className="btn-primario" onClick={() => criar.mutate('a_fazer')}>Nova tarefa</button>} />

      <div className="flex flex-wrap items-center gap-2">
        {[{ slug: 'todas', nome: 'Todas', cor: '' }, ...(frentes ?? [])].map(f => {
          const sel = f.slug === frenteSlug
          const n = f.slug === 'todas' ? abertas.length : abertas.filter(t => t.frente_id === (f as { id?: string }).id).length
          return (
            <button key={f.slug} onClick={() => { const p = new URLSearchParams(params); f.slug === 'todas' ? p.delete('frente') : p.set('frente', f.slug); setParams(p) }}
              className={`inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3 font-semibold ${sel ? 'border-tinta bg-tinta text-white' : 'border-[#DCDAD3] bg-white hover:bg-bandeja'}`}>
              {f.cor && <Ponto cor={f.cor} tamanho={8} />}{f.nome} <span className={sel ? 'font-normal text-white/70' : 'font-normal text-cinza'}>{n}</span>
            </button>
          )
        })}
        <label className="sr-only" htmlFor="filtro-resp">Responsável</label>
        <select id="filtro-resp" className="h-[34px] rounded-full border border-[#DCDAD3] bg-white px-3" value={responsavel} onChange={e => setResponsavel(e.target.value)}>
          <option value="todos">Responsável: todos</option>
          <option value="ninguem">Sem responsável</option>
          {perfis?.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <button onClick={() => setSoAtrasadas(v => !v)}
          className={`h-[34px] rounded-full border px-3 ${soAtrasadas ? 'border-ruim bg-ruim text-white' : 'border-[#F3C4BE] bg-[#FDF0EE] text-ruim-texto'}`}>Só atrasadas</button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1100px] grid-cols-5 items-start gap-3">
          {STATUS.map(col => {
            const cards = filtradas.filter(t => t.status === col.id).sort((a, b) => (col.id === 'concluida' ? b.ordem - a.ordem : a.ordem - b.ordem))
            const total = (tarefas ?? []).filter(t => t.status === col.id).length
            const lim = limiteDe(col.id)
            const cheio = lim != null && total >= lim
            return (
              <section key={col.id} className="flex flex-col gap-2.5 rounded-xl bg-bandeja p-3"
                onDragOver={e => e.preventDefault()}
                onDrop={() => { if (arrastando) mover.mutate({ id: arrastando, status: col.id }); setArrastando(null) }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold">{col.nome}</h2>
                  <span className={cheio ? 'rounded-full bg-alerta-fundo px-2 text-xs font-semibold text-alerta-texto' : 'text-xs text-cinza'}>{lim != null ? `${total} de ${lim}` : total}</span>
                </div>
                {cards.slice(0, col.id === 'concluida' ? 12 : 200).map(t => {
                  const f = t.frente_id ? mFrentes.get(t.frente_id) : undefined
                  const r = t.responsavel_id ? mPerfis.get(t.responsavel_id) : undefined
                  const cl = t.tarefa_checklist ?? []
                  const late = estaAtrasada(t)
                  return (
                    <article key={t.id} draggable onDragStart={() => setArrastando(t.id)} onDragEnd={() => setArrastando(null)}
                      className={`flex cursor-grab flex-col gap-2.5 rounded-[10px] border border-linha bg-white p-3 hover:border-[#C9C6BD] ${arrastando === t.id ? 'opacity-50' : ''}`}>
                      <button className="flex flex-col gap-2.5 text-left" onClick={() => setAberta(t.id)}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {f ? <EtiquetaFrente nome={f.nome} cor={f.cor} /> : <span className="text-[11px] text-cinza">sem frente</span>}
                          {t.prioridade === 'alta' && <span className="text-[11px] font-semibold text-ruim-texto">Alta</span>}
                        </div>
                        <span className={`font-medium leading-snug ${t.status === 'concluida' ? 'text-cinza line-through' : ''}`}>{t.titulo}</span>
                        <div className="flex items-center gap-2">
                          {r ? <Avatar id={r.id} nome={r.nome} tamanho={24} /> : <span className="text-xs text-cinza">sem responsável</span>}
                          <span className={late ? 'rounded-full bg-ruim-fundo px-2 text-xs font-semibold text-ruim-texto' : 'text-xs text-cinza'}>{textoPrazo(t.prazo)}</span>
                          {cl.length > 0 && <span className="num ml-auto text-xs text-cinza">{cl.filter(x => x.feito).length}/{cl.length}</span>}
                        </div>
                      </button>
                      <label className="sr-only" htmlFor={`mover-${t.id}`}>Mover para</label>
                      <select id={`mover-${t.id}`} className="h-7 rounded-md border border-linha bg-bandeja px-1 text-xs text-cinza lg:hidden" value={t.status}
                        onChange={e => mover.mutate({ id: t.id, status: e.target.value as StatusTarefa })}>
                        {STATUS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                      </select>
                    </article>
                  )
                })}
                {cards.length === 0 && <span className="px-1 py-2 text-[13px] text-cinza">Nada aqui.</span>}
                <button className="h-8 px-1 text-left text-cinza hover:text-tinta" onClick={() => criar.mutate(col.id)}>+ Adicionar</button>
              </section>
            )
          })}
        </div>
      </div>
      {aberta && <TarefaPainel id={aberta} aoFechar={() => setAberta(null)} />}
    </>
  )
}
