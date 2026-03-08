import { useTranslation } from 'react-i18next';
import { useProject } from '@/contexts/ProjectContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Projeto } from '@/types';

export function ProjectSelectionModal() {
  const { t } = useTranslation();
  const { userProjects, isLoading, selectProject, showSelectionModal } = useProject();

  // Não precisa chamar loadUserProjects aqui, pois já é chamado no contexto

  const handleSelectProject = (project: Projeto) => {
    selectProject(project);
  };

  // Se o contexto indicar que o modal não deve estar aberto, não renderiza nada
  if (!showSelectionModal) {
    return null;
  }

  return (
    <Dialog open={showSelectionModal} modal={true}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-normal flex items-center gap-2">
            <FolderKanban className="h-6 w-6" />
            {t('project.selection.title', 'Selecionar Projeto')}
          </DialogTitle>
          <DialogDescription>
            {t('project.selection.description', 'Escolha o projeto com o qual deseja trabalhar')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-muted-foreground">
                {t('project.selection.loading', 'Carregando projetos...')}
              </span>
            </div>
          ) : userProjects.length === 0 ? (
            <div className="text-center py-12">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                {t('project.selection.noProjects', 'Nenhum projeto encontrado')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('project.selection.noProjectsDescription', 'Você não possui projetos vinculados. Entre em contato com o administrador.')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userProjects.map((project) => (
                <Card
                  key={project.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-lg hover:border-primary',
                    'hover:scale-[1.02]'
                  )}
                  onClick={() => handleSelectProject(project)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FolderKanban className="h-5 w-5 text-primary" />
                      {project.nome}
                    </CardTitle>
                    <CardDescription>
                      {t('project.selection.code', 'Código')}: {project.codTed}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{t('project.selection.initialTerm', 'Termo Inicial')}:</span>{' '}
                        {new Date(project.termoInicial).toLocaleDateString('pt-BR')}
                      </div>
                      <div>
                        <span className="font-medium">{t('project.selection.finalTerm', 'Termo Final')}:</span>{' '}
                        {new Date(project.termoFinal).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <Button 
                      className="w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(project);
                      }}
                    >
                      {t('project.selection.select', 'Selecionar')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
