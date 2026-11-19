import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { AuthProvider, useAuth } from './lib/auth'
import Shell from './components/Shell'
import Entrar from './pages/Entrar'
import Inicio from './pages/Inicio'
import Tarefas from './pages/Tarefas'
import Mentorados from './pages/Mentorados'
import Jornada from './pages/Jornada'
import Leads from './pages/Leads'
import Financeiro from './pages/Financeiro'
import EmBreve from './pages/EmBreve'
import Membros from './pages/Membros'
import CursoEditor from './pages/CursoEditor'
import Equipe from './pages/Equipe'
import AreaAluno from './pages/AreaAluno'
import VitrinePrevia from './pages/VitrinePrevia'
import { Qualificacao, Diagnostico } from './pages/Publico'
import DiagnosticoLeitura from './pages/DiagnosticoLeitura'
import { Carregando } from './components/ui'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } } })

function Portao() {
  const { sessao, carregando, eGestao, papeis, sair } = useAuth()
  if (carregando) return <Carregando />
  if (!sessao) return <Entrar />
  if (!eGestao && (papeis.includes('aluno') || papeis.includes('mentorado'))) return <Routes><Route path="/*" element={<AreaAluno />} /></Routes>
  if (!eGestao) return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="cartao flex max-w-md flex-col gap-3 p-7">
        <h1 className="text-xl font-bold">Acesso em liberação</h1>
        <p className="text-[#4A4943]">Sua conta foi criada, mas ainda não tem papel no painel. Um administrador precisa liberar o acesso de equipe, mentor ou mentorado.</p>
        <button className="btn-secundario self-start" onClick={sair}>Sair</button>
      </div>
    </div>
  )
  return (
    <Routes>
      <Route path="vitrine/*" element={<VitrinePrevia />} />
      <Route element={<Shell />}>
        <Route index element={<Inicio />} />
        <Route path="tarefas" element={<Tarefas />} />
        <Route path="mentorados" element={<Mentorados />} />
        <Route path="mentorados/:id" element={<Jornada />} />
        <Route path="leads" element={<Leads />} />
        <Route path="diagnosticos/:id" element={<DiagnosticoLeitura />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="agenda" element={<EmBreve secao="agenda" />} />
        <Route path="reunioes" element={<EmBreve secao="reunioes" />} />
        <Route path="documentos" element={<EmBreve secao="documentos" />} />
        <Route path="membros" element={<Membros />} />
        <Route path="membros/curso/:id" element={<CursoEditor />} />
        <Route path="equipe" element={<Equipe />} />
        <Route path="aluno/*" element={<AreaAluno />} />
        <Route path="*" element={<Inicio />} />
      </Route>
    </Routes>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/qualificacao" element={<Qualificacao />} />
          <Route path="/diagnostico" element={<Diagnostico />} />
          <Route path="/*" element={<AuthProvider><Portao /></AuthProvider>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
