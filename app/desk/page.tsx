import { redirect } from 'next/navigation';

// The desk hero now lives at the public homepage (/) — this only exists so
// old bookmarks/links to /desk still land somewhere.
export default function DeskRedirect() {
  redirect('/');
}
