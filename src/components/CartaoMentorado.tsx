import { Link } from 'react-router-dom'
import type { ResumoMentorado } from '@/lib/mentoria'
import { NIVEL } from '@/lib/mentoria'
import { dataCurta } from '@/lib/util'
import { Avatar } from './ui'

/** Anel de progresso da etapa atual. */
function Anel({ pct, tamanho = 56 }: { pct: number; tamanho?: number }) {
  const r = (tamanho - 6) / 2, c = 2 * Math.PI * r
  return (
    <svg width={tamanho} height={tamanho} viewBox={`0 0 ${tamanho} ${tamanho}`} role="img" aria-label={`${pct}% da etapa`} className="shrink-0">
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="#EEECE6" strokeWidth={5} />
      <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" stroke="#9A7A30" strokeWidth={5} strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`} transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={13} fontWeight={700} fill="#1C1B18">{pct}%</text>
    </svg>
  )
}

export default function CartaoMentorado({ r, totalEtapas }: { r: ResumoMentorado; totalEtapas: number }) {
  const n = NIVEL[r.nivel]
  const ordem = r.etapa?.ordem ?? 1
  return (
    <Link to={`/mentorados/${r.m.id}`} className="cartao cartao-hover group relative flex flex-col overflow-hidden">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: n.cor }} />
      <div className="flex items-start gap-3 p-5 pb-4">
        <Avatar id={r.m.id} nome={r.m.nome} tamanho={46} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <b className="truncate text-[16px] leading-tight">{r.m.nome}</b>
          <span className="truncate text-[13px] text-cinza">{[r.m.especialidade, r.m.cidade].filter(Boolean).join(' · ') || `Mentoria ${r.plano.toLowerCase()}`}</span>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: n.fundo, color: n.texto }}>{n.nome}</span>
      </div>

      <div className="flex items-center gap-4 px-5 pb-4">
        <Anel pct={r.pctEtapa} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-xs text-cinza">Etapa {ordem} de {totalEtapas}</span>
          <b className="text-[15px]">{r.etapa?.nome ?? '-'}</b>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: totalEtapas }, (_, i) => (
              <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i + 1 < ordem ? '#9A7A30' : i + 1 === ordem ? '#D8C08A' : '#EEECE6' }} />
            ))}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 border-t border-linha bg-[#FBFAF7] text-center">
        <div className="flex flex-col gap-0.5 px-2 py-3"><dt className="text-[11px] text-cinza">Itens da etapa</dt><dd className="num font-semibold">{r.feitosEtapa}/{r.itensEtapa}</dd></div>
        <div className="flex flex-col gap-0.5 border-x border-linha px-2 py-3"><dt className="text-[11px] text-cinza">Aulas vistas</dt><dd className="num font-semibold">{r.aulasConcluidas}</dd></div>
        <div className="flex flex-col gap-0.5 px-2 py-3"><dt className="text-[11px] text-cinza">Última sessão</dt><dd className="num font-semibold">{r.ultimaSessao ? dataCurta(r.ultimaSessao) : '-'}</dd></div>
      </dl>

      <div className="flex min-h-[44px] items-center gap-2 border-t border-linha px-5 py-2.5 text-[13px]">
        {r.motivos.length ? <span className="truncate" style={{ color: n.texto }}>{r.motivos.join(' · ')}</span> : <span className="text-bom-texto">Tudo em dia</span>}
        <span className="ml-auto shrink-0 text-cinza transition group-hover:translate-x-0.5 group-hover:text-tinta">Abrir →</span>
      </div>
    </Link>
  )
}
