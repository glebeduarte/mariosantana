import type { StatusTarefa, EtapaLead } from './tipos'

export const STATUS: { id: StatusTarefa; nome: string }[] = [
  { id: 'a_fazer', nome: 'A fazer' },
  { id: 'em_andamento', nome: 'Em andamento' },
  { id: 'em_revisao', nome: 'Em revisão' },
  { id: 'aguardando', nome: 'Aguardando' },
  { id: 'concluida', nome: 'Concluída' },
]

export const ETAPAS_LEAD: { id: EtapaLead; nome: string }[] = [
  { id: 'novo', nome: 'Novo' },
  { id: 'diagnostico', nome: 'Diagnóstico respondido' },
  { id: 'call', nome: 'Call agendada' },
  { id: 'proposta', nome: 'Proposta enviada' },
  { id: 'fechado', nome: 'Fechado' },
  { id: 'perdido', nome: 'Perdido' },
]

/** Tom claro de uma cor hex, para o fundo de etiquetas. */
export function clarear(hex: string, quanto = 0.86) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const m = (c: number) => Math.round(c + (255 - c) * quanto)
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`
}
/** Tom escuro de uma cor hex, para o texto de etiquetas. */
export function escurecer(hex: string, quanto = 0.35) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const m = (c: number) => Math.round(c * (1 - quanto))
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`
}

export function hojeISO() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Diferença em dias entre uma data (AAAA-MM-DD) e hoje. Negativo = no passado. */
export function diasAte(data: string) {
  const a = new Date(data + 'T00:00:00')
  const b = new Date(hojeISO() + 'T00:00:00')
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

export function textoPrazo(data: string | null) {
  if (!data) return 'sem prazo'
  const d = diasAte(data)
  if (d === 0) return 'hoje'
  if (d === 1) return 'amanhã'
  if (d === -1) return 'ontem'
  if (d < 0) return `há ${-d} dias`
  if (d < 7) return `em ${d} dias`
  return dataCurta(data)
}

export function dataCurta(data: string | null) {
  if (!data) return '-'
  const [a, m, d] = data.slice(0, 10).split('-')
  return `${d}/${m}${a !== String(new Date().getFullYear()) ? '/' + a.slice(2) : ''}`
}

export function dinheiro(v: number | null | undefined) {
  if (v == null) return '-'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function iniciais(nome: string) {
  return nome.replace(/^Dra?\.\s*/i, '').split(/\s+/).filter(Boolean).map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

const TONS = ['#3B6FB6', '#C2477F', '#2F8A55', '#C9741F', '#1D8C84', '#7D8526', '#9A7A30', '#6A5AA0']
export function corDe(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONS[h % TONS.length]
}
