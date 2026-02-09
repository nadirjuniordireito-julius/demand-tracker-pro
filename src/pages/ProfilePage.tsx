import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Lock, Save, Eye, EyeOff, Upload, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage, getErrorStatus } from '@/lib/apiErrorHandler';
import { useAuth } from '@/contexts/AuthContext';
import { usuarioFotoService } from '@/services';
import { usuarioService } from '@/services/usuarioService';
import { LoadingButton } from '@/components/common/LoadingStates';

// Schema para dados pessoais
const profileSchema = z.object({
  nome: z.string()
    .min(3, 'Nome deve ter pelo menos 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string()
    .email('E-mail inválido')
    .max(255, 'E-mail deve ter no máximo 255 caracteres'),
});

// Schema para alteração de senha
const passwordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(6, 'Nova senha deve ter pelo menos 6 caracteres')
    .max(50, 'Nova senha deve ter no máximo 50 caracteres'),
  confirmPassword: z.string()
    .min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  
  // Estados para foto
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [isLoadingFoto, setIsLoadingFoto] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);
  const [isDeletingFoto, setIsDeletingFoto] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: user?.nome || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

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
      A: t('users.administrator'),
      O: t('users.operator'),
      V: t('users.viewer'),
    };
    return profiles[user.perfil] || user.perfil;
  };

  const getStatusLabel = () => {
    if (!user?.status) return '';
    return user.status === 'A' ? t('users.active') : t('users.inactive');
  };

  // Carrega a foto do usuário
  const loadFoto = async () => {
    if (!user?.id) return;
    
    setIsLoadingFoto(true);
    try {
      // Tenta fazer download da foto
      // Se não existir, o backend retornará 404
      const blob = await usuarioFotoService.download(user.id);
      const url = URL.createObjectURL(blob);
      setFotoUrl(url);
    } catch (error: unknown) {
      const status = getErrorStatus(error);
      const msg = getErrorMessage(error);
      if (status === 404 || msg.includes('404')) {
        setFotoUrl(null);
      } else {
        if (import.meta.env.DEV) console.warn('Erro ao carregar foto:', error);
        setFotoUrl(null);
      }
    } finally {
      setIsLoadingFoto(false);
    }
  };

  // Carrega foto quando o componente monta ou usuário muda
  useEffect(() => {
    if (user?.id) {
      loadFoto();
    }
    
    // Cleanup: revoga URL do blob quando componente desmonta ou fotoUrl muda
    return () => {
      if (fotoUrl) {
        URL.revokeObjectURL(fotoUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Handler para seleção de arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Valida tipo de arquivo (imagens)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('profile.invalidImageType'),
      });
      return;
    }

    // Valida tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('profile.imageTooLarge'),
      });
      return;
    }

    setSelectedFile(file);
    setIsUploadDialogOpen(true);
  };

  // Handler para upload da foto
  const handleUploadFoto = async () => {
    if (!selectedFile || !user?.id) return;

    setIsUploadingFoto(true);
    try {
      // Tenta fazer upload primeiro
      // Se já existir foto, o backend pode retornar erro, então tentamos update
      try {
        await usuarioFotoService.upload(user.id, selectedFile);
      } catch (uploadError: unknown) {
        const status = getErrorStatus(uploadError);
        const msg = getErrorMessage(uploadError).toLowerCase();
        if (status === 409 || status === 400 || msg.includes('já existe') || msg.includes('already exists')) {
          await usuarioFotoService.update(user.id, selectedFile);
        } else {
          throw uploadError;
        }
      }

      // Recarrega a foto
      if (fotoUrl) {
        URL.revokeObjectURL(fotoUrl);
      }
      await loadFoto();

      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: t('common.success'),
        description: t('profile.photoUploadSuccess'),
      });
    } catch (error: unknown) {
      let errorMessage = getErrorMessage(error, t('profile.photoUploadError'));
      if (error && typeof error === 'object' && 'responseText' in error) {
        const rt = (error as { responseText: unknown }).responseText;
        if (typeof rt === 'string') {
          try {
            const errorData = JSON.parse(rt) as { message?: string; error?: string; title?: string; detail?: string };
            errorMessage = errorData.message || errorData.error || errorData.title || errorMessage;
            if (errorData.detail) errorMessage += `: ${errorData.detail}`;
          } catch {
            errorMessage = rt || errorMessage;
          }
        }
      }
      if (import.meta.env.DEV) {
        console.error('Erro ao fazer upload da foto:', { error, message: errorMessage });
      }
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: errorMessage,
      });
    } finally {
      setIsUploadingFoto(false);
    }
  };

  // Handler para remoção da foto
  const handleDeleteFoto = async () => {
    if (!user?.id || !fotoUrl) return;

    setIsDeletingFoto(true);
    try {
      await usuarioFotoService.delete(user.id);
      
      // Remove a URL do blob
      URL.revokeObjectURL(fotoUrl);
      setFotoUrl(null);

      toast({
        title: t('common.success'),
        description: t('profile.photoDeleteSuccess'),
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: getErrorMessage(error, t('profile.photoDeleteError')),
      });
    } finally {
      setIsDeletingFoto(false);
    }
  };

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!user?.id) return;

    setIsProfileLoading(true);
    try {
      await usuarioService.update(user.id, {
        nome: data.nome,
        email: data.email,
      });

      // Atualiza o usuário no contexto para refletir imediatamente no Header e demais telas
      await refreshUser();

      toast({
        title: t('profile.updateSuccess'),
        description: t('profile.profileUpdated'),
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('profile.updateError'),
      });
    } finally {
      setIsProfileLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user?.id) return;

    setIsPasswordLoading(true);
    try {
      // Atualiza apenas a senha do usuário logado
      await usuarioService.update(user.id, {
        password: data.newPassword,
      });

      toast({
        title: t('profile.passwordSuccess'),
        description: t('profile.passwordUpdated'),
      });
      passwordForm.reset();
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('profile.passwordError'),
      });
    } finally {
      setIsPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-normal tracking-tight">{t('profile.title')}</h1>
        <p className="text-muted-foreground">{t('profile.description')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Card de informações do usuário */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  {fotoUrl && !isLoadingFoto ? (
                    <AvatarImage src={fotoUrl} alt={user?.nome} />
                  ) : null}
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-normal">
                    {isLoadingFoto ? (
                      <div className="h-full w-full flex items-center justify-center">
                        <div className="h-6 w-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      getUserInitials()
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex gap-1 bg-background rounded-full p-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    title={t('profile.uploadPhoto')}
                    aria-label={t('profile.uploadPhoto')}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  {fotoUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleDeleteFoto}
                      disabled={isDeletingFoto}
                      title={t('profile.deletePhoto')}
                      aria-label={t('profile.deletePhoto')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>
            <CardTitle>{user?.nome}</CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('profile.userProfile')}</span>
                <Badge variant="secondary">{getProfileLabel()}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">{t('common.status')}</span>
                <Badge variant={user?.status === 'A' ? 'default' : 'outline'}>
                  {getStatusLabel()}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">ID</span>
                <span className="text-sm font-mono">#{user?.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs de edição */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="personal" className="gap-2">
                  <User className="h-4 w-4" />
                  {t('profile.personalData')}
                </TabsTrigger>
                <TabsTrigger value="password" className="gap-2">
                  <Lock className="h-4 w-4" />
                  {t('profile.changePassword')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-6">
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                    <FormField
                      control={profileForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.name')} *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t('profile.namePlaceholder')} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('users.email')} *</FormLabel>
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder={t('profile.emailPlaceholder')} 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isProfileLoading} className="gap-2">
                        <Save className="h-4 w-4" />
                        {isProfileLoading ? t('common.loading') : t('common.save')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="password" className="mt-6">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.currentPassword')} *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showCurrentPassword ? 'text' : 'password'}
                                placeholder={t('profile.currentPasswordPlaceholder')} 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                aria-label={showCurrentPassword ? t('profile.hidePassword') : t('profile.showPassword')}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.newPassword')} *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showNewPassword ? 'text' : 'password'}
                                placeholder={t('profile.newPasswordPlaceholder')} 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                aria-label={showNewPassword ? t('profile.hidePassword') : t('profile.showPassword')}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('profile.confirmPassword')} *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder={t('profile.confirmPasswordPlaceholder')} 
                                {...field} 
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? t('profile.hidePassword') : t('profile.showPassword')}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <Eye className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end pt-4">
                      <Button type="submit" disabled={isPasswordLoading} className="gap-2">
                        <Lock className="h-4 w-4" />
                        {isPasswordLoading ? t('common.loading') : t('profile.updatePassword')}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardHeader>
        </Card>
      </div>

      {/* Dialog de Upload de Foto */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.uploadPhoto')}</DialogTitle>
            <DialogDescription>
              {t('profile.selectedFile')}
            </DialogDescription>
          </DialogHeader>
          {selectedFile && (
            <div className="mt-2 space-y-1">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">{t('profile.selectedFile')}:</span> {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUploadDialogOpen(false);
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              disabled={isUploadingFoto}
            >
              {t('common.cancel')}
            </Button>
            <LoadingButton
              onClick={handleUploadFoto}
              isLoading={isUploadingFoto}
              loadingText={t('profile.uploading')}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('profile.uploadPhoto')}
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
