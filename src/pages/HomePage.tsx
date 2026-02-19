import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/types';
import HomePageAdmin from '@/pages/home/HomePageAdmin';
import HomePageOperador from '@/pages/home/HomePageOperador';
import HomePageVisualizador from '@/pages/home/HomePageVisualizador';

export default function HomePage() {
  const { user } = useAuth();
  const perfil: UserProfile | undefined = user?.perfil;

  switch (perfil) {
    case 'A':
      return <HomePageAdmin />;
    case 'O':
      return <HomePageOperador />;
    case 'V':
      return <HomePageVisualizador />;
    default:
      return <HomePageVisualizador />;
  }
}
