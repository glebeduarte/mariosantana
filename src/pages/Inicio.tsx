import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useFrentes, usePerfis, mapaPor } from '@/lib/dados'
import { useMentoria, NIVEL } from '@/lib/mentoria'
import { dataCurta, diasAte, dinheiro, hojeISO, textoPrazo } from '@/lib/util'
import { Avatar, Carregando, EtiquetaFrente, Ponto, Vazio } from '@/components/ui'
import Icone from '@/components/Icone'
import { useTarefas, estaAtrasada } from './Tarefas'
import type { Lead, Parcela } from '@/lib/tipos'

function Kpi({ rotulo, valor, detalhe, tom, to, icone, cor, atraso = 0 }: { rotulo: string; valor: string | number; detalhe: string; tom?: 'ruim' | 'alerta'; to: string; icone: string; cor: string; atraso?: number }) {
  return (
    <Link to={to} style={{ animationDelay: `${atraso}ms` }} className="cartao cartao-hover entrar relative flex flex-col gap-1.5 overflow-hidden p-5">
      <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.16] blur-xl" style={{ background: cor }} />
      <div className="flex items-center justify-between"><span className="rotulo">{rotulo}</span>
        <span className="grid h-9 w-9 place-items-center rounded-xl text-white shadow-[0_8px_16px_-8px_rgba(0,0,0,0.45)]" style={{ background: `linear-gradient(135deg, ${cor}CC, ${cor})` }}><Icone nome={icone} tamanho={17} /></span></div>
      <span className="num text-[30px] font-semibold leading-none tracking-[-0.02em]">{valor}</span>
      <span className={`text-[13px] ${tom === 'ruim' ? 'font-semibold text-ruim-texto' : tom === 'alerta' ? 'text-alerta-texto' : 'text-cinza'}`}>{detalhe}</span>
    </Link>
  )
}

