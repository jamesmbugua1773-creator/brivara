"use client";

import { useTranslations } from 'next-intl';

export default function TestPage() {
  const common = useTranslations('common');
  return <div>{common('testPageWorks')}</div>;
}
