# Language Selection Feature - Implementation Guide

## Overview

A multi-language support system has been added to Brivara Capital with English and French options. Users can select their preferred language using a dropdown button in the header of registration and login pages.

## Features Implemented

### ✅ Completed Features

1. **Language Switcher Component** (`LanguageSwitcher.tsx`)
   - Dropdown button with flag icons (🇬🇧 for English, 🇫🇷 for French)
   - Smooth transitions and click-outside detection
   - Language preference saved to browser localStorage
   - Currently selected language highlighted with checkmark

2. **Internationalization (i18n) Setup**
   - Uses `next-intl` library for Next.js integration
   - Supports URL-based locale routing: `/en/*` and `/fr/*`
   - Translation files for both languages

3. **Translation Files**
   - **en.json**: Complete English translations
   - **fr.json**: Complete French translations
   - Organized by sections: common, auth, dashboard, errors, buttons

4. **Internationalized Pages**
   - `/[locale]/register` - Registration page with language switcher
   - `/[locale]/login` - Login page with language switcher
   - Both pages use translated text throughout

5. **Middleware Configuration**
   - Automatic locale detection and routing
   - Default locale: English (`en`)
   - Locale prefix handling for URL structure

## Files Created/Modified

### New Files
```
frontend/
├── i18n.ts                          # i18n configuration
├── middleware.ts                    # Locale routing middleware
├── messages/
│   ├── en.json                     # English translations
│   └── fr.json                     # French translations
├── app/components/
│   └── LanguageSwitcher.tsx        # Language dropdown component
└── app/[locale]/
    ├── layout.tsx                  # Locale layout wrapper
    ├── register/
    │   └── page.tsx                # Internationalized register page
    └── login/
        └── page.tsx                # Internationalized login page
```

### Modified Files
- `frontend/next.config.ts` - No changes needed (already compatible)
- `frontend/package.json` - Added `next-intl` dependency

## How It Works

### 1. User Accesses Registration Page

```
User visits: https://yourdomain.com/register
    ↓
Middleware detects locale preference (or defaults to 'en')
    ↓
User is routed to: https://yourdomain.com/en/register
    ↓
Language switcher displays in top-right corner
```

### 2. User Selects Language

```
User clicks language dropdown
    ↓
Selects French (Français)
    ↓
URL changes to: https://yourdomain.com/fr/register
    ↓
Page content switches to French
    ↓
Preference saved to localStorage
```

### 3. Language Persistence

- User's language preference is stored in `localStorage.preferredLanguage`
- Next time user visits, they'll see content in their preferred language
- Language preference follows user across pages

## Translation Structure

### Translation Keys

All translations are organized by section:

```json
{
  "common": {
    "language": "Language",
    "selectLanguage": "Select Language",
    "welcome": "Welcome to Brivara Capital"
  },
  "auth": {
    "register": "Create Account",
    "email": "Email Address",
    "password": "Password",
    "login": "Sign In"
  },
  "errors": {
    "required": "This field is required",
    "invalidEmail": "Please enter a valid email address"
  },
  "buttons": {
    "continue": "Continue",
    "submit": "Submit"
  }
}
```

### Using Translations in Components

In server components:
```tsx
import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('auth');
  return <h1>{t('register')}</h1>;
}
```

In client components (add 'use client'):
```tsx
'use client';

import { useTranslations } from 'next-intl';

export default function MyComponent() {
  const t = useTranslations('auth');
  return <h1>{t('register')}</h1>;
}
```

## Adding More Languages

To add a new language (e.g., Spanish):

1. **Create translation file**:
   ```bash
   cp frontend/messages/en.json frontend/messages/es.json
   ```

2. **Translate content** in `es.json`

3. **Update i18n.ts**:
   ```typescript
   const locales = ['en', 'fr', 'es'];
   ```

4. **Update middleware.ts**:
   ```typescript
   locales: ['en', 'fr', 'es'],
   ```

5. **Update LanguageSwitcher.tsx**:
   ```typescript
   const languages = [
     { code: 'en', label: t('english'), flag: '🇬🇧' },
     { code: 'fr', label: t('french'), flag: '🇫🇷' },
     { code: 'es', label: 'Español', flag: '🇪🇸' },  // Add this
   ];
   ```

