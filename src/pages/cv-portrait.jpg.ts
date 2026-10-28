import type { APIRoute } from 'astro';
import { portraitJpeg } from '@/lib/cv/assets';

/** The CV's photo: the preview shows it and the Generate button embeds it. */
export const GET: APIRoute = async () =>
  new Response((await portraitJpeg()) as Uint8Array<ArrayBuffer>, {
    headers: { 'Content-Type': 'image/jpeg' },
  });
