import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Etapa, Mentorado, Parcela } from './tipos'
import { diasAte } from './util'

export type Nivel = 'ok' | 'atencao' | 'risco'

export interface ResumoMentorado {
  m: Mentorado
  etapa: Etapa | undefined
  itensEtapa: number
  feitosEtapa: number
  pctEtapa: number
  onbFeitos: number
  onbTotal: number
  aulasConcluidas: number
  ultimaSessao: string | null
  diasSemSessao: number | null
  parcelasPagas: number
  parcelasTotal: number
  parcelaAtrasada: Parcela | undefined
  nivel: Nivel
  motivos: string[]
  plano: string
}

export function useMentoria() {
  return useQuery({
    queryKey: ['mentoria-resumo'],
    queryFn: async () => {
      const [m, e, it, prog, oi, onb, s, p, al, pa, pl] = await Promise.all([
        supabase.from('mentorados').select('*').order('nome'),
        supabase.from('etapas').select('*').order('ordem'),
        supabase.from('etapa_itens').select('id,etapa_id'),
        supabase.from('mentorado_itens').select('mentorado_id,item_id'),
        supabase.from('onboarding_itens').select('id'),
        supabase.from('mentorado_onboarding').select('mentorado_id'),
        supabase.from('sessoes').select('mentorado_id,data,status'),
        supabase.from('parcelas').select('*').neq('status', 'cancelada'),
        supabase.from('alunos').select('id,email'),
        supabase.from('progresso_aulas').select('aluno_id').eq('concluida', true),
        supabase.from('planos_mentoria').select('id,nome,duracao_meses'),
      ])
      if (m.error) throw m.error
      const etapas = (e.data ?? []) as Etapa[]
      const itens = (it.data ?? []) as { id: string; etapa_id: string }[]
      const progresso = (prog.data ?? []) as { mentorado_id: string; item_id: string }[]
      const onbTotal = oi.data?.length ?? 7
      const sessoes = (s.data ?? []) as { mentorado_id: string; data: string | null; status: string }[]
      const parcelas = (p.data ?? []) as Parcela[]
      const alunoPorEmail = new Map(((al.data ?? []) as { id: string; email: string | null }[]).map(a => [(a.email ?? '').toLowerCase(), a.id]))
      const aulasPorAluno = new Map<string, number>()
      for (const r of (pa.data ?? []) as { aluno_id: string }[]) aulasPorAluno.set(r.aluno_id, (aulasPorAluno.get(r.aluno_id) ?? 0) + 1)
      const planos = new Map(((pl.data ?? []) as { id: string; duracao_meses: number }[]).map(x => [x.id, x.duracao_meses]))
      const agora = Date.now()

      const resumos: ResumoMentorado[] = ((m.data ?? []) as Mentorado[]).map(mt => {
        const etapa = etapas.find(x => x.id === mt.etapa_id) ?? etapas[0]
        const doEtapa = itens.filter(i => i.etapa_id === etapa?.id)
        const feitosSet = new Set(progresso.filter(x => x.mentorado_id === mt.id).map(x => x.item_id))
        const feitosEtapa = doEtapa.filter(i => feitosSet.has(i.id)).length
        const ses = sessoes.filter(x => x.mentorado_id === mt.id && x.data && new Date(x.data).getTime() <= agora).map(x => x.data!).sort()
        const ultimaSessao = ses.length ? ses[ses.length - 1] : null
        const diasSemSessao = ultimaSessao ? Math.floor((agora - new Date(ultimaSessao).getTime()) / 86400000) : null
        const pm = parcelas.filter(x => x.mentorado_id === mt.id)
        const parcelaAtrasada = pm.find(x => x.status === 'pendente' && diasAte(x.vencimento) < 0)
        const onbFeitos = ((onb.data ?? []) as { mentorado_id: string }[]).filter(x => x.mentorado_id === mt.id).length
        const alunoId = alunoPorEmail.get((mt.email ?? '').toLowerCase())

        const motivos: string[] = []
        let risco = false
        if (parcelaAtrasada) { motivos.push(`parcela ${parcelaAtrasada.numero}/${parcelaAtrasada.total} atrasada`); risco = true }
        if (diasSemSessao != null && diasSemSessao > 45) { motivos.push(`${diasSemSessao} dias sem sessão`); risco = true }
        else if (diasSemSessao == null) motivos.push('nenhuma sessão registrada')
        else if (diasSemSessao > 30) motivos.push(`${diasSemSessao} dias sem sessão`)
        if (onbFeitos < onbTotal) motivos.push(`onboarding ${onbFeitos}/${onbTotal}`)
        const nivel: Nivel = risco ? 'risco' : motivos.length ? 'atencao' : 'ok'

        return {
          m: mt, etapa, itensEtapa: doEtapa.length, feitosEtapa, pctEtapa: doEtapa.length ? Math.round(feitosEtapa / doEtapa.length * 100) : 0,
          onbFeitos, onbTotal, aulasConcluidas: alunoId ? aulasPorAluno.get(alunoId) ?? 0 : 0,
          ultimaSessao, diasSemSessao, parcelasPagas: pm.filter(x => x.status === 'paga').length, parcelasTotal: pm.length, parcelaAtrasada,
          nivel, motivos, plano: (mt.plano_id && planos.get(mt.plano_id) === 6) ? 'Semestral' : 'Anual',
        }
      })
      return { resumos, etapas }
    },
  })
}

export const NIVEL: Record<Nivel, { nome: string; cor: string; fundo: string; texto: string }> = {
  ok: { nome: 'Em dia', cor: '#2F8A55', fundo: '#E0F2E6', texto: '#1E6B3D' },
  atencao: { nome: 'Atenção', cor: '#D9A12B', fundo: '#FDF1D6', texto: '#7A5300' },
  risco: { nome: 'Em risco', cor: '#C8402F', fundo: '#FDE7E5', texto: '#8F2A1E' },
}
