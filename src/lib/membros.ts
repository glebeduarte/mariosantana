export interface Curso {
  id: string; titulo: string; slug: string | null; descricao_curta: string | null; capa_url: string | null
  imagem_destaque_url: string | null; categoria: string | null; publicado: boolean; destaque: boolean
  ordem_vitrine: number | null; checkout_url: string | null
}
export interface Modulo { id: string; curso_id: string; titulo: string; ordem: number }
export interface Aula {
  id: string; modulo_id: string; titulo: string; descricao: string | null; conteudo: string | null
  video_tipo: string; video_url: string | null; pdf_url: string | null; ordem: number
}
export interface Aluno { id: string; user_id: string | null; email: string | null; nome: string; origem: string | null; criado_em: string }
export interface Matricula { id: string; aluno_id: string; curso_id: string; criada_em: string; expira_em: string | null }

/** Converte links do Google Drive e do YouTube em endereço que pode ser exibido dentro da página. */
export function urlIncorporavel(url: string | null) {
  if (!url) return null
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
  if (drive) return `https://drive.google.com/file/d/${drive[1]}/preview`
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}
