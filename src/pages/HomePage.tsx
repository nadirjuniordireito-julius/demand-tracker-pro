import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  FolderKanban, 
  Users, 
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { t } = useTranslation();

  const quickLinks = [
    {
      title: t('nav.dashboard'),
      description: 'Visualize estatísticas e métricas do sistema',
      icon: TrendingUp,
      to: '/dashboard',
      color: 'bg-info/10 text-info',
    },
    {
      title: t('nav.demands'),
      description: 'Gerencie demandas técnicas dos projetos',
      icon: FileText,
      to: '/demandas',
      color: 'bg-primary/10 text-primary',
    },
    {
      title: t('nav.projects'),
      description: 'Cadastre e gerencie projetos',
      icon: FolderKanban,
      to: '/cadastros/projetos',
      color: 'bg-success/10 text-success',
    },
    {
      title: t('nav.users'),
      description: 'Gerencie usuários do sistema',
      icon: Users,
      to: '/cadastros/usuarios',
      color: 'bg-warning/10 text-warning',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo ao {t('common.appName')}
        </h1>
        <p className="text-muted-foreground">
          Gerencie demandas técnicas de forma eficiente e organizada.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Card key={link.to} className="hover:shadow-elevated transition-shadow duration-200">
            <CardHeader className="pb-2">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${link.color}`}>
                <link.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-lg">{link.title}</CardTitle>
              <CardDescription>{link.description}</CardDescription>
              <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
                <Link to={link.to} className="flex items-center gap-1 text-primary">
                  Acessar <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Como usar o sistema</CardTitle>
          <CardDescription>
            Siga o fluxo abaixo para gerenciar suas demandas técnicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">
                1
              </div>
              <h4 className="font-medium">Criar Demanda</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastre uma nova demanda técnica vinculada a um projeto
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">
                2
              </div>
              <h4 className="font-medium">Termo de Abertura</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Formalize a demanda com descrição detalhada
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">
                3
              </div>
              <h4 className="font-medium">Termo de Planejamento</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Defina especificações, cronograma e custos
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">
                4
              </div>
              <h4 className="font-medium">Termo de Encerramento</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Registre os resultados e custos realizados
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
