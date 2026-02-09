import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt.json';
import enUS from './locales/en.json';
import esES from './locales/es.json';

export const LANGUAGES = [
  { code: 'pt', name: 'Português', flag: '/flags/pt.svg' },
  { code: 'en', name: 'English', flag: '/flags/en.svg' },
  { code: 'es', name: 'Español', flag: '/flags/es.svg' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

const savedLanguage = localStorage.getItem('language') || 'pt';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pt: { translation: ptBR },
      en: { translation: enUS },
      es: { translation: esES },
    },
    lng: savedLanguage,
    fallbackLng: 'pt',
    interpolation: {
      escapeValue: true,
    },
  });

export const changeLanguage = (lang: LanguageCode) => {
  i18n.changeLanguage(lang);
  localStorage.setItem('language', lang);
};

export default i18n;