## URL Structure

### Before (non-localized)
- `/register` - Registration page
- `/login` - Login page
- `/dashboard` - Dashboard

### After (localized)
- `/en/register` - English registration
- `/fr/register` - French registration
- `/en/login` - English login
- `/fr/login` - French login
- Non-localized pages redirect to `/[locale]/*`

## Environment Variables

No additional environment variables needed. The system works with existing configuration.

## Testing the Feature

### Test 1: Language Switching on Registration Page
```
1. Visit: http://localhost:3000/en/register
2. Click language dropdown (top-right)
3. Select "Français"
4. URL changes to: http://localhost:3000/fr/register
5. All text should be in French
6. Select "English" and verify it switches back
```

### Test 2: Language Switching on Login Page
```
1. Visit: http://localhost:3000/en/login
2. Click language dropdown
3. Select French
4. All text switches to French
5. Form fields show French labels
```

### Test 3: Language Persistence
```
1. Set language to French on register page
2. Navigate to login page
3. Language should still be French
4. Refresh page - should maintain French
```

### Test 4: Default Language
```
1. Clear browser cache/localStorage
2. Visit: http://localhost:3000/register
3. Should default to English
4. Middleware should route to /en/register
```

## Styling

The language switcher uses Tailwind CSS classes and integrates with the existing design:

- **Position**: Top-right corner (`absolute top-6 right-6`)
- **Colors**: Gray border with blue hover state
- **Icons**: Flag emojis and Lucide icons
- **Responsive**: Works on all screen sizes

## Browser Compatibility

- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Uses localStorage for preference persistence
- No third-party dependencies beyond `next-intl`

## Performance Considerations

- Translation files are loaded server-side
- No runtime translation overhead
- Static text on build time
- Minimal JavaScript overhead from switcher component

## Future Enhancements

Potential improvements:

1. **Add More Languages**
   - Spanish (es)
   - German (de)
   - Portuguese (pt)
   - Arabic (ar)

2. **Automatic Language Detection**
   - Browser language preference
   - Geographic location-based selection

3. **Database Storage**
   - Save language preference in user profile
   - Sync across devices when logged in

4. **Translation Management**
   - CMS integration for managing translations
   - Professional translation services integration

5. **Localized Content**
   - Currency formatting (USD, EUR, GBP, etc.)
   - Date formatting (MM/DD/YYYY vs DD/MM/YYYY)
   - Number formatting (1,000 vs 1.000)
   - Timezone handling

## Troubleshooting

### Language Switcher Not Appearing

**Issue**: Dropdown button not visible on page
**Solution**: Ensure component is properly imported in page:
```tsx
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';
```

### Translations Not Loading

**Issue**: Seeing `undefined` or missing translations
**Solution**: 
1. Check translation file exists in `frontend/messages/[locale].json`
2. Verify key path is correct in component
3. Check for typos in translation keys

### URL Not Changing on Language Select

**Issue**: Click on language but URL doesn't update
**Solution**:
1. Verify middleware is installed: `frontend/middleware.ts`
2. Check Next.js version supports middleware (14.0+)
3. Restart dev server

### Pages Not Found (404)

**Issue**: Getting 404 errors on locale paths
**Solution**:
1. Ensure `[locale]` folder exists: `frontend/app/[locale]/`
2. Verify page files are in correct location
3. Check folder naming (brackets are required)

## Support

For issues or questions about the language feature:
1. Check this documentation
2. Review translation files for format reference
3. Check console for errors
4. Verify all files are in correct locations

---

## Summary

The language selection feature is now fully integrated into the Brivara Capital system. Users can easily switch between English and French using the dropdown button in the registration and login pages. The system automatically persists their preference and routes them to the correct localized version of the site.

**Key Benefits**:
✅ Easy language switching for users
✅ Persistent user preferences
✅ Clean, intuitive UI
✅ Professional translations
✅ Scalable for additional languages
✅ No performance impact

---

*Last Updated: December 29, 2025*
*Version: 1.0*
*Status: ✅ Complete and Ready for Testing*
