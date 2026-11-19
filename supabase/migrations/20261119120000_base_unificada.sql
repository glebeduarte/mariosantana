-- Plataforma Método Mário Santana: base unificada
-- Núcleo, operação (frentes, tarefas, reuniões, documentos), mentoria, financeiro e comercial.

create extension if not exists pgcrypto;

-- ============ Núcleo ============
create type public.papel as enum ('admin','mentor','equipe','mentorado','aluno');

create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  email text,
  avatar_url text,
  cor text,
  criado_em timestamptz not null default now()
);

create table public.papeis_usuario (
  user_id uuid not null references auth.users(id) on delete cascade,
  papel public.papel not null,
  primary key (user_id, papel)
);

create or replace function public.tem_papel(_papel public.papel)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.papeis_usuario where user_id = auth.uid() and papel = _papel)
$$;

create or replace function public.e_gestao()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.papeis_usuario where user_id = auth.uid() and papel in ('admin','mentor','equipe'))
$$;

create or replace function public.e_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.papeis_usuario where user_id = auth.uid() and papel in ('admin','mentor'))
$$;

-- Novo usuário: cria perfil. O primeiro usuário da base vira admin.
create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.papeis_usuario where papel = 'admin') then
    insert into public.papeis_usuario (user_id, papel) values (new.id, 'admin');
  end if;
  return new;
end $$;

create trigger trg_ao_criar_usuario after insert on auth.users
  for each row execute function public.ao_criar_usuario();

create or replace function public.tocar_atualizado()
returns trigger language plpgsql as $$ begin new.atualizado_em = now(); return new; end $$;

-- ============ Operação ============
create table public.frentes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text unique not null,
  cor text not null,
  ordem int not null default 0,
  responsavel_id uuid references public.perfis(id) on delete set null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create type public.status_tarefa as enum ('a_fazer','em_andamento','em_revisao','aguardando','concluida');
create type public.prioridade as enum ('baixa','media','alta');

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  frente_id uuid references public.frentes(id) on delete set null,
  titulo text not null,
  descricao text,
  status public.status_tarefa not null default 'a_fazer',
  prioridade public.prioridade not null default 'media',
  responsavel_id uuid references public.perfis(id) on delete set null,
  criado_por uuid references public.perfis(id) on delete set null default auth.uid(),
  prazo date,
  ordem double precision not null default 0,
  origem_tipo text,           -- mentorado, lead, parcela, reuniao
  origem_id uuid,
  concluida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.tarefas (status, ordem);
create index on public.tarefas (frente_id);
create index on public.tarefas (responsavel_id);
create trigger trg_tarefas_atualizado before update on public.tarefas for each row execute function public.tocar_atualizado();

create or replace function public.marcar_conclusao()
returns trigger language plpgsql as $$
begin
  if new.status = 'concluida' and (old.status is distinct from 'concluida') then new.concluida_em = now(); end if;
  if new.status <> 'concluida' then new.concluida_em = null; end if;
  return new;
end $$;
create trigger trg_tarefas_conclusao before update on public.tarefas for each row execute function public.marcar_conclusao();

create table public.tarefa_checklist (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  texto text not null,
  feito boolean not null default false,
  ordem int not null default 0
);

create table public.tarefa_comentarios (
  id uuid primary key default gen_random_uuid(),
  tarefa_id uuid not null references public.tarefas(id) on delete cascade,
  autor_id uuid references public.perfis(id) on delete set null default auth.uid(),
  texto text not null,
  criado_em timestamptz not null default now()
);

create table public.limites_quadro (
  status public.status_tarefa primary key,
  limite int
);

create table public.reunioes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  data timestamptz not null,
  frente_id uuid references public.frentes(id) on delete set null,
  pauta text,
  notas text,
  criado_em timestamptz not null default now()
);

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  frente_id uuid references public.frentes(id) on delete set null,
  titulo text not null,
  url text,
  tipo text,                  -- link, modelo, contrato, material
  descricao text,
  criado_por uuid references public.perfis(id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now()
);

-- ============ Mentoria ============
create table public.planos_mentoria (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  duracao_meses int not null,
  ativo boolean not null default true
);

create table public.etapas (
  id uuid primary key default gen_random_uuid(),
  ordem int not null unique,
  nome text not null,
  descricao text
);

create type public.tipo_item_etapa as enum ('aula','workbook','sessao','tarefa');

