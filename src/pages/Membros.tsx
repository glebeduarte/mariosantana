import { Fragment, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import type { Aluno, Curso, Matricula } from '@/lib/membros'
import { dataCurta } from '@/lib/util'
import { Barra, Cabecalho, Carregando, Erro, Pilula, Vazio } from '@/components/ui'

type Aba = 'cursos' | 'alunos' | 'biblioteca' | 'eduzz'

function useBase() {
  return useQuery({
    queryKey: ['membros-base'],
    queryFn: async () => {
      const [c, m, a, al, mt, pr] = await Promise.all([
        supabase.from('cursos').select('*').order('ordem_vitrine', { nullsFirst: false }),
        supabase.from('modulos').select('id,curso_id'),
        supabase.from('aulas').select('id,modulo_id'),
        supabase.from('alunos').select('*').order('nome'),
        supabase.from('matriculas').select('*'),
        supabase.from('progresso_aulas').select('aluno_id,aula_id,concluida,atualizado_em').eq('concluida', true),
      ])
      if (c.error) throw c.error
      return {
        cursos: c.data as Curso[], modulos: (m.data ?? []) as { id: string; curso_id: string }[], aulas: (a.data ?? []) as { id: string; modulo_id: string }[],
        alunos: (al.data ?? []) as Aluno[], matriculas: (mt.data ?? []) as Matricula[],
        progresso: (pr.data ?? []) as { aluno_id: string; aula_id: string; atualizado_em: string }[],
      }
    },
  })
}

/** Traz para o Supabase novo os arquivos que ainda estão no armazenamento do Lovable. */
function CopiarArquivos({ pendentes }: { pendentes: number }) {
  const qc = useQueryClient()
  const [estado, setEstado] = useState<string | null>(null)
  if (!pendentes && !estado) return null
  async function rodar() {
    setEstado('Copiando, pode levar um minuto...')
    const { data, error } = await supabase.functions.invoke('copiar-arquivos')
    if (error) { setEstado(`Não foi possível copiar: ${error.message}`); return }
    setEstado(`${data.arquivos} arquivos copiados, ${data.linhas} registros atualizados${data.falhas?.length ? `, ${data.falhas.length} falharam` : ''}.`)
    qc.invalidateQueries()
  }
  return (
    <div className="cartao flex flex-wrap items-center gap-3 border-l-4 border-l-[#C9A453] p-4">
      <span className="text-[14px]">{estado ?? `${pendentes} capas e materiais ainda estão guardados no Lovable. Copie antes de desligar o sistema antigo.`}</span>
      {!estado?.includes('copiados') && <button className="btn-ouro ml-auto" onClick={rodar} disabled={estado?.startsWith('Copiando')}>Copiar arquivos agora</button>}
    </div>
  )
}

export default function Membros() {
  const [aba, setAba] = useState<Aba>('cursos')
  const { papeis } = useAuth()
  const { data, isLoading, error } = useBase()
  if (isLoading) return <Carregando />
  if (error || !data) return <Erro erro={error} />

  const semLogin = data.alunos.filter(a => !a.user_id).length
  return (
    <>
      <Cabecalho titulo="Área de membros"
        acoes={<Link to="/vitrine" className="btn-ouro">Ver vitrine como aluno</Link>}
        frase={`${data.cursos.length} cursos, ${data.aulas.length} aulas, ${data.matriculas.length} matrículas e ${data.alunos.length} alunos. ${semLogin} ainda não criaram acesso no sistema novo.`} />
      {papeis.includes('admin') && <CopiarArquivos pendentes={JSON.stringify([data.cursos, data.aulas]).split('yycqayijtvpqckndjnju').length - 1} />}
      <nav aria-label="Seções da área de membros" className="flex gap-6 overflow-x-auto border-b border-linha">
        {([['cursos', 'Cursos'], ['alunos', 'Alunos e acessos'], ['biblioteca', 'Biblioteca'], ['eduzz', 'Integração Eduzz']] as [Aba, string][]).map(([id, nome]) => (
          <button key={id} onClick={() => setAba(id)} className={`h-10 whitespace-nowrap border-b-2 ${aba === id ? 'border-tinta font-bold' : 'border-transparent text-cinza'}`}>{nome}</button>
        ))}
      </nav>
      {aba === 'cursos' && <Cursos d={data} />}
      {aba === 'alunos' && <Alunos d={data} />}
      {aba === 'biblioteca' && <Biblioteca />}
      {aba === 'eduzz' && <Eduzz />}
    </>
  )
}

type Base = NonNullable<ReturnType<typeof useBase>['data']>

function aulasDoCurso(d: Base, cursoId: string) {
  const mods = new Set(d.modulos.filter(m => m.curso_id === cursoId).map(m => m.id))
  return d.aulas.filter(a => mods.has(a.modulo_id)).map(a => a.id)
}

function Cursos({ d }: { d: Base }) {
  const qc = useQueryClient()
  const nav = useNavigate()
  async function novo() {
    const { data } = await supabase.from('cursos').insert({ titulo: 'Novo curso', publicado: false }).select('id').single()
    qc.invalidateQueries({ queryKey: ['membros-base'] })
    if (data) nav(`/membros/curso/${data.id}`)
  }
  return (
    <section className="flex flex-col gap-2">
      <div className="flex justify-end"><button className="btn-primario" onClick={novo}>Novo curso</button></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead><tr className="text-left text-[13px] text-cinza">
            <th className="px-2 py-2.5 font-medium">Curso</th><th className="px-2 text-right font-medium">Módulos</th><th className="px-2 text-right font-medium">Aulas</th>
            <th className="px-2 text-right font-medium">Alunos</th><th className="w-40 px-2 font-medium">Conclusão média</th><th className="px-2 font-medium">Situação</th><th />
          </tr></thead>
          <tbody>{d.cursos.map(c => {
            const aulas = aulasDoCurso(d, c.id)
            const alunos = d.matriculas.filter(m => m.curso_id === c.id).map(m => m.aluno_id)
            const set = new Set(aulas)
            const pct = alunos.length && aulas.length
              ? Math.round(alunos.reduce((s, al) => s + d.progresso.filter(p => p.aluno_id === al && set.has(p.aula_id)).length / aulas.length, 0) / alunos.length * 100) : 0
            return (
              <tr key={c.id} className="border-t border-[#F0EEE9]">
                <td className="px-2 py-2.5"><div className="flex items-center gap-3">
                  {c.capa_url ? <img src={c.capa_url} alt="" className="h-9 w-14 shrink-0 rounded object-cover" /> : <span className="h-9 w-14 shrink-0 rounded bg-bandeja" />}
                  <div className="flex flex-col"><b>{c.titulo}</b><span className="text-xs text-cinza">{c.categoria ?? '-'}</span></div></div></td>
                <td className="num px-2 text-right">{d.modulos.filter(m => m.curso_id === c.id).length}</td>
                <td className="num px-2 text-right">{aulas.length}</td>
                <td className="num px-2 text-right">{alunos.length}</td>
                <td className="px-2"><div className="flex items-center gap-2"><Barra pct={pct} /><span className="num w-9 text-right text-xs text-cinza">{pct}%</span></div></td>
                <td className="px-2">{c.publicado ? <Pilula tom="bom">Publicado</Pilula> : <Pilula>Rascunho</Pilula>}</td>
                <td className="px-2 text-right"><Link to={`/membros/curso/${c.id}`} className="font-semibold text-ouro-escuro">Editar</Link></td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </section>
  )
}

function Alunos({ d }: { d: Base }) {
  const qc = useQueryClient()
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [novo, setNovo] = useState(false)
  const lista = d.alunos.filter(a => (a.nome + ' ' + (a.email ?? '')).toLowerCase().includes(busca.toLowerCase()))
  const recarregar = () => qc.invalidateQueries({ queryKey: ['membros-base'] })

  async function alternarMatricula(alunoId: string, cursoId: string) {
    const m = d.matriculas.find(x => x.aluno_id === alunoId && x.curso_id === cursoId)
    if (m) await supabase.from('matriculas').delete().eq('id', m.id)
    else await supabase.from('matriculas').insert({ aluno_id: alunoId, curso_id: cursoId })
    recarregar()
  }
  async function criar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    await supabase.from('alunos').insert({ nome: String(f.get('nome')), email: String(f.get('email')).toLowerCase().trim(), origem: 'manual' })
    setNovo(false); recarregar()
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="sr-only" htmlFor="busca-aluno">Buscar aluno</label>
        <input id="busca-aluno" className="campo max-w-xs" placeholder="Buscar por nome ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} />
        <button className="btn-primario" onClick={() => setNovo(v => !v)}>Novo aluno</button>
      </div>
      {novo && (
        <form onSubmit={criar} className="cartao grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1"><span className="rotulo">Nome</span><input id="al-nome" name="nome" className="campo" required /></label>
          <label className="flex flex-col gap-1"><span className="rotulo">E-mail</span><input id="al-email" name="email" type="email" className="campo" required /></label>
          <div className="flex items-end gap-2"><button className="btn-primario">Salvar</button><button type="button" className="btn-secundario" onClick={() => setNovo(false)}>Cancelar</button></div>
          <p className="text-[13px] text-cinza sm:col-span-3">Quando a pessoa criar acesso com este e-mail, o login é ligado ao aluno e os cursos aparecem para ela.</p>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead><tr className="text-left text-[13px] text-cinza">
            <th className="px-2 py-2.5 font-medium">Aluno</th><th className="px-2 text-right font-medium">Cursos</th><th className="px-2 text-right font-medium">Aulas concluídas</th>
            <th className="px-2 font-medium">Última aula</th><th className="px-2 font-medium">Acesso no sistema novo</th><th />
          </tr></thead>
          <tbody>{lista.map(a => {
            const prog = d.progresso.filter(p => p.aluno_id === a.id)
            const ultima = prog.map(p => p.atualizado_em).sort().pop()
            const mats = d.matriculas.filter(m => m.aluno_id === a.id)
            return (
              <Fragment key={a.id}>
                <tr className="border-t border-[#F0EEE9]">
                  <td className="px-2 py-2.5"><div className="flex flex-col"><b>{a.nome}</b><span className="text-xs text-cinza">{a.email}</span></div></td>
                  <td className="num px-2 text-right">{mats.length}</td>
                  <td className="num px-2 text-right">{prog.length}</td>
                  <td className="px-2 text-cinza">{ultima ? dataCurta(ultima) : '-'}</td>
                  <td className="px-2">{a.user_id ? <Pilula tom="bom">Criou acesso</Pilula> : <Pilula tom="alerta">Aguardando</Pilula>}</td>
                  <td className="px-2 text-right"><button className="font-semibold text-ouro-escuro" onClick={() => setAberto(aberto === a.id ? null : a.id)}>{aberto === a.id ? 'Fechar' : 'Matrículas'}</button></td>
                </tr>
                {aberto === a.id && (
                  <tr><td colSpan={6} className="bg-bandeja px-4 py-3">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {d.cursos.map(c => (
                        <label key={c.id} className="flex items-center gap-2">
                          <input type="checkbox" id={`mat-${a.id}-${c.id}`} className="h-4 w-4 accent-[#2F8A55]" checked={mats.some(m => m.curso_id === c.id)} onChange={() => alternarMatricula(a.id, c.id)} />
                          {c.titulo}
                        </label>
                      ))}
                    </div>
                  </td></tr>
                )}
              </Fragment>
            )
          })}</tbody>
        </table>
      </div>
    </section>
  )
}

function Biblioteca() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['biblioteca'],
    queryFn: async () => (await supabase.from('biblioteca').select('*').order('ordem')).data as { id: string; titulo: string; autor: string | null; capa_url: string | null; download_url: string | null; publicado: boolean }[],
  })
  async function alternar(id: string, publicado: boolean) { await supabase.from('biblioteca').update({ publicado: !publicado }).eq('id', id); qc.invalidateQueries({ queryKey: ['biblioteca'] }) }
  if (!data) return <Carregando />
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {data.map(l => (
        <div key={l.id} className="cartao flex flex-col gap-2 p-3">
          {l.capa_url ? <img src={l.capa_url} alt="" className="aspect-[2/3] w-full rounded object-cover" /> : <div className="aspect-[2/3] w-full rounded bg-bandeja" />}
          <b className="leading-snug">{l.titulo}</b>
          <span className="text-xs text-cinza">{l.autor ?? 'Autor não informado'}</span>
          <div className="mt-auto flex items-center justify-between">
            {l.download_url ? <a href={l.download_url} target="_blank" rel="noreferrer" className="text-[13px] text-ouro-escuro">Abrir</a> : <span className="text-[13px] text-cinza">Sem link</span>}
            <button onClick={() => alternar(l.id, l.publicado)}>{l.publicado ? <Pilula tom="bom">Publicado</Pilula> : <Pilula>Oculto</Pilula>}</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Eduzz() {
  const { data } = useQuery({
    queryKey: ['eduzz'],
    queryFn: async () => {
      const [r, a] = await Promise.all([
        supabase.from('regras_produto').select('*').order('rotulo'),
        supabase.from('acessos_externos').select('*').order('concedido_em', { ascending: false }),
      ])
      return { regras: (r.data ?? []) as { id: string; produto_externo_id: string; rotulo: string; todos_cursos: boolean; ativa: boolean }[],
        acessos: (a.data ?? []) as { id: string; regra_id: string; email_comprador: string; nome_comprador: string; status: string; concedido_em: string }[] }
    },
  })
  if (!data) return <Carregando />
  const porPessoa = new Map<string, { nome: string; email: string; regra: string; quando: string; cursos: number }>()
  for (const a of data.acessos) {
    const k = a.email_comprador + a.regra_id
    const atual = porPessoa.get(k)
    porPessoa.set(k, { nome: a.nome_comprador, email: a.email_comprador, regra: data.regras.find(r => r.id === a.regra_id)?.rotulo ?? '-', quando: a.concedido_em, cursos: (atual?.cursos ?? 0) + 1 })
  }
  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
      <section className="cartao flex flex-col p-4">
        <h2 className="pb-2 text-base font-bold">Produtos da Eduzz e o que liberam</h2>
        {data.regras.map(r => (
          <div key={r.id} className="flex items-center gap-3 border-t border-[#F0EEE9] py-2.5">
            <div className="flex flex-1 flex-col"><b>{r.rotulo}</b><span className="num text-xs text-cinza">Produto {r.produto_externo_id} · {r.todos_cursos ? 'libera todos os cursos' : 'cursos escolhidos'}</span></div>
            {r.ativa ? <Pilula tom="bom">Ativa</Pilula> : <Pilula>Desligada</Pilula>}
          </div>
        ))}
      </section>
      <section className="cartao flex flex-col p-4">
        <h2 className="pb-2 text-base font-bold">Acessos liberados por compra</h2>
        {porPessoa.size === 0 ? <Vazio>Nenhum acesso registrado.</Vazio> : [...porPessoa.values()].map(p => (
          <div key={p.email + p.regra} className="flex items-center gap-3 border-t border-[#F0EEE9] py-2.5">
            <div className="flex flex-1 flex-col"><b>{p.nome}</b><span className="text-xs text-cinza">{p.regra} · {p.cursos} cursos · {dataCurta(p.quando)}</span></div>
          </div>
        ))}
        <p className="pt-3 text-[13px] text-cinza">O recebimento automático das vendas da Eduzz (webhook) passa para este sistema na virada. Até lá, a Lovable continua recebendo as compras.</p>
      </section>
    </div>
  )
}
