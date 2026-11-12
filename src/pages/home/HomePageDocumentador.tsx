import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

export default function HomePageDocumentador() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const nome = user?.nome?.trim();

  return (
    <h1 className="text-lg font-normal tracking-tight">
      {nome ? t('home.welcomeDocumentador', { name: nome }) : t('home.welcomeDocumentadorFallback')}
    </h1>
  );
}
