-- Área de membros: estrutura equivalente à plataforma atual (Lovable), com ids preservados na migração.

-- Alunos: toda pessoa com acesso a cursos. user_id é ligado ao login quando a pessoa cria acesso com o mesmo e-mail.
create table public.alunos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  email text unique,
  nome text not null default '',
  avatar_url text,
  origem text,               -- lovable, eduzz, manual
  criado_em timestamptz not null default now()
);

create table public.cursos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text unique,
  descricao text,
  descricao_curta text,
  capa_url text,
  imagem_destaque_url text,
  categoria text,
  nivel text,
  duracao_minutos int,
  publicado boolean not null default false,
  destaque boolean not null default false,
  ordem_vitrine int,
  checkout_url text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger trg_cursos_atualizado before update on public.cursos for each row execute function public.tocar_atualizado();

create table public.modulos (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos(id) on delete cascade,
  titulo text not null,
  descricao text,
  ordem int not null default 0,
  capa_url text,
  criado_em timestamptz not null default now()
);

create table public.aulas (
  id uuid primary key default gen_random_uuid(),
  modulo_id uuid not null references public.modulos(id) on delete cascade,
  titulo text not null,
  descricao text,
  conteudo text,
  conteudo_rico jsonb,
  video_tipo text not null default 'none',   -- url, pdf, none
  video_url text,
  pdf_url text,
  duracao_segundos int,
  ordem int not null default 0,
  criado_em timestamptz not null default now()
);

create table public.matriculas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  criada_em timestamptz not null default now(),
  expira_em timestamptz,
  unique (aluno_id, curso_id)
);

create table public.progresso_aulas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  aula_id uuid not null references public.aulas(id) on delete cascade,
  concluida boolean not null default false,
  posicao_segundos int not null default 0,
  atualizado_em timestamptz not null default now(),
  unique (aluno_id, aula_id)
);

create table public.certificados (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  codigo text unique not null default upper(substr(md5(gen_random_uuid()::text), 1, 10)),
  emitido_em timestamptz not null default now()
);

create table public.biblioteca (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  autor text,
  descricao text,
  capa_url text,
  download_url text,
  ordem int not null default 0,
  publicado boolean not null default true,
  etapa smallint,
  criado_em timestamptz not null default now()
);

-- Integração de vendas (Eduzz): regra por produto e acessos concedidos
create table public.regras_produto (
  id uuid primary key default gen_random_uuid(),
  provedor text not null default 'eduzz',
  produto_externo_id text not null,
  rotulo text,
  curso_id uuid references public.cursos(id) on delete set null,
  todos_cursos boolean not null default false,
  plano_mentoria text,
  dias_acesso int,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

create table public.regra_produto_cursos (
  regra_id uuid not null references public.regras_produto(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete cascade,
  primary key (regra_id, curso_id)
);

create table public.acessos_externos (
  id uuid primary key default gen_random_uuid(),
  regra_id uuid references public.regras_produto(id) on delete set null,
  aluno_id uuid references public.alunos(id) on delete set null,
  provedor text not null default 'eduzz',
  produto_externo_id text,
  email_comprador text,
  nome_comprador text,
  curso_id uuid references public.cursos(id) on delete set null,
  status text not null default 'ativo',      -- ativo, revogado, erro, pendente
  concedido_em timestamptz,
  revogado_em timestamptz,
  expira_em timestamptz,
  ultimo_evento text,
  erro text,
  dados jsonb,
  criado_em timestamptz not null default now()
);

-- Ligar o login ao aluno e ao mentorado pelo e-mail
create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_aluno uuid; v_mentorado uuid;
begin
  insert into public.perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;

  if not exists (select 1 from public.papeis_usuario where papel = 'admin') then
    insert into public.papeis_usuario (user_id, papel) values (new.id, 'admin');
  end if;

  update public.alunos set user_id = new.id where lower(email) = lower(new.email) and user_id is null returning id into v_aluno;
  if v_aluno is not null then
    insert into public.papeis_usuario (user_id, papel) values (new.id, 'aluno') on conflict do nothing;
  end if;

  update public.mentorados set perfil_id = new.id where lower(email) = lower(new.email) and perfil_id is null returning id into v_mentorado;
  if v_mentorado is not null then
    insert into public.papeis_usuario (user_id, papel) values (new.id, 'mentorado') on conflict do nothing;
  end if;

  -- papel de gestão reservado no convite (ver tabela convites)
  insert into public.papeis_usuario (user_id, papel)
    select new.id, c.papel from public.convites c where lower(c.email) = lower(new.email) and c.aceito_em is null
  on conflict do nothing;
  update public.convites set aceito_em = now() where lower(email) = lower(new.email) and aceito_em is null;
  return new;
end $$;

-- Convites da equipe: o admin reserva o papel pelo e-mail; ao criar acesso, o papel é aplicado.
create table public.convites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  papel public.papel not null,
  convidado_por uuid references public.perfis(id) on delete set null default auth.uid(),
  aceito_em timestamptz,
  criado_em timestamptz not null default now()
);

-- Helper: aluno do usuário logado
create or replace function public.meu_aluno()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.alunos where user_id = auth.uid()
$$;
revoke execute on function public.meu_aluno() from public, anon;
grant execute on function public.meu_aluno() to authenticated;
revoke execute on function public.ao_criar_usuario() from public, anon, authenticated;

-- RLS
do $$
declare t text;
begin
  foreach t in array array['alunos','cursos','modulos','aulas','matriculas','progresso_aulas','certificados','biblioteca',
    'regras_produto','regra_produto_cursos','acessos_externos','convites']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy gestao_tudo on public.%I for all to authenticated using (public.e_gestao()) with check (public.e_gestao())', t);
  end loop;
end $$;

create policy aluno_ve_proprio on public.alunos for select to authenticated using (user_id = auth.uid());
create policy vitrine_cursos on public.cursos for select to anon, authenticated using (publicado);
create policy aluno_ve_modulos on public.modulos for select to authenticated
  using (exists (select 1 from public.matriculas m where m.curso_id = modulos.curso_id and m.aluno_id = public.meu_aluno()));
create policy aluno_ve_aulas on public.aulas for select to authenticated
  using (exists (select 1 from public.modulos mo join public.matriculas m on m.curso_id = mo.curso_id where mo.id = aulas.modulo_id and m.aluno_id = public.meu_aluno()));
create policy aluno_ve_matriculas on public.matriculas for select to authenticated using (aluno_id = public.meu_aluno());
create policy aluno_progresso on public.progresso_aulas for all to authenticated using (aluno_id = public.meu_aluno()) with check (aluno_id = public.meu_aluno());
create policy aluno_certificados on public.certificados for select to authenticated using (aluno_id = public.meu_aluno());
create policy aluno_biblioteca on public.biblioteca for select to authenticated using (publicado);

create index on public.modulos (curso_id, ordem);
create index on public.aulas (modulo_id, ordem);
create index on public.progresso_aulas (aluno_id);

-- Mentorado: telefone já existe; acrescenta o plano de origem e link de reunião nas sessões
alter table public.sessoes add column if not exists link_reuniao text;
alter table public.observacoes add column if not exists etapa smallint;
alter table public.etapa_itens add column if not exists obrigatorio boolean not null default false;
alter table public.etapa_itens add column if not exists mentorado_marca boolean not null default true;
alter table public.etapa_itens add column if not exists ativo boolean not null default true;
alter table public.etapa_itens add column if not exists descricao text;
alter type public.tipo_item_etapa add value if not exists 'marco';
