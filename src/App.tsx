import { lazy, Suspense, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProcessingProvider } from "@/contexts/ProcessingContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LoadingSpinner } from "@/components/common/LoadingStates";
import "@/lib/apiErrorHandler";
import { useEffect } from "react";
import LoginPage from "./pages/LoginPage";

const HomePage = lazy(() => import("./pages/HomePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const UsuariosPage = lazy(() => import("./pages/cadastros/UsuariosPage"));
const ProjetosPage = lazy(() => import("./pages/cadastros/ProjetosPage"));
const ProjetoMetaPage = lazy(() => import("./pages/cadastros/ProjetoMetaPage"));
const PerfisPage = lazy(() => import("./pages/cadastros/PerfisPage"));
const ProfissionaisPage = lazy(() => import("./pages/cadastros/ProfissionaisPage"));
const DesembolsosPage = lazy(() => import("./pages/cadastros/DesembolsosPage"));
const TemplatesPage = lazy(() => import("./pages/cadastros/TemplatesPage"));
const DemandasPage = lazy(() => import("./pages/demandas/DemandasPage"));
const TermoAberturaPage = lazy(() => import("./pages/demandas/TermoAberturaPage"));
const TermoPlanejamentoPage = lazy(() => import("./pages/demandas/TermoPlanejamentoPage"));
const TermoEncerramentoPage = lazy(() => import("./pages/demandas/TermoEncerramentoPage"));
const AvaliacaoDemandaPage = lazy(() => import("./features/avaliacao-demanda").then((m) => ({ default: m.AvaliacaoDemandaPage })));
const TedHealthMapPage = lazy(() => import("./pages/TedHealthMapPage"));
const ExecucaoDemandasListPage = lazy(() => import("./modules/execucaoDemanda/pages/ExecucaoDemandasListPage"));
const ExecucaoDemandaDetailPage = lazy(() => import("./modules/execucaoDemanda/pages/ExecucaoDemandaDetailPage"));
const ExecucaoGanttPage = lazy(() => import("./modules/execucaoDemanda/pages/ExecucaoGanttPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProjetoSemaforoPage = lazy(() => import("./pages/ProjetoSemaforoPage"));

const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center p-8">
    <LoadingSpinner size="lg" />
  </div>
);

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem themes={['light', 'dark', 'light-blue', 'system']}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <ProjectProvider>
                <ProcessingProvider>
                  <ErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route
                          element={
                            <ProtectedRoute>
                              <MainLayout />
                            </ProtectedRoute>
                          }
                        >
                          <Route path="/" element={<HomePage />} />
                          <Route path="/dashboard" element={<DashboardPage />} />
                          <Route path="/cadastros/usuarios" element={<UsuariosPage />} />
                          <Route path="/cadastros/projetos" element={<ProjetosPage />} />
                          <Route path="/cadastros/projeto-meta" element={<ProjetoMetaPage />} />
                          <Route path="/cadastros/perfis" element={<PerfisPage />} />
                          <Route path="/cadastros/profissionais" element={<ProfissionaisPage />} />
                          <Route path="/cadastros/desembolsos" element={<DesembolsosPage />} />
                          <Route path="/cadastros/templates" element={<TemplatesPage />} />
                          <Route path="/projetos/:id/semaforo" element={<ProjetoSemaforoPage />} />
                          <Route path="/demandas" element={<DemandasPage />} />
                          <Route path="/demandas/termo-abertura" element={<TermoAberturaPage />} />
                          <Route path="/demandas/termo-planejamento" element={<TermoPlanejamentoPage />} />
                          <Route path="/demandas/termo-encerramento" element={<TermoEncerramentoPage />} />
                          <Route path="/demandas/avaliacao" element={<AvaliacaoDemandaPage />} />
                          <Route path="/demandas/health-map" element={<TedHealthMapPage />} />
                          <Route path="/execucao-demandas" element={<ExecucaoDemandasListPage />} />
                          <Route path="/execucao-demandas/:demandaTecnicaId" element={<ExecucaoDemandaDetailPage />} />
                          <Route path="/execucao-demandas/:demandaTecnicaId/gantt" element={<ExecucaoGanttPage />} />
                          <Route path="/perfil" element={<ProfilePage />} />
                          <Route path="/configuracoes" element={<SettingsPage />} />
                        </Route>
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </ProcessingProvider>
              </ProjectProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
};

export default App;
