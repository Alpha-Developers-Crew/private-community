import { clsx } from 'clsx';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'away' | 'offline';
  className?: string;
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
const statusSizes = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5', xl: 'w-4 h-4' };

export default function Avatar({ src, name, size = 'md', status, className }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';
  const colors = ['bg-primary-600', 'bg-purple-600', 'bg-pink-600', 'bg-amber-600', 'bg-cyan-600', 'bg-emerald-600'];
  const colorIndex = name?.length ? name.charCodeAt(0) % colors.length : 0;

  return (
    <div className={clsx('relative inline-flex shrink-0', className)}>
      {src ? (
        <img src={src} alt={name} className={clsx(sizes[size], 'rounded-full object-cover')} />
      ) : (
        <div className={clsx(sizes[size], 'rounded-full flex items-center justify-center font-medium text-white', colors[colorIndex])}>
          {initial}
        </div>
      )}
      {status && (
        <span className={clsx(
          'absolute bottom-0 right-0 rounded-full border-2 border-surface-900',
          statusSizes[size],
          status === 'online' ? 'bg-emerald-500' : status === 'away' ? 'bg-amber-500' : 'bg-surface-500'
        )} />
      )}
    </div>
  );
}
