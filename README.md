# Plataforma Método Mário Santana

Painel do negócio digital do Dr. Mário Santana: operação por frentes, tarefas, mentoria, comercial, financeiro e área de membros.

- Front: Vite + React + TypeScript + Tailwind
- Banco e login: Supabase (projeto `muzencwphngtkrlrwjih`)
- Publicação: Vercel, a cada push na `main`

## Rodar local
```
npm install
npm run dev
```
Variáveis opcionais em `.env.local` (ver `.env.example`). Sem elas, o app usa a URL e a chave publicável do projeto.

## Banco
As migrações ficam em `supabase/migrations`. O primeiro usuário que criar conta vira admin; os demais papéis são liberados por um admin.
