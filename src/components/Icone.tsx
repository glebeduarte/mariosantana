const P: Record<string, string> = {
  inicio: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  tarefas: 'M4 5h16M4 12h16M4 19h10M17 17l2 2 3-4',
  agenda: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  reunioes: 'M3 6h12v9H8l-5 4zM15 10h6v8l-3-2h-3',
  documentos: 'M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6',
  mentorados: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 3.5a4 4 0 0 1 0 7.5M22 21c0-3-2-5-4-5.5',
  membros: 'M3 5h18v12H3zM10 9l5 3-5 3zM8 21h8',
  equipe: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  leads: 'M3 4h18l-7 8v6l-4 2v-8z',
  financeiro: 'M3 7h18v12H3zM3 11h18M7 15h3',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.5-4.5',
  mais: 'M12 5v14M5 12h14',
  seta: 'M9 6l6 6-6 6',
  alerta: 'M12 3 2 20h20zM12 10v4M12 17v.5',
  relogio: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  check: 'M5 12l4 4 10-10',
  sair: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 6h16M4 12h16M4 18h16',
  grade: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  lista: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
}

export default function Icone({ nome, tamanho = 18, className = '' }: { nome: keyof typeof P | string; tamanho?: number; className?: string }) {
  return (
    <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
      strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`}>
      <path d={P[nome] ?? P.seta} />
    </svg>
  )
}
