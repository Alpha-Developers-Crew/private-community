import { FileIcon, Download } from 'lucide-react';

interface FilePreviewProps {
  url: string;
  fileName?: string;
  fileType?: string;
  className?: string;
}

export default function FilePreview({ url, fileName, fileType, className = '' }: FilePreviewProps) {
  const type = fileType || url.split('.').pop()?.toLowerCase() || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(type)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={`block ${className}`}>
        <img src={url} alt={fileName || 'Image'} className="max-w-full rounded-lg max-h-96 object-cover" />
      </a>
    );
  }

  if (type === 'mp4' || type === 'webm') {
    return (
      <video controls className={`max-w-full rounded-lg max-h-96 ${className}`}>
        <source src={url} />
      </video>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 bg-surface-800 rounded-lg hover:bg-surface-700 transition-colors ${className}`}
    >
      <FileIcon className="w-5 h-5 text-primary-400" />
      <span className="text-sm text-surface-300 truncate flex-1">{fileName || url.split('/').pop()}</span>
      <Download className="w-4 h-4 text-surface-400" />
    </a>
  );
}
