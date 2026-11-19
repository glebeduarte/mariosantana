// Copia os arquivos que ainda estão no armazenamento do Lovable para o bucket "midia"
// e troca os endereços nas tabelas. Só um administrador logado pode chamar.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

const ORIGEM = /https:\/\/yycqayijtvpqckndjnju\.supabase\.co\/storage\/v1\/object\/public\/([^"\s,)]+)/g
const TABELAS = ['cursos', 'biblioteca', 'aulas', 'modulos']
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const url = Deno.env.get('SUPABASE_URL')!
  const usuario = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } })
  const { data: admin } = await usuario.rpc('e_admin')
  if (admin !== true) return json({ erro: 'Somente administradores.' }, 403)

  const db = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const novo = (caminho: string) => `${url}/storage/v1/object/public/midia/${caminho}`
  const copiados = new Map<string, string>()
  const falhas: string[] = []
  let linhas = 0

  for (const tabela of TABELAS) {
    const { data } = await db.from(tabela).select('*')
    for (const linha of data ?? []) {
      const mudancas: Record<string, unknown> = {}
      for (const [col, valor] of Object.entries(linha)) {
        if (valor == null) continue
        const texto = typeof valor === 'string' ? valor : JSON.stringify(valor)
        const achados = [...texto.matchAll(ORIGEM)]
        if (!achados.length) continue
        let saida = texto
        for (const [inteiro, caminho] of achados) {
          if (!copiados.has(inteiro)) {
            const r = await fetch(inteiro)
            if (!r.ok) { falhas.push(inteiro); continue }
            const up = await db.storage.from('midia').upload(decodeURIComponent(caminho), await r.arrayBuffer(),
              { contentType: r.headers.get('content-type') ?? undefined, upsert: true })
            if (up.error) { falhas.push(inteiro); continue }
            copiados.set(inteiro, novo(caminho))
          }
          saida = saida.split(inteiro).join(copiados.get(inteiro)!)
        }
        if (saida !== texto) mudancas[col] = typeof valor === 'string' ? saida : JSON.parse(saida)
      }
      if (Object.keys(mudancas).length) { await db.from(tabela).update(mudancas).eq('id', linha.id); linhas++ }
    }
  }
  return json({ arquivos: copiados.size, linhas, falhas })
})
