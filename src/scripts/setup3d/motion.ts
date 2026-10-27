/**
 * Time-based tweens for the /setup stages, one per named channel.
 *
 * Starting a tween on a channel replaces the one running there, so rapid
 * clicks never stack animations: the newest request wins and starts from
 * wherever the previous one left the scene. Every tween resolves its promise,
 * true when it reached its end and false when it was replaced or cancelled,
 * so callers can chain steps without waiting on something that will never
 * finish. Progress comes from the frame timestamp, not a frame count: a slow
 * device drops frames but lands on time.
 */

export type Ease = (t: number) => number;

const inOut: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const ease = {
  /** Cubic in-out: camera travel, parts moving apart. */
  inOut,
  /** Cubic out: highlights and fades that should respond at once. */
  out: ((t) => 1 - (1 - t) ** 3) as Ease,
  /** Hold still for the first `delay` of the time, then cubic in-out: a step that follows another. */
  after:
    (delay: number): Ease =>
    (t) =>
      t <= delay ? 0 : inOut((t - delay) / (1 - delay)),
};

interface Run {
  ms: number;
  step: (k: number) => void;
  ease: Ease;
  start: number | null;
  done: (finished: boolean) => void;
}

export class Motion {
  private runs = new Map<string, Run>();

  /** request: ask the stage for a frame. instant: reduced motion, every tween jumps to its end. */
  constructor(
    private request: () => void,
    public instant = false,
  ) {}

  play(channel: string, ms: number, step: (k: number) => void, curve: Ease = ease.inOut) {
    this.cancel(channel);
    return new Promise<boolean>((done) => {
      if (this.instant || ms <= 0) {
        step(1);
        this.request();
        done(true);
        return;
      }
      this.runs.set(channel, { ms, step, ease: curve, start: null, done });
      this.request();
    });
  }

  /** Advance every tween to `now`; true while any is still running. */
  tick(now: number) {
    for (const [channel, run] of this.runs) {
      run.start ??= now;
      const t = Math.min(1, (now - run.start) / run.ms);
      run.step(run.ease(t));
      if (t >= 1) {
        this.runs.delete(channel);
        run.done(true);
      }
    }
    return this.runs.size > 0;
  }

  /** Stop a channel where it is. */
  cancel(channel: string) {
    const run = this.runs.get(channel);
    if (!run) return;
    this.runs.delete(channel);
    run.done(false);
  }

  /** Jump every channel to its end state (used before the stage goes away). */
  finish() {
    for (const [channel, run] of this.runs) {
      this.runs.delete(channel);
      run.step(1);
      run.done(true);
    }
  }

  has(channel: string) {
    return this.runs.has(channel);
  }

  get busy() {
    return this.runs.size > 0;
  }
}