create table public.etapa_itens (
  id uuid primary key default gen_random_uuid(),
  etapa_id uuid not null references public.etapas(id) on delete cascade,
  tipo public.tipo_item_etapa not null,
  titulo text not null,
  ordem int not null default 0,
  referencia text            -- id de aula ou link do workbook
);

create type public.status_mentorado as enum ('ativo','pausado','concluido','cancelado');

create table public.mentorados (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid references public.perfis(id) on delete set null,
  nome text not null,
  email text,
  telefone text,
  cidade text,
  especialidade text,
  plano_id uuid references public.planos_mentoria(id) on delete set null,
  inicio date,
  fim date,
  etapa_id uuid references public.etapas(id) on delete set null,
  status public.status_mentorado not null default 'ativo',
  ultimo_acesso timestamptz,
  criado_em timestamptz not null default now()
);

create table public.mentorado_itens (
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  item_id uuid not null references public.etapa_itens(id) on delete cascade,
  feito_em timestamptz not null default now(),
  primary key (mentorado_id, item_id)
);

create table public.onboarding_itens (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  ordem int not null,
  responsavel_padrao text     -- equipe, mentor, mentorado, automatico
);

create table public.mentorado_onboarding (
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  item_id uuid not null references public.onboarding_itens(id) on delete cascade,
  feito_em timestamptz not null default now(),
  feito_por uuid references public.perfis(id) on delete set null default auth.uid(),
  primary key (mentorado_id, item_id)
);

create type public.status_sessao as enum ('a_agendar','agendada','realizada','faltou','cancelada');

create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  titulo text not null,
  data timestamptz,
  status public.status_sessao not null default 'a_agendar',
  notas text,
  google_event_id text,
  criado_em timestamptz not null default now()
);

create table public.observacoes (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  autor_id uuid references public.perfis(id) on delete set null default auth.uid(),
  texto text not null,
  criado_em timestamptz not null default now()
);

-- ============ Comercial ============
create type public.etapa_lead as enum ('novo','diagnostico','call','proposta','fechado','perdido');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  cidade text,
  especialidade text,
  origem text,                -- qualificacao, diagnostico, indicacao, evento
  pontuacao int,
  qualificado boolean,
  motivo_desqualificacao text,
  etapa public.etapa_lead not null default 'novo',
  responsavel_id uuid references public.perfis(id) on delete set null,
  proxima_acao text,
  proxima_acao_em timestamptz,
  notas text,
  mentorado_id uuid references public.mentorados(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger trg_leads_atualizado before update on public.leads for each row execute function public.tocar_atualizado();

create table public.diagnosticos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  mentorado_id uuid references public.mentorados(id) on delete set null,
  nome text,
  email text,
  respostas jsonb not null default '{}'::jsonb,
  resumo_ia text,
  criado_em timestamptz not null default now()
);

-- ============ Financeiro ============
create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  valor_total numeric(12,2),
  numero_parcelas int not null default 12,
  meio text,                  -- eduzz, pix, cartao, boleto
  assinado_em date,
  documento_url text,
  criado_em timestamptz not null default now()
);

create type public.status_parcela as enum ('pendente','paga','cancelada');

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid references public.contratos(id) on delete cascade,
  mentorado_id uuid not null references public.mentorados(id) on delete cascade,
  numero int not null,
  total int not null,
  vencimento date not null,
  valor numeric(12,2),
  meio text,
  status public.status_parcela not null default 'pendente',
  pago_em date,
  criado_em timestamptz not null default now()
);
create index on public.parcelas (vencimento);

-- ============ RLS ============
do $$
declare t text;
begin
  foreach t in array array['frentes','tarefas','tarefa_checklist','tarefa_comentarios','limites_quadro','reunioes','documentos',
    'planos_mentoria','etapas','etapa_itens','mentorados','mentorado_itens','onboarding_itens','mentorado_onboarding','sessoes',
    'observacoes','leads','diagnosticos','contratos','parcelas','perfis','papeis_usuario']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Gestão (admin, mentor, equipe) opera tudo da operação, comercial, mentoria e financeiro
do $$
declare t text;
begin
  foreach t in array array['frentes','tarefas','tarefa_checklist','tarefa_comentarios','limites_quadro','reunioes','documentos',
    'planos_mentoria','etapas','etapa_itens','mentorados','mentorado_itens','onboarding_itens','mentorado_onboarding','sessoes',
    'observacoes','leads','diagnosticos','contratos','parcelas']
  loop
    execute format('create policy gestao_tudo on public.%I for all to authenticated using (public.e_gestao()) with check (public.e_gestao())', t);
  end loop;
