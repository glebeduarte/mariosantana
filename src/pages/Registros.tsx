import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useFrentes, mapaPor } from '@/lib/dados'
import { dataCurta } from '@/lib/util'
import { Cabecalho, Carregando, EtiquetaFrente, Vazio } from '@/components/ui'
import Icone from '@/components/Icone'

type Reuniao = { id: string; titulo: string; data: string | null; frente_id: string | null; pauta: string | null; notas: string | null }
type Documento = { id: string; titulo: string; url: string | null; tipo: string | null; descricao: string | null; frente_id: string | null }

function FiltroFrentes({ valor, mudar }: { valor: string; mudar: (v: string) => void }) {
  const { data: frentes } = useFrentes()
  return (
    <div className="flex flex-wrap gap-2">
      {[{ id: '', nome: 'Todas', cor: '#1C1B18' }, ...(frentes ?? [])].map(f => (
        <button key={f.id} onClick={() => mudar(f.id)} aria-pressed={valor === f.id}
          className={`flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] ring-1 transition ${valor === f.id ? 'bg-tinta text-white ring-tinta' : 'bg-white ring-linha hover:ring-[#CFCBC0]'}`}>
          <span className="h-2 w-2 rounded-full" style={{ background: f.cor }} />{f.nome}
        </button>
      ))}
    </div>
  )
}

