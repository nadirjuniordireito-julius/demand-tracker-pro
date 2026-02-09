import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usuarioProjetoService } from '@/services';
import type { Projeto } from '@/types';

interface ProjectContextType {
  selectedProject: Projeto | null;
  userProjects: Projeto[];
  isLoading: boolean;
  showSelectionModal: boolean;
  selectProject: (project: Projeto) => void;
  loadUserProjects: () => Promise<void>;
  clearProject: () => void;
  openProjectSelection: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const PROJECT_STORAGE_KEY = 'selectedProject';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Projeto | null>(null);
  const [userProjects, setUserProjects] = useState<Projeto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelectionModal, setShowSelectionModal] = useState(false);

  // Carrega projeto salvo do localStorage e projetos do usuário
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setUserProjects([]);
      setSelectedProject(null);
      setShowSelectionModal(false);
      localStorage.removeItem(PROJECT_STORAGE_KEY);
      setIsLoading(false);
      return;
    }

    const savedProjectRaw = localStorage.getItem(PROJECT_STORAGE_KEY);
    let savedProject: Projeto | null = null;

    if (savedProjectRaw) {
      try {
        savedProject = JSON.parse(savedProjectRaw);
      } catch (error) {
        console.error('Erro ao carregar projeto salvo:', error);
        localStorage.removeItem(PROJECT_STORAGE_KEY);
        savedProject = null;
      }
    }

    let cancelled = false;
    setIsLoading(true);

    usuarioProjetoService.findByUsuario(user.id)
      .then(usuarioProjetos => {
        if (cancelled) return;

        const projects = usuarioProjetos
          .map(up => up.projeto)
          .filter((p): p is Projeto => Boolean(p));

        setUserProjects(projects);

        if (!savedProject) {
          // Nenhum projeto salvo ainda
          if (projects.length === 1) {
            // Apenas um projeto disponível: seleciona automaticamente
            const [onlyProject] = projects;
            setSelectedProject(onlyProject);
            localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(onlyProject));
            setShowSelectionModal(false);
          } else if (projects.length > 1) {
            // Mais de um projeto: pedir seleção
            setShowSelectionModal(true);
          } else {
            // Nenhum projeto disponível: não há o que selecionar
            setSelectedProject(null);
            localStorage.removeItem(PROJECT_STORAGE_KEY);
            setShowSelectionModal(false);
          }
        } else {
          // Há um projeto salvo, verifica se ainda está na lista de projetos do usuário
          const existsInList = projects.some(p => p.id === savedProject!.id);
          if (existsInList) {
            setSelectedProject(savedProject);
            setShowSelectionModal(false);
          } else if (projects.length === 1) {
            // Projeto salvo não é mais válido, mas há um único projeto atual: seleciona-o
            const [onlyProject] = projects;
            setSelectedProject(onlyProject);
            localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(onlyProject));
            setShowSelectionModal(false);
          } else if (projects.length > 1) {
            // Vários projetos, mas o salvo não existe mais: pedir nova seleção
            setSelectedProject(null);
            localStorage.removeItem(PROJECT_STORAGE_KEY);
            setShowSelectionModal(true);
          } else {
            // Nenhum projeto disponível
            setSelectedProject(null);
            localStorage.removeItem(PROJECT_STORAGE_KEY);
            setShowSelectionModal(false);
          }
        }
      })
      .catch(error => {
        if (cancelled) return;
        console.error('Erro ao carregar projetos do usuário:', error);
        setUserProjects([]);
        setSelectedProject(null);
        setShowSelectionModal(false);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  // Carrega projetos do usuário (função exposta para uso externo)
  const loadUserProjects = useCallback(async () => {
    if (!user?.id) {
      setUserProjects([]);
      return;
    }

    try {
      setIsLoading(true);
      const usuarioProjetos = await usuarioProjetoService.findByUsuario(user.id);
      const projects = usuarioProjetos
        .map(up => up.projeto)
        .filter((p): p is Projeto => Boolean(p));
      setUserProjects(projects);
    } catch (error) {
      console.error('Erro ao carregar projetos do usuário:', error);
      setUserProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Seleciona um projeto
  const selectProject = useCallback((project: Projeto) => {
    setSelectedProject(project);
    localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(project));
    setShowSelectionModal(false); // Fecha o modal após seleção
  }, []);

  // Limpa o projeto selecionado
  const clearProject = useCallback(() => {
    setSelectedProject(null);
    localStorage.removeItem(PROJECT_STORAGE_KEY);
  }, []);

  // Abre o modal de seleção de projeto
  const openProjectSelection = useCallback(() => {
    setShowSelectionModal(true);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        userProjects,
        isLoading,
        showSelectionModal,
        selectProject,
        loadUserProjects,
        clearProject,
        openProjectSelection,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
