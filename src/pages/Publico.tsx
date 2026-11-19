import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SECOES, type Pergunta, type Resposta } from '@/lib/diagnostico'

const WHATS = 'https://wa.me/556581418899?text='
const LIMIAR = 9

/** Moldura das páginas públicas: fundo escuro e dourado, igual à vitrine. */
function Moldura({ children, pct, rotulo }: { children: React.ReactNode; pct: number; rotulo: string }) {
  return (
    <div className="min-h-screen bg-[#0E0D0B] text-[#F3EEE3]">
      <header className="flex h-[72px] items-center px-5 lg:px-12">
        <span className="font-marca text-[22px] font-semibold text-white">Método <span className="texto-ouro">Mário Santana</span></span>
      </header>
      <main className="mx-auto max-w-[720px] px-5 pb-20 pt-6">
        <div className="relative mb-10 h-1 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#E8CC8C] to-[#9A7A30] transition-all duration-500" style={{ width: `${pct}%` }} />
          <span className="absolute right-0 top-3 text-[11px] uppercase tracking-[0.15em] text-white/50">{rotulo}</span>
        </div>
        {children}
      </main>
    </div>
  )
}

const cartao = 'entrar rounded-2xl bg-white/[0.04] p-7 ring-1 ring-white/10 sm:p-9'
const opcao = (sel: boolean) => `flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-[15px] ring-1 transition ${sel ? 'bg-[#C9A453]/15 text-white ring-[#C9A453]' : 'text-white/70 ring-white/10 hover:bg-white/5 hover:text-white'}`
const campo = 'h-11 w-full rounded-lg bg-white/5 px-3 text-white outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-[#C9A453]'
const btnOuro = 'rounded-xl bg-gradient-to-r from-[#E8CC8C] to-[#B8913F] px-7 py-3 text-[14px] font-semibold text-[#1F1D18] shadow-[0_10px_30px_-10px_rgba(201,164,83,0.6)] transition hover:brightness-105 disabled:opacity-30'
const btnVoltar = 'py-3 text-[14px] text-white/60 hover:text-white'

/* ---------------- Qualificação ---------------- */

type Op = { t: string; v: string; s: number }
const Q: { id: string; rotulo: string; texto: string; ops: Op[]; desq?: string[]; msg?: string }[] = [
  { id: 'q1', rotulo: 'Sobre você', texto: 'Você é dentista com clínica ou consultório em funcionamento?',
    ops: [{ t: 'Sim, tenho clínica ativa', v: 'a', s: 2 }, { t: 'Sim, mas estou reestruturando', v: 'b', s: 1 }, { t: 'Ainda estou montando', v: 'c', s: -10 }, { t: 'Sou recém-formado(a)', v: 'd', s: -10 }],
    desq: ['c', 'd'], msg: 'Este diagnóstico é para dentistas com clínica já em operação. Quando você tiver sua estrutura montada, voltamos a conversar.' },
  { id: 'q2', rotulo: 'Faturamento', texto: 'Qual é a faixa aproximada do seu faturamento mensal atual?',
    ops: [{ t: 'Abaixo de R$ 15 mil', v: 'a', s: 0 }, { t: 'Entre R$ 15 mil e R$ 30 mil', v: 'b', s: 1 }, { t: 'Entre R$ 30 mil e R$ 60 mil', v: 'c', s: 2 }, { t: 'Acima de R$ 60 mil', v: 'd', s: 3 }] },
  { id: 'q3', rotulo: 'O problema central', texto: 'Como você descreveria seu faturamento nos últimos 6 meses?',
    ops: [{ t: 'Irregular, oscila muito sem controle', v: 'a', s: 3 }, { t: 'Razoável, mas abaixo do que deveria ser', v: 'b', s: 2 }, { t: 'Estável, mas quero escalar com mais segurança', v: 'c', s: 2 }, { t: 'Está ótimo, sem problemas', v: 'd', s: 0 }] },
  { id: 'q4', rotulo: 'Dependência de novos pacientes', texto: 'Sua receita depende principalmente de captar novos pacientes todo mês?',
    ops: [{ t: 'Sim, quase totalmente', v: 'a', s: 3 }, { t: 'Em boa parte, sim', v: 'b', s: 2 }, { t: 'Tenho alguma recorrência, mas é pouca', v: 'c', s: 1 }, { t: 'Não, já tenho base recorrente sólida', v: 'd', s: 0 }] },
  { id: 'q5', rotulo: 'Tempo de mercado', texto: 'Há quantos anos você atua como dentista?',
    ops: [{ t: 'Menos de 2 anos', v: 'a', s: 0 }, { t: 'Entre 2 e 5 anos', v: 'b', s: 1 }, { t: 'Entre 5 e 15 anos', v: 'c', s: 2 }, { t: 'Mais de 15 anos', v: 'd', s: 3 }] },
  { id: 'q6', rotulo: 'Investimento em desenvolvimento', texto: 'Você já investiu ou investe em mentoria, consultoria ou formação em gestão?',
    ops: [{ t: 'Sim, regularmente', v: 'a', s: 3 }, { t: 'Já investi pontualmente', v: 'b', s: 2 }, { t: 'Nunca investi, mas estou aberto(a)', v: 'c', s: 1 }, { t: 'Não vejo necessidade disso', v: 'd', s: -2 }] },
  { id: 'q7', rotulo: 'Disponibilidade', texto: 'Você teria disponibilidade para aplicar um método ao longo de 6 a 12 meses?',
    ops: [{ t: 'Sim, é exatamente o que busco', v: 'a', s: 2 }, { t: 'Sim, se os resultados forem claros', v: 'b', s: 2 }, { t: 'Talvez, dependendo da exigência', v: 'c', s: 1 }, { t: 'Não tenho tempo agora', v: 'd', s: -5 }],
    desq: ['d'], msg: 'Entendemos. Este processo exige dedicação real para funcionar. Quando sua agenda permitir, estamos aqui.' },
]

