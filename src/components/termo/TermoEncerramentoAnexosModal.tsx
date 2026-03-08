import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LoadingSpinner, LoadingButton } from '@/components/common/LoadingStates';
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
import { PdfPreviewDialog } from '@/components/common/PdfPreviewDialog';
import { termoEncerramentoAnexoService } from '@/services/termoEncerramentoAnexoService';
import { normalizeDemandaStatus } from '@/lib/demandaStatus';
import type { TermoEncerramentoAnexoResponseDTO } from '@/types';
import { FileText, Upload, Download, Trash2, Eye } from 'lucide-react';

const PDF_CONTENT_TYPES = ['application/pdf'];
const isPdf = (item: TermoEncerramentoAnexoResponseDTO): boolean => {
  const ct = (item.tipoConteudo || '').toLowerCase().trim();
  if (PDF_CONTENT_TYPES.some((t) => ct.includes(t))) return true;
  const name = (item.nomeArquivo || '').toLowerCase();
  return name.endsWith('.pdf');
};

interface TermoEncerramentoAnexosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  termoEncerramentoId: number | null;
  /** Demanda status: anexos podem ser incluídos/excluídos quando status === 'E' ou 'F' */
  demandaStatus: string | undefined;
  usuarioId?: number;
}

export function TermoEncerramentoAnexosModal({
  open,
  onOpenChange,
  termoEncerramentoId,
  demandaStatus,
  usuarioId,
}: TermoEncerramentoAnexosModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [anexos, setAnexos] = useState<TermoEncerramentoAnexoResponseDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [anexoToDelete, setAnexoToDelete] = useState<TermoEncerramentoAnexoResponseDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewAnexo, setPreviewAnexo] = useState<TermoEncerramentoAnexoResponseDTO | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusCode = normalizeDemandaStatus(demandaStatus);
  const canEdit = statusCode === 'E' || statusCode === 'F';

  const loadAnexos = useCallback(async () => {
    if (termoEncerramentoId == null || !open) return;
    setIsLoading(true);
    try {
      const list = await termoEncerramentoAnexoService.findByTermoEncerramentoId(termoEncerramentoId);
      setAnexos(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [termoEncerramentoId, open, toast, t]);

  useEffect(() => {
    if (open && termoEncerramentoId != null) loadAnexos();
  }, [open, termoEncerramentoId, loadAnexos]);

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
    if (termoEncerramentoId == null) return;
    if (!canEdit) {
      toast({
        title: t('common.error'),
        description: t('closingTerm.attachments.statusRestriction'),
        variant: 'destructive',
      });
      return;
    }
    const input = fileInputRef.current;
    const file = selectedFile ?? input?.files?.[0];
    if (!file) {
      toast({
        title: t('common.error'),
        description: t('closingTerm.attachments.selectFile'),
        variant: 'destructive',
      });
      return;
    }
    setIsUploading(true);
    try {
      await termoEncerramentoAnexoService.upload(termoEncerramentoId, file, usuarioId);
      toast({ title: t('common.success'), description: t('closingTerm.attachments.uploadSuccess') });
      setSelectedFile(null);
      if (input) input.value = '';
      loadAnexos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (anexo: TermoEncerramentoAnexoResponseDTO) => {
    try {
      const blob = await termoEncerramentoAnexoService.download(anexo.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = anexo.nomeArquivo || 'anexo';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!anexoToDelete) return;
    if (!canEdit) {
      toast({
        title: t('common.error'),
        description: t('closingTerm.attachments.statusRestriction'),
        variant: 'destructive',
      });
      setAnexoToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await termoEncerramentoAnexoService.delete(anexoToDelete.id);
      toast({ title: t('common.success'), description: t('closingTerm.attachments.deleteSuccess') });
      setAnexoToDelete(null);
      loadAnexos();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (termoEncerramentoId == null) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('closingTerm.attachments.title')}</DialogTitle>
            <DialogDescription>{t('closingTerm.attachments.description')}</DialogDescription>
          </DialogHeader>

          {!canEdit && (
            <p className="text-sm text-muted-foreground">
              {t('closingTerm.attachments.onlyWhenStatusE')}
            </p>
          )}

          {/* Upload area - só habilitado quando status E */}
          {canEdit && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {t('closingTerm.attachments.selectFile')}
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
                  {t('closingTerm.attachments.upload')}
                </LoadingButton>
              </div>
              {selectedFile && (
                <span className="text-sm text-muted-foreground self-center">
                  {selectedFile.name}
                </span>
              )}
            </div>
          )}

          {/* List */}
          <div className="border rounded-md overflow-auto flex-1 min-h-[360px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="lg" text={t('common.loading')} />
              </div>
            ) : anexos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mb-2" />
                <p>{t('closingTerm.attachments.noAttachments')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('closingTerm.attachments.fileName')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('closingTerm.attachments.contentType')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('closingTerm.attachments.size')}</TableHead>
                    <TableHead className="w-[120px] text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anexos.map((anexo) => (
                    <TableRow key={anexo.id}>
                      <TableCell className="font-medium truncate max-w-[180px]" title={anexo.nomeArquivo}>
                        {anexo.nomeArquivo}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                        {anexo.tipoConteudo || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {anexo.tamanhoArquivo != null ? formatFileSize(anexo.tamanhoArquivo) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {isPdf(anexo) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setPreviewAnexo(anexo)}
                              title={t('common.preview')}
                              aria-label={t('common.preview')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(anexo)}
                            title={t('common.download')}
                            aria-label={t('common.download')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setAnexoToDelete(anexo)}
                              title={t('common.delete')}
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!anexoToDelete} onOpenChange={(o) => !o && setAnexoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('closingTerm.attachments.deleteConfirm', { name: anexoToDelete?.nomeArquivo ?? '' })}
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

      <PdfPreviewDialog
        open={!!previewAnexo}
        onOpenChange={(open) => !open && setPreviewAnexo(null)}
        title={t('closingTerm.attachments.previewTitle')}
        description={previewAnexo?.nomeArquivo}
        fetchPdf={() => termoEncerramentoAnexoService.download(previewAnexo!.id)}
        loadingLabel={t('common.loading')}
        errorMessage={t('closingTerm.attachments.previewError')}
        closeLabel={t('common.close')}
        downloadLabel={t('common.download')}
        downloadFileName={previewAnexo?.nomeArquivo}
        onError={(err: unknown) =>
          toast({
            title: t('common.error'),
            description: err instanceof Error ? err.message : t('closingTerm.attachments.previewError'),
            variant: 'destructive',
          })
        }
      />
    </>
  );
}
