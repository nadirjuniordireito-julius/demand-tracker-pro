import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  MessageSquare, 
  Globe, 
  User, 
  LogOut,
  Settings,
  ChevronDown,
  RefreshCw,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { LANGUAGES, changeLanguage, type LanguageCode } from '@/i18n';
import { useAuth } from '@/contexts/AuthContext';
import { useProject } from '@/contexts/ProjectContext';
import { usuarioFotoService } from '@/services';
import logoImage from '@/assets/logo.png';
import juliusLogo from '@/assets/julius-xpt-976-TW.png';
import { formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { APP_VERSION } from '@/constants/appInfo';

export function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedProject, userProjects, openProjectSelection } = useProject();
  const [notificationCount] = useState(3);
  const [messageCount] = useState(5);
  const [userFotoUrl, setUserFotoUrl] = useState<string | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  const currentLanguage = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  // Carrega a foto do usuário
  useEffect(() => {
    const loadUserFoto = async () => {
      if (!user?.id) {
        setUserFotoUrl(null);
        return;
      }

      try {
        // Tenta fazer download da foto
        const blob = await usuarioFotoService.download(user.id);
        const url = URL.createObjectURL(blob);
        setUserFotoUrl(url);
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };
        if (err?.status !== 404 && !String(err?.message ?? '').includes('404') && import.meta.env.DEV) {
          console.warn('Erro ao carregar foto do usuário no header:', error);
        }
        setUserFotoUrl(null);
      }
    };

    loadUserFoto();

    // Cleanup: revoga URL do blob quando componente desmonta ou fotoUrl muda
    return () => {
      if (userFotoUrl) {
        URL.revokeObjectURL(userFotoUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleLanguageChange = (code: LanguageCode) => {
    changeLanguage(code);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Ignora erros do backend - o importante é limpar o token localmente
      if (import.meta.env.DEV) console.warn('Erro ao fazer logout no backend, mas continuando com logout local:', error);
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

  const getUserLogin = () => {
    return user?.username ?? user?.email ?? '';
  };

  return (
    <header className="h-14 bg-header border-b border-header-border flex items-center justify-between px-4 shadow-subtle">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-4">
          <div
            role="button"
            tabIndex={0}
            className="flex items-center gap-2 mt-[-9px] cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
            onDoubleClick={() => setAboutOpen(true)}
            onKeyDown={(e) => e.key === 'Enter' && setAboutOpen(true)}
            aria-label={t('common.appName')}
          >
            
            <img
              src={juliusLogo}
              alt="Julius"
              className="h-8 w-auto object-contain"
            />
          </div>

          {selectedProject && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md">
              {userProjects.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-muted-foreground hover:text-header-foreground"
                  onClick={openProjectSelection}
                  title={t('projects.change')}
                  aria-label={t('projects.change')}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-medium text-header-foreground leading-tight">
                  {selectedProject.codTed} - {selectedProject.nome}
                </span>
                <span className="text-xs text-muted-foreground leading-tight">
                  {formatDate(selectedProject.termoInicial, 'dd/MM/yyyy', { locale: ptBR })} - {formatDate(selectedProject.termoFinal, 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
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
              <span className="hidden sm:inline-flex items-center gap-1">
                <span className="uppercase text-xs font-medium">
                  {currentLanguage.code}
                </span>
                <img
                  src={currentLanguage.flag}
                  alt={currentLanguage.name}
                  className="h-3 w-5 rounded-sm object-cover border border-border/60"
                />
              </span>
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
                <img
                  src={lang.flag}
                  alt={lang.name}
                  className="mr-2 h-3 w-5 rounded-sm object-cover border border-border/60"
                />
                <span className="mr-1 uppercase text-xs font-medium">
                  {lang.code}
                </span>
                <span>{lang.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Messages - oculto até implementação futura */}
        <div className="hidden" aria-hidden>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-header-foreground hover:bg-muted relative"
                aria-label={t('header.messages')}
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
        </div>

        {/* Notifications - oculto até implementação futura */}
        <div className="hidden" aria-hidden>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-header-foreground hover:bg-muted relative"
                aria-label={t('header.notifications')}
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
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-header-foreground hover:bg-muted gap-2 pl-1"
            >
              <Avatar className="h-8 w-8">
                {userFotoUrl ? (
                  <AvatarImage src={userFotoUrl} alt={user?.nome} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start text-left">
                <span className="text-sm font-medium leading-tight">
                  {user?.nome || 'Usuário'}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight italic">
                  {getUserLogin()}
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

      {/* Modal Sobre (duplo clique no logo) */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <button
            type="button"
            aria-label={t('common.close')}
            className="absolute right-4 top-4 z-10 inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/95 text-muted-foreground transition hover:text-foreground"
            onClick={() => setAboutOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            <img
              src={logoImage}
              alt="Logo"
              className="h-[11rem] w-auto object-contain mb-4"
            />
            <h2 className="text-xl font-semibold text-foreground mb-1">
              {t('common.appName')}
            </h2>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {t('common.appNameDesc')}
            </p>
          </div>
          <footer className="text-center border-t bg-muted/40 px-6 py-3 flex flex-col gap-1 text-xs text-emerald-900">
            <span className="font-bold">{t('common.aboutDevelopedBy')}</span>
            <span>
              {t('common.aboutCreatedDate')} · © {t('common.aboutAllRightsReserved')} - V.{APP_VERSION}
            </span>
           
            
          </footer>
        </DialogContent>
      </Dialog>
    </header>
  );
}
