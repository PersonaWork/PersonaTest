'use client';

import { Button } from '@/components/ui';

export default function LoginError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        <p className="text-slate-400">We couldn&apos;t load the login page. Please try again.</p>
        <Button onClick={reset}>Try Again</Button>
      </div>
    </div>
  );
}
