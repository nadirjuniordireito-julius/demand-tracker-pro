import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  MessageSquare, 
  Globe, 
  User, 
  LogOut,
  Settings,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LANGUAGES, changeLanguage, type LanguageCode } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarCollapsed: boolean;
}

export function Header({ onToggleSidebar, isSidebarCollapsed }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedProject, openProjectSelection } = useProject();
  const [notificationCount] = useState(3);
  const [messageCount] = useState(5);

  const currentLanguage = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (code: LanguageCode) => {
    changeLanguage(code);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Ignora erros do backend - o importante é limpar o token localmente
      console.warn('Erro ao fazer logout no backend, mas continuando com logout local:', error);
    }
    // Força um refresh completo da página para garantir que o estado seja limpo
    window.location.href = '/login';
  };

  const getUserInitials = () => {
    if (!user?.nome) return 'U';
    const names = user.nome.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  const getProfileLabel = () => {
    if (!user?.perfil) return '';
    const profiles: Record<string, string> = {
      ADMIN: t('users.profileAdmin'),
      MANAGER: t('users.profileManager'),
      ANALYST: t('users.profileAnalyst'),
      USER: t('users.profileUser'),
    };
    return profiles[user.perfil] || user.perfil;
  };

  return (
    <header className="h-14 bg-header border-b border-header-border flex items-center justify-between px-4 shadow-subtle">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="text-header-foreground hover:bg-muted transition-all duration-300"
          title={t('header.toggleSidebar')}
        >
          <Menu 
            className={`h-5 w-5 transition-transform duration-300 ${
              isSidebarCollapsed ? 'rotate-180' : ''
            }`} 
          />
        </Button>
        
        <div className="hidden md:flex items-center gap-4">
          <h1 className="text-lg font-semibold text-header-foreground">
            {t('common.appName')}
          </h1>
          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border group">
              <span className="text-sm font-medium text-header-foreground">
                {selectedProject.codTed}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {selectedProject.nome}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-header-foreground"
                onClick={openProjectSelection}
                title={t('project.change', 'Trocar projeto')}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Language Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-header-foreground hover:bg-muted gap-2"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{currentLanguage.flag}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {LANGUAGES.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={i18n.language === lang.code ? 'bg-accent' : ''}
              >
                <span className="mr-2">{lang.flag}</span>
                {lang.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messages */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-header-foreground hover:bg-muted relative"
            >
              <MessageSquare className="h-5 w-5" />
              {messageCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {messageCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="p-2 font-medium border-b">
              {t('header.messages')}
            </div>
            <div className="p-4 text-center text-muted-foreground text-sm">
              {t('messages.noMessages')}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-header-foreground hover:bg-muted relative"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                >
                  {notificationCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="p-2 font-medium border-b">
              {t('header.notifications')}
            </div>
            <div className="p-4 text-center text-muted-foreground text-sm">
              {t('header.noNotifications')}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-header-foreground hover:bg-muted gap-2 pl-1"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-medium leading-tight">
                  {user?.nome || 'Usuário'}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {getProfileLabel()}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 border-b mb-1">
              <p className="text-sm font-medium">{user?.nome}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuItem onClick={() => navigate('/perfil')}>
              <User className="h-4 w-4 mr-2" />
              {t('header.profile')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
              <Settings className="h-4 w-4 mr-2" />
              {t('header.settings')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('header.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
