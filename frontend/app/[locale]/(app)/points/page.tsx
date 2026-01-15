"use client";

import React from 'react';
import { useTranslations } from 'next-intl';

export default function PointsPage() {
  const t = useTranslations('points');

  return (
    <div>
      <h1 className="text-3xl font-bold text-turquoise mb-4">{t('title')}</h1>
      <p className="text-gray-300">{t('placeholder')}</p>
    </div>
  );
}
