// Recebe as vendas da Eduzz, libera ou retira o acesso aos cursos e cria o mentorado quando a regra pede.
// Endereço: /functions/v1/webhook-vendas?token=<token da tabela integracao_vendas>
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })

function pegar(obj: unknown, caminhos: string[][]): string | null {
  for (const c of caminhos) {
    let atual: any = obj
    for (const k of c) atual = atual && typeof atual === 'object' ? atual[k] : undefined
    if (typeof atual === 'string' && atual.trim()) return atual.trim()
    if (typeof atual === 'number') return String(atual)
  }
  return null
}
const campo = (p: unknown, k: string) => pegar(p, [[k], ['fields', k]])

async function lerCorpo(req: Request): Promise<Record<string, unknown>> {
  const tipo = req.headers.get('content-type') ?? ''
  if (tipo.includes('json')) return await req.json().catch(() => ({}))
  if (tipo.includes('form')) { const f = await req.formData(); return Object.fromEntries(f.entries()) }
  const t = await req.text(); try { return JSON.parse(t) } catch { return { bruto: t } }
}

function acaoEduzz(p: unknown): 'liberar' | 'retirar' | 'ignorar' {
  const tipo = campo(p, 'type')?.toLowerCase()
  const fatura = campo(p, 'edz_fat_status') ?? ''
  const contrato = campo(p, 'edz_con_status_cod') ?? ''
  if (tipo === 'remove') return 'retirar'
  if (['4', '7', '9', '10'].includes(fatura) || ['3', '4', '7', '9', '11'].includes(contrato)) return 'retirar'
  if (fatura === '3' || ['1', '10'].includes(contrato)) return 'liberar'
  const s = (pegar(p, [['status'], ['data', 'status'], ['event']]) ?? '').toLowerCase()
  if (/refund|chargeback|cancel|expired|reembols|devolv/.test(s)) return 'retirar'
  if (/approved|paid|complete|aprovad|pago/.test(s)) return 'liberar'
  return 'ignorar'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erro: 'Use POST' }, 405)
  const token = new URL(req.url).searchParams.get('token') ?? req.headers.get('x-webhook-token')
  const { data: integ } = await db.from('integracao_vendas').select('token, ativa').eq('provedor', 'eduzz').maybeSingle()
  if (!integ || !token || token !== integ.token) return json({ erro: 'Token inválido' }, 401)
  if (!integ.ativa) return json({ erro: 'Integração pausada' }, 409)

  const p = await lerCorpo(req)
  const produto = pegar(p, [['edz_cnt_cod'], ['fields', 'edz_cnt_cod'], ['edz_cnt_paicod'], ['fields', 'edz_cnt_paicod'], ['product_id'], ['data', 'product_id'], ['product', 'id']])
  const email = pegar(p, [['edz_cli_email'], ['fields', 'edz_cli_email'], ['buyer', 'email'], ['customer', 'email'], ['email']])?.toLowerCase() ?? null
  const nome = pegar(p, [['edz_cli_rsocial'], ['fields', 'edz_cli_rsocial'], ['buyer', 'name'], ['customer', 'name'], ['name']])
  const telefone = pegar(p, [['edz_cli_cel'], ['fields', 'edz_cli_cel'], ['buyer', 'phone'], ['phone']])
  const acao = acaoEduzz(p)
  const { data: ev } = await db.from('eventos_venda').insert({
    evento_externo: pegar(p, [['nsid'], ['sid'], ['fields', 'edz_fat_cod'], ['id']]), produto_externo_id: produto, email, nome, telefone, acao, payload: p,
  }).select('id').single()
  const fechar = async (status: string, extra: Record<string, unknown> = {}) => { await db.from('eventos_venda').update({ status, ...extra }).eq('id', ev!.id); return json({ ok: true, status }) }

  try {
    if (!produto || !email) return await fechar('ignorado', { erro: 'Sem produto ou e-mail (teste de validação)' })
    const { data: regra } = await db.from('regras_produto').select('*').eq('produto_externo_id', produto).maybeSingle()
    if (!regra || !regra.ativa) return await fechar('ignorado', { erro: 'Nenhuma regra ativa para este produto' })
    if (acao === 'ignorar') return await fechar('ignorado', { regra_id: regra.id, erro: 'Status de pagamento sem mudança de acesso' })

    let cursos: string[]
    if (regra.todos_cursos) cursos = ((await db.from('cursos').select('id')).data ?? []).map(c => c.id)
    else cursos = [...new Set([...((await db.from('regra_produto_cursos').select('curso_id').eq('regra_id', regra.id)).data ?? []).map(c => c.curso_id), ...(regra.curso_id ? [regra.curso_id] : [])])]

    let { data: aluno } = await db.from('alunos').select('id').eq('email', email).maybeSingle()
    if (!aluno && acao === 'liberar') aluno = (await db.from('alunos').insert({ email, nome: nome ?? email, origem: 'eduzz' }).select('id').single()).data
    if (!aluno) return await fechar('ignorado', { regra_id: regra.id, erro: 'Aluno não encontrado para retirar acesso' })

    if (acao === 'liberar') {
      const expira = regra.dias_acesso ? new Date(Date.now() + regra.dias_acesso * 864e5).toISOString() : null
      if (cursos.length) {
        const { error } = await db.from('matriculas').upsert(cursos.map(curso_id => ({ aluno_id: aluno!.id, curso_id, expira_em: expira })), { onConflict: 'aluno_id,curso_id' })
        if (error) throw error
      }
      if (regra.plano_mentoria) {
        const { data: existe } = await db.from('mentorados').select('id').ilike('email', email).maybeSingle()
        if (!existe) {
          const meses = regra.plano_mentoria === 'semestral' ? 6 : regra.plano_mentoria === 'trimestral' ? 3 : 12
          const { data: plano } = await db.from('planos_mentoria').select('id').eq('duracao_meses', meses).order('ativo', { ascending: false }).limit(1).maybeSingle()
          const { data: etapa } = await db.from('etapas').select('id').order('ordem').limit(1).maybeSingle()
          const hoje = new Date()
          const fim = new Date(hoje); fim.setMonth(fim.getMonth() + meses)
          await db.from('mentorados').insert({ nome: nome ?? email, email, telefone, plano_id: plano?.id ?? null, etapa_id: etapa?.id ?? null,
            inicio: hoje.toISOString().slice(0, 10), fim: fim.toISOString().slice(0, 10) })
        }
      }
    } else if (cursos.length) {
      await db.from('matriculas').delete().eq('aluno_id', aluno.id).in('curso_id', cursos)
    }
    return await fechar('processado', { regra_id: regra.id, erro: null })
  } catch (e) {
    return await fechar('erro', { erro: e instanceof Error ? e.message : String(e) })
  }
})
