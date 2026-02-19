import { useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileText,
  FolderKanban,
  CheckCircle,
  TrendingUp,
  Eye,
} from 'lucide-react';

const DashboardCharts = lazy(() => import('../DashboardCharts'));

export default function DashboardPageVisualizador() {
  const { t } = useTranslation();
  
  const loadData = async () => {
   
  };

  useEffect(() => {
    loadData();
  }, []);
  

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.titleVisualizador')}</h1>
        </div>
        <p className="text-sm font-light text-muted-foreground">{t('dashboard.descriptionVisualizador')}</p>
      </div>
    </div>
  );
}
