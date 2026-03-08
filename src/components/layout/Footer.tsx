import { useTranslation } from 'react-i18next';
import juliusLogo from '@/assets/julius-xpt-976-TW.png';

const APP_VERSION = '1.0.0';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto h-10 bg-footer border-t border-footer-border flex items-center justify-between px-4 text-sm text-footer-foreground">
      <div className="flex items-center gap-2">
        <img
          src={juliusLogo}
          alt="Julius"
          className="h-6 w-auto object-contain"
        />
        <span>•</span>
        <span>© {currentYear} {t('footer.copyright')}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span>{t('footer.version')} {APP_VERSION}</span>
      </div>
    </footer>
  );
}
