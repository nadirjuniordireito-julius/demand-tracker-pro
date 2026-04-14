import { cn } from '@/lib/utils';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';

interface DialogHeaderStandardProps {
  title: string;
  description: string;
}

/** Works inside or outside `<Dialog>` — uses plain markup so Radix dialog context is not required. */
export function DialogHeaderStandard({ title, description }: DialogHeaderStandardProps) {
  const { t } = useTranslation();
  const { selectedProject } = useProject();

  const navy = '#001f3f';

  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left')}
      style={{ color: navy }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1.5">
          <h2
            className={cn('text-base font-normal leading-none tracking-tight')}
            style={{ color: navy }}
          >
            {title}
          </h2>
          <p
            className={cn('text-sm text-muted-foreground')}
            style={{ color: navy }}
          >
            {description}
          </p>
        </div>
        {selectedProject && (
          <div className="text-right min-w-[200px]" style={{ color: navy }}>
            <p className="text-sm font-normal">{t('common.selectedProject')}</p>
            <p className="text-sm">
              {selectedProject.nome}
              {selectedProject.codTed && ` - ${selectedProject.codTed}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
