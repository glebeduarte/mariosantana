import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEtapas, mapaPor } from '@/lib/dados'
import type { Mentorado, Parcela } from '@/lib/tipos'
import { diasAte } from '@/lib/util'
import { Avatar, Barra, Cabecalho, Carregando, Erro, Pilula, Vazio } from '@/components/ui'

export interface Saude { nivel: 'ok' | 'atencao' | 'risco'; motivos: string[] }

export function avaliar(m: Mentorado, onbFeitos: number, onbTotal: number, parcelas: Parcela[]): Saude {
  const motivos: string[] = []
  let risco = false
  const atrasada = parcelas.find(p => p.mentorado_id === m.id && p.status === 'pendente' && diasAte(p.vencimento) < 0)
  if (atrasada) { motivos.push(`parcela ${atrasada.numero}/${atrasada.total} atrasada`); risco = true }
  if (m.ultimo_acesso) {
    const dias = Math.floor((Date.now() - new Date(m.ultimo_acesso).getTime()) / 86400000)
    if (dias >= 10) { motivos.push(`${dias} dias sem acesso`); risco = true }
  }
  if (onbFeitos < onbTotal) motivos.push(`onboarding ${onbFeitos}/${onbTotal}`)
  return { nivel: risco ? 'risco' : motivos.length ? 'atencao' : 'ok', motivos }
}

