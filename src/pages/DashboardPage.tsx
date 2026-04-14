import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/types';
import DashboardMap from '@/pages/dashboard/DashboardMap';
import DashboardPageVisualizador from '@/pages/dashboard/DashboardPageVisualizador';

export default function DashboardPage() {
  const { user } = useAuth();
  const perfil: UserProfile | undefined = user?.perfil;

  switch (perfil) {
    case 'A':
      return <DashboardMap />;
    case 'O':
      return <DashboardMap />;
    case 'V':
      return <DashboardMap />;
    default:
      return <DashboardPageVisualizador />;
  }
}
