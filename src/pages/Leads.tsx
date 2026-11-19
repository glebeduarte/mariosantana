import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EtapaLead, Lead } from '@/lib/tipos'
import { ETAPAS_LEAD, dataCurta } from '@/lib/util'
import { Cabecalho, Carregando, Erro, Pilula } from '@/components/ui'

export default function Leads() {
  const qc = useQueryClient()
  const [novo, setNovo] = useState(false)
  const [arrastando, setArrastando] = useState<string | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase.from('leads').select('*').order('criado_em', { ascending: false })
      if (error) throw error
      return data as Lead[]
    },
  })
  const recarregar = () => { qc.invalidateQueries({ queryKey: ['leads'] }); qc.invalidateQueries({ queryKey: ['contagens-menu'] }) }

  async function mover(id: string, etapa: EtapaLead) { await supabase.from('leads').update({ etapa }).eq('id', id); recarregar() }
  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = (k: string) => String(f.get(k) || '') || null
    await supabase.from('leads').insert({ nome: v('nome'), email: v('email'), telefone: v('telefone'), cidade: v('cidade'), origem: v('origem') ?? 'manual' })
    setNovo(false); recarregar()
  }

  if (isLoading) return <Carregando />
  if (error) return <Erro erro={error} />
  const leads = data ?? []

  return (
    <>
      <Cabecalho titulo="Leads" frase={`${leads.filter(l => !['fechado', 'perdido'].includes(l.etapa)).length} em aberto no funil da mentoria anual. O formulário de qualificação e o diagnóstico passam a cair aqui na próxima etapa.`}
        acoes={<button className="btn-primario" onClick={() => setNovo(v => !v)}>Novo lead</button>} />
      {novo && (
        <form onSubmit={criar} className="cartao grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          {[['nome', 'Nome'], ['email', 'E-mail'], ['telefone', 'Telefone'], ['cidade', 'Cidade'], ['origem', 'Origem']].map(([n, r]) => (
            <label key={n} className="flex flex-col gap-1"><span className="rotulo">{r}</span><input id={`l-${n}`} name={n} className="campo" required={n === 'nome'} /></label>
          ))}
          <div className="flex items-end gap-2"><button className="btn-primario">Salvar</button><button type="button" className="btn-secundario" onClick={() => setNovo(false)}>Cancelar</button></div>
        </form>
      )}
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1150px] grid-cols-6 items-start gap-3">
          {ETAPAS_LEAD.map(et => {
            const aqui = leads.filter(l => l.etapa === et.id)
            return (
              <section key={et.id} className="flex flex-col gap-2 rounded-xl bg-bandeja p-3" onDragOver={e => e.preventDefault()}
                onDrop={() => { if (arrastando) mover(arrastando, et.id); setArrastando(null) }}>
                <div className="flex justify-between"><h2 className="text-sm font-bold">{et.nome}</h2><span className="text-cinza">{aqui.length}</span></div>
                {aqui.map(l => (
                  <article key={l.id} draggable onDragStart={() => setArrastando(l.id)} className="flex cursor-grab flex-col gap-1 rounded-[10px] border border-linha bg-white p-3">
                    <b>{l.nome}</b>
                    <span className="text-xs text-cinza">{[l.cidade, l.origem, dataCurta(l.criado_em)].filter(Boolean).join(' · ')}</span>
                    {l.qualificado === false ? <Pilula tom="ruim">Desqualificado{l.motivo_desqualificacao ? ` · ${l.motivo_desqualificacao}` : ''}</Pilula>
                      : l.pontuacao != null ? <Pilula tom="bom">Pontuação {l.pontuacao}</Pilula> : null}
                    <label className="sr-only" htmlFor={`le-${l.id}`}>Mover para</label>
                    <select id={`le-${l.id}`} className="mt-1 h-7 rounded-md border border-linha bg-bandeja px-1 text-xs text-cinza lg:hidden" value={l.etapa} onChange={e => mover(l.id, e.target.value as EtapaLead)}>
                      {ETAPAS_LEAD.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}
                    </select>
                  </article>
                ))}
                {aqui.length === 0 && <span className="text-[13px] text-cinza">Nada aqui.</span>}
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}
