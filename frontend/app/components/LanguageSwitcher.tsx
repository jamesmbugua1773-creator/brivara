'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supportedLocales = ['en', 'fr', 'pt'] as const;

  const languages = [
    { code: 'en', label: t('english'), flag: '🇬🇧' },
    { code: 'fr', label: t('french'), flag: '🇫🇷' },
    { code: 'pt', label: t('portuguese'), flag: '🇵🇹' },
  ];

  const currentLanguage = languages.find((lang) => lang.code === locale);

  const handleLanguageChange = (newLocale: string) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    // Persist user's language preference for middleware / locale-less routes
    try {
      document.cookie = `NEXT_LOCALE=${encodeURIComponent(newLocale)}; Path=/; SameSite=Lax`;
    } catch {}

    const path = pathname || '/';
    const segments = path.split('/');

    // If the current path starts with a locale segment, replace it; otherwise prefix it.
    const hasLocalePrefix = supportedLocales.includes((segments[1] as any) ?? '');
    const newPathname = hasLocalePrefix
      ? ['/', newLocale, ...segments.slice(2)].join('/').replace(/\/+/g, '/')
      : `/${newLocale}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/+/g, '/');

    router.push(newPathname);
    setIsOpen(false);

    // Store user's language preference
    localStorage.setItem('preferredLanguage', newLocale);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors"
        aria-label={t('selectLanguage')}
        title={t('selectLanguage')}
      >
        <span className="text-lg">{currentLanguage?.flag}</span>
        <span className="text-sm font-medium text-gray-700">{currentLanguage?.code.toUpperCase()}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                  locale === language.code ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="text-lg">{language.flag}</span>
                <span className="flex-1">{language.label}</span>
                {locale === language.code && <span className="ml-2 text-blue-600">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
