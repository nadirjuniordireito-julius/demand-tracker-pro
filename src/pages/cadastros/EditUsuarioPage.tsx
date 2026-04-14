import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PageHeader } from '@/components/common/PageComponents';
import { ErrorState, LoadingButton } from '@/components/common/LoadingStates';
import { usuarioCreateSchema, usuarioSchema, type UsuarioFormData } from '@/lib/validations';
import { usuarioService } from '@/services/usuarioService';
import { useAuth } from '@/contexts/AuthContext';
import type { Usuario } from '@/types';

type LocationState = {
  returnTo?: string;
};

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

const USUARIOS_NOVO_PATH = '/cadastros/usuarios/novo';

export default function EditUsuarioPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuarioId } = useParams<{ usuarioId: string }>();
  const { user } = useAuth();
  const isCreate = location.pathname === USUARIOS_NOVO_PATH;
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(!isCreate);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user && user.perfil !== 'A') {
    return <Navigate to="/" replace />;
  }

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(isCreate ? usuarioCreateSchema : usuarioSchema),
    defaultValues: {
      nome: '',
      password: '',
      perfil: 'O',
      status: 'A',
    },
  });

  const returnTo = useMemo(() => {
    const queryReturnTo = new URLSearchParams(location.search).get('returnTo');
    const stateReturnTo = (location.state as LocationState | null)?.returnTo;
    const candidate = queryReturnTo || stateReturnTo;
    return isSafeInternalPath(candidate) ? candidate : null;
  }, [location.search, location.state]);

  const handleBack = useCallback(() => {
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    navigate('/cadastros/usuarios');
  }, [navigate, returnTo]);

  const loadUsuario = useCallback(async () => {
    const parsedId = Number(usuarioId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      const data = await usuarioService.findById(parsedId);
      setUsuario(data);
      form.reset({
        nome: data.nome,
        password: '',
        perfil: data.perfil,
        status: data.status,
      });
    } catch {
      setError(t('common.errorLoadingData'));
    } finally {
      setIsLoading(false);
    }
  }, [usuarioId, form, t]);

  useEffect(() => {
    if (isCreate) return;
    void loadUsuario();
  }, [isCreate, loadUsuario]);

  const onSubmit = async (data: UsuarioFormData) => {
    setIsSaving(true);
    try {
      if (isCreate) {
        await usuarioService.create({
          nome: data.nome,
          password: data.password,
          perfil: data.perfil,
          status: data.status,
        });
      } else if (usuario) {
        await usuarioService.update(usuario.id, {
          nome: data.nome,
          perfil: data.perfil,
          status: data.status,
          ...(data.password && { password: data.password }),
        });
      }
      handleBack();
    } finally {
      setIsSaving(false);
    }
  };

  if (error && !isCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('users.editUser')} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadUsuario}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (!isCreate && (isLoading || !usuario)) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('users.editUser')} />
        <div className="text-center py-8">
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const pageTitle = isCreate ? t('users.newUser') : t('users.editUser');
  const pageDescription = isCreate ? t('common.fillUser') : t('common.editUser');

  return (
    <div className="space-y-6">
      <PageHeader title={pageTitle} description={pageDescription} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('auth.username')} *</FormLabel>
                <FormControl>
                  <Input placeholder={t('auth.usernamePlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {isCreate ? `${t('users.password')} *` : t('users.password')}
                </FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={isCreate ? t('common.passwordPlaceholder') : t('common.passwordKeepBlank')}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="perfil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('users.profile')} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="A">{t('users.administrator')}</SelectItem>
                    <SelectItem value="O">{t('users.operator')}</SelectItem>
                    <SelectItem value="V">{t('users.viewer')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('users.status')} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="A">{t('users.active')}</SelectItem>
                    <SelectItem value="I">{t('users.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isSaving}
              loadingText={t('common.saving')}
            >
              {t('common.save')}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}
