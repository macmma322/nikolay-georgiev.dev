import type { APIRoute } from 'astro';
import text from '../../../blueprint/LICENSE?raw';

export const GET: APIRoute = () =>
  new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
