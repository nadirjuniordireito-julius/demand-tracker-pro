import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Users,
  FolderKanban,
  UserCircle,
  FileText,
  FilePlus,
  FileCheck,
  FileX,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isCollapsed: boolean;
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
}

function NavItem({ to, icon, label, isCollapsed, end = false }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
          isCollapsed && 'justify-center px-2'
        )
      }
      title={isCollapsed ? label : undefined}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!isCollapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

function NavGroup({ icon, label, isCollapsed, children, defaultOpen = false }: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const location = useLocation();

  // Check if any child route is active
  const isChildActive = location.pathname.includes('/cadastros') || 
                        location.pathname.includes('/demandas');

  return (
    <div className="space-y-1">
      <button
        onClick={() => !isCollapsed && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200',
          'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isChildActive && 'text-sidebar-accent-foreground',
          isCollapsed && 'justify-center px-2'
        )}
        title={isCollapsed ? label : undefined}
      >
        <span className="flex-shrink-0">{icon}</span>
        {!isCollapsed && (
          <>
            <span className="flex-1 text-left truncate">{label}</span>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 flex-shrink-0" />
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

export function Sidebar({ isCollapsed }: SidebarProps) {
  const { t } = useTranslation();

  return (
    <aside
      className={cn(
        'bg-sidebar border-r border-sidebar-border flex flex-col',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo Area */}
      <div className={cn(
        'h-14 flex items-center border-b border-sidebar-border px-4',
        isCollapsed && 'justify-center px-2'
      )}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-sidebar-foreground truncate">
              SDT
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2">
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

        {/* Cadastros Group */}
        <NavGroup
          icon={<FolderKanban className="h-5 w-5" />}
          label={t('nav.registrations')}
          isCollapsed={isCollapsed}
          defaultOpen
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
            to="/cadastros/perfis" 
            icon={<UserCircle className="h-4 w-4" />} 
            label={t('nav.profiles')} 
            isCollapsed={isCollapsed}
          />
        </NavGroup>

        {/* Demandas Group */}
        <NavGroup
          icon={<FileText className="h-5 w-5" />}
          label={t('nav.demands')}
          isCollapsed={isCollapsed}
          defaultOpen
        >
          <NavItem 
            to="/demandas" 
            icon={<FileText className="h-4 w-4" />} 
            label={t('nav.technicalDemand')} 
            isCollapsed={isCollapsed}
            end
          />
          <NavItem 
            to="/demandas/termo-abertura" 
            icon={<FilePlus className="h-4 w-4" />} 
            label={t('nav.openingTerm')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            to="/demandas/termo-planejamento" 
            icon={<FileCheck className="h-4 w-4" />} 
            label={t('nav.planningTerm')} 
            isCollapsed={isCollapsed}
          />
          <NavItem 
            to="/demandas/termo-encerramento" 
            icon={<FileX className="h-4 w-4" />} 
            label={t('nav.closingTerm')} 
            isCollapsed={isCollapsed}
          />
        </NavGroup>
      </nav>
    </aside>
  );
}
