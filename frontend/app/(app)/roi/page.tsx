"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ROIPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
