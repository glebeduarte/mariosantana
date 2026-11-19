import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Mentorado, Parcela } from '@/lib/tipos'
import { dataCurta, diasAte, dinheiro, hojeISO } from '@/lib/util'
import { Cabecalho, Carregando, Erro, Pilula, Vazio } from '@/components/ui'

export default function Financeiro() {
  const qc = useQueryClient()
  const [mes, setMes] = useState(hojeISO().slice(0, 7))
  const { data, isLoading, error } = useQuery({
    queryKey: ['financeiro'],
    queryFn: async () => {
      const [p, m] = await Promise.all([
        supabase.from('parcelas').select('*').neq('status', 'cancelada').order('vencimento'),
        supabase.from('mentorados').select('id,nome'),
      ])
      if (p.error) throw p.error
      return { parcelas: p.data as Parcela[], nomes: new Map(((m.data ?? []) as Pick<Mentorado, 'id' | 'nome'>[]).map(x => [x.id, x.nome])) }
    },
  })

  async function alternar(p: Parcela) {
    await supabase.from('parcelas').update(p.status === 'paga' ? { status: 'pendente', pago_em: null } : { status: 'paga', pago_em: hojeISO() }).eq('id', p.id)
    qc.invalidateQueries({ queryKey: ['financeiro'] }); qc.invalidateQueries({ queryKey: ['contagens-menu'] })
  }

  if (isLoading) return <Carregando />
  if (error) return <Erro erro={error} />
  const todas = data!.parcelas
  const atrasadas = todas.filter(p => p.status === 'pendente' && diasAte(p.vencimento) < 0)
  const doMes = todas.filter(p => p.vencimento.slice(0, 7) === mes)
  const lista = [...atrasadas.filter(p => p.vencimento.slice(0, 7) !== mes), ...doMes]
  const soma = (ps: Parcela[]) => ps.reduce((s, p) => s + (p.valor ?? 0), 0)
  const recebido = soma(doMes.filter(p => p.status === 'paga'))

  return (
    <>
      <Cabecalho titulo="Financeiro"
        frase={atrasadas.length ? `${atrasadas.length} parcela${atrasadas.length > 1 ? 's' : ''} atrasada${atrasadas.length > 1 ? 's' : ''}, somando ${dinheiro(soma(atrasadas))}.` : 'Nenhuma parcela atrasada.'}
        acoes={<label className="flex items-center gap-2"><span className="rotulo">Mês</span><input id="mes" type="month" className="campo w-auto" value={mes} onChange={e => setMes(e.target.value)} /></label>} />

      <section aria-label="Resumo do mês" className="cartao grid grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 p-4"><span className="rotulo">Previsto no mês</span><span className="num text-2xl font-semibold">{dinheiro(soma(doMes))}</span></div>
        <div className="flex flex-col gap-1 border-l border-linha p-4"><span className="rotulo">Recebido</span><span className="num text-2xl font-semibold">{dinheiro(recebido)}</span></div>
        <div className="flex flex-col gap-1 border-t border-linha p-4 lg:border-l lg:border-t-0"><span className="rotulo">Parcelas pagas</span><span className="num text-2xl font-semibold">{doMes.filter(p => p.status === 'paga').length} de {doMes.length}</span></div>
        <div className="flex flex-col gap-1 border-l border-t border-linha p-4 lg:border-t-0"><span className="rotulo">Em atraso (todos os meses)</span><span className={`num text-2xl font-semibold ${atrasadas.length ? 'text-ruim' : ''}`}>{dinheiro(soma(atrasadas))}</span></div>
      </section>

      {lista.length === 0 ? <Vazio>Nenhuma parcela neste mês. As parcelas são geradas na jornada de cada mentorado.</Vazio> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead><tr className="text-left text-[13px] text-cinza">
              <th className="px-2 py-2.5 font-medium">Mentorado</th><th className="px-2 text-right font-medium">Parcela</th><th className="px-2 text-right font-medium">Vencimento</th>
              <th className="px-2 text-right font-medium">Valor</th><th className="px-2 font-medium">Meio</th><th className="px-2 font-medium">Situação</th><th />
            </tr></thead>
            <tbody>{lista.map(p => {
              const d = diasAte(p.vencimento)
              return (
                <tr key={p.id} className="border-t border-[#F0EEE9]">
                  <td className="px-2 py-2.5 font-semibold"><Link to={`/mentorados/${p.mentorado_id}`}>{data!.nomes.get(p.mentorado_id) ?? '-'}</Link></td>
                  <td className="num px-2 text-right">{p.numero}/{p.total}</td>
                  <td className="num px-2 text-right">{dataCurta(p.vencimento)}</td>
                  <td className="num px-2 text-right">{dinheiro(p.valor)}</td>
                  <td className="px-2 text-cinza">{p.meio ?? '-'}</td>
                  <td className="px-2">{p.status === 'paga' ? <Pilula tom="bom">Paga</Pilula> : d < 0 ? <Pilula tom="ruim">Atrasada {-d} dia{d === -1 ? '' : 's'}</Pilula> : d <= 7 ? <Pilula tom="alerta">Vence em {d} dia{d === 1 ? '' : 's'}</Pilula> : <Pilula>A vencer</Pilula>}</td>
                  <td className="px-2 text-right"><button className="btn-secundario h-8 px-3 text-[13px]" onClick={() => alternar(p)}>{p.status === 'paga' ? 'Desfazer' : 'Marcar paga'}</button></td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
    </>
  )
}
