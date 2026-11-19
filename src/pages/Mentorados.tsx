import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useMentoria, NIVEL, type Nivel } from '@/lib/mentoria'
import { dataCurta } from '@/lib/util'
import { Avatar, Barra, Cabecalho, Carregando, Erro, Vazio } from '@/components/ui'
import CartaoMentorado from '@/components/CartaoMentorado'
import Icone from '@/components/Icone'

type Vista = 'cartoes' | 'etapas' | 'tabela'

export default function Mentorados() {
  const qc = useQueryClient()
  const nav = useNavigate()
  const { data, isLoading, error } = useMentoria()
  const [filtro, setFiltro] = useState<Nivel | 'todos'>('todos')
  const [vista, setVista] = useState<Vista>('cartoes')
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const v = (k: string) => String(f.get(k) || '').trim() || null
    const { data: plano } = await supabase.from('planos_mentoria').select('id').eq('ativo', true).limit(1).maybeSingle()
    const { data: criado, error } = await supabase.from('mentorados').insert({
      nome: v('nome'), email: v('email')?.toLowerCase(), cidade: v('cidade'), especialidade: v('especialidade'), inicio: v('inicio'),
      etapa_id: data?.etapas[0]?.id ?? null, plano_id: plano?.id ?? null,
    }).select('id').single()
    if (error) { setErroForm(error.message); return }
    qc.invalidateQueries({ queryKey: ['mentoria-resumo'] })
    nav(`/mentorados/${criado.id}`)
  }

  if (isLoading) return <Carregando />
  if (error || !data) return <Erro erro={error} />

  const ativos = data.resumos.filter(r => r.m.status === 'ativo')
  const conta = (n: Nivel) => ativos.filter(r => r.nivel === n).length
  const lista = ativos
    .filter(r => filtro === 'todos' || r.nivel === filtro)
    .filter(r => (r.m.nome + ' ' + (r.m.cidade ?? '')).toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => ({ risco: 0, atencao: 1, ok: 2 }[a.nivel] - { risco: 0, atencao: 1, ok: 2 }[b.nivel]) || a.m.nome.localeCompare(b.m.nome))
  const totalEtapas = data.etapas.length
  const emRisco = ativos.filter(r => r.nivel === 'risco')

  return (
    <>
      <Cabecalho titulo="Mentorados"
        frase={ativos.length === 0 ? 'Nenhum mentorado ativo.' : emRisco.length
          ? `${ativos.length} mentorados ativos. ${emRisco.length === 1 ? `${emRisco[0].m.nome} está em risco: ${emRisco[0].motivos[0]}.` : `${emRisco.length} estão em risco.`}`
          : `${ativos.length} mentorados ativos, nenhum em risco.`}
        acoes={<button className="btn-primario" onClick={() => setNovo(v => !v)}><Icone nome="mais" tamanho={16} />Novo mentorado</button>} />

      {novo && (
        <form onSubmit={criar} className="cartao grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          {[['nome', 'Nome', true], ['email', 'E-mail', false], ['cidade', 'Cidade', false], ['especialidade', 'Especialidade', false]].map(([n, r, req]) => (
            <label key={n as string} className="flex flex-col gap-1"><span className="rotulo">{r}</span><input id={`m-${n}`} name={n as string} className="campo" required={!!req} /></label>
          ))}
          <label className="flex flex-col gap-1"><span className="rotulo">Início</span><input id="m-inicio" name="inicio" type="date" className="campo" /></label>
          <div className="flex items-end gap-2"><button className="btn-primario">Criar e abrir jornada</button><button type="button" className="btn-secundario" onClick={() => setNovo(false)}>Cancelar</button></div>
          {erroForm && <p className="text-ruim-texto sm:col-span-3">{erroForm}</p>}
        </form>
      )}

      <section aria-label="Situação dos mentorados" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {([['todos', 'Ativos', ativos.length, '#1C1B18'], ['risco', NIVEL.risco.nome, conta('risco'), NIVEL.risco.cor], ['atencao', NIVEL.atencao.nome, conta('atencao'), NIVEL.atencao.cor], ['ok', NIVEL.ok.nome, conta('ok'), NIVEL.ok.cor]] as [Nivel | 'todos', string, number, string][]).map(([id, nome, n, cor]) => (
          <button key={id} onClick={() => setFiltro(id)} aria-pressed={filtro === id}
            className={`cartao flex items-center gap-4 p-4 text-left transition ${filtro === id ? 'border-tinta ring-1 ring-tinta' : 'hover:border-[#CFCBC0]'}`}>
            <span className="h-10 w-1.5 rounded-full" style={{ background: cor }} />
            <span className="flex flex-col"><span className="rotulo">{nome}</span><span className="num text-[28px] font-semibold leading-none">{n}</span></span>
          </button>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
          <Icone nome="busca" tamanho={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cinza" />
          <label htmlFor="busca-m" className="sr-only">Buscar mentorado</label>
          <input id="busca-m" className="campo pl-9" placeholder="Buscar por nome ou cidade" value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <div role="group" aria-label="Forma de ver" className="ml-auto flex rounded-xl bg-bandeja p-1">
          {([['cartoes', 'Cartões', 'grade'], ['etapas', 'Por etapa', 'tarefas'], ['tabela', 'Tabela', 'lista']] as [Vista, string, string][]).map(([id, nome, ic]) => (
            <button key={id} onClick={() => setVista(id)} aria-pressed={vista === id}
              className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] ${vista === id ? 'bg-white font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-cinza hover:text-tinta'}`}>
              <Icone nome={ic} tamanho={15} />{nome}
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? <Vazio>Nenhum mentorado neste filtro.</Vazio> : vista === 'cartoes' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {lista.map(r => <CartaoMentorado key={r.m.id} r={r} totalEtapas={totalEtapas} />)}
        </div>
      ) : vista === 'etapas' ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1100px] grid-cols-6 items-start gap-3">
            {data.etapas.map(e => {
              const aqui = lista.filter(r => r.etapa?.id === e.id)
              return (
                <section key={e.id} className="flex flex-col gap-2.5 rounded-2xl bg-bandeja p-3">
                  <div className="flex items-center justify-between px-1"><h2 className="text-sm font-bold">{e.ordem}. {e.nome}</h2><span className="num text-cinza">{aqui.length}</span></div>
                  {aqui.map(r => (
                    <Link key={r.m.id} to={`/mentorados/${r.m.id}`} className="cartao cartao-hover relative flex flex-col gap-2.5 overflow-hidden p-3">
                      <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: NIVEL[r.nivel].cor }} />
                      <div className="flex items-center gap-2"><Avatar id={r.m.id} nome={r.m.nome} tamanho={30} /><b className="min-w-0 truncate leading-tight">{r.m.nome}</b></div>
                      <div className="flex items-center gap-2"><Barra pct={r.pctEtapa} /><span className="num text-xs text-cinza">{r.pctEtapa}%</span></div>
                      <span className="truncate text-xs" style={{ color: NIVEL[r.nivel].texto }}>{r.motivos[0] ?? 'Tudo em dia'}</span>
                    </Link>
                  ))}
                  {aqui.length === 0 && <span className="px-1 text-[13px] text-cinza">Ninguém nesta etapa.</span>}
                </section>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="cartao overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse">
            <thead><tr className="text-left text-[13px] text-cinza">
              <th className="px-4 py-3 font-medium">Mentorado</th><th className="px-2 font-medium">Etapa</th><th className="w-44 px-2 font-medium">Progresso da etapa</th>
              <th className="px-2 text-right font-medium">Onboarding</th><th className="px-2 text-right font-medium">Aulas</th><th className="px-2 text-right font-medium">Última sessão</th>
              <th className="px-2 font-medium">Situação</th><th />
            </tr></thead>
            <tbody>{lista.map(r => (
              <tr key={r.m.id} className="border-t border-[#F0EEE9] hover:bg-[#FBFAF7]">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><Avatar id={r.m.id} nome={r.m.nome} tamanho={34} /><div className="flex flex-col"><b>{r.m.nome}</b><span className="text-xs text-cinza">{r.m.cidade ?? `Mentoria ${r.plano.toLowerCase()}`}</span></div></div></td>
                <td className="px-2">{r.etapa?.nome}</td>
                <td className="px-2"><div className="flex items-center gap-2"><Barra pct={r.pctEtapa} /><span className="num w-9 text-right text-xs text-cinza">{r.pctEtapa}%</span></div></td>
                <td className="num px-2 text-right">{r.onbFeitos}/{r.onbTotal}</td>
                <td className="num px-2 text-right">{r.aulasConcluidas}</td>
                <td className="num px-2 text-right">{r.ultimaSessao ? dataCurta(r.ultimaSessao) : '-'}</td>
                <td className="px-2"><span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: NIVEL[r.nivel].fundo, color: NIVEL[r.nivel].texto }}>{NIVEL[r.nivel].nome}</span></td>
                <td className="px-4 text-right"><Link to={`/mentorados/${r.m.id}`} className="font-semibold text-ouro-escuro">Abrir</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </>
  )
}
