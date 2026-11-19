import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useFrentes, usePerfis, mapaPor } from '@/lib/dados'
import type { Comentario, ItemChecklist, Tarefa } from '@/lib/tipos'
import { STATUS } from '@/lib/util'
import { Avatar } from './ui'

export default function TarefaPainel({ id, aoFechar }: { id: string; aoFechar: () => void }) {
  const qc = useQueryClient()
  const { data: frentes } = useFrentes()
  const { data: perfis } = usePerfis()
  const mPerfis = mapaPor(perfis)

  const { data: t } = useQuery({
    queryKey: ['tarefa', id],
    queryFn: async () => (await supabase.from('tarefas').select('*').eq('id', id).single()).data as Tarefa,
  })
  const { data: itens } = useQuery({
    queryKey: ['checklist', id],
    queryFn: async () => (await supabase.from('tarefa_checklist').select('*').eq('tarefa_id', id).order('ordem')).data as ItemChecklist[],
  })
  const { data: comentarios } = useQuery({
    queryKey: ['comentarios', id],
    queryFn: async () => (await supabase.from('tarefa_comentarios').select('*').eq('tarefa_id', id).order('criado_em')).data as Comentario[],
  })

  const [rascunho, setRascunho] = useState<Partial<Tarefa>>({})
  useEffect(() => { if (t) setRascunho(t) }, [t])
  const [novoItem, setNovoItem] = useState('')
  const [novoComentario, setNovoComentario] = useState('')
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)

  const atualizarTudo = () => {
    qc.invalidateQueries({ queryKey: ['tarefas'] }); qc.invalidateQueries({ queryKey: ['tarefa', id] })
    qc.invalidateQueries({ queryKey: ['checklist', id] }); qc.invalidateQueries({ queryKey: ['comentarios', id] })
    qc.invalidateQueries({ queryKey: ['contagens-menu'] })
  }

  const salvar = useMutation({
    mutationFn: async (campos: Partial<Tarefa>) => {
      const { error } = await supabase.from('tarefas').update(campos).eq('id', id)
      if (error) throw error
    },
    onSuccess: atualizarTudo,
  })
  const campo = <K extends keyof Tarefa>(k: K, v: Tarefa[K]) => { setRascunho(r => ({ ...r, [k]: v })); salvar.mutate({ [k]: v } as Partial<Tarefa>) }

  async function addItem() {
    if (!novoItem.trim()) return
    await supabase.from('tarefa_checklist').insert({ tarefa_id: id, texto: novoItem.trim(), ordem: (itens?.length ?? 0) + 1 })
    setNovoItem(''); atualizarTudo()
  }
  async function marcar(i: ItemChecklist) { await supabase.from('tarefa_checklist').update({ feito: !i.feito }).eq('id', i.id); atualizarTudo() }
  async function tirarItem(i: ItemChecklist) { await supabase.from('tarefa_checklist').delete().eq('id', i.id); atualizarTudo() }
  async function comentar() {
    if (!novoComentario.trim()) return
    await supabase.from('tarefa_comentarios').insert({ tarefa_id: id, texto: novoComentario.trim() })
    setNovoComentario(''); atualizarTudo()
  }
  async function excluir() { await supabase.from('tarefas').delete().eq('id', id); atualizarTudo(); aoFechar() }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Tarefa">
      <div className="absolute inset-0 bg-black/25" onClick={aoFechar} />
      <div className="relative flex h-full w-full max-w-[520px] flex-col gap-5 overflow-y-auto bg-white p-6 shadow-2xl">
        {!t ? <span className="text-cinza">Carregando…</span> : (
          <>
            <div className="flex items-start gap-3">
              <label htmlFor="t-titulo" className="sr-only">Título</label>
              <textarea id="t-titulo" rows={2} className="flex-1 resize-none rounded-lg border border-transparent p-1 text-xl font-bold outline-none hover:border-linha focus:border-tinta"
                value={rascunho.titulo ?? ''} onChange={e => setRascunho(r => ({ ...r, titulo: e.target.value }))}
                onBlur={() => rascunho.titulo !== t.titulo && salvar.mutate({ titulo: rascunho.titulo })} />
              <button onClick={aoFechar} className="btn-secundario h-9 px-3">Fechar</button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1"><span className="rotulo">Situação</span>
                <select id="t-status" className="campo" value={rascunho.status} onChange={e => campo('status', e.target.value as Tarefa['status'])}>
                  {STATUS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></label>
              <label className="flex flex-col gap-1"><span className="rotulo">Frente</span>
                <select id="t-frente" className="campo" value={rascunho.frente_id ?? ''} onChange={e => campo('frente_id', e.target.value || null)}>
                  <option value="">Sem frente</option>{frentes?.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
              <label className="flex flex-col gap-1"><span className="rotulo">Responsável</span>
                <select id="t-resp" className="campo" value={rascunho.responsavel_id ?? ''} onChange={e => campo('responsavel_id', e.target.value || null)}>
                  <option value="">Ninguém</option>{perfis?.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></label>
              <label className="flex flex-col gap-1"><span className="rotulo">Prazo</span>
                <input id="t-prazo" type="date" className="campo" value={rascunho.prazo ?? ''} onChange={e => campo('prazo', e.target.value || null)} /></label>
              <label className="flex flex-col gap-1"><span className="rotulo">Prioridade</span>
                <select id="t-prio" className="campo" value={rascunho.prioridade} onChange={e => campo('prioridade', e.target.value as Tarefa['prioridade'])}>
                  <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
            </div>

            <label className="flex flex-col gap-1"><span className="rotulo">Descrição</span>
              <textarea id="t-desc" rows={4} className="rounded-lg border border-[#DCDAD3] bg-[#FAFAF8] p-3 outline-none focus:border-tinta"
                value={rascunho.descricao ?? ''} onChange={e => setRascunho(r => ({ ...r, descricao: e.target.value }))}
                onBlur={() => rascunho.descricao !== t.descricao && salvar.mutate({ descricao: rascunho.descricao })} /></label>

            <section className="flex flex-col gap-1">
              <h3 className="font-bold">Checklist {itens && itens.length > 0 && <span className="num font-normal text-cinza">{itens.filter(i => i.feito).length}/{itens.length}</span>}</h3>
              {itens?.map(i => (
                <div key={i.id} className="group flex items-center gap-2 border-t border-[#F0EEE9] py-2">
                  <input type="checkbox" id={`ck-${i.id}`} checked={i.feito} onChange={() => marcar(i)} className="h-4 w-4 accent-[#2F8A55]" />
                  <label htmlFor={`ck-${i.id}`} className={`flex-1 ${i.feito ? 'text-cinza line-through' : ''}`}>{i.texto}</label>
                  <button onClick={() => tirarItem(i)} className="text-xs text-cinza opacity-0 group-hover:opacity-100">remover</button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <label htmlFor="novo-item" className="sr-only">Novo item</label>
                <input id="novo-item" className="campo" placeholder="Adicionar item" value={novoItem} onChange={e => setNovoItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} />
                <button className="btn-secundario" onClick={addItem}>Adicionar</button>
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="font-bold">Comentários</h3>
              {comentarios?.map(c => {
                const a = c.autor_id ? mPerfis.get(c.autor_id) : undefined
                return (
                  <div key={c.id} className="flex gap-2.5">
                    {a && <Avatar id={a.id} nome={a.nome} />}
                    <div className="flex flex-col"><span className="text-xs text-cinza">{a?.nome ?? 'Alguém'} · {new Date(c.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span><span className="whitespace-pre-wrap">{c.texto}</span></div>
                  </div>
                )
              })}
              <label htmlFor="novo-com" className="sr-only">Novo comentário</label>
              <textarea id="novo-com" rows={2} className="rounded-lg border border-[#DCDAD3] bg-[#FAFAF8] p-3 outline-none focus:border-tinta" placeholder="Escreva um comentário"
                value={novoComentario} onChange={e => setNovoComentario(e.target.value)} />
              <button className="btn-secundario self-start" onClick={comentar}>Comentar</button>
            </section>

            <div className="mt-auto border-t border-linha pt-4">
              {confirmarExclusao ? (
                <div className="flex flex-wrap items-center gap-2"><span>Excluir esta tarefa de vez?</span>
                  <button className="btn h-9 bg-ruim px-3 text-white" onClick={excluir}>Excluir</button>
                  <button className="btn-secundario h-9 px-3" onClick={() => setConfirmarExclusao(false)}>Cancelar</button></div>
              ) : <button className="text-ruim-texto" onClick={() => setConfirmarExclusao(true)}>Excluir tarefa</button>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
