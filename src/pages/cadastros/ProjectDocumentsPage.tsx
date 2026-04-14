import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageComponents';
import { LoadingSpinner, LoadingButton, ErrorState } from '@/components/common/LoadingStates';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { projetoDocService, projetoService } from '@/services';
import type { Projeto, ProjetoDoc } from '@/types';
import { FileText, Upload, Download, Trash2 } from 'lucide-react';

type LocationState = {
  returnTo?: string;
};

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  return value.startsWith('/') && !value.startsWith('//');
}

export default function ProjectDocumentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { projetoId } = useParams<{ projetoId: string }>();
  const { toast } = useToast();
  const [projeto, setProjeto] = useState<Projeto | null>(null);
  const [docs, setDocs] = useState<ProjetoDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProjeto, setIsLoadingProjeto] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNome, setUploadNome] = useState('');
  const [docToDelete, setDocToDelete] = useState<ProjetoDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    navigate('/cadastros/projetos');
  }, [navigate, returnTo]);

  const loadProjeto = useCallback(async () => {
    const parsedId = Number(projetoId);
    if (!parsedId || Number.isNaN(parsedId)) {
      setError(t('common.invalidData'));
      setIsLoadingProjeto(false);
      return;
    }

    setError(null);
    setIsLoadingProjeto(true);
    try {
      const data = await projetoService.findById(parsedId);
      setProjeto(data);
    } catch {
      setError(t('common.errorLoadingData'));
    } finally {
      setIsLoadingProjeto(false);
    }
  }, [projetoId, t]);

  const loadDocs = useCallback(async () => {
    if (!projeto?.id) return;
    setIsLoading(true);
    try {
      const list = await projetoDocService.findByProjeto(projeto.id);
      setDocs(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [projeto?.id, toast, t]);

  useEffect(() => {
    void loadProjeto();
  }, [loadProjeto]);

  useEffect(() => {
    if (projeto?.id) {
      void loadDocs();
    }
  }, [projeto?.id, loadDocs]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return t('common.fileSizeZero');
    const k = 1024;
    const sizes = [
      t('common.fileSizeBytes'),
      t('common.fileSizeKB'),
      t('common.fileSizeMB'),
      t('common.fileSizeGB'),
    ];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleUpload = async () => {
    if (!projeto?.id) return;
    const input = fileInputRef.current;
    const file = selectedFile ?? input?.files?.[0];
    if (!file) {
      toast({
        title: t('common.error'),
        description: t('projects.documents.selectFile'),
        variant: 'destructive',
      });
      return;
    }
    setIsUploading(true);
    try {
      await projetoDocService.upload(projeto.id, file, uploadNome.trim() || undefined);
      toast({ title: t('common.success'), description: t('projects.documents.uploadSuccess') });
      setUploadNome('');
      setSelectedFile(null);
      if (input) input.value = '';
      await loadDocs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc: ProjetoDoc) => {
    try {
      const blob = await projetoDocService.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.nomeArquivo || doc.nome || 'documento';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);
    try {
      await projetoDocService.delete(docToDelete.id);
      toast({ title: t('common.success'), description: t('projects.documents.deleteSuccess') });
      setDocToDelete(null);
      await loadDocs();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projects.documents.title', { name: '' })} />
        <ErrorState
          title={t('common.errorTitle')}
          message={error}
          onRetry={loadProjeto}
          retryText={t('common.retry')}
        />
      </div>
    );
  }

  if (isLoadingProjeto || !projeto) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('projects.documents.label')} />
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" text={t('common.loading')} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={t('projects.documents.title', { name: projeto.nome })}
          description={t('projects.documents.description')}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder={t('projects.documents.namePlaceholder')}
            value={uploadNome}
            onChange={(e) => setUploadNome(e.target.value)}
            className="sm:max-w-[240px]"
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {t('projects.documents.selectFile')}
            </Button>
            <LoadingButton
              type="button"
              size="sm"
              onClick={handleUpload}
              isLoading={isUploading}
              loadingText={t('common.processing')}
              disabled={!selectedFile}
            >
              <Upload className="h-4 w-4 mr-1" />
              {t('projects.documents.upload')}
            </LoadingButton>
          </div>
        </div>

        <div className="border rounded-md overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" text={t('common.loading')} />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mb-2" />
              <p>{t('projects.documents.noDocuments')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('projects.documents.name')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('projects.documents.fileName')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('projects.documents.size')}</TableHead>
                  <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.nome}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground truncate max-w-[180px]">
                      {doc.nomeArquivo || '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {doc.tamanhoArquivo != null ? formatFileSize(doc.tamanhoArquivo) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                          title={t('common.download')}
                          aria-label={t('common.download')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDocToDelete(doc)}
                          title={t('common.delete')}
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={handleBack}>
            {t('common.cancel')}
          </Button>
        </div>
      </div>

      <AlertDialog open={!!docToDelete} onOpenChange={(o) => !o && setDocToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('projects.documents.deleteConfirm', { name: docToDelete?.nome ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
