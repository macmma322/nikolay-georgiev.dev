import type { APIRoute } from 'astro';
import text from '../../../blueprint/CLAUDE.md?raw';

// The downloadable blueprint. blueprint/CLAUDE.md is the single source: the
// page renders it, this route serves it byte for byte.
export const GET: APIRoute = () =>
  new Response(text, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
