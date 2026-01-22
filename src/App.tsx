import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import UsuariosPage from "./pages/cadastros/UsuariosPage";
import ProjetosPage from "./pages/cadastros/ProjetosPage";
import PerfisPage from "./pages/cadastros/PerfisPage";
import DemandasPage from "./pages/demandas/DemandasPage";
import TermoAberturaPage from "./pages/demandas/TermoAberturaPage";
import TermoPlanejamentoPage from "./pages/demandas/TermoPlanejamentoPage";
import TermoEncerramentoPage from "./pages/demandas/TermoEncerramentoPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ProjectProvider>
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
              <Route path="/cadastros/perfis" element={<PerfisPage />} />
              <Route path="/demandas" element={<DemandasPage />} />
              <Route path="/demandas/termo-abertura" element={<TermoAberturaPage />} />
              <Route path="/demandas/termo-planejamento" element={<TermoPlanejamentoPage />} />
              <Route path="/demandas/termo-encerramento" element={<TermoEncerramentoPage />} />
              <Route path="/perfil" element={<ProfilePage />} />
              <Route path="/configuracoes" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
            </ProjectProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
