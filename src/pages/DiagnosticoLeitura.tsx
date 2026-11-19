import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { SECOES, rotuloResposta, type Resposta } from '@/lib/diagnostico'
import { dataCurta } from '@/lib/util'
import { Cabecalho, Carregando, Erro } from '@/components/ui'

type Diag = { id: string; nome: string | null; email: string | null; criado_em: string; lead_id: string | null; mentorado_id: string | null
  respostas: { dados?: Record<string, string>; respostas?: Record<string, Resposta>; texto?: string } }

/** Leitura do autodiagnóstico: respostas agrupadas pelas 7 seções do método. */
export default function DiagnosticoLeitura() {
  const { id } = useParams()
  const { data, isLoading, error } = useQuery({
    queryKey: ['diagnostico', id],
    queryFn: async () => { const r = await supabase.from('diagnosticos').select('*').eq('id', id!).single(); if (r.error) throw r.error; return r.data as Diag },
  })
  if (isLoading) return <Carregando />
  if (error || !data) return <Erro erro={error} />
  const dados = data.respostas.dados ?? {}
  const resp = data.respostas.respostas ?? {}
  return (
    <>
      <Cabecalho titulo={`Diagnóstico de ${data.nome ?? 'sem nome'}`}
        frase={[data.email, dados.cidade, dados.especialidade, dados.anos && `${dados.anos} anos de formado`, `enviado em ${dataCurta(data.criado_em)}`].filter(Boolean).join(' · ')}
        acoes={<>{data.mentorado_id && <Link className="btn-secundario" to={`/mentorados/${data.mentorado_id}`}>Abrir jornada</Link>}<Link className="btn-secundario" to="/leads">Voltar aos leads</Link></>} />
      {data.respostas.texto && !Object.keys(resp).length
        ? <pre className="cartao whitespace-pre-wrap p-6 font-sans text-[14px] leading-relaxed">{data.respostas.texto}</pre>
        : SECOES.map(s => (
          <section key={s.number} className="cartao overflow-hidden">
            <header className="faixa-ouro px-6 py-3 text-white"><span className="text-[12px] text-white/60">{s.number}</span> <b className="ml-1">{s.title}</b> <span className="text-[13px] text-white/60">· {s.subtitle}</span></header>
            <dl className="flex flex-col">{s.questions.map(p => (
              <div key={p.id} className="grid gap-1 border-t border-linha px-6 py-3.5 first:border-t-0 md:grid-cols-[2fr_3fr] md:gap-6">
                <dt className="text-[13px] text-cinza"><span className="mr-1.5 text-ouro-escuro">{p.id}</span>{p.text}</dt>
                <dd className="whitespace-pre-wrap text-[14px] font-medium">{rotuloResposta(p, resp[p.id])}</dd>
              </div>))}
            </dl>
          </section>
        ))}
    </>
  )
}
