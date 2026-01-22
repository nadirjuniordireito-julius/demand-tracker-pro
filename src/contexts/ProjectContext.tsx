import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { projetoService } from '@/services/projetoService';
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

    // Carrega projeto salvo do localStorage
    const savedProject = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (savedProject) {
      try {
        const project = JSON.parse(savedProject);
        setSelectedProject(project);
        setShowSelectionModal(false); // Não mostra modal se já tem projeto salvo
      } catch (error) {
        console.error('Erro ao carregar projeto salvo:', error);
        localStorage.removeItem(PROJECT_STORAGE_KEY);
        setShowSelectionModal(true); // Mostra modal se não conseguiu carregar
      }
    } else {
      // Se não tem projeto salvo, mostra o modal
      setShowSelectionModal(true);
    }

    // Carrega projetos do usuário
    setIsLoading(true);
    projetoService.findByUsuario(user.id)
      .then(projects => {
        setUserProjects(projects);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Erro ao carregar projetos do usuário:', error);
        setUserProjects([]);
        setIsLoading(false);
      });
  }, [isAuthenticated, user?.id]); // Apenas isAuthenticated e user?.id nas dependências

  // Carrega projetos do usuário (função exposta para uso externo)
  const loadUserProjects = useCallback(async () => {
    if (!user?.id) {
      setUserProjects([]);
      return;
    }

    try {
      setIsLoading(true);
      const projects = await projetoService.findByUsuario(user.id);
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
