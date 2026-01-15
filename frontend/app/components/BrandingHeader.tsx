"use client";

import Image from 'next/image';
import logo from '@/app/assets/WhatsApp_Image_2025-12-29_at_13.04.28-removebg-preview.png';
import { useTranslations } from 'next-intl';

export function BrandingHeader(
  { role, size = 'md' }: { role?: string | null; size?: 'md' | 'lg' } = {}
) {
  const common = useTranslations('common');
  const logoSize = size === 'lg' ? 192 : 96;
  const logoClassName = size === 'lg' ? 'w-48 h-auto' : 'w-24 h-auto';

  return (
    <div className="mb-6 pb-6 border-b border-slate-800">
      <div className="flex flex-col items-center text-center">
        <Image 
          src={logo} 
          alt={common('logoAlt')}
          width={logoSize}
          height={logoSize}
          className={`${logoClassName} brightness-0 invert`}
          priority
        />
        <p className="mt-2 text-xs text-gray-400 italic">{common('tagline')}</p>
        {role && (
          <div className="mt-2 text-xs text-gray-400">
            {common('role')}: <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-gray-200">{role}</span>
          </div>
        )}
      </div>
    </div>
  );
}
