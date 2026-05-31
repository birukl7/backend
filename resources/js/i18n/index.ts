import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import am from './locales/am';
import ti from './locales/ti';
import om from './locales/om';

const savedLang = localStorage.getItem('app_language') ?? 'en';

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        am: { translation: am },
        ti: { translation: ti },
        om: { translation: om },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

document.documentElement.lang = savedLang;

export default i18n;
