import { Play } from 'lucide-react';
import { getAppleTvUrl } from '../ShowService';

interface OpenInAppleTvButtonProps {
  showId: string;
}

// Plain anchor on purpose: tv.apple.com is a universal link, so on iOS/macOS
// the tap is handed to the Apple TV app instead of loading the web page.
export async function OpenInAppleTvButton({ showId }: OpenInAppleTvButtonProps) {
  const appleTvUrl = await getAppleTvUrl(showId);
  if (!appleTvUrl) return null;

  return (
    <div className='text-center mt-2'>
      <a
        href={appleTvUrl}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-flex items-center gap-2 rounded-md bg-black/40 px-3 py-1 text-lg font-semibold text-white shadow hover:bg-black/60'
      >
        <Play className='h-4 w-4 fill-current' />
        Open in Apple TV
      </a>
    </div>
  );
}
