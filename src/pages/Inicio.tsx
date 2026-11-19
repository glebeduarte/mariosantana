import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { useFrentes, usePerfis, mapaPor } from '@/lib/dados'
import { diasAte, hojeISO, textoPrazo } from '@/lib/util'
import { Avatar, Barra, Cabecalho, Carregando, EtiquetaFrente, Painel, Ponto, Vazio } from '@/components/ui'
import { useTarefas, estaAtrasada } from './Tarefas'
import type { Mentorado, Parcela, Lead } from '@/lib/tipos'

export default function Inicio() {
  const { perfil } = useAuth()
  const { data: tarefas, isLoading } = useTarefas()
  const { data: frentes } = useFrentes()
  const { data: perfis } = usePerfis()
  const mPerfis = mapaPor(perfis)
  const mFrentes = mapaPor(frentes)

  const { data: extra } = useQuery({
    queryKey: ['inicio-extra'],
    queryFn: async () => {
      const ini = hojeISO().slice(0, 8) + '01'
      const [m, p, l] = await Promise.all([
        supabase.from('mentorados').select('*').eq('status', 'ativo'),
        supabase.from('parcelas').select('*').gte('vencimento', ini).neq('status', 'cancelada'),
        supabase.from('leads').select('*').not('etapa', 'in', '(fechado,perdido)'),
      ])
      return { mentorados: (m.data ?? []) as Mentorado[], parcelas: (p.data ?? []) as Parcela[], leads: (l.data ?? []) as Lead[] }
    },
  })

  if (isLoading) return <Carregando />
  const todas = tarefas ?? []
  const abertas = todas.filter(t => t.status !== 'concluida')
  const atrasadas = abertas.filter(estaAtrasada)
  const inicioMes = hojeISO().slice(0, 8) + '01'
  const foco = abertas
    .filter(t => t.prazo && diasAte(t.prazo) <= 0)
    .sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1))
    .slice(0, 6)

  const mesParcelas = (extra?.parcelas ?? []).filter(p => p.vencimento.slice(0, 7) === hojeISO().slice(0, 7))
  const pagas = mesParcelas.filter(p => p.status === 'paga').length
  const parcelasAtrasadas = (extra?.parcelas ?? []).filter(p => p.status === 'pendente' && diasAte(p.vencimento) < 0).length
  const frenteMaisAtrasada = frentes?.map(f => ({ f, n: atrasadas.filter(t => t.frente_id === f.id).length })).sort((a, b) => b.n - a.n)[0]

  const frase = atrasadas.length === 0
    ? 'Nenhuma tarefa atrasada.'
    : `${atrasadas.length} tarefa${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}${frenteMaisAtrasada && frenteMaisAtrasada.n ? `, ${frenteMaisAtrasada.n} na frente ${frenteMaisAtrasada.f.nome}` : ''}.`

  return (
    <>
      <Cabecalho titulo={`Início${perfil?.nome ? ' · ' + perfil.nome.split(' ')[0] : ''}`} frase={frase}
        acoes={<Link to="/tarefas" className="btn-primario">Abrir quadro</Link>} />

      <section aria-labelledby="h-frentes" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 id="h-frentes" className="text-[17px] font-bold">Frentes de atuação</h2>
          <span className="text-[13px] text-cinza">{abertas.length} tarefas abertas · {atrasadas.length} atrasadas</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {frentes?.map(f => {
            const daFrente = todas.filter(t => t.frente_id === f.id)
            const ab = daFrente.filter(t => t.status !== 'concluida')
            const at = ab.filter(estaAtrasada).length
            const feitasMes = daFrente.filter(t => t.status === 'concluida' && t.concluida_em && t.concluida_em >= inicioMes).length
            const pct = feitasMes + ab.length ? Math.round((feitasMes / (feitasMes + ab.length)) * 100) : 0
            const prox = ab.filter(t => t.prazo).sort((a, b) => (a.prazo! < b.prazo! ? -1 : 1))[0]
            const resp = f.responsavel_id ? mPerfis.get(f.responsavel_id) : undefined
            return (
              <Link key={f.id} to={`/tarefas?frente=${f.slug}`} className="cartao flex flex-col gap-3 p-4 hover:border-[#C9C6BD]">
                <div className="flex items-center gap-2"><EtiquetaFrente nome={f.nome} cor={f.cor} /><span className="ml-auto text-xs text-cinza">{resp?.nome ?? 'sem responsável'}</span></div>
                <div className="flex items-baseline gap-3">
                  <span className="num text-[30px] font-semibold">{ab.length}</span><span className="text-cinza">abertas</span>
                  {at ? <span className="rounded-full bg-ruim-fundo px-2 text-xs font-semibold text-ruim-texto">{at} atrasada{at > 1 ? 's' : ''}</span> : <span className="text-xs text-cinza">nada atrasado</span>}
                </div>
                <div className="flex flex-col gap-1.5"><div className="flex"><Barra pct={pct} cor={f.cor} /></div><span className="text-xs text-cinza">{feitasMes} concluídas no mês · {pct}%</span></div>
                <span className="text-[13px]">{prox ? <>Próximo: {prox.titulo} · {textoPrazo(prox.prazo)}</> : <span className="text-cinza">Sem prazos marcados</span>}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.3fr_1fr_1fr]">
        <Painel titulo="Para hoje e atrasadas" direita={<Link to="/tarefas" className="text-[13px] text-ouro-escuro">Ver quadro</Link>}>
          {foco.length === 0 ? <Vazio>Nada vencendo hoje.</Vazio> : foco.map(t => {
            const f = t.frente_id ? mFrentes.get(t.frente_id) : undefined
            const r = t.responsavel_id ? mPerfis.get(t.responsavel_id) : undefined
            return (
              <div key={t.id} className="flex items-center gap-2.5 border-t border-[#F0EEE9] py-2.5">
                <Ponto cor={f?.cor ?? '#C9C6BD'} /><span className="min-w-0 flex-1 truncate">{t.titulo}</span>
                {r && <Avatar id={r.id} nome={r.nome} />}
                <span className={`w-16 text-right text-xs ${estaAtrasada(t) ? 'font-semibold text-ruim-texto' : 'text-cinza'}`}>{textoPrazo(t.prazo)}</span>
              </div>
            )
          })}
        </Painel>

        <Painel titulo="Agenda de hoje" direita={<span className="text-xs text-cinza">Google Agenda</span>}>
          <Vazio>A ligação com o Google Agenda do Dr. Mário entra na próxima etapa.</Vazio>
        </Painel>

        <Painel titulo="Saúde da mentoria" direita={<Link to="/mentorados" className="text-[13px] text-ouro-escuro">Mentorados</Link>}>
          {(extra?.mentorados.length ?? 0) === 0 ? <Vazio>Nenhum mentorado ativo.</Vazio> : (
            <div className="flex flex-col gap-1"><span className="num text-[30px] font-semibold">{extra!.mentorados.length}</span><span className="text-cinza">mentorados ativos</span></div>
          )}
        </Painel>
      </div>

      <section aria-label="Resumo comercial e financeiro" className="cartao grid grid-cols-2 lg:grid-cols-4">
        <Link to="/leads" className="flex flex-col gap-1 p-4"><span className="rotulo">Leads em aberto</span><span className="num text-2xl font-semibold">{extra?.leads.length ?? 0}</span><span className="text-xs text-cinza">{extra?.leads.filter(l => l.etapa === 'novo').length ?? 0} novos</span></Link>
        <Link to="/financeiro" className="flex flex-col gap-1 border-l border-linha p-4"><span className="rotulo">Parcelas do mês</span><span className="num text-2xl font-semibold">{pagas} de {mesParcelas.length} pagas</span><span className={`text-xs ${parcelasAtrasadas ? 'text-ruim-texto' : 'text-cinza'}`}>{parcelasAtrasadas} atrasada{parcelasAtrasadas === 1 ? '' : 's'}</span></Link>
        <Link to="/tarefas" className="flex flex-col gap-1 border-t border-linha p-4 lg:border-l lg:border-t-0"><span className="rotulo">Concluídas no mês</span><span className="num text-2xl font-semibold">{todas.filter(t => t.concluida_em && t.concluida_em >= inicioMes).length}</span><span className="text-xs text-cinza">todas as frentes</span></Link>
        <Link to="/membros" className="flex flex-col gap-1 border-l border-t border-linha p-4 lg:border-t-0"><span className="rotulo">Área de membros</span><span className="text-2xl font-semibold">Cursos e alunos</span><span className="text-xs text-cinza">6 cursos, 70 aulas, 66 matrículas migradas</span></Link>
      </section>
    </>
  )
}