end $$;

-- Perfis: todos logados leem; cada um edita o seu; admin edita todos
create policy perfis_ler on public.perfis for select to authenticated using (true);
create policy perfis_editar_proprio on public.perfis for update to authenticated using (id = auth.uid() or public.e_admin());
create policy papeis_ler on public.papeis_usuario for select to authenticated using (user_id = auth.uid() or public.e_gestao());
create policy papeis_admin on public.papeis_usuario for all to authenticated using (public.e_admin()) with check (public.e_admin());

-- Mentorado vê a própria jornada
create policy mentorado_ve_proprio on public.mentorados for select to authenticated using (perfil_id = auth.uid());
create policy mentorado_ve_etapas on public.etapas for select to authenticated using (true);
create policy mentorado_ve_itens on public.etapa_itens for select to authenticated using (true);
create policy mentorado_ve_onb_itens on public.onboarding_itens for select to authenticated using (true);
create policy mentorado_ve_progresso on public.mentorado_itens for select to authenticated
  using (exists (select 1 from public.mentorados m where m.id = mentorado_id and m.perfil_id = auth.uid()));
create policy mentorado_marca_progresso on public.mentorado_itens for insert to authenticated
  with check (exists (select 1 from public.mentorados m where m.id = mentorado_id and m.perfil_id = auth.uid()));
create policy mentorado_ve_sessoes on public.sessoes for select to authenticated
  using (exists (select 1 from public.mentorados m where m.id = mentorado_id and m.perfil_id = auth.uid()));
create policy mentorado_ve_parcelas on public.parcelas for select to authenticated
  using (exists (select 1 from public.mentorados m where m.id = mentorado_id and m.perfil_id = auth.uid()));

-- Formulários públicos (qualificação e diagnóstico) podem criar lead e diagnóstico
create policy publico_cria_lead on public.leads for insert to anon with check (etapa = 'novo');
create policy publico_cria_diagnostico on public.diagnosticos for insert to anon with check (true);

-- ============ Dados base ============
insert into public.frentes (nome, slug, cor, ordem) values
  ('Mentoria','mentoria','#3B6FB6',1),
  ('Conteúdo','conteudo','#C2477F',2),
  ('Comercial','comercial','#2F8A55',3),
  ('Eventos','eventos','#C9741F',4),
  ('Financeiro','financeiro','#1D8C84',5),
  ('Produtos','produtos','#7D8526',6);

insert into public.limites_quadro (status, limite) values
  ('a_fazer',null),('em_andamento',5),('em_revisao',3),('aguardando',null),('concluida',null);

insert into public.planos_mentoria (nome, duracao_meses) values ('Método Mário Santana: Profissional Completo', 12);

insert into public.etapas (ordem, nome, descricao) values
  (1,'Despertar','Quem é o profissional além dos títulos e o ponto de partida do negócio.'),
  (2,'Clareza','Posicionamento, oferta e precificação.'),
  (3,'Presença','Autoridade e comunicação.'),
  (4,'Conexão','Relacionamento com pacientes e rede.'),
  (5,'Ecossistema','Equipe, processos e estrutura.'),
  (6,'Maturidade Alcançada','Revisão do ciclo e próximos passos.');

insert into public.etapa_itens (etapa_id, tipo, titulo, ordem)
select e.id, 'workbook', 'Ferramenta 1.1 · Quem Sou Eu Além dos Títulos', 1 from public.etapas e where e.ordem = 1;
insert into public.etapa_itens (etapa_id, tipo, titulo, ordem)
select e.id, 'sessao', 'Sessão de alinhamento 1:1', 9 from public.etapas e where e.ordem = 1;

insert into public.onboarding_itens (titulo, ordem, responsavel_padrao) values
  ('Script de boas-vindas',1,'equipe'),
  ('E-mail de boas-vindas',2,'automatico'),
  ('Acesso ao portal',3,'automatico'),
  ('Questionário de autodiagnóstico',4,'mentorado'),
  ('Contrato assinado',5,'mentorado'),
  ('Kit físico enviado',6,'equipe'),
  ('Sessão de alinhamento',7,'mentor');
