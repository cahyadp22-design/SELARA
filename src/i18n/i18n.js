// src/i18n/i18n.js - Language Context & Provider
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import idTranslations from './id';
import enTranslations from './en';

const LANGUAGE_KEY = '@selara_language';

const translations = {
  id: idTranslations,
  en: enTranslations,
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('id'); // default Bahasa Indonesia
  const [isReady, setIsReady] = useState(false);

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLang && translations[savedLang]) {
          setLanguageState(savedLang);
        }
      } catch (error) {
        console.log('Error loading language preference:', error);
      } finally {
        setIsReady(true);
      }
    };
    loadLanguage();
  }, []);

  // Set language and persist to AsyncStorage
  const setLanguage = async (lang) => {
    if (!translations[lang]) return;
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    } catch (error) {
      console.log('Error saving language preference:', error);
    }
  };

  // Translation function
  const t = (key) => {
    return translations[language]?.[key] ?? translations['id']?.[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isReady }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export default LanguageContext;