function Painel({ titulo, acao, children, className = '' }: { titulo: string; acao?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`cartao flex flex-col p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-2 pb-3"><h2 className="titulo-secao">{titulo}</h2>{acao}</div>
      {children}
    </section>
  )
}

/** Início da semana (segunda) de uma data. */
function semana(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x }

export default function Inicio() {
  const { perfil } = useAuth()
  const { data: tarefas, isLoading } = useTarefas()
  const { data: frentes } = useFrentes()
  const { data: perfis } = usePerfis()
  const { data: mentoria } = useMentoria()
  const mPerfis = mapaPor(perfis)
  const mFrentes = mapaPor(frentes)

  const { data: extra } = useQuery({
    queryKey: ['inicio-extra'],
    queryFn: async () => {
      const [p, l] = await Promise.all([
        supabase.from('parcelas').select('*').neq('status', 'cancelada'),
        supabase.from('leads').select('*').not('etapa', 'in', '(fechado,perdido)'),
      ])
      return { parcelas: (p.data ?? []) as Parcela[], leads: (l.data ?? []) as Lead[] }
    },
  })

  if (isLoading) return <Carregando />
  const todas = tarefas ?? []
  const abertas = todas.filter(t => t.status !== 'concluida')
  const atrasadas = abertas.filter(estaAtrasada)
  const hoje = hojeISO()
  const inicioMes = hoje.slice(0, 8) + '01'
  const ativos = (mentoria?.resumos ?? []).filter(r => r.m.status === 'ativo')
  const emRisco = ativos.filter(r => r.nivel === 'risco')
  const mesParcelas = (extra?.parcelas ?? []).filter(p => p.vencimento.slice(0, 7) === hoje.slice(0, 7))
  const pagas = mesParcelas.filter(p => p.status === 'paga')
  const parcelasAtrasadas = (extra?.parcelas ?? []).filter(p => p.status === 'pendente' && diasAte(p.vencimento) < 0)
  const nomeM = new Map(ativos.map(r => [r.m.id, r.m.nome]))

  // Concluídas por semana: últimas 8 semanas, a atual no ouro
  const s0 = semana(new Date())
  const semanas = Array.from({ length: 8 }, (_, i) => { const d = new Date(s0); d.setDate(d.getDate() - (7 * (7 - i))); return d })
  const porSemana = semanas.map(d => {
    const fim = new Date(d); fim.setDate(fim.getDate() + 7)
    return todas.filter(t => t.concluida_em && new Date(t.concluida_em) >= d && new Date(t.concluida_em) < fim).length
  })
  const maxSem = Math.max(4, ...porSemana)
  const passoY = Math.ceil(maxSem / 4)
  const topoY = passoY * 4

  // Atenção: atrasadas, mentorados em risco, parcelas atrasadas
  const atencao = [
    ...atrasadas.sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1)).slice(0, 4).map(t => ({ id: t.id, to: '/tarefas', cor: (t.frente_id && mFrentes.get(t.frente_id)?.cor) || '#C9C6BD', titulo: t.titulo, sub: `Tarefa · ${textoPrazo(t.prazo)}` })),
    ...emRisco.slice(0, 3).map(r => ({ id: r.m.id, to: `/mentorados/${r.m.id}`, cor: NIVEL.risco.cor, titulo: r.m.nome, sub: `Mentorado · ${r.motivos[0]}` })),
    ...parcelasAtrasadas.slice(0, 3).map(p => ({ id: p.id, to: '/financeiro', cor: '#1D8C84', titulo: `Parcela ${p.numero}/${p.total} · ${nomeM.get(p.mentorado_id) ?? 'mentorado'}`, sub: `Financeiro · venceu ${dataCurta(p.vencimento)} · ${dinheiro(p.valor)}` })),
  ]

  const data = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const frase = [
    atrasadas.length ? `${atrasadas.length} tarefa${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}` : 'nenhuma tarefa atrasada',
    emRisco.length ? `${emRisco.length} mentorado${emRisco.length > 1 ? 's' : ''} em risco` : 'nenhum mentorado em risco',
  ].join(', ')

  return (
    <>
      <header className="faixa-ouro entrar relative isolate flex flex-wrap items-end justify-between gap-5 overflow-hidden rounded-3xl p-7 text-white shadow-[0_30px_60px_-34px_rgba(28,27,24,0.8)] sm:p-8">
        <span aria-hidden className="absolute -right-16 -top-24 -z-10 h-72 w-72 rounded-full border border-[#E8CC8C]/20" />
        <span aria-hidden className="absolute -right-4 -top-10 -z-10 h-44 w-44 rounded-full border border-[#E8CC8C]/15" />
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] capitalize text-white/60">{data}</span>
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.02em]">Visão geral{perfil?.nome ? <>, <span className="texto-ouro">{perfil.nome.split(' ')[0]}</span></> : ''}</h1>
          <p className="text-white/75">Hoje: {frase}.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/vitrine" className="btn h-10 border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20">Ver vitrine</Link>
          <Link to="/mentorados" className="btn h-10 border border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20">Mentorados</Link>
          <Link to="/tarefas" className="btn-ouro">Abrir quadro</Link>
        </div>
      </header>

      <section aria-label="Indicadores" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icone="tarefas" cor="#3B6FB6" atraso={60} to="/tarefas" rotulo="Tarefas abertas" valor={abertas.length} detalhe={atrasadas.length ? `${atrasadas.length} atrasada${atrasadas.length > 1 ? 's' : ''}` : 'nenhuma atrasada'} tom={atrasadas.length ? 'ruim' : undefined} />
        <Kpi icone="mentorados" cor="#9A7A30" atraso={120} to="/mentorados" rotulo="Mentorados ativos" valor={ativos.length} detalhe={emRisco.length ? `${emRisco.length} em risco` : 'nenhum em risco'} tom={emRisco.length ? 'ruim' : undefined} />
        <Kpi icone="financeiro" cor="#1D8C84" atraso={180} to="/financeiro" rotulo="Parcelas do mês" valor={mesParcelas.length ? `${pagas.length}/${mesParcelas.length}` : '-'} detalhe={mesParcelas.length ? `${dinheiro(pagas.reduce((s, p) => s + (p.valor ?? 0), 0))} recebido` : 'nenhuma cadastrada'} tom={parcelasAtrasadas.length ? 'alerta' : undefined} />
        <Kpi icone="leads" cor="#2F8A55" atraso={240} to="/leads" rotulo="Leads em aberto" valor={extra?.leads.length ?? 0} detalhe={`${extra?.leads.filter(l => l.etapa === 'novo').length ?? 0} novos aguardando contato`} />
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-labelledby="h-frentes" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between"><h2 id="h-frentes" className="titulo-secao">Frentes de atuação</h2><span className="text-[13px] text-cinza">tarefas abertas e concluídas no mês</span></div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {frentes?.map(f => {
              const daFrente = todas.filter(t => t.frente_id === f.id)
              const ab = daFrente.filter(t => t.status !== 'concluida')
              const at = ab.filter(estaAtrasada).length
              const feitas = daFrente.filter(t => t.status === 'concluida' && t.concluida_em && t.concluida_em >= inicioMes).length
              const pct = feitas + ab.length ? Math.round(feitas / (feitas + ab.length) * 100) : 0
              const prox = ab.filter(t => t.prazo).sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1))[0]
              const resp = f.responsavel_id ? mPerfis.get(f.responsavel_id) : undefined
              return (
                <Link key={f.id} to={`/tarefas?frente=${f.slug}`} className="cartao cartao-hover relative flex flex-col gap-3 overflow-hidden p-4">
                  <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16 opacity-60" style={{ background: `linear-gradient(180deg, ${f.cor}1F, transparent)` }} />
                  <div className="flex items-center gap-2"><EtiquetaFrente nome={f.nome} cor={f.cor} />
                    {resp ? <span className="ml-auto"><Avatar id={resp.id} nome={resp.nome} tamanho={24} /></span> : <span className="ml-auto text-xs text-cinza">sem responsável</span>}</div>
                  <div className="flex items-baseline gap-2">
                    <span className="num text-[28px] font-semibold leading-none">{ab.length}</span><span className="text-cinza">abertas</span>
                    {at > 0 && <span className="ml-auto rounded-full bg-ruim-fundo px-2 py-0.5 text-xs font-semibold text-ruim-texto">{at} atrasada{at > 1 ? 's' : ''}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="h-2 overflow-hidden rounded-full bg-[#EEECE6]"><div className="barra-anim h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${f.cor}99, ${f.cor})` }} /></div>
                    <span className="text-xs text-cinza">{feitas} concluída{feitas === 1 ? '' : 's'} no mês · {pct}%</span>
                  </div>
                  <span className="truncate border-t border-[#F0EEE9] pt-2.5 text-[13px]">{prox ? <>{prox.titulo} <span className="text-cinza">· {textoPrazo(prox.prazo)}</span></> : <span className="text-cinza">Sem prazos marcados</span>}</span>
                </Link>
              )
            })}
          </div>
        </section>

        <Painel titulo="Precisa de atenção" acao={<span className="num text-[13px] text-cinza">{atencao.length}</span>}>
          {atencao.length === 0 ? <Vazio>Nada pendente agora.</Vazio> : (
            <div className="flex flex-col">
              {atencao.map(a => (
                <Link key={a.id} to={a.to} className="flex items-center gap-3 rounded-lg border-t border-[#F0EEE9] px-1 py-2.5 first:border-t-0 hover:bg-[#FBFAF7]">
                  <Ponto cor={a.cor} />
                  <span className="flex min-w-0 flex-1 flex-col"><span className="truncate font-medium">{a.titulo}</span><span className="truncate text-xs text-cinza">{a.sub}</span></span>
                  <Icone nome="seta" tamanho={14} className="text-[#C9C6BD]" />
                </Link>
              ))}
            </div>
          )}
        </Painel>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        <Painel titulo="Mentorados por etapa" acao={<Link to="/mentorados" className="text-[13px] text-ouro-escuro">Ver todos</Link>}>
          {!mentoria ? <Carregando /> : (
            <div className="flex flex-col gap-3">
              {mentoria.etapas.map(e => {
                const aqui = ativos.filter(r => r.etapa?.id === e.id)
                const max = Math.max(1, ...mentoria.etapas.map(x => ativos.filter(r => r.etapa?.id === x.id).length))
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <span className="w-[120px] shrink-0 truncate text-[13px]">{e.nome}</span>
                    <div className="flex h-7 flex-1 items-center gap-[3px]">
                      {aqui.map(r => <span key={r.m.id} title={r.m.nome} className="crescer h-full rounded-[5px] shadow-[inset_0_-6px_10px_-6px_rgba(0,0,0,0.25)]" style={{ width: `${100 / max}%`, background: `linear-gradient(180deg, ${NIVEL[r.nivel].cor}BB, ${NIVEL[r.nivel].cor})` }} />)}
                    </div>
                    <span className="num w-5 text-right font-semibold">{aqui.length}</span>
                  </div>
                )
              })}
              <div className="flex flex-wrap gap-4 pt-1 text-xs text-cinza">
                {(['ok', 'atencao', 'risco'] as const).map(n => <span key={n} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: NIVEL[n].cor }} />{NIVEL[n].nome}</span>)}
              </div>
            </div>
          )}
        </Painel>

        <Painel titulo="Tarefas concluídas por semana" acao={<span className="text-[13px] text-cinza">últimas 8 semanas</span>}>
          <div className="flex gap-2">
            <div className="flex h-[150px] flex-col justify-between pb-5 text-right text-[11px] text-cinza">
              {[4, 3, 2, 1, 0].map(i => <span key={i} className="num leading-none">{passoY * i}</span>)}
            </div>
            <div className="relative flex flex-1 flex-col">
              <div className="absolute inset-x-0 top-0 flex h-[130px] flex-col justify-between">{[0, 1, 2, 3, 4].map(i => <span key={i} className={`h-px ${i === 4 ? 'bg-[#D8D5CC]' : 'bg-[#F0EEE9]'}`} />)}</div>
              <div className="relative flex h-[130px] items-end gap-2">
                {porSemana.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center justify-end" title={`${v} concluídas`}>
                    <span className="crescer w-full rounded-t-[5px]" style={{ animationDelay: `${i * 50}ms`, height: `${(v / topoY) * 130}px`, background: i === 7 ? 'linear-gradient(180deg, #E8CC8C, #9A7A30)' : 'linear-gradient(180deg, #E4E1D8, #CFCBC0)' }} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1.5">{semanas.map((d, i) => <span key={i} className="num flex-1 text-center text-[11px] text-cinza">{i === 7 ? 'esta' : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`}</span>)}</div>
            </div>
          </div>
        </Painel>

        <Painel titulo="Próximos prazos" acao={<Link to="/tarefas" className="text-[13px] text-ouro-escuro">Quadro</Link>} className="lg:col-span-2 2xl:col-span-1">
          {(() => {
            const prox = abertas.filter(t => t.prazo && diasAte(t.prazo) >= 0).sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1)).slice(0, 6)
            return prox.length === 0 ? <Vazio>Nenhum prazo marcado à frente.</Vazio> : prox.map(t => {
              const f = t.frente_id ? mFrentes.get(t.frente_id) : undefined
              const r = t.responsavel_id ? mPerfis.get(t.responsavel_id) : undefined
              return (
                <div key={t.id} className="flex items-center gap-3 border-t border-[#F0EEE9] py-2.5 first:border-t-0">
                  <Ponto cor={f?.cor ?? '#C9C6BD'} />
                  <span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                  {r && <Avatar id={r.id} nome={r.nome} tamanho={24} />}
                  <span className="num w-16 text-right text-xs text-cinza">{textoPrazo(t.prazo)}</span>
                </div>
              )
            })
          })()}
        </Painel>
      </div>
    </>
  )
}