export default function Mentorados() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data: etapas } = useEtapas()
  const mEtapas = mapaPor(etapas)
  const [novo, setNovo] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['mentorados-painel'],
    queryFn: async () => {
      const [m, o, oi, p, it, prog] = await Promise.all([
        supabase.from('mentorados').select('*').order('nome'),
        supabase.from('mentorado_onboarding').select('mentorado_id'),
        supabase.from('onboarding_itens').select('id'),
        supabase.from('parcelas').select('*').neq('status', 'cancelada'),
        supabase.from('etapa_itens').select('id,etapa_id'),
        supabase.from('mentorado_itens').select('mentorado_id,item_id'),
      ])
      if (m.error) throw m.error
      return {
        mentorados: m.data as Mentorado[], onb: (o.data ?? []) as { mentorado_id: string }[], onbTotal: oi.data?.length ?? 7,
        parcelas: (p.data ?? []) as Parcela[], itens: (it.data ?? []) as { id: string; etapa_id: string }[],
        prog: (prog.data ?? []) as { mentorado_id: string; item_id: string }[],
      }
    },
  })

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const primeira = etapas?.[0]?.id ?? null
    const { data: plano } = await supabase.from('planos_mentoria').select('id').limit(1).maybeSingle()
    const { data: criado, error } = await supabase.from('mentorados').insert({
      nome: String(f.get('nome')), email: String(f.get('email') || '') || null, cidade: String(f.get('cidade') || '') || null,
      especialidade: String(f.get('especialidade') || '') || null, inicio: String(f.get('inicio') || '') || null, etapa_id: primeira, plano_id: plano?.id ?? null,
    }).select('id').single()
    if (error) { alertaErro(error.message); return }
    qc.invalidateQueries({ queryKey: ['mentorados-painel'] })
    nav(`/mentorados/${criado.id}`)
  }
  const [erroForm, alertaErro] = useState<string | null>(null)

  if (isLoading) return <Carregando />
  if (error) return <Erro erro={error} />
  const ms = (data?.mentorados ?? []).filter(m => m.status === 'ativo')
  const saude = new Map(ms.map(m => [m.id, avaliar(m, data!.onb.filter(o => o.mentorado_id === m.id).length, data!.onbTotal, data!.parcelas)]))
  const risco = ms.filter(m => saude.get(m.id)!.nivel === 'risco')

  return (
    <>
      <Cabecalho titulo="Mentorados"
        frase={ms.length === 0 ? 'Nenhum mentorado ativo.' : `${ms.length} ativos na mentoria anual.${risco.length ? ` ${risco.map(m => m.nome).join(', ')} em risco.` : ''}`}
        acoes={<button className="btn-primario" onClick={() => setNovo(v => !v)}>Novo mentorado</button>} />

      {novo && (
        <form onSubmit={criar} className="cartao grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          {[['nome', 'Nome', true], ['email', 'E-mail', false], ['cidade', 'Cidade', false], ['especialidade', 'Especialidade', false]].map(([n, r, req]) => (
            <label key={n as string} className="flex flex-col gap-1"><span className="rotulo">{r}</span><input id={`m-${n}`} name={n as string} className="campo" required={!!req} /></label>
          ))}
          <label className="flex flex-col gap-1"><span className="rotulo">Início</span><input id="m-inicio" name="inicio" type="date" className="campo" /></label>
          <div className="flex items-end gap-2"><button className="btn-primario">Criar e abrir jornada</button><button type="button" className="btn-secundario" onClick={() => setNovo(false)}>Cancelar</button></div>
          {erroForm && <p className="text-ruim-texto sm:col-span-3">{erroForm}</p>}
        </form>
      )}

      <section aria-labelledby="h-etapas" className="flex flex-col gap-2.5">
        <h2 id="h-etapas" className="text-[17px] font-bold">Onde cada um está no método</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {etapas?.map(e => {
            const aqui = ms.filter(m => m.etapa_id === e.id)
            return (
              <div key={e.id} className="flex min-h-24 flex-col gap-2 rounded-[10px] bg-bandeja p-3">
                <div className="flex justify-between"><b>{e.nome === 'Maturidade Alcançada' ? 'Maturidade' : e.nome}</b><span className="text-cinza">{aqui.length}</span></div>
                <div className="flex flex-wrap gap-1">{aqui.map(m => {
                  const n = saude.get(m.id)!.nivel
                  return <Link key={m.id} to={`/mentorados/${m.id}`} className={`rounded-md border border-linha px-2 py-0.5 text-xs font-semibold ${n === 'risco' ? 'bg-ruim-fundo text-ruim-texto' : n === 'atencao' ? 'bg-alerta-fundo' : 'bg-white'}`}>{m.nome.replace(/^Dra?\.\s*/, '')}</Link>
                })}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="h-saude" className="flex flex-col gap-1.5">
        <h2 id="h-saude" className="text-[17px] font-bold">Saúde de cada mentorado</h2>
        {ms.length === 0 ? <Vazio>Sem mentorados ativos.</Vazio> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead><tr className="text-left text-[13px] text-cinza">
                <th className="px-2 py-2.5 font-medium">Mentorado</th><th className="px-2 font-medium">Etapa</th><th className="w-40 px-2 font-medium">Progresso da etapa</th>
                <th className="px-2 text-right font-medium">Onboarding</th><th className="px-2 font-medium">Parcelas</th><th className="px-2 font-medium">Situação</th><th />
              </tr></thead>
              <tbody>{ms.map(m => {
                const s = saude.get(m.id)!
                const itensEtapa = data!.itens.filter(i => i.etapa_id === m.etapa_id)
                const feitos = data!.prog.filter(p => p.mentorado_id === m.id && itensEtapa.some(i => i.id === p.item_id)).length
                const pct = itensEtapa.length ? Math.round((feitos / itensEtapa.length) * 100) : 0
                const pm = data!.parcelas.filter(p => p.mentorado_id === m.id)
                const atras = pm.find(p => p.status === 'pendente' && diasAte(p.vencimento) < 0)
                return (
                  <tr key={m.id} className="border-t border-[#F0EEE9]">
                    <td className="px-2 py-2.5"><div className="flex items-center gap-2.5"><Avatar id={m.id} nome={m.nome} tamanho={34} /><div className="flex flex-col"><b>{m.nome}</b><span className="text-xs text-cinza">{m.cidade ?? '-'}</span></div></div></td>
                    <td className="px-2">{m.etapa_id ? mEtapas.get(m.etapa_id)?.nome : '-'}</td>
                    <td className="px-2"><div className="flex items-center gap-2"><Barra pct={pct} /><span className="num w-9 text-right text-xs text-cinza">{pct}%</span></div></td>
                    <td className="num px-2 text-right">{data!.onb.filter(o => o.mentorado_id === m.id).length}/{data!.onbTotal}</td>
                    <td className="px-2">{pm.length === 0 ? <span className="text-cinza">-</span> : atras ? <Pilula tom="ruim">Atrasada</Pilula> : <Pilula tom="bom">Em dia</Pilula>}</td>
                    <td className="px-2">{s.nivel === 'risco' ? <Pilula tom="forte">Em risco</Pilula> : s.nivel === 'atencao' ? <Pilula tom="alerta">{s.motivos[0]}</Pilula> : <Pilula>Em dia</Pilula>}</td>
                    <td className="px-2 text-right"><Link to={`/mentorados/${m.id}`} className="font-semibold text-ouro-escuro">Abrir</Link></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
