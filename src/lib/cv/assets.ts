import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import type { FontBytes } from './pdf';

/**
 * Build-time inputs for the CV: the font files (the page links the same
 * files for the preview and the Generate button) and the portrait, cropped
 * to head and shoulders from the About page's photo.
 */

export const FONT_FILES = {
  regular: '400Regular/TikTokSans_400Regular.ttf',
  semibold: '600SemiBold/TikTokSans_600SemiBold.ttf',
  bold: '700Bold/TikTokSans_700Bold.ttf',
} as const;

const fontDir = join(process.cwd(), 'node_modules/@expo-google-fonts/tiktok-sans');

export async function fontBytes(): Promise<FontBytes> {
  const entries = await Promise.all(
    Object.entries(FONT_FILES).map(
      async ([key, file]) => [key, new Uint8Array(await readFile(join(fontDir, file)))] as const,
    ),
  );
  return Object.fromEntries(entries) as FontBytes;
}

let photo: Promise<Uint8Array> | undefined;

/** 4:5 head-and-shoulders crop of the 1200 × 1500 portrait, as a JPEG (pdf-lib embeds JPEG and PNG). */
export function portraitJpeg(): Promise<Uint8Array> {
  photo ??= sharp(join(process.cwd(), 'src/assets/media/about/portrait.webp'))
    .extract({ left: 150, top: 60, width: 900, height: 1125 })
    .resize(480, 600)
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer()
    .then((b) => new Uint8Array(b));
  return photo;
}
