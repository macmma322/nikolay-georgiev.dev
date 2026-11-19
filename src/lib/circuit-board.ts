type Point = readonly [number, number];
type Tone = 0 | 1 | 2;

export const circuitWidth = 1440;
export const circuitHeight = 300;

export type Trace = {
  points: readonly Point[];
  tone: Tone;
  feed?: readonly Point[];
};

export function makeCircuitBoard(seed: number) {
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const traces: Trace[] = [];
  for (const side of [0, 1]) {
    const p = (x: number, y: number): Point => [side === 0 ? x : circuitWidth - x, y];
    for (let lane = 0; lane < 10; lane++) {
      const y = 33 + lane * 26 + Math.round(random() * 7);
      const elbow = 105 + Math.round(random() * 140) + (lane % 4) * 50;
      const bevel = (lane % 2 === 0 ? 1 : -1) * (12 + Math.round(random() * 19));
      const step = Math.abs(bevel);
      const reach = 422 + Math.round(random() * 244);
      const tone: Tone = lane % 4 === 0 ? 2 : lane % 3 === 0 ? 1 : 0;
      const junction = elbow + step + 27;
      const end = Math.max(junction + 30, reach);
      const feed = [p(-5, y), p(elbow, y), p(elbow + step, y + bevel)];
      traces.push({
        points: [...feed, p(junction, y + bevel), p(end, y + bevel)],
        tone,
      });
      if (lane % 3 !== 1) {
        const rise = lane < 5 ? 24 : -24;
        traces.push({
          points: [
            p(junction, y + bevel),
            p(junction + 24, y + bevel + rise),
            p(end + 24, y + bevel + rise),
          ],
          tone: tone === 0 ? 1 : tone,
          feed,
        });
      }
    }
  }
  // Short, disconnected contact pairs keep the space between both banks open.
  for (let row = 0; row < 4; row++) {
    const y = 96 + row * 38;
    traces.push({
      points: [
        [677, y],
        [688, y],
        [700, y - 12],
      ],
      tone: 0,
    });
    traces.push({
      points: [
        [763, y + 12],
        [752, y + 12],
        [740, y],
      ],
      tone: 2,
    });
  }
  return traces;
}

/** Long traces with staggered 45° turns form the full-viewport circuit field. */
export const backdropHeight = 640;

export function makeBackdropBoard(seed: number): Trace[] {
  const random = (range: number) => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return Math.floor((seed / 4294967296) * range);
  };

  return Array.from({ length: 28 }, (_, lane) => {
    const y = 48 + lane * 19 + random(8);
    const lead = 165 + random(420);
    const bend = 24 + random(33);
    const middle = lead + bend + 110 + random(195);
    const rise = lane % 4 < 2 ? bend : -bend;
    const tail = Math.min(middle + bend + 90 + random(150), 1280);
    const end = tail + 28 + random(153);
    const points: Point[] = [
      [lead - 110 - random(460), y],
      [lead, y],
      [lead + bend, y + rise],
      [middle, y + rise],
      [middle + bend, y],
      [tail, y],
      [tail + 22, y + (lane < 14 ? 22 : -22)],
      [end + 22, y + (lane < 14 ? 22 : -22)],
    ];

    return {
      points: lane % 2 === 0 ? points : points.reverse(),
      tone: lane % 7 === 0 ? 2 : lane % 3 === 0 ? 1 : 0,
    };
  });
}
