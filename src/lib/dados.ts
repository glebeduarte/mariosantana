import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Frente, Perfil, Etapa } from './tipos'

async function lista<T>(tabela: string, ordem?: string): Promise<T[]> {
  let q = supabase.from(tabela).select('*')
  if (ordem) q = q.order(ordem)
  const { data, error } = await q
  if (error) throw error
  return data as T[]
}

export const useFrentes = () => useQuery({ queryKey: ['frentes'], queryFn: () => lista<Frente>('frentes', 'ordem') })
export const usePerfis = () => useQuery({ queryKey: ['perfis'], queryFn: () => lista<Perfil>('perfis', 'nome') })
export const useEtapas = () => useQuery({ queryKey: ['etapas'], queryFn: () => lista<Etapa>('etapas', 'ordem') })

export function mapaPor<T extends { id: string }>(itens: T[] | undefined) {
  const m = new Map<string, T>()
  for (const i of itens ?? []) m.set(i.id, i)
  return m
}