export function Qualificacao() {
  const [i, setI] = useState(0)
  const [resp, setResp] = useState<Record<string, string>>({})
  const [dados, setDados] = useState({ nome: '', esp: '', tel: '', email: '', cidade: '' })
  const [fim, setFim] = useState<null | { tipo: 'desq' | 'ok' | 'baixo'; msg?: string }>(null)
  const [enviando, setEnviando] = useState(false)
  const pontos = Q.reduce((s, q) => s + (q.ops.find(o => o.v === resp[q.id])?.s ?? 0), 0)
  const total = Q.length + 1
  const primeiro = (dados.nome || 'Doutor(a)').replace(/^Dr[a]?\.?\s*/i, '').split(' ')[0]
  const whats = (m: string) => window.open(WHATS + encodeURIComponent(m), '_blank')

  function escolher(q: typeof Q[number], v: string) {
    setResp({ ...resp, [q.id]: v })
    if (q.desq?.includes(v)) setFim({ tipo: 'desq', msg: q.msg })
  }

  async function concluir() {
    setEnviando(true)
    const ok = pontos >= LIMIAR
    const respostas = Object.fromEntries(Q.map(q => [q.texto, q.ops.find(o => o.v === resp[q.id])?.t ?? '-']))
    await supabase.from('leads').insert({
      nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(), telefone: dados.tel.trim(), cidade: dados.cidade.trim(),
      especialidade: dados.esp.trim() || null, origem: 'qualificacao', pontuacao: pontos, qualificado: ok, etapa: 'novo',
      motivo_desqualificacao: ok ? null : `Pontuação ${pontos} abaixo de ${LIMIAR}`,
      notas: Object.entries(respostas).map(([p, r]) => `${p}\n→ ${r}`).join('\n\n'),
    })
    setEnviando(false)
    setFim({ tipo: ok ? 'ok' : 'baixo' })
  }

  if (fim) return (
    <Moldura pct={100} rotulo="Concluído">
      <div className={`${cartao} text-center`}>
        {fim.tipo === 'ok' ? <>
          <h1 className="font-marca text-[34px] font-semibold texto-ouro">Tudo certo, {primeiro}.</h1>
          <p className="mx-auto mb-8 mt-3 max-w-md text-white/70">Seu perfil está alinhado com o diagnóstico. Mário reserva poucas vagas por mês para essa conversa, escolha o melhor horário para você.</p>
          <button className={btnOuro} onClick={() => whats(`Olá, sou ${dados.nome} (${dados.esp || 'dentista'}) de ${dados.cidade}. Tenho interesse em agendar a reunião de diagnóstico com o Dr. Mário.`)}>Escolher meu horário →</button>
          <p className="mt-8 text-[12px] uppercase tracking-[0.12em] text-[#E8CC8C]">Perfil qualificado · 45 minutos · Online · Sem custo</p>
        </> : <>
          <h1 className="font-marca text-[30px] font-semibold">{fim.tipo === 'desq' ? 'Obrigado pela honestidade.' : `Obrigado, ${primeiro}.`}</h1>
          <p className="mx-auto mb-8 mt-3 max-w-md text-white/70">{fim.msg ?? 'Pelo que você compartilhou, o diagnóstico com Mário pode não ser o passo mais adequado para o seu momento agora. Mas o caminho existe e começa em outro ponto.'}</p>
          <button className="rounded-xl px-7 py-3 text-[14px] ring-1 ring-[#C9A453]/40 hover:bg-white/5" onClick={() => whats('Olá, quero acompanhar o conteúdo do Mário Santana')}>Acompanhar o Mário</button>
          {fim.tipo === 'desq' && <div><button className={`${btnVoltar} mt-4`} onClick={() => { setFim(null); setResp(r => { const n = { ...r }; delete n[Q[i].id]; return n }) }}>← Voltar e rever a resposta</button></div>}
        </>}
      </div>
    </Moldura>
  )

  const q = Q[i]
  return (
    <Moldura pct={Math.round(i / total * 100)} rotulo={`${i + 1} de ${total}`}>
      {i === 0 && <div className="mb-10">
        <p className="mb-3 text-[12px] uppercase tracking-[0.2em] text-[#E8CC8C]">Diagnóstico com Mário Santana</p>
        <h1 className="font-marca text-[34px] font-semibold leading-tight">Algumas perguntas rápidas para entender o seu momento.</h1>
        <p className="mt-2 text-white/60">Leva menos de 3 minutos. Suas respostas determinam se o diagnóstico é adequado para o seu perfil agora.</p>
      </div>}
      {q ? <>
        <div className={cartao} key={q.id}>
          <p className="mb-2 text-[12px] uppercase tracking-[0.18em] text-[#E8CC8C]">{q.rotulo}</p>
          <p className="mb-6 font-marca text-[22px] leading-snug">{q.texto}</p>
          <div className="flex flex-col gap-2">{q.ops.map(o => <button key={o.v} className={opcao(resp[q.id] === o.v)} onClick={() => escolher(q, o.v)}>{o.t}</button>)}</div>
        </div>
        <div className="mt-6 flex justify-between">
          <button className={`${btnVoltar} ${i === 0 ? 'invisible' : ''}`} onClick={() => setI(i - 1)}>← Voltar</button>
          <button className={btnOuro} disabled={!resp[q.id]} onClick={() => setI(i + 1)}>Continuar →</button>
        </div>
      </> : <>
        <div className={cartao}>
          <p className="mb-2 text-[12px] uppercase tracking-[0.18em] text-[#E8CC8C]">Quase lá</p>
          <p className="mb-6 font-marca text-[22px]">Para onde enviamos a confirmação?</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {([['nome', 'Nome completo', 'text'], ['esp', 'Especialidade', 'text'], ['tel', 'WhatsApp', 'tel'], ['email', 'E-mail', 'email'], ['cidade', 'Cidade e estado', 'text']] as const).map(([k, r, t]) => (
              <label key={k} className={`flex flex-col gap-1.5 ${k === 'cidade' ? 'sm:col-span-2' : ''}`}><span className="text-[12px] text-white/60">{r}</span>
                <input id={`ql-${k}`} type={t} maxLength={200} className={campo} value={dados[k]} onChange={e => setDados({ ...dados, [k]: e.target.value })} /></label>
            ))}
          </div>
        </div>
        <div className="mt-6 flex justify-between">
          <button className={btnVoltar} onClick={() => setI(i - 1)}>← Voltar</button>
          <button className={btnOuro} disabled={enviando || !(dados.nome.trim() && dados.tel.trim() && /\S+@\S+\.\S+/.test(dados.email) && dados.cidade.trim())} onClick={concluir}>{enviando ? 'Enviando...' : 'Ver resultado →'}</button>
        </div>
      </>}
    </Moldura>
  )
}

