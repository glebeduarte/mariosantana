alter function public.tocar_atualizado() set search_path = public;
alter function public.marcar_conclusao() set search_path = public;
revoke execute on function public.ao_criar_usuario() from public, anon, authenticated;
revoke execute on function public.e_gestao() from public, anon;
revoke execute on function public.e_admin() from public, anon;
revoke execute on function public.tem_papel(public.papel) from public, anon;
grant execute on function public.e_gestao() to authenticated;
grant execute on function public.e_admin() to authenticated;
grant execute on function public.tem_papel(public.papel) to authenticated;
