import type { ReactNode } from 'react'
import { clarear, escurecer, corDe, iniciais } from '@/lib/util'

export function EtiquetaFrente({ nome, cor }: { nome: string; cor: string }) {
  return (
    <span className="shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: clarear(cor), color: escurecer(cor) }}>
      {nome}
    </span>
  )
}

export function Ponto({ cor, tamanho = 10 }: { cor: string; tamanho?: number }) {
  return <span className="shrink-0 rounded-[3px]" style={{ width: tamanho, height: tamanho, background: cor }} />
}

export function Avatar({ id, nome, tamanho = 26 }: { id: string; nome: string; tamanho?: number }) {
  const c = corDe(id)
  return (
    <span title={nome} className="grid shrink-0 place-items-center rounded-full font-bold"
      style={{ width: tamanho, height: tamanho, fontSize: tamanho * 0.4, background: clarear(c), color: escurecer(c) }}>
      {iniciais(nome)}
    </span>
  )
}

type Tom = 'bom' | 'alerta' | 'ruim' | 'neutro' | 'forte'
const TONS: Record<Tom, string> = {
  bom: 'bg-bom-fundo text-bom-texto',
  alerta: 'bg-alerta-fundo text-alerta-texto',
  ruim: 'bg-ruim-fundo text-ruim-texto',
  neutro: 'bg-[#EEECE6] text-[#4A4943]',
  forte: 'bg-ruim text-white',
}
export function Pilula({ tom = 'neutro', children }: { tom?: Tom; children: ReactNode }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONS[tom]}`}>{children}</span>
}

export function Barra({ pct, cor = '#9A7A30' }: { pct: number; cor?: string }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#EEECE6]">
      <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: cor }} />
    </div>
  )
}

export function Cabecalho({ titulo, frase, acoes }: { titulo: string; frase?: ReactNode; acoes?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-[26px] font-bold leading-tight">{titulo}</h1>
        {frase && <p className="text-[#4A4943]">{frase}</p>}
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-linha px-4 py-6 text-center text-cinza">{children}</div>
}

export function Carregando() {
  return <div className="py-10 text-center text-cinza">Carregando…</div>
}

export function Erro({ erro }: { erro: unknown }) {
  return <div className="rounded-lg bg-ruim-fundo px-4 py-3 text-ruim-texto">Não foi possível carregar: {(erro as Error)?.message ?? 'erro desconhecido'}</div>
}

export function Painel({ titulo, direita, children, className = '' }: { titulo: string; direita?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`cartao flex flex-col p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-2 pb-2">
        <h2 className="text-base font-bold">{titulo}</h2>
        {direita}
      </div>
      {children}
    </section>
  )
}