/* ---------------- Autodiagnóstico ---------------- */

function CampoPergunta({ p, v, mudar }: { p: Pergunta; v: Resposta | undefined; mudar: (v: Resposta) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] leading-relaxed"><span className="mr-2 text-[12px] text-[#E8CC8C]">{p.id}</span>{p.text}</p>
      {p.type === 'single' && p.options!.map(o => <button key={o.value} type="button" className={opcao(v === o.value)} onClick={() => mudar(o.value)}>{o.label}</button>)}
      {p.type === 'multi' && p.options!.map(o => {
        const arr = Array.isArray(v) ? v : []
        const sel = arr.includes(o.value)
        const nenhum = o.value === 'nenhuma' || o.value === 'nenhum'
        return <button key={o.value} type="button" aria-pressed={sel} className={opcao(sel)} onClick={() => mudar(sel ? arr.filter(x => x !== o.value) : nenhum ? [o.value] : [...arr.filter(x => x !== 'nenhuma' && x !== 'nenhum'), o.value])}>
          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded ring-1 ${sel ? 'bg-[#C9A453] ring-[#C9A453]' : 'ring-white/30'}`}>{sel && <span className="text-[10px] text-[#1F1D18]">✓</span>}</span>{o.label}</button>
      })}
      {p.type === 'scale' && <>
        <div className="flex flex-wrap gap-2">{Array.from({ length: 11 }, (_, n) => (
          <button key={n} type="button" onClick={() => mudar(n)} className={`h-11 w-11 rounded-lg text-sm ring-1 transition ${v === n ? 'bg-gradient-to-br from-[#E8CC8C] to-[#B8913F] font-bold text-[#1F1D18] ring-transparent' : 'text-white/70 ring-white/15 hover:ring-[#C9A453]/60'}`}>{n}</button>))}</div>
        <div className="flex justify-between text-[12px] text-white/50"><span>0 = {p.scaleLabels!.min}</span><span>10 = {p.scaleLabels!.max}</span></div>
      </>}
      {p.type === 'textarea' && <>
        <textarea id={`d-${p.id}`} rows={p.id === '7.1' ? 6 : 4} maxLength={p.maxLength} placeholder={p.placeholder} value={(v as string) ?? ''} onChange={e => mudar(e.target.value)}
          className="w-full resize-none rounded-lg bg-white/5 p-3 text-white outline-none ring-1 ring-white/15 placeholder:text-white/30 focus:ring-[#C9A453]" />
        <span className="text-right text-[12px] text-white/40">{((v as string) ?? '').length}/{p.maxLength}</span>
      </>}
    </div>
  )
}

const preenchida = (v: Resposta | undefined) => v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)

export function Diagnostico() {
  const [passo, setPasso] = useState(0) // 0 dados, 1..7 seções, 8 revisão, 9 enviado
  const [dados, setDados] = useState({ nome: '', email: '', cidade: '', especialidade: '', anos: '' })
  const [resp, setResp] = useState<Record<string, Resposta>>({})
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const total = SECOES.length + 2
  const sobe = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  function avancar() {
    if (passo === 0 && !(dados.nome.trim() && /\S+@\S+\.\S+/.test(dados.email))) { setErro('Preencha nome e e-mail para continuar.'); return }
    if (passo >= 1 && passo <= SECOES.length) {
      const falta = SECOES[passo - 1].questions.find(q => !preenchida(resp[q.id]))
      if (falta) { setErro(`Responda a pergunta ${falta.id} para continuar.`); return }
    }
    setErro(null); setPasso(passo + 1); sobe()
  }

  async function enviar() {
    setEnviando(true); setErro(null)
    const leadId = crypto.randomUUID()
    const l = await supabase.from('leads').insert({
      id: leadId, nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(), cidade: dados.cidade.trim() || null,
      especialidade: dados.especialidade.trim() || null, origem: 'diagnostico', etapa: 'novo',
      notas: dados.anos ? `Anos de formado: ${dados.anos}` : null,
    })
    const d = await supabase.from('diagnosticos').insert({
      lead_id: l.error ? null : leadId, nome: dados.nome.trim(), email: dados.email.trim().toLowerCase(),
      respostas: { dados, respostas: resp },
    })
    setEnviando(false)
    if (d.error) { setErro('Não foi possível enviar agora. Tente de novo em instantes.'); return }
    setPasso(total); sobe()
  }

  const rotulo = passo === 0 ? 'Seus dados' : passo <= SECOES.length ? `Seção ${passo} de ${SECOES.length}` : passo === total - 1 ? 'Revisão' : 'Enviado'
  return (
    <Moldura pct={Math.min(100, Math.round(passo / total * 100))} rotulo={rotulo}>
      {passo === 0 && <>
        <div className="mb-10">
          <p className="mb-3 text-[12px] uppercase tracking-[0.2em] text-[#E8CC8C]">Autodiagnóstico</p>
          <h1 className="font-marca text-[36px] font-semibold leading-tight">Antes da mentoria, eu preciso entender onde você está.</h1>
          <p className="mt-2 text-white/60">São 31 perguntas em 7 blocos. Responda com sinceridade: só eu e minha equipe vemos as respostas.</p>
        </div>
        <div className={`${cartao} grid gap-4 sm:grid-cols-2`}>
          {([['nome', 'Nome completo'], ['email', 'E-mail'], ['cidade', 'Cidade e estado'], ['especialidade', 'Especialidade'], ['anos', 'Anos de formado']] as const).map(([k, r]) => (
            <label key={k} className="flex flex-col gap-1.5"><span className="text-[12px] text-white/60">{r}</span>
              <input id={`dg-${k}`} type={k === 'email' ? 'email' : 'text'} className={campo} value={dados[k]} onChange={e => setDados({ ...dados, [k]: e.target.value })} /></label>
          ))}
        </div>
      </>}
      {passo >= 1 && passo <= SECOES.length && (() => { const s = SECOES[passo - 1]; return (
        <div key={s.number}>
          <div className="mb-8">
            <p className="text-[12px] uppercase tracking-[0.2em] text-[#E8CC8C]">{s.number} · {s.subtitle}</p>
            <h2 className="font-marca text-[38px] font-semibold">{s.title}</h2>
            <p className="mt-1 max-w-[60ch] text-white/60">{s.context}</p>
          </div>
          <div className={`${cartao} flex flex-col gap-9`}>{s.questions.map(p => <CampoPergunta key={p.id} p={p} v={resp[p.id]} mudar={v => setResp({ ...resp, [p.id]: v })} />)}</div>
        </div>) })()}
      {passo === total - 1 && <div className={cartao}>
        <h2 className="font-marca text-[30px] font-semibold">Tudo pronto para enviar</h2>
        <p className="mt-2 text-white/60">Você respondeu {Object.values(resp).filter(preenchida).length} perguntas. Se quiser ajustar alguma, volte nas seções antes de enviar.</p>
        <ul className="mt-6 flex flex-col gap-1.5 text-[14px] text-white/70">{SECOES.map((s, k) => <li key={s.number}><button className="hover:text-white" onClick={() => setPasso(k + 1)}>{s.number} {s.title} →</button></li>)}</ul>
      </div>}
      {passo === total && <div className={`${cartao} text-center`}>
        <h1 className="font-marca text-[34px] font-semibold texto-ouro">Recebido, {dados.nome.split(' ')[0]}.</h1>
        <p className="mx-auto mt-3 max-w-md text-white/70">Vou ler cada resposta com atenção antes da nossa conversa. Se precisar de algo, chame no WhatsApp.</p>
      </div>}
      {erro && <p className="mt-4 text-[14px] text-[#F0A08A]">{erro}</p>}
      {passo < total && <div className="mt-6 flex justify-between">
        <button className={`${btnVoltar} ${passo === 0 ? 'invisible' : ''}`} onClick={() => { setErro(null); setPasso(passo - 1); sobe() }}>← Voltar</button>
        {passo === total - 1
          ? <button className={btnOuro} disabled={enviando} onClick={enviar}>{enviando ? 'Enviando...' : 'Enviar diagnóstico'}</button>
          : <button className={btnOuro} onClick={avancar}>Continuar →</button>}
      </div>}
    </Moldura>
  )
}
