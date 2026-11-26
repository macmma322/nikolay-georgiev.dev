/** Runtime frame registration in each horizontal strip. Contacts are normalized
 * coordinates measured on the resized cells. ctx.drawImage crops one cell. */
export type CharacterState =
  | 'idle'
  | 'breathe'
  | 'blink'
  | 'look-around'
  | 'walk-left'
  | 'walk-right'
  | 'stop'
  | 'turn'
  | 'lean'
  | 'sit'
  | 'phone'
  | 'typing'
  | 'inspect'
  | 'interact'
  | 'peek'
  | 'react'
  | 'exit';

export const clips = {
  standing: { frames: 1, contact: 0.997 },
  // Filmed clips (scripts/avatar-film.mjs): same framing as the drawings they replaced.
  walk: { frames: 29, contact: 0.99 },
  turn: { frames: 4, contact: 0.99 },
  'lean-phone': { frames: 49, contact: 0.29 },
  phone: { frames: 49, contact: 0.61 },
  listen: { frames: 49, contact: 0.64 },
  typing: { frames: 49, contact: 0.99 },
  inspect: { frames: 49, contact: 0.99 },
} as const;

export type Clip = keyof typeof clips;
const cache = new Map<Clip, Promise<HTMLImageElement>>();
export function loadClip(clip: Clip) {
  let result = cache.get(clip);
  if (!result) {
    const image = new Image();
    image.src = '/avatar/' + clip + '.webp';
    result = image
      .decode()
      .then(() => image)
      .catch((error: unknown) => {
        cache.delete(clip);
        throw error;
      });
    cache.set(clip, result);
  }
  return result;
}
