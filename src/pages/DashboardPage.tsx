import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/types';
import DashboardPageAdmin from '@/pages/dashboard/DashboardPageAdmin';
import DashboardPageOperador from '@/pages/dashboard/DashboardPageOperador';
import DashboardPageVisualizador from '@/pages/dashboard/DashboardPageVisualizador';

export default function DashboardPage() {
  const { user } = useAuth();
  const perfil: UserProfile | undefined = user?.perfil;

  switch (perfil) {
    case 'A':
      return <DashboardPageAdmin />;
    case 'O':
      return <DashboardPageOperador />;
    case 'V':
      return <DashboardPageVisualizador />;
    default:
      return <DashboardPageVisualizador />;
  }
}
