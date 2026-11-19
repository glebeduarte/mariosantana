import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEtapas, usePerfis, mapaPor } from '@/lib/dados'
import type { EtapaItem, Mentorado, Observacao, OnboardingItem, Parcela, Sessao } from '@/lib/tipos'
import { dataCurta, diasAte, dinheiro } from '@/lib/util'
import { Avatar, Carregando, Erro, Painel, Pilula, Vazio } from '@/components/ui'

const TIPO: Record<string, { nome: string; cls: string }> = {
  aula: { nome: 'Aula', cls: 'bg-[#E3ECF8] text-[#1F4E85]' },
  workbook: { nome: 'Workbook', cls: 'bg-ouro-claro text-ouro-escuro' },
  sessao: { nome: 'Sessão', cls: 'bg-bom-fundo text-bom-texto' },
  tarefa: { nome: 'Tarefa', cls: 'bg-[#EEECE6] text-[#4A4943]' },
}

export default function Jornada() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data: etapas } = useEtapas()
  const { data: perfis } = usePerfis()
  const mPerfis = mapaPor(perfis)
  const [etapaVista, setEtapaVista] = useState<string | null>(null)
  const [obs, setObs] = useState('')
  const [novaSessao, setNovaSessao] = useState({ titulo: '', data: '' })
  const [gerar, setGerar] = useState({ valor: '', primeira: '', meio: 'eduzz', n: '12' })

  const { data, isLoading, error } = useQuery({
    queryKey: ['jornada', id],
    queryFn: async () => {
      const [m, itens, prog, oi, onb, s, o, p] = await Promise.all([
        supabase.from('mentorados').select('*').eq('id', id!).single(),
        supabase.from('etapa_itens').select('*').order('ordem'),
        supabase.from('mentorado_itens').select('item_id').eq('mentorado_id', id!),
        supabase.from('onboarding_itens').select('*').order('ordem'),
        supabase.from('mentorado_onboarding').select('item_id').eq('mentorado_id', id!),
        supabase.from('sessoes').select('*').eq('mentorado_id', id!).order('data', { ascending: false, nullsFirst: true }),
        supabase.from('observacoes').select('*').eq('mentorado_id', id!).order('criado_em', { ascending: false }),
        supabase.from('parcelas').select('*').eq('mentorado_id', id!).order('numero'),
      ])
      if (m.error) throw m.error
      return {
        m: m.data as Mentorado, itens: (itens.data ?? []) as EtapaItem[], prog: new Set((prog.data ?? []).map(x => x.item_id as string)),
        oi: (oi.data ?? []) as OnboardingItem[], onb: new Set((onb.data ?? []).map(x => x.item_id as string)),
        sessoes: (s.data ?? []) as Sessao[], obs: (o.data ?? []) as Observacao[], parcelas: (p.data ?? []) as Parcela[],
      }
    },
  })
  const recarregar = () => { qc.invalidateQueries({ queryKey: ['jornada', id] }); qc.invalidateQueries({ queryKey: ['mentorados-painel'] }) }

  if (isLoading || !etapas) return <Carregando />
  if (error || !data) return <Erro erro={error} />
  const { m } = data
  const atual = etapas.find(e => e.id === m.etapa_id) ?? etapas[0]
  const vista = etapas.find(e => e.id === etapaVista) ?? atual
  const itensVista = data.itens.filter(i => i.etapa_id === vista.id)

  async function alternarItem(itemId: string) {
    if (data!.prog.has(itemId)) await supabase.from('mentorado_itens').delete().eq('mentorado_id', id!).eq('item_id', itemId)
    else await supabase.from('mentorado_itens').insert({ mentorado_id: id, item_id: itemId })
    recarregar()
  }
  async function alternarOnb(itemId: string) {
    if (data!.onb.has(itemId)) await supabase.from('mentorado_onboarding').delete().eq('mentorado_id', id!).eq('item_id', itemId)
    else await supabase.from('mentorado_onboarding').insert({ mentorado_id: id, item_id: itemId })
    recarregar()
  }
  async function moverEtapa(etapaId: string) { await supabase.from('mentorados').update({ etapa_id: etapaId }).eq('id', id!); recarregar() }
  async function salvarObs() { if (!obs.trim()) return; await supabase.from('observacoes').insert({ mentorado_id: id, texto: obs.trim() }); setObs(''); recarregar() }
  async function criarSessao() {
    if (!novaSessao.titulo.trim()) return
    await supabase.from('sessoes').insert({ mentorado_id: id, titulo: novaSessao.titulo.trim(), data: novaSessao.data || null, status: novaSessao.data ? 'agendada' : 'a_agendar' })
    setNovaSessao({ titulo: '', data: '' }); recarregar()
  }
  async function marcarPaga(p: Parcela) {
    await supabase.from('parcelas').update(p.status === 'paga' ? { status: 'pendente', pago_em: null } : { status: 'paga', pago_em: new Date().toISOString().slice(0, 10) }).eq('id', p.id)
    recarregar()
  }
  async function gerarParcelas() {
    const n = Number(gerar.n), valor = Number(gerar.valor.replace(',', '.'))
    if (!n || !gerar.primeira) return
    const { data: c } = await supabase.from('contratos').insert({ mentorado_id: id, numero_parcelas: n, meio: gerar.meio, valor_total: valor ? valor * n : null }).select('id').single()
    const [a, mm, d] = gerar.primeira.split('-').map(Number)
    const linhas = Array.from({ length: n }, (_, i) => {
      const dt = new Date(a, mm - 1 + i, d)
      return { contrato_id: c?.id, mentorado_id: id, numero: i + 1, total: n, valor: valor || null, meio: gerar.meio, vencimento: dt.toISOString().slice(0, 10) }
    })
    await supabase.from('parcelas').insert(linhas); recarregar()
  }

  const onbFeitos = data.oi.filter(i => data.onb.has(i.id)).length
  const pagas = data.parcelas.filter(p => p.status === 'paga').length
  const proxima = data.parcelas.find(p => p.status === 'pendente')

  return (
    <>
      <Link to="/mentorados" className="text-[13px] text-ouro-escuro">Mentorados / {m.nome}</Link>
      <header className="flex flex-wrap items-center gap-4">
        <Avatar id={m.id} nome={m.nome} tamanho={52} />
        <div className="flex min-w-[260px] flex-1 flex-col gap-1">
          <h1 className="text-[26px] font-bold leading-tight">{m.nome}</h1>
          <span className="text-[#4A4943]">{[m.especialidade, m.cidade].filter(Boolean).join(' em ') || 'Sem especialidade e cidade'} · Mentoria anual{m.inicio ? ` · início ${dataCurta(m.inicio)}` : ''}</span>
        </div>
        <label className="flex items-center gap-2"><span className="rotulo">Etapa atual</span>
          <select id="etapa-atual" className="campo w-auto" value={atual.id} onChange={e => moverEtapa(e.target.value)}>
            {etapas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
      </header>

      <section aria-label="Etapas do método" className="grid grid-cols-2 gap-1.5 md:grid-cols-3 xl:grid-cols-6">
        {etapas.map(e => {
          const its = data.itens.filter(i => i.etapa_id === e.id)
          const f = its.filter(i => data.prog.has(i.id)).length
          const pct = its.length ? (f / its.length) * 100 : 0
          const sel = e.id === vista.id
          return (
            <button key={e.id} onClick={() => setEtapaVista(e.id)} className={`flex flex-col gap-1.5 rounded-[10px] border p-3 text-left ${sel ? 'border-tinta bg-[#FAF8F3]' : 'border-linha bg-white hover:bg-bandeja'}`}>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#EEECE6]"><div className="h-full bg-ouro" style={{ width: `${pct}%` }} /></div>
              <b>{e.nome}</b>
              <span className="text-xs text-cinza">{e.id === atual.id ? 'etapa atual · ' : ''}{f} de {its.length}</span>
            </button>
          )
        })}
      </section>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Painel titulo={`Etapa ${vista.ordem} · ${vista.nome}`} direita={<span className="text-[13px] text-cinza">{itensVista.filter(i => data.prog.has(i.id)).length} de {itensVista.length}</span>}>
          {vista.descricao && <p className="pb-2 text-[13px] text-cinza">{vista.descricao}</p>}
          {itensVista.length === 0 ? <Vazio>Nenhum item cadastrado para esta etapa. Os itens de cada etapa ficam em Mentoria, na configuração do método.</Vazio> :
            itensVista.map(i => (
              <label key={i.id} className="flex cursor-pointer items-center gap-2.5 border-t border-[#F0EEE9] py-2.5">
                <input type="checkbox" id={`it-${i.id}`} checked={data.prog.has(i.id)} onChange={() => alternarItem(i.id)} className="h-4 w-4 accent-[#2F8A55]" />
                <span className={`flex-1 ${data.prog.has(i.id) ? 'text-cinza line-through' : ''}`}>{i.titulo}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${TIPO[i.tipo].cls}`}>{TIPO[i.tipo].nome}</span>
              </label>
            ))}
        </Painel>

        <div className="flex flex-col gap-4">
          <Painel titulo="Onboarding" direita={<span className="text-[13px] text-cinza">{onbFeitos} de {data.oi.length}</span>}>
            {data.oi.map(i => (
              <label key={i.id} className="flex cursor-pointer items-center gap-2.5 border-t border-[#F0EEE9] py-2">
                <input type="checkbox" id={`onb-${i.id}`} checked={data.onb.has(i.id)} onChange={() => alternarOnb(i.id)} className="h-4 w-4 accent-[#2F8A55]" />
                <span className={`flex-1 ${data.onb.has(i.id) ? 'text-cinza' : 'font-semibold'}`}>{i.titulo}</span>
                <span className="text-xs text-cinza">{i.responsavel_padrao}</span>
              </label>
            ))}
          </Painel>
          <Painel titulo="Observações do mentor">
            <label htmlFor="obs" className="sr-only">Nova observação</label>
            <textarea id="obs" rows={2} value={obs} onChange={e => setObs(e.target.value)} className="rounded-lg border border-[#DCDAD3] bg-[#FAFAF8] p-3 outline-none focus:border-tinta" placeholder="Registrar observação" />
            <button className="btn-secundario mt-2 self-start" onClick={salvarObs}>Salvar</button>
            {data.obs.map(o => (
              <div key={o.id} className="flex flex-col gap-0.5 border-t border-[#F0EEE9] py-2.5 first-of-type:mt-3">
                <span className="text-xs text-cinza">{(o.autor_id && mPerfis.get(o.autor_id)?.nome) || 'Alguém'} · {dataCurta(o.criado_em)}</span>
                <span className="whitespace-pre-wrap">{o.texto}</span>
              </div>
            ))}
          </Painel>
        </div>

        <div className="flex flex-col gap-4">
          <Painel titulo="Parcelas" direita={data.parcelas.length ? <span className="text-[13px] text-cinza">{pagas} de {data.parcelas.length} pagas</span> : undefined}>
            {data.parcelas.length === 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] text-cinza">Gerar as parcelas do contrato:</span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1"><span className="rotulo">Parcelas</span><input id="g-n" className="campo" value={gerar.n} onChange={e => setGerar(g => ({ ...g, n: e.target.value }))} /></label>
                  <label className="flex flex-col gap-1"><span className="rotulo">Valor de cada</span><input id="g-valor" className="campo" inputMode="decimal" value={gerar.valor} onChange={e => setGerar(g => ({ ...g, valor: e.target.value }))} /></label>
                  <label className="flex flex-col gap-1"><span className="rotulo">1º vencimento</span><input id="g-primeira" type="date" className="campo" value={gerar.primeira} onChange={e => setGerar(g => ({ ...g, primeira: e.target.value }))} /></label>
                  <label className="flex flex-col gap-1"><span className="rotulo">Meio</span><select id="g-meio" className="campo" value={gerar.meio} onChange={e => setGerar(g => ({ ...g, meio: e.target.value }))}><option value="eduzz">Eduzz</option><option value="pix">Pix</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option></select></label>
                </div>
                <button className="btn-secundario self-start" onClick={gerarParcelas}>Gerar parcelas</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-[3px]">
                  {data.parcelas.map(p => (
                    <button key={p.id} title={`${p.numero}/${p.total} · ${dataCurta(p.vencimento)} · ${p.status}. Clique para marcar como ${p.status === 'paga' ? 'pendente' : 'paga'}.`}
                      onClick={() => marcarPaga(p)} className="h-[22px] rounded"
                      style={{ background: p.status === 'paga' ? '#2F8A55' : diasAte(p.vencimento) < 0 ? '#C8402F' : '#EEECE6' }} />
                  ))}
                </div>
                {proxima && <span className="pt-2 text-[13px]">Próxima: {proxima.numero}/{proxima.total} em {dataCurta(proxima.vencimento)} · {dinheiro(proxima.valor)}{proxima.meio ? ` · ${proxima.meio}` : ''}</span>}
              </>
            )}
          </Painel>
          <Painel titulo="Sessões">
            {data.sessoes.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 border-t border-[#F0EEE9] py-2">
                <span className="font-semibold">{s.titulo}</span>
                {s.data ? <span className="text-xs text-cinza">{new Date(s.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span> : <Pilula tom="alerta">sem data</Pilula>}
              </div>
            ))}
            <div className="flex flex-col gap-2 pt-2">
              <label htmlFor="s-titulo" className="sr-only">Título da sessão</label>
              <input id="s-titulo" className="campo" placeholder="Nova sessão (ex.: Alinhamento 1:1)" value={novaSessao.titulo} onChange={e => setNovaSessao(s => ({ ...s, titulo: e.target.value }))} />
              <div className="flex gap-2">
                <label htmlFor="s-data" className="sr-only">Data</label>
                <input id="s-data" type="datetime-local" className="campo" value={novaSessao.data} onChange={e => setNovaSessao(s => ({ ...s, data: e.target.value }))} />
                <button className="btn-secundario" onClick={criarSessao}>Adicionar</button>
              </div>
            </div>
          </Painel>
        </div>
      </div>
    </>
  )
}
