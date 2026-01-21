import { useTranslation } from 'react-i18next';

const APP_VERSION = '1.0.0';
const COMPANY_NAME = 'Sua Empresa';

export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="h-10 bg-footer border-t border-footer-border flex items-center justify-between px-4 text-sm text-footer-foreground">
      <div className="flex items-center gap-2">
        <span>{COMPANY_NAME}</span>
        <span>•</span>
        <span>© {currentYear} {t('footer.copyright')}</span>
      </div>
      
      <div className="flex items-center gap-2">
        <span>{t('footer.version')} {APP_VERSION}</span>
      </div>
    </footer>
  );
}
