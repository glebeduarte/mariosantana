-- Admin inicial restrito ao e-mail do responsável pela implantação; demais papéis de gestão via convites.
create or replace function public.ao_criar_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_aluno uuid; v_mentorado uuid;
begin
  insert into public.perfis (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  if lower(new.email) = 'glebejr@gmail.com' then
    insert into public.papeis_usuario (user_id, papel) values (new.id, 'admin') on conflict do nothing;
  end if;
  update public.alunos set user_id = new.id where lower(email) = lower(new.email) and user_id is null returning id into v_aluno;
  if v_aluno is not null then
    insert into public.papeis_usuario (user_id, papel) values (new.id, 'aluno') on conflict do nothing;
  end if;
  update public.mentorados set perfil_id = new.id where lower(email) = lower(new.email) and perfil_id is null returning id into v_mentorado;
  if v_mentorado is not null then
    insert into public.papeis_usuario (user_id, papel) values (new.id, 'mentorado') on conflict do nothing;
  end if;
  insert into public.papeis_usuario (user_id, papel)
    select new.id, c.papel from public.convites c where lower(c.email) = lower(new.email) and c.aceito_em is null
  on conflict do nothing;
  update public.convites set aceito_em = now() where lower(email) = lower(new.email) and aceito_em is null;
  return new;
end $$;
revoke execute on function public.ao_criar_usuario() from public, anon, authenticated;
