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

  const navy = '#001f3f';

  return (
    <DialogHeader style={{ color: navy }}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <DialogTitle style={{ color: navy }}>{title}</DialogTitle>
          <DialogDescription style={{ color: navy }}>{description}</DialogDescription>
        </div>
        {selectedProject && (
          <div className="text-right min-w-[200px]" style={{ color: navy }}>
            <p className="text-sm font-normal">{t('common.selectedProject')}</p>
            <p className="text-sm" >
              {selectedProject.nome}
              {selectedProject.codTed && ` - ${selectedProject.codTed}`}
            </p>
          </div>
        )}
      </div>
    </DialogHeader>
  );
}
