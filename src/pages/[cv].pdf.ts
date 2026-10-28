import type { APIRoute, GetStaticPaths } from 'astro';
import { cv } from '@/data/cv';
import type { Locale } from '@/i18n';
import { fontBytes, portraitJpeg } from '@/lib/cv/assets';
import { cvFile, type Mode } from '@/lib/cv/doc';
import { cvDocs } from '@/lib/cv/load';
import { cvPdf } from '@/lib/cv/pdf';

/**
 * The ready-made CVs, written at build time by the same code the Generate
 * button runs in the browser: the general CV in each language, as the
 * portfolio version and as the application (ATS) version.
 * Nikolay-Georgiev-CV.pdf is the address older links use; it stays the
 * English portfolio CV.
 */
const files: [Locale, Mode, string][] = [
  ['en', 'portfolio', cvFile('en')],
  ['bg', 'portfolio', cvFile('bg')],
  ['en', 'ats', cvFile('en', 'general', 'ats')],
  ['bg', 'ats', cvFile('bg', 'general', 'ats')],
  ['en', 'portfolio', 'Nikolay-Georgiev-CV.pdf'],
];

export const getStaticPaths = (() =>
  files.map(([locale, mode, file]) => ({
    params: { cv: file.replace(/\.pdf$/, '') },
    props: { locale, mode },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ locale: Locale; mode: Mode }> = async ({ props }) => {
  const doc = (await cvDocs())[props.locale]['general']!;
  const [fonts, photo] = await Promise.all([fontBytes(), portraitJpeg()]);
  // The CV's revision date, not the build's.
  const date = new Date(`${cv.updated}T00:00:00Z`);
  const bytes = await cvPdf(doc, { fonts, photo }, props.mode, date);
  return new Response(bytes as Uint8Array<ArrayBuffer>, {
    headers: { 'Content-Type': 'application/pdf' },
  });
};
