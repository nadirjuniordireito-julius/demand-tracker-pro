import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';
import { ProjectSelectionModal } from '@/components/project/ProjectSelectionModal';
import { useProject } from '@/contexts/ProjectContext';
import { cn } from '@/lib/utils';

export function MainLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { selectedProject, isLoading, showSelectionModal } = useProject();

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  // Mostra loading enquanto carrega
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Mostra o modal de seleção se não houver projeto selecionado ou se showSelectionModal for true
  if (!selectedProject || showSelectionModal) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <ProjectSelectionModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          onToggleSidebar={handleToggleSidebar} 
        />
        
        <main className={cn(
          'flex-1 overflow-auto p-6',
          'transition-all duration-300'
        )}>
          <div className="container mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
