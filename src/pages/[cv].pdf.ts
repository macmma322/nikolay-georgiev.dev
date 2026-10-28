import type { APIRoute, GetStaticPaths } from 'astro';
import { fontBytes, portraitJpeg } from '@/lib/cv/assets';
import { cvFile } from '@/lib/cv/doc';
import { cvDocs } from '@/lib/cv/load';
import { cvPdf } from '@/lib/cv/pdf';
import { cv } from '@/data/cv';
import type { Locale } from '@/i18n';

/**
 * The fallback CVs, written at build time by the same code the Generate
 * button runs in the browser. Nikolay-Georgiev-CV.pdf is the address older
 * links use; it stays the English CV.
 */
export const getStaticPaths = (() =>
  (
    [
      ['en', cvFile('en')],
      ['bg', cvFile('bg')],
      ['en', 'Nikolay-Georgiev-CV.pdf'],
    ] as const
  ).map(([locale, file]) => ({
    params: { cv: file.replace(/\.pdf$/, '') },
    props: { locale },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ locale: Locale }> = async ({ props }) => {
  const doc = (await cvDocs())[props.locale];
  const [fonts, photo] = await Promise.all([fontBytes(), portraitJpeg()]);
  // The CV's revision date, not the build's.
  const bytes = await cvPdf(doc, { fonts, photo }, new Date(`${cv.updated}T00:00:00Z`));
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: { 'Content-Type': 'application/pdf' },
  });
};
