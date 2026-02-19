import { useTranslation } from 'react-i18next';
import {
  FileText,
  FolderKanban,
  TrendingUp,
  ArrowRight,
  Workflow,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function HomePageOperador() {
  const { t } = useTranslation();

  const quickLinks = [
    {
      title: t('nav.dashboard'),
      description: t('common.dashboardDescription'),
      icon: TrendingUp,
      to: '/dashboard',
    },
    {
      title: t('nav.demands'),
      description: t('common.demandsDescription'),
      icon: FileText,
      to: '/demandas',
    },
    {
      title: t('nav.projects'),
      description: t('common.projectsDescription'),
      icon: FolderKanban,
      to: '/cadastros/projetos',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-normal tracking-tight">
            {t('home.welcomeOperador')}
          </h1>
        </div>
        <p className="text-muted-foreground">{t('home.descriptionOperador')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Card key={link.to} className="hover:shadow-elevated transition-shadow duration-200">
            <CardHeader className="pb-2">
              <link.icon className="h-10 w-10 text-foreground" strokeWidth={1.5} />
            </CardHeader>
            <CardContent className="space-y-2">
              <CardTitle className="text-base font-normal text-primary">{link.title}</CardTitle>
              <CardDescription>{link.description}</CardDescription>
              <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
                <Link to={link.to} className="flex items-center gap-1 text-primary">
                  {t('common.access')} <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('common.howToUseTitle')}</CardTitle>
          <CardDescription>{t('common.howToUseDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-normal mb-2">1</div>
              <h4 className="font-medium">{t('common.step1Title')}</h4>
              <p className="text-sm text-muted-foreground mt-1">{t('common.step1Description')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-normal mb-2">2</div>
              <h4 className="font-medium">{t('common.step2Title')}</h4>
              <p className="text-sm text-muted-foreground mt-1">{t('common.step2Description')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-normal mb-2">3</div>
              <h4 className="font-medium">{t('common.step3Title')}</h4>
              <p className="text-sm text-muted-foreground mt-1">{t('common.step3Description')}</p>
            </div>
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-normal mb-2">4</div>
              <h4 className="font-medium">{t('common.step4Title')}</h4>
              <p className="text-sm text-muted-foreground mt-1">{t('common.step4Description')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
