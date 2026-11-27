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
  // aspect: one cell's width over its height, so a cell can be placed before its image loads.
  standing: { frames: 1, contact: 0.997, aspect: 0.3423 },
  // Filmed clips (scripts/avatar-film.mjs): same framing as the drawings they replaced.
  walk: { frames: 29, contact: 0.99, aspect: 0.7813 },
  turn: { frames: 4, contact: 0.99, aspect: 0.5854 },
  'lean-phone': { frames: 49, contact: 0.29, aspect: 0.4633 },
  phone: { frames: 49, contact: 0.61, aspect: 0.5266 },
  listen: { frames: 49, contact: 0.64, aspect: 0.628 },
  typing: { frames: 49, contact: 0.99, aspect: 0.9167 },
  inspect: { frames: 49, contact: 0.99, aspect: 0.8041 },
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
