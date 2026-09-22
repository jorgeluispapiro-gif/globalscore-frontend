import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProvedorAutenticacao } from './hooks/useAutenticacao';
import { ProvedorProjeto } from './hooks/useProjeto';
import { RotaProtegida } from './components/layout/RotaProtegida';
import { ShellAplicacao } from './components/layout/ShellAplicacao';
import { TelaCarregamento } from './components/ui/Estados';
import { LoginPage } from './pages/LoginPage';
import { NaoEncontradaPage } from './pages/NaoEncontradaPage';

// Cada área interna é carregada quando acessada. Assim, a tela de login não
// precisa baixar Recharts nem o fluxo completo de importação.
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((modulo) => ({ default: modulo.DashboardPage })));
const ProjetosPage = lazy(() => import('./pages/ProjetosPage').then((modulo) => ({ default: modulo.ProjetosPage })));
const ImportacoesPage = lazy(() => import('./pages/ImportacoesPage').then((modulo) => ({ default: modulo.ImportacoesPage })));
const EntidadesPage = lazy(() => import('./pages/EntidadesPage').then((modulo) => ({ default: modulo.EntidadesPage })));
const IndicadoresPage = lazy(() => import('./pages/IndicadoresPage').then((modulo) => ({ default: modulo.IndicadoresPage })));
const AvaliacoesPage = lazy(() => import('./pages/AvaliacoesPage').then((modulo) => ({ default: modulo.AvaliacoesPage })));

export default function App() {
  return (
    <BrowserRouter>
      <ProvedorAutenticacao>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RotaProtegida />}>
            <Route element={<ProvedorProjeto><Suspense fallback={<TelaCarregamento texto="Carregando área" />}><ShellAplicacao /></Suspense></ProvedorProjeto>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projetos" element={<ProjetosPage />} />
              <Route path="/importacoes" element={<ImportacoesPage />} />
              <Route path="/entidades" element={<EntidadesPage />} />
              <Route path="/indicadores" element={<IndicadoresPage />} />
              <Route path="/avaliacoes" element={<AvaliacoesPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NaoEncontradaPage />} />
        </Routes>
      </ProvedorAutenticacao>
    </BrowserRouter>
  );
}
