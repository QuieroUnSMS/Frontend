'use client';

import dynamic from 'next/dynamic';

function BootScreen() {
  return (
    <div className="grid min-h-screen place-items-center text-sm tracking-[0.18em] text-muted-foreground">
      QUIEROUNSMS
    </div>
  );
}

const AppShell = dynamic(() => import('@/components/app-shell'), {
  ssr: false,
  loading: () => <BootScreen />,
});

export default function HomePage() {
  return <AppShell />;
}
