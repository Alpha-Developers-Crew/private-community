import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-surface-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}
