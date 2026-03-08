import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Users,
  FolderKanban,
  UserCircle,
  Briefcase,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Target,
  HeartPulse,
  CircleDollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleSidebar: () => void;
}

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  end?: boolean;
}

interface NavGroupProps {
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Prefixo da rota (ex: /cadastros, /demandas) para destacar só quando a rota atual pertence a este grupo */
  pathPrefix: string;
  /** Chamado ao clicar no grupo com menu recolhido, para expandir o sidebar */
  onExpandSidebar?: () => void;
}

function NavItem({ to, icon, label, isCollapsed, end = false }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-light',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-normal',
          isCollapsed && 'justify-center px-2'
        )
      }
      title={isCollapsed ? label : undefined}
    >
      <span className="flex-shrink-0 [&_svg]:stroke-[1]">{icon}</span>
      {!isCollapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function NavGroup({ icon, label, isCollapsed, children, defaultOpen = false, pathPrefix, onExpandSidebar }: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();

  const isChildActive = location.pathname === pathPrefix || location.pathname.startsWith(pathPrefix + '/');

  const handleClick = () => {
    if (isCollapsed) {
      onExpandSidebar?.();
      setIsOpen(true);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 text-sm font-light',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isChildActive && 'text-sidebar-accent-foreground',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? label : undefined}
      >
        <span className="flex-shrink-0 [&_svg]:stroke-[1]">{icon}</span>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{label}</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0 stroke-[1]" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0 stroke-[1]" />
            )}
          </>
        )}
      </button>
      
      {!isCollapsed && isOpen && (
        <div className="ml-4 pl-3 border-l border-sidebar-border space-y-1 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

interface NavSubGroupProps {
  icon: React.ReactNode;
  label: string;
  isCollapsed: boolean;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function NavSubGroup({ icon, label, isCollapsed, children, defaultOpen = false }: NavSubGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();

  // Check if any child route is active
  const isChildActive = location.pathname.startsWith('/cadastros/projeto-meta') || 
                        location.pathname.startsWith('/cadastros/meta-produto');
  
  // Auto-open if child is active
  useEffect(() => {
    if (isChildActive && !isCollapsed) {
      setIsOpen(true);
    }
  }, [isChildActive, isCollapsed]);

  return (
    <div className="space-y-1">
      <button
        onClick={() => !isCollapsed && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-200 text-xs font-light',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isChildActive && 'text-sidebar-accent-foreground',
          isCollapsed && 'justify-center px-1'
        )}
        title={isCollapsed ? label : undefined}
      >
        <span className="flex-shrink-0 [&_svg]:stroke-[1]">{icon}</span>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{label}</span>
            {isOpen ? (
              <ChevronDown className="h-3 w-3 flex-shrink-0 stroke-[1]" />
            ) : (
              <ChevronRight className="h-3 w-3 flex-shrink-0 stroke-[1]" />
            )}
          </>
        )}
      </button>
      
      {!isCollapsed && isOpen && (
        <div className="ml-3 pl-2 border-l border-sidebar-border/50 space-y-1 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ isCollapsed, onToggleSidebar }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { selectedProject } = useProject();

  return (
    <aside
      className={cn(
        'h-full shrink-0 relative bg-sidebar border-r border-sidebar-border flex flex-col',
        'shadow-[4px_0_14px_rgba(0,0,0,0.08)]',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2 pt-4">
        {/* Início - visível para todos os perfis */}
        <NavItem 
          to="/"
          icon={<Home className="h-5 w-5" />} 
          label={t('nav.home')} 
          isCollapsed={isCollapsed}
          end
        />
        <NavItem 
          to="/dashboard" 
          icon={<LayoutDashboard className="h-5 w-5" />} 
          label={t('nav.dashboard')} 
          isCollapsed={isCollapsed}
        />

        {/* Visão de Saúde do Projeto (Semáforo) - requer projeto selecionado */}
        {selectedProject && (
          <NavItem
            to={`/projetos/${selectedProject.id}/semaforo`}
            icon={<HeartPulse className="h-5 w-5" />}
            label={t('nav.projectHealth')}
            isCollapsed={isCollapsed}
          />
        )}

        {/* Cadastros Group - apenas perfil Admin (A) */}
        {user?.perfil === 'A' && (
          <NavGroup
            icon={<FolderKanban className="h-5 w-5" />}
            label={t('nav.registrations')}
            isCollapsed={isCollapsed}
            defaultOpen
            pathPrefix="/cadastros"
            onExpandSidebar={() => isCollapsed && onToggleSidebar()}
          >
            <NavItem 
              to="/cadastros/usuarios" 
              icon={<Users className="h-4 w-4" />} 
              label={t('nav.users')} 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/cadastros/projetos" 
              icon={<FolderKanban className="h-4 w-4" />} 
              label={t('nav.projects')} 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/cadastros/projeto-meta" 
              icon={<Target className="h-4 w-4" />} 
              label={t('nav.goals')} 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/cadastros/perfis" 
              icon={<UserCircle className="h-4 w-4" />} 
              label={t('nav.profiles')} 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/cadastros/profissionais" 
              icon={<Briefcase className="h-4 w-4" />} 
              label={t('nav.professionals')} 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/cadastros/desembolsos" 
              icon={<CircleDollarSign className="h-4 w-4" />} 
              label={t('nav.disbursements')} 
              isCollapsed={isCollapsed}
            />
            <NavItem 
              to="/cadastros/templates" 
              icon={<FileText className="h-4 w-4" />} 
              label={t('nav.templates')} 
              isCollapsed={isCollapsed}
            />
          </NavGroup>
        )}

        {/* Demandas Group - Visualizador (V) não vê submenu Demanda Técnica */}
        <NavGroup
          icon={<FileText className="h-5 w-5" />}
          label={t('nav.demands')}
          isCollapsed={isCollapsed}
          defaultOpen
          pathPrefix="/demandas"
          onExpandSidebar={() => isCollapsed && onToggleSidebar()}
        >
          {user?.perfil !== 'V' && (
            <NavItem 
              to="/demandas" 
              icon={<FileText className="h-4 w-4" />} 
              label={t('nav.technicalDemand')} 
              isCollapsed={isCollapsed}
              end
            />
          )}
          <NavItem 
            to="/demandas/health-map" 
            icon={<HeartPulse className="h-4 w-4" />} 
            label={t('nav.healthMap')} 
            isCollapsed={isCollapsed}
            end
          />
        </NavGroup>
      </nav>

      {/* Botão expandir/recolher - semicírculo projetando para fora da sidebar */}
      <div className="absolute left-full top-3 z-10 w-[14px] overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className={cn(
            '-ml-[14px] h-7 w-7 rounded-full border border-sidebar-border bg-sidebar shadow-sm',
            'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            'transition-all duration-200 flex items-center justify-end pr-1.5'
          )}
          title={t('header.toggleSidebar')}
          aria-label={t('header.toggleSidebar')}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 stroke-[2.5]" />
          )}
        </Button>
      </div>
    </aside>
  );
}
