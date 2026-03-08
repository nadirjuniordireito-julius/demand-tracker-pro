import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Loader2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { demandaService } from '@/services/demandaService';
import { usuarioFotoService } from '@/services/usuarioFotoService';
import { formatDateTime } from '@/helpers/formatDate';
import type { DemandaTimelineEventoDTO, UsuarioTimelineDTO, DemandaTecnica } from '@/types';
import { cn } from '@/lib/utils';

/** Avatar que carrega a foto do usuário via API autenticada (evita 403). */
function TimelineUsuarioAvatar({ usuario, className }: { usuario: UsuarioTimelineDTO; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario?.id || !usuario?.fotoUrl) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    usuarioFotoService
      .download(usuario.id)
      .then((blob) => {
        if (!cancelled) {
          objectUrl = URL.createObjectURL(blob);
          setBlobUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setBlobUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [usuario?.id, usuario?.fotoUrl]);

  return (
    <Avatar className={cn('h-9 w-9 shrink-0 rounded-full border-2 border-border', className)}>
      {blobUrl ? <AvatarImage src={blobUrl} alt={usuario.nome} /> : null}
      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
        <User className="h-4 w-4" />
      </AvatarFallback>
    </Avatar>
  );
}

export interface DemandaTimelineModalProps {
  /** ID da demanda técnica. Quando null/undefined, o modal não busca dados. */
  demandaId: number | null | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DemandaTimelineModal({ demandaId, open, onOpenChange }: DemandaTimelineModalProps) {
  const { t } = useTranslation();
  const [demanda, setDemanda] = useState<DemandaTecnica | null>(null);
  const [eventos, setEventos] = useState<DemandaTimelineEventoDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || demandaId == null) {
      setDemanda(null);
      setEventos([]);
      setError(null);
      return;
    }
    let cancelled = false;
    setDemanda(null);
    setLoading(true);
    setError(null);
    Promise.all([
      demandaService.findById(demandaId),
      demandaService.getTimeline(demandaId),
    ])
      .then(([demandaData, timelineData]) => {
        if (!cancelled) {
          setDemanda(demandaData);
          setEventos(timelineData ?? []);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDemanda(null);
          setEventos([]);
          setError(e?.message ?? t('common.errorMessage', 'Não foi possível carregar os dados.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, demandaId, t]);

  const getTipoEventoLabel = (tipoEvento: string) =>
    t(`demands.timeline.eventType.${tipoEvento}`, tipoEvento);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal flex items-center gap-2">
            <History className="h-5 w-5 shrink-0" />
            <span className="font-bold">{demanda?.codigo ?? '—'}</span>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground mt-1">
              {demanda?.descricao ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2"
                  dangerouslySetInnerHTML={{ __html: demanda.descricao }}
                />
              ) : (
                <span>{demanda ? '—' : ''}</span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-muted-foreground">
                {t('demands.timeline.loading', 'Carregando timeline...')}
              </span>
            </div>
          ) : error ? (
            <p className="text-destructive text-sm py-4">{error}</p>
          ) : eventos.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              {t('demands.timeline.empty', 'Nenhum evento registrado na timeline.')}
            </p>
          ) : (
            <div className="relative py-2">
              {/* Linha vertical central */}
              
              <div
                className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-px bg-border"
                aria-hidden
              />

              <ul className="space-y-0">
                {eventos.map((evento, index) => {
                  const isLeft = index % 2 === 0;
                  return (
                    <li
                      key={evento.sequencia}
                      className="relative grid grid-cols-[1fr_auto_1fr] gap-4 items-start py-3"
                    >
                      {/* Lado esquerdo: conteúdo só quando isLeft + linha só embaixo (bottom) com sombra */}
                      <div className={cn('min-w-0', isLeft ? 'pr-4' : '')}>
                        {isLeft && (
                          <div className="text-right">
                            <p className="font-medium text-sm">{getTipoEventoLabel(evento.tipoEvento)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(evento.dataHoraEvento, 'dd/MM/yyyy HH:mm')}
                            </p>
                            {evento.usuario && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {evento.usuario.nome}
                              </p>
                            )}
                            <div
                              className="mt-2 w-[60%] ml-auto border-b border-border shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]"
                              aria-hidden
                            />
                          </div>
                        )}
                      </div>
                      {/* Nó central: foto do usuário ou círculo fallback */}
                      <div
                        className="relative z-10 flex shrink-0 items-center justify-center"
                        aria-hidden
                      >
                        {evento.usuario ? (
                          <TimelineUsuarioAvatar usuario={evento.usuario} className="h-10 w-10 border-2 border-primary" />
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-primary bg-background" />
                        )}
                      </div>
                      {/* Lado direito: conteúdo só quando !isLeft + linha só embaixo (bottom) com sombra */}
                      <div className={cn('min-w-0', !isLeft ? 'pl-4' : '')}>
                        {!isLeft && (
                          <div className="text-left">
                            <p className="font-medium text-sm">{getTipoEventoLabel(evento.tipoEvento)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(evento.dataHoraEvento, 'dd/MM/yyyy HH:mm')}
                            </p>
                            {evento.usuario && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {evento.usuario.nome}
                              </p>
                            )}
                            <div
                              className="mt-2 w-[60%] border-b border-border shadow-[0_2px_4px_-1px_rgba(0,0,0,0.06)]"
                              aria-hidden
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter className="mt-4 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.close', 'Fechar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
