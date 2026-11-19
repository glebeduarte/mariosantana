import { Cabecalho, Vazio } from '@/components/ui'

const TEXTOS: Record<string, { titulo: string; frase: string; detalhe: string }> = {
  agenda: { titulo: 'Agenda', frase: 'Compromissos do Google Agenda do Dr. Mário junto com os prazos das tarefas.', detalhe: 'Entra quando a conta Google do Dr. Mário for conectada.' },
  reunioes: { titulo: 'Reuniões', frase: 'Pauta, notas e tarefas geradas em cada reunião de equipe.', detalhe: 'Próxima etapa da construção.' },
  documentos: { titulo: 'Documentos', frase: 'Links, modelos e materiais organizados por frente.', detalhe: 'Próxima etapa. Os links da Eduzz e das páginas, hoje no ClickUp, entram aqui.' },
  membros: { titulo: 'Área de membros', frase: 'Cursos, aulas, alunos, vitrine, planos, certificados e integração com a Eduzz.', detalhe: 'Em migração: os 5 cursos, 45 aulas e 60 matrículas da plataforma atual serão copiados para cá. Até a virada, a área de membros da Lovable segue no ar.' },
}

export default function EmBreve({ secao }: { secao: keyof typeof TEXTOS }) {
  const t = TEXTOS[secao]
  return (
    <>
      <Cabecalho titulo={t.titulo} frase={t.frase} />
      <Vazio>{t.detalhe}</Vazio>
    </>
  )
}
