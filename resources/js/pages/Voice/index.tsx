"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import VoicePanel from '@/components/voice/voice-panel';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Call Center', href: '/voice' },
];

export default function VoiceIndex() {
  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title="Call Center - Voice Calling" />
      <div className="w-full px-3 pb-8 pt-4 sm:px-6 lg:px-8">
        <VoicePanel variant="full" />
      </div>
    </AppLayout>
  );
}
