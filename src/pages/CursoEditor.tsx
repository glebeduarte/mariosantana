import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Aula, Curso, Modulo } from '@/lib/membros'
import { Carregando, Erro, Pilula } from '@/components/ui'

export default function CursoEditor() {
  const { id } = useParams()
  const qc = useQueryClient()
  const [aulaAberta, setAulaAberta] = useState<string | null>(null)
  const { data, isLoading, error } = useQuery({
    queryKey: ['curso', id],
    queryFn: async () => {
      const [c, m] = await Promise.all([
        supabase.from('cursos').select('*').eq('id', id!).single(),
        supabase.from('modulos').select('*').eq('curso_id', id!).order('ordem'),
      ])
      if (c.error) throw c.error
      const mods = (m.data ?? []) as Modulo[]
      const a = mods.length ? await supabase.from('aulas').select('*').in('modulo_id', mods.map(x => x.id)).order('ordem') : { data: [] }
      return { curso: c.data as Curso, modulos: mods, aulas: (a.data ?? []) as Aula[] }
    },
  })
  const recarregar = () => { qc.invalidateQueries({ queryKey: ['curso', id] }); qc.invalidateQueries({ queryKey: ['membros-base'] }) }

  if (isLoading) return <Carregando />
  if (error || !data) return <Erro erro={error} />
  const { curso } = data

  async function salvarCurso(campos: Partial<Curso>) { await supabase.from('cursos').update(campos).eq('id', id!); recarregar() }
  async function novoModulo() { await supabase.from('modulos').insert({ curso_id: id, titulo: 'Novo módulo', ordem: data!.modulos.length }); recarregar() }
  async function renomearModulo(m: Modulo, titulo: string) { if (titulo !== m.titulo) { await supabase.from('modulos').update({ titulo }).eq('id', m.id); recarregar() } }
  async function novaAula(m: Modulo) {
    const n = data!.aulas.filter(a => a.modulo_id === m.id).length
    const { data: a } = await supabase.from('aulas').insert({ modulo_id: m.id, titulo: 'Nova aula', ordem: n, video_tipo: 'url' }).select('id').single()
    recarregar(); if (a) setAulaAberta(a.id)
  }
  async function salvarAula(a: Aula, campos: Partial<Aula>) { await supabase.from('aulas').update(campos).eq('id', a.id); recarregar() }
  async function mover(a: Aula, dir: -1 | 1) {
    const irmas = data!.aulas.filter(x => x.modulo_id === a.modulo_id).sort((x, y) => x.ordem - y.ordem)
    const i = irmas.findIndex(x => x.id === a.id), j = i + dir
    if (j < 0 || j >= irmas.length) return
    await Promise.all([
      supabase.from('aulas').update({ ordem: irmas[j].ordem }).eq('id', a.id),
      supabase.from('aulas').update({ ordem: irmas[i].ordem }).eq('id', irmas[j].id),
    ])
    recarregar()
  }

  return (
    <>
      <Link to="/membros" className="text-[13px] text-ouro-escuro">Área de membros / {curso.titulo}</Link>
      <header className="flex flex-wrap items-start gap-4">
        {curso.capa_url && <img src={curso.capa_url} alt="" className="h-20 w-32 rounded-lg object-cover" />}
        <div className="flex min-w-[280px] flex-1 flex-col gap-2">
          <label htmlFor="c-titulo" className="sr-only">Título do curso</label>
          <input id="c-titulo" defaultValue={curso.titulo} onBlur={e => e.target.value !== curso.titulo && salvarCurso({ titulo: e.target.value })}
            className="rounded-lg border border-transparent p-1 text-[26px] font-bold outline-none hover:border-linha focus:border-tinta" />
          <label htmlFor="c-desc" className="sr-only">Descrição curta</label>
          <textarea id="c-desc" rows={2} defaultValue={curso.descricao_curta ?? ''} onBlur={e => salvarCurso({ descricao_curta: e.target.value })}
            className="rounded-lg border border-linha bg-[#FAFAF8] p-2 text-[#4A4943] outline-none focus:border-tinta" />
        </div>
        <div className="flex flex-col gap-2">
          <button className="btn-secundario" onClick={() => salvarCurso({ publicado: !curso.publicado })}>{curso.publicado ? 'Despublicar' : 'Publicar'}</button>
          <label className="flex flex-col gap-1"><span className="rotulo">Categoria</span>
            <input id="c-cat" className="campo" defaultValue={curso.categoria ?? ''} onBlur={e => salvarCurso({ categoria: e.target.value || null })} /></label>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {data.modulos.map(m => {
          const aulas = data.aulas.filter(a => a.modulo_id === m.id).sort((x, y) => x.ordem - y.ordem)
          return (
            <section key={m.id} className="cartao flex flex-col p-4">
              <div className="flex items-center gap-3 pb-2">
                <label htmlFor={`mod-${m.id}`} className="sr-only">Nome do módulo</label>
                <input id={`mod-${m.id}`} defaultValue={m.titulo} onBlur={e => renomearModulo(m, e.target.value)}
                  className="flex-1 rounded-md border border-transparent p-1 text-base font-bold outline-none hover:border-linha focus:border-tinta" />
                <span className="text-[13px] text-cinza">{aulas.length} aulas</span>
              </div>
              {aulas.map((a, i) => (
                <div key={a.id} className="border-t border-[#F0EEE9]">
                  <div className="flex items-center gap-2 py-2">
                    <span className="num w-6 text-right text-xs text-cinza">{i + 1}</span>
                    <button className="flex-1 text-left" onClick={() => setAulaAberta(aulaAberta === a.id ? null : a.id)}>{a.titulo}</button>
                    {a.video_tipo === 'pdf' ? <Pilula>PDF</Pilula> : a.video_url ? <Pilula tom="bom">Vídeo</Pilula> : <Pilula tom="alerta">Sem conteúdo</Pilula>}
                    <button aria-label="Subir aula" className="px-1 text-cinza hover:text-tinta" onClick={() => mover(a, -1)}>↑</button>
                    <button aria-label="Descer aula" className="px-1 text-cinza hover:text-tinta" onClick={() => mover(a, 1)}>↓</button>
                  </div>
                  {aulaAberta === a.id && (
                    <div className="grid grid-cols-1 gap-3 bg-bandeja p-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1"><span className="rotulo">Título</span>
                        <input id={`a-t-${a.id}`} className="campo" defaultValue={a.titulo} onBlur={e => salvarAula(a, { titulo: e.target.value })} /></label>
                      <label className="flex flex-col gap-1"><span className="rotulo">Tipo</span>
                        <select id={`a-tp-${a.id}`} className="campo" defaultValue={a.video_tipo} onChange={e => salvarAula(a, { video_tipo: e.target.value })}>
                          <option value="url">Vídeo (Drive, YouTube, Vimeo)</option><option value="pdf">PDF</option><option value="none">Texto ou link</option></select></label>
                      <label className="flex flex-col gap-1 md:col-span-2"><span className="rotulo">Link do vídeo</span>
                        <input id={`a-v-${a.id}`} className="campo" defaultValue={a.video_url ?? ''} onBlur={e => salvarAula(a, { video_url: e.target.value || null })} /></label>
                      <label className="flex flex-col gap-1 md:col-span-2"><span className="rotulo">Link do PDF</span>
                        <input id={`a-p-${a.id}`} className="campo" defaultValue={a.pdf_url ?? ''} onBlur={e => salvarAula(a, { pdf_url: e.target.value || null })} /></label>
                      <label className="flex flex-col gap-1 md:col-span-2"><span className="rotulo">Descrição</span>
                        <textarea id={`a-d-${a.id}`} rows={3} className="rounded-lg border border-[#DCDAD3] bg-white p-2 outline-none focus:border-tinta" defaultValue={a.descricao ?? ''} onBlur={e => salvarAula(a, { descricao: e.target.value || null })} /></label>
                    </div>
                  )}
                </div>
              ))}
              <button className="mt-1 self-start text-cinza hover:text-tinta" onClick={() => novaAula(m)}>+ Nova aula</button>
            </section>
          )
        })}
        <button className="btn-secundario self-start" onClick={novoModulo}>Novo módulo</button>
      </div>
    </>
  )
}
