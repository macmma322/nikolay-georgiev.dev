import type { APIRoute, GetStaticPaths } from 'astro';
import { spriteName, spriteSvg } from '@/lib/sprite';

export const getStaticPaths: GetStaticPaths = () => [{ params: { name: spriteName } }];

export const GET: APIRoute = () =>
  new Response(spriteSvg, { headers: { 'Content-Type': 'image/svg+xml' } });