function SeletorFrente({ id }: { id: string }) {
  const { data: frentes } = useFrentes()
  return (
    <label className="flex flex-col gap-1"><span className="rotulo">Frente</span>
      <select id={id} name="frente_id" className="campo"><option value="">Geral</option>{frentes?.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></label>
  )
}

export function Reunioes() {
  const qc = useQueryClient()
  const { data: frentes } = useFrentes()
  const porFrente = mapaPor(frentes)
  const [filtro, setFiltro] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [nova, setNova] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['reunioes'],
    queryFn: async () => ((await supabase.from('reunioes').select('*').order('data', { ascending: false, nullsFirst: false })).data ?? []) as Reuniao[],
  })
  const recarregar = () => qc.invalidateQueries({ queryKey: ['reunioes'] })

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) || '').trim() || null
    const { data: r } = await supabase.from('reunioes').insert({ titulo: v('titulo'), data: v('data'), frente_id: v('frente_id'), pauta: v('pauta') }).select('id').single()
    setNova(false); recarregar(); if (r) setAberta(r.id)
  }
  async function salvar(r: Reuniao, campo: 'pauta' | 'notas', valor: string) {
    if ((r[campo] ?? '') === valor) return
    await supabase.from('reunioes').update({ [campo]: valor || null }).eq('id', r.id); recarregar()
  }

  if (isLoading) return <Carregando />
  const lista = (data ?? []).filter(r => !filtro || r.frente_id === filtro)
  const agora = Date.now()
  const proximas = lista.filter(r => r.data && new Date(r.data).getTime() >= agora).reverse()
  const passadas = lista.filter(r => !r.data || new Date(r.data).getTime() < agora)

  const Linha = ({ r }: { r: Reuniao }) => {
    const fr = r.frente_id ? porFrente.get(r.frente_id) : undefined
    const ab = aberta === r.id
    return (
      <article className="cartao overflow-hidden">
        <button className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#FBFAF7]" onClick={() => setAberta(ab ? null : r.id)} aria-expanded={ab}>
          <span className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-bandeja py-1.5">
            <span className="text-[11px] uppercase text-cinza">{r.data ? new Date(r.data).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') : '-'}</span>
            <b className="num text-[20px] leading-none">{r.data ? new Date(r.data).getDate() : '?'}</b>
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <b className="truncate">{r.titulo}</b>
            <span className="flex items-center gap-2 text-[13px] text-cinza">
              {fr && <EtiquetaFrente nome={fr.nome} cor={fr.cor} />}
              {r.data && new Date(r.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              {r.notas ? ' · com registro' : ' · sem registro'}
            </span>
          </span>
          <span className={`text-cinza transition ${ab ? 'rotate-90' : ''}`}>›</span>
        </button>
        {ab && (
          <div className="grid gap-4 border-t border-linha p-5 md:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="rotulo">Pauta</span>
              <textarea id={`pa-${r.id}`} rows={7} defaultValue={r.pauta ?? ''} onBlur={e => salvar(r, 'pauta', e.target.value)} className="campo h-auto py-2" placeholder="O que precisa ser decidido" /></label>
            <label className="flex flex-col gap-1"><span className="rotulo">Registro e decisões</span>
              <textarea id={`no-${r.id}`} rows={7} defaultValue={r.notas ?? ''} onBlur={e => salvar(r, 'notas', e.target.value)} className="campo h-auto py-2" placeholder="O que foi decidido, quem faz e até quando" /></label>
            <p className="text-xs text-cinza md:col-span-2">Salva sozinho ao sair do campo.</p>
          </div>
        )}
      </article>
    )
  }

  return (
    <>
      <Cabecalho titulo="Reuniões" frase={`${proximas.length} marcadas e ${passadas.filter(r => !r.notas).length} passadas sem registro.`}
        acoes={<button className="btn-primario" onClick={() => setNova(v => !v)}><Icone nome="mais" tamanho={16} />Nova reunião</button>} />
      {nova && (
        <form onSubmit={criar} className="cartao grid gap-3 p-5 sm:grid-cols-3">
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="rotulo">Título</span><input id="r-titulo" name="titulo" required className="campo" /></label>
          <label className="flex flex-col gap-1"><span className="rotulo">Data e hora</span><input id="r-data" name="data" type="datetime-local" className="campo" /></label>
          <SeletorFrente id="r-frente" />
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="rotulo">Pauta</span><input id="r-pauta" name="pauta" className="campo" /></label>
          <div className="flex gap-2"><button className="btn-primario">Criar</button><button type="button" className="btn-secundario" onClick={() => setNova(false)}>Cancelar</button></div>
        </form>
      )}
      <FiltroFrentes valor={filtro} mudar={setFiltro} />
      {proximas.length > 0 && <section className="flex flex-col gap-2.5"><h2 className="font-bold">Próximas</h2>{proximas.map(r => <Linha key={r.id} r={r} />)}</section>}
      <section className="flex flex-col gap-2.5"><h2 className="font-bold">Realizadas</h2>
        {passadas.length ? passadas.map(r => <Linha key={r.id} r={r} />) : <Vazio>Nenhuma reunião registrada ainda.</Vazio>}</section>
    </>
  )
}

const TIPOS: Record<string, string> = { link: 'Link', pagina: 'Página', planilha: 'Planilha', documento: 'Documento', video: 'Vídeo', acesso: 'Acesso' }

export function Documentos() {
  const qc = useQueryClient()
  const { data: frentes } = useFrentes()
  const porFrente = mapaPor(frentes)
  const [filtro, setFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['documentos'],
    queryFn: async () => ((await supabase.from('documentos').select('*').order('titulo')).data ?? []) as Documento[],
  })
  const recarregar = () => qc.invalidateQueries({ queryKey: ['documentos'] })

  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget); const v = (k: string) => String(f.get(k) || '').trim() || null
    await supabase.from('documentos').insert({ titulo: v('titulo'), url: v('url'), tipo: v('tipo'), descricao: v('descricao'), frente_id: v('frente_id') })
    setNovo(false); recarregar()
  }
  async function remover(d: Documento) {
    if (!window.confirm(`Remover "${d.titulo}" da lista?`)) return
    await supabase.from('documentos').delete().eq('id', d.id); recarregar()
  }

  if (isLoading) return <Carregando />
  const lista = (data ?? []).filter(d => (!filtro || d.frente_id === filtro) && (d.titulo + ' ' + (d.descricao ?? '')).toLowerCase().includes(busca.toLowerCase()))
  const grupos = [...(frentes ?? []).map(f => ({ id: f.id, nome: f.nome, cor: f.cor })), { id: '', nome: 'Geral', cor: '#8A877F' }]

  return (
    <>
      <Cabecalho titulo="Documentos" frase="Links, páginas, planilhas e acessos do negócio num lugar só, separados por frente."
        acoes={<button className="btn-primario" onClick={() => setNovo(v => !v)}><Icone nome="mais" tamanho={16} />Novo link</button>} />
      {novo && (
        <form onSubmit={criar} className="cartao grid gap-3 p-5 sm:grid-cols-3">
          <label className="flex flex-col gap-1"><span className="rotulo">Título</span><input id="d-titulo" name="titulo" required className="campo" /></label>
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="rotulo">Endereço</span><input id="d-url" name="url" type="url" placeholder="https://" className="campo" /></label>
          <label className="flex flex-col gap-1"><span className="rotulo">Tipo</span><select id="d-tipo" name="tipo" className="campo">{Object.entries(TIPOS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          <SeletorFrente id="d-frente" />
          <label className="flex flex-col gap-1"><span className="rotulo">Descrição</span><input id="d-desc" name="descricao" className="campo" /></label>
          <div className="flex gap-2"><button className="btn-primario">Salvar</button><button type="button" className="btn-secundario" onClick={() => setNovo(false)}>Cancelar</button></div>
        </form>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FiltroFrentes valor={filtro} mudar={setFiltro} />
        <label htmlFor="busca-doc" className="sr-only">Buscar</label>
        <input id="busca-doc" className="campo ml-auto max-w-xs" placeholder="Buscar" value={busca} onChange={e => setBusca(e.target.value)} />
      </div>
      {lista.length === 0 ? <Vazio>Nada cadastrado nesta frente.</Vazio> : grupos.map(g => {
        const aqui = lista.filter(d => (d.frente_id ?? '') === g.id)
        if (!aqui.length) return null
        return (
          <section key={g.id || 'geral'} className="flex flex-col gap-2.5">
            <h2 className="flex items-center gap-2 font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: g.cor }} />{g.nome}<span className="font-normal text-cinza">{aqui.length}</span></h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {aqui.map(d => (
                <div key={d.id} className="cartao cartao-hover group relative flex flex-col gap-1.5 overflow-hidden p-4">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: (d.frente_id && porFrente.get(d.frente_id)?.cor) || '#C9A453' }} />
                  <div className="flex items-center gap-2"><span className="rounded-full bg-bandeja px-2 py-0.5 text-[11px] text-cinza">{TIPOS[d.tipo ?? 'link'] ?? d.tipo}</span>
                    <button className="ml-auto text-xs text-cinza opacity-0 transition hover:text-ruim-texto group-hover:opacity-100" onClick={() => remover(d)}>remover</button></div>
                  {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="font-semibold hover:text-ouro-escuro">{d.titulo} ↗</a> : <b>{d.titulo}</b>}
                  {d.descricao && <span className="text-[13px] text-cinza">{d.descricao}</span>}
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </>
  )
}
