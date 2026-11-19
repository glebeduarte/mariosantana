export type Papel = 'admin' | 'mentor' | 'equipe' | 'mentorado' | 'aluno'
export type StatusTarefa = 'a_fazer' | 'em_andamento' | 'em_revisao' | 'aguardando' | 'concluida'
export type Prioridade = 'baixa' | 'media' | 'alta'
export type EtapaLead = 'novo' | 'diagnostico' | 'call' | 'proposta' | 'fechado' | 'perdido'

export interface Perfil { id: string; nome: string; email: string | null; cor: string | null }
export interface Frente { id: string; nome: string; slug: string; cor: string; ordem: number; responsavel_id: string | null; ativa: boolean }

export interface Tarefa {
  id: string; frente_id: string | null; titulo: string; descricao: string | null; status: StatusTarefa
  prioridade: Prioridade; responsavel_id: string | null; prazo: string | null; ordem: number
  origem_tipo: string | null; origem_id: string | null; concluida_em: string | null; criado_em: string
  tarefa_checklist?: { id: string; feito: boolean }[]
}
export interface ItemChecklist { id: string; tarefa_id: string; texto: string; feito: boolean; ordem: number }
export interface Comentario { id: string; tarefa_id: string; autor_id: string | null; texto: string; criado_em: string }

export interface Etapa { id: string; ordem: number; nome: string; descricao: string | null }
export interface EtapaItem { id: string; etapa_id: string; tipo: 'aula' | 'workbook' | 'sessao' | 'tarefa'; titulo: string; ordem: number }
export interface Mentorado {
  id: string; perfil_id: string | null; nome: string; email: string | null; telefone: string | null; cidade: string | null
  especialidade: string | null; plano_id: string | null; inicio: string | null; fim: string | null; etapa_id: string | null
  status: 'ativo' | 'pausado' | 'concluido' | 'cancelado'; ultimo_acesso: string | null; criado_em: string
}
export interface OnboardingItem { id: string; titulo: string; ordem: number; responsavel_padrao: string | null }
export interface Sessao { id: string; mentorado_id: string; titulo: string; data: string | null; status: string; notas: string | null }
export interface Observacao { id: string; mentorado_id: string; autor_id: string | null; texto: string; criado_em: string }
export interface Parcela {
  id: string; mentorado_id: string; contrato_id: string | null; numero: number; total: number; vencimento: string
  valor: number | null; meio: string | null; status: 'pendente' | 'paga' | 'cancelada'; pago_em: string | null
}
export interface Lead {
  id: string; nome: string; email: string | null; telefone: string | null; cidade: string | null; especialidade: string | null
  origem: string | null; pontuacao: number | null; qualificado: boolean | null; motivo_desqualificacao: string | null
  etapa: EtapaLead; responsavel_id: string | null; proxima_acao: string | null; proxima_acao_em: string | null
  notas: string | null; criado_em: string
}
