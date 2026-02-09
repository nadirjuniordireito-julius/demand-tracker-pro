import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useProject } from '@/contexts/ProjectContext';
import { useTranslation } from 'react-i18next';

interface DialogHeaderStandardProps {
  title: string;
  description: string;
}

export function DialogHeaderStandard({ title, description }: DialogHeaderStandardProps) {
  const { t } = useTranslation();
  const { selectedProject } = useProject();

  return (
    <DialogHeader>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </div>
        {selectedProject && (
          <div className="text-right min-w-[200px]">
            <p className="text-sm font-normal text-foreground">{t('common.selectedProject')}</p>
            <p className="text-sm text-muted-foreground">
              {selectedProject.nome}
              {selectedProject.codTed && ` - ${selectedProject.codTed}`}
            </p>
          </div>
        )}
      </div>
    </DialogHeader>
  );
}
