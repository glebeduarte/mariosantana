import { Link, Route, Routes, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import Vitrine, { CursoVitrine } from '@/components/Vitrine'
import Icone from '@/components/Icone'

/** Prévia da vitrine dentro do painel: a equipe escolhe um aluno ou mentorado e vê exatamente o que ele vê. */
export default function VitrinePrevia() {
  const [params, setParams] = useSearchParams()
  const { data: alunos } = useQuery({
    queryKey: ['alunos-previa'],
    queryFn: async () => {
      const [a, m, mt] = await Promise.all([
        supabase.from('alunos').select('id,nome,email').order('nome'),
        supabase.from('mentorados').select('email').eq('status', 'ativo'),
        supabase.from('matriculas').select('aluno_id'),
      ])
      const mentorados = new Set((m.data ?? []).map(x => (x.email ?? '').toLowerCase()))
      const contas = new Map<string, number>()
      for (const r of (mt.data ?? []) as { aluno_id: string }[]) contas.set(r.aluno_id, (contas.get(r.aluno_id) ?? 0) + 1)
      return ((a.data ?? []) as { id: string; nome: string; email: string | null }[])
        .map(x => ({ ...x, mentorado: mentorados.has((x.email ?? '').toLowerCase()), cursos: contas.get(x.id) ?? 0 }))
        .sort((x, y) => Number(y.mentorado) - Number(x.mentorado) || x.nome.localeCompare(y.nome))
    },
  })
  let salvo: string | null = null
  try { salvo = sessionStorage.getItem('previa-aluno') } catch { /* sem armazenamento */ }
  const escolhido = params.get('aluno') ?? salvo ?? alunos?.find(a => a.mentorado)?.id ?? alunos?.[0]?.id
  const atual = alunos?.find(a => a.id === escolhido)
  const q = escolhido ? `?aluno=${escolhido}` : ''

  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#F3EEE3]">
      <div className="faixa-ouro relative z-50 text-white">
        <div className="flex flex-wrap items-center gap-3 px-5 py-2.5 lg:px-12">
          <span className="pulso grid h-2.5 w-2.5 place-items-center rounded-full bg-[#E8CC8C] text-[#E8CC8C]" aria-hidden />
          <span className="text-[13px] font-semibold">Pré-visualização da área de membros</span>
          <span className="hidden text-[13px] text-white/55 md:inline">o progresso não é alterado aqui</span>
          <label htmlFor="previa-aluno" className="ml-auto text-[13px] text-white/70">Ver como</label>
          <select id="previa-aluno" value={escolhido ?? ''} onChange={e => { try { sessionStorage.setItem('previa-aluno', e.target.value) } catch { /* sem armazenamento */ } setParams({ aluno: e.target.value }) }}
            className="h-9 max-w-[280px] rounded-lg border border-white/20 bg-white/10 px-2 text-[13px] text-white outline-none backdrop-blur [&>option]:text-tinta">
            {alunos?.map(a => <option key={a.id} value={a.id}>{a.nome}{a.mentorado ? ' · mentorado' : ''} ({a.cursos} cursos)</option>)}
          </select>
          <Link to="/membros" className="flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-semibold text-tinta hover:bg-[#F6EEDB]"><Icone nome="sair" tamanho={15} />Voltar ao painel</Link>
        </div>
      </div>

      <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 bg-gradient-to-b from-[#0E0D0B] via-[#0E0D0B]/80 to-transparent px-5 lg:px-12">
        <Link to={`/vitrine${q}`} className="font-marca text-[22px] font-semibold text-white">Método <span className="texto-ouro">Mário Santana</span></Link>
        <nav aria-label="Área de membros (prévia)" className="flex items-center gap-6 text-[14px]">
          <Link to={`/vitrine${q}`} className="font-semibold text-white">Início</Link>
          <span className="hidden items-center gap-2 text-white/70 sm:flex"><span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-[#E8CC8C] to-[#9A7A30] text-xs font-bold text-[#1F1D18]">{(atual?.nome ?? '?').slice(0, 2).toUpperCase()}</span>{atual?.nome.split(' ')[0]}</span>
        </nav>
      </header>

      <main>
        <Routes>
          <Route index element={<Vitrine alunoId={escolhido} base="/vitrine" nome={atual?.nome} />} />
          <Route path="curso/:id" element={<CursoVitrine alunoId={escolhido} base="/vitrine" previa />} />
          <Route path="curso/:id/aula/:aulaId" element={<CursoVitrine alunoId={escolhido} base="/vitrine" previa />} />
        </Routes>
      </main>
    </div>
  )
}
