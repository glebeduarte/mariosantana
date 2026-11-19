// Perguntas do autodiagnóstico, trazidas do site atual sem alteração de texto.
export interface Opcao { label: string; value: string }
export interface Pergunta {
  id: string; text: string; type: 'single' | 'multi' | 'scale' | 'textarea'
  options?: Opcao[]; placeholder?: string; maxLength?: number
  scaleLabels?: { min: string; max: string }
}
export interface Secao { number: string; title: string; subtitle: string; context: string; questions: Pergunta[] }

const o = (...pares: [string, string][]): Opcao[] => pares.map(([label, value]) => ({ label, value }))
const escala = (id: string, text: string, min: string, max: string): Pergunta => ({ id, text, type: 'scale', scaleLabels: { min, max } })
const texto = (id: string, text: string, maxLength: number, placeholder: string): Pergunta => ({ id, text, type: 'textarea', maxLength, placeholder })
const unica = (id: string, text: string, options: Opcao[]): Pergunta => ({ id, text, type: 'single', options })
const multi = (id: string, text: string, options: Opcao[]): Pergunta => ({ id, text, type: 'multi', options })

export const SECOES: Secao[] = [
  { number: '01', title: 'Despertar', subtitle: 'Mentalidade e Autoconhecimento',
    context: 'Aqui eu quero entender como você se enxerga como profissional e como empreendedor. Sem julgamento, só clareza.',
    questions: [
      unica('1.1', 'Como você se descreveria hoje: mais como um técnico que tem consultório ou como um empreendedor que pratica odontologia?', o(
        ['Totalmente técnico, meu foco é 100% na cadeira', 'totalmente_tecnico'], ['Mais técnico do que empreendedor', 'mais_tecnico'],
        ['Meio a meio, tento equilibrar', 'meio_a_meio'], ['Mais empreendedor do que técnico', 'mais_empreendedor'], ['Me vejo claramente como empresário', 'empresario'])),
      escala('1.2', 'De 0 a 10, quão seguro você se sente sobre quem você é como profissional, não o que você faz, mas quem você é?', 'totalmente inseguro', 'clareza total'),
      multi('1.3', 'Quais dessas crenças você reconhece em si mesmo? (marque todas que se aplicam)', o(
        ['"Basta ser bom tecnicamente que o sucesso vem"', 'tecnica_sucesso'], ['"Marketing é coisa de vendedor, não de dentista"', 'marketing_vendedor'],
        ['"Eu deveria estar mais avançado na carreira a essa altura"', 'deveria_avancado'], ['"Me comparo com colegas nas redes sociais e me sinto para trás"', 'comparacao_redes'],
        ['"Não me sinto confortável me posicionando como autoridade"', 'desconforto_autoridade'], ['"Tenho medo de cobrar o que realmente valho"', 'medo_cobrar'], ['Nenhuma dessas', 'nenhuma'])),
      texto('1.4', 'Quais são suas 3 maiores frustrações com o consultório hoje?', 500, 'Seja direto. Ex: "Trabalho demais e ganho pouco", "Não consigo reter pacientes"...'),
      texto('1.5', 'O que te motivou a buscar uma mentoria neste momento da sua carreira?', 500, 'O que aconteceu ou o que você sentiu que te fez tomar essa decisão?'),
    ] },
  { number: '02', title: 'Clareza', subtitle: 'O Poder da Odontologia Preventiva',
    context: 'Aqui eu quero entender qual é o papel real da prevenção na sua prática hoje, não o que você acha que deveria ser, mas o que de fato acontece no dia a dia.',
    questions: [
      unica('2.1', 'Qual é o papel da prevenção na sua clínica hoje?', o(
        ['Praticamente inexistente, atendo demanda curativa', 'inexistente'], ['Falo sobre prevenção mas não tenho processo estruturado', 'sem_processo'],
        ['Tenho algumas ações preventivas mas são pontuais', 'pontuais'], ['A prevenção faz parte do meu atendimento de forma consistente', 'consistente'], ['A prevenção é o centro do meu modelo de negócio', 'centro'])),
      unica('2.2', 'Quando um paciente termina um tratamento, o que acontece normalmente?', o(
        ['Ele vai embora e só volta se tiver dor ou problema novo', 'vai_embora'], ['Eu sugiro que volte, mas a maioria não volta', 'sugiro'],
        ['Alguns voltam para check-up, mas sem regularidade', 'alguns_voltam'], ['A maioria volta para acompanhamento preventivo regular', 'maioria_volta'],
        ['Praticamente todos voltam, tenho um sistema de retorno funcionando', 'todos_voltam'])),
      escala('2.3', 'De 0 a 10, quanta da sua receita vem de pacientes recorrentes (que voltam regularmente) vs. pacientes novos?', '100% depende de novos', '100% vem de recorrentes'),
      texto('2.4', 'Se um paciente te perguntasse "Doutor, eu preciso mesmo voltar se não estou sentindo nada?", como você responderia?', 400, 'Escreva como responderia na prática, não a resposta ideal...'),
      unica('2.5', 'Você consegue explicar para um paciente leigo, em 2 minutos, por que a prevenção é mais valiosa do que esperar o problema aparecer?', o(
        ['Não, tenho dificuldade de articular isso de forma convincente', 'dificuldade'], ['Mais ou menos, falo sobre isso mas sinto que não gera impacto', 'mais_ou_menos'],
        ['Sim, consigo explicar com clareza e geralmente o paciente entende', 'sim_clareza'], ['Sim, e quando explico o paciente muda de postura na hora', 'sim_impacto'])),
    ] },
  { number: '03', title: 'Influência', subtitle: 'Soft Skills para o Profissional Completo',
    context: 'Comunicação, vendas, experiência do paciente, liderança. Tudo que a faculdade não ensinou.',
    questions: [
      unica('3.1', 'Como você apresenta um plano de tratamento ao paciente hoje?', o(
        ['Explico o procedimento e digo o valor', 'procedimento_valor'], ['Explico o problema, o tratamento e o valor', 'problema_tratamento_valor'],
        ['Explico o problema, educo sobre as consequências, apresento a solução e o valor', 'educo_consequencias'], ['Faço uma consulta completa de conscientização antes de falar em valor', 'consulta_completa'])),
      escala('3.2', 'De 0 a 10, quão confortável você se sente falando sobre preço com o paciente?', 'muito desconfortável', 'totalmente natural'),
      unica('3.3', 'Como é a relação com sua equipe hoje?', o(
        ['Trabalho sozinho (sem equipe)', 'sozinho'], ['Tenho equipe mas é fonte constante de frustração', 'frustracao'], ['Funciona no básico mas falta alinhamento', 'basico'],
        ['Equipe razoável, mas depende muito de mim para tudo', 'razoavel'], ['Equipe alinhada e com boa autonomia', 'alinhada'])),
      unica('3.4', 'Com que frequência você treina sua equipe?', o(
        ['Não treino, não tenho equipe ou nunca fiz isso', 'nao_treino'], ['Raramente, quando surge um problema grave', 'raramente'],
        ['Pontualmente, reuniões esporádicas (mensal, trimestral)', 'pontualmente'], ['Regularmente, tenho rotina de treinamento estruturada', 'regularmente'],
        ['Diariamente, correções e orientações no momento que acontecem', 'diariamente'])),
      unica('3.5', 'Qual dessas frases mais te representa hoje?', o(
        ['"Faço um trabalho excelente mas os pacientes não percebem o valor"', 'nao_percebem'], ['"Sei que preciso vender melhor mas tenho medo de parecer vendedor"', 'medo_vendedor'],
        ['"Já tentei técnicas de vendas e não funcionou para mim"', 'nao_funcionou'], ['"Consigo vender bem quando o paciente valoriza, mas muitos não valorizam"', 'alguns_valorizam'],
        ['"Meus pacientes percebem o valor e aceitam o tratamento sem resistência"', 'percebem_valor'])),
    ] },
  { number: '04', title: 'Conexão', subtitle: 'Cultura de Relacionamento',
    context: 'Indicação, fidelização, pertencimento. Como está a relação com seus pacientes além do procedimento.',
    questions: [
      unica('4.1', 'Seus pacientes indicam espontaneamente?', o(
        ['Raramente ou nunca', 'raramente'], ['Acontece de vez em quando, sem padrão', 'sem_padrao'],
        ['Sim, com alguma frequência, mas não sei por que alguns indicam e outros não', 'alguma_frequencia'],
        ['Sim, regularmente, boa parte dos meus novos pacientes vem por indicação', 'regularmente'], ['Indicação é minha principal fonte de novos pacientes', 'principal_fonte'])),
      multi('4.2', 'Você tem algum processo de fidelização estruturado? (marque todos que se aplicam)', o(
        ['Boas-vindas para novos pacientes', 'boas_vindas'], ['Mensagem de aniversário', 'aniversario'], ['Follow-up pós-consulta', 'followup'],
        ['Programa de retorno preventivo', 'retorno_preventivo'], ['Kit ou presente para pacientes', 'kit_presente'],
        ['Comunicação regular entre consultas (conteúdo, dicas)', 'comunicacao_regular'], ['Nenhum processo estruturado', 'nenhum'])),
      escala('4.3', 'De 0 a 10, quanto seus pacientes se sentem "parte de algo" ao serem atendidos por você, não apenas clientes?', 'relação puramente transacional', 'forte senso de pertencimento'),
      unica('4.4', 'Preço é um tema frequente com seus pacientes?', o(
        ['Sim, a maioria questiona ou compara preços', 'maioria_questiona'], ['Alguns questionam, outros aceitam sem problema', 'alguns'],
        ['Raramente questionam, a maioria aceita o valor', 'raramente'], ['Praticamente nunca, preço não é assunto', 'nunca'])),
      unica('4.5', 'Se um paciente seu antigo ouvisse alguém criticar seu trabalho, o que aconteceria?', o(
        ['Provavelmente não diria nada', 'nada'], ['Talvez defendesse, depende da situação', 'talvez'], ['A maioria defenderia meu nome', 'maioria_defenderia'],
        ['Tenho pacientes que seriam os primeiros a me defender publicamente', 'defendem_publicamente'])),
    ] },
  { number: '05', title: 'Ecossistema', subtitle: 'Sustentabilidade e Escala',
    context: 'Processos, equipe, ferramentas. O sistema que faz (ou deveria fazer) tudo funcionar.',
    questions: [
      unica('5.1', 'Se você faltasse uma semana inteira, o que aconteceria com sua clínica?', o(
        ['Para tudo, nada funciona sem mim', 'para_tudo'], ['Funciona precariamente, muita coisa trava', 'precariamente'], ['O básico roda, mas perde qualidade', 'basico'],
        ['Funciona razoavelmente, equipe dá conta do operacional', 'razoavelmente'], ['Funciona normalmente, processos e equipe são autônomos', 'normalmente'])),
      unica('5.2', 'Seus processos estão documentados?', o(
        ['Não tenho processos documentados, está tudo na minha cabeça', 'nada'], ['Tenho algumas anotações soltas mas nada estruturado', 'anotacoes'],
        ['Tenho alguns processos básicos registrados', 'basicos'], ['A maioria dos processos está documentada e acessível à equipe', 'maioria'],
        ['Tudo documentado, a equipe consulta sem precisar me perguntar', 'tudo'])),
      multi('5.3', 'Que ferramentas de gestão você usa hoje? (marque todas que se aplicam)', o(
        ['Software de gestão da clínica (agenda, prontuário)', 'software_gestao'], ['CRM de pacientes', 'crm'], ['WhatsApp Business', 'whatsapp'],
        ['Planilha financeira (Excel, Google Sheets)', 'planilha'], ['Sistema de agendamento online', 'agendamento'],
        ['Ferramenta de disparo de mensagens (automação)', 'automacao'], ['Nenhuma ferramenta específica', 'nenhuma'])),
      escala('5.4', 'De 0 a 10, quão previsível é sua receita nos próximos 3 meses?', 'zero previsibilidade, cada mês é surpresa', 'sei exatamente o que entra'),
      texto('5.5', 'Qual sua maior dificuldade operacional hoje?', 400, 'O que mais trava no dia a dia da sua clínica?'),
    ] },
  { number: '06', title: 'Sua Clínica', subtitle: 'Dados gerais',
    context: 'Informações práticas para eu entender o tamanho e o momento do seu negócio. Tudo confidencial.',
    questions: [
      unica('6.1', 'Quantos pacientes ativos você atende por mês (média)?', o(['Menos de 30', 'menos_30'], ['30 a 60', '30_60'], ['60 a 100', '60_100'], ['100 a 150', '100_150'], ['Mais de 150', 'mais_150'])),
      unica('6.2', 'Faixa de faturamento mensal bruto da clínica:', o(['Até R$ 15.000', 'ate_15k'], ['R$ 15.000 a R$ 30.000', '15k_30k'], ['R$ 30.000 a R$ 60.000', '30k_60k'],
        ['R$ 60.000 a R$ 100.000', '60k_100k'], ['Acima de R$ 100.000', 'acima_100k'], ['Prefiro não informar', 'prefiro_nao'])),
      unica('6.3', 'Ticket médio por paciente (valor médio que cada paciente investe por tratamento):', o(['Até R$ 500', 'ate_500'], ['R$ 500 a R$ 1.500', '500_1500'],
        ['R$ 1.500 a R$ 5.000', '1500_5000'], ['R$ 5.000 a R$ 15.000', '5000_15000'], ['Acima de R$ 15.000', 'acima_15000'])),
      unica('6.4', 'Quantas pessoas na equipe (incluindo você)?', o(['Só eu', 'so_eu'], ['2-3 pessoas', '2_3'], ['4-6 pessoas', '4_6'], ['7-10 pessoas', '7_10'], ['Mais de 10 pessoas', 'mais_10'])),
      unica('6.5', 'Há quanto tempo a clínica está aberta?', o(['Menos de 2 anos', 'menos_2'], ['2 a 5 anos', '2_5'], ['5 a 10 anos', '5_10'], ['10 a 20 anos', '10_20'], ['Mais de 20 anos', 'mais_20'])),
    ] },
  { number: '07', title: 'Sua Expectativa', subtitle: 'Uma última pergunta', context: 'Esta resposta é a mais importante para mim.',
    questions: [texto('7.1', 'O que você espera ter conquistado ao final desta mentoria? Seja específico.', 800,
      'Descreva a transformação que você busca. Pode ser financeira, profissional, pessoal, operacional... O que importa é que seja verdadeiro.')] },
]

export type Resposta = string | string[] | number

/** Converte o valor salvo de volta no texto da opção, para leitura no painel. */
export function rotuloResposta(p: Pergunta, v: Resposta | undefined): string {
  if (v === undefined || v === '' || (Array.isArray(v) && !v.length)) return '-'
  if (p.type === 'scale') return `${v} de 10`
  if (p.type === 'textarea') return String(v)
  const achar = (x: string) => p.options?.find(op => op.value === x)?.label ?? x
  return Array.isArray(v) ? v.map(achar).join('; ') : achar(String(v))
}

export const TODAS = SECOES.flatMap(s => s.questions)
