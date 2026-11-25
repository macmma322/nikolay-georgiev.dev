/**
 * Presence state machine for the central standing avatar (`button[data-me]`)
 * inside the street stage.
 *
 * Separates subtle human presence (multi-phase stance shifts, saccadic and
 * spontaneous blinking, crowd tracking, and contextual acknowledgements) from
 * the pedestrian simulation loop while avoiding conflicting transform updates.
 *
 * All visual output is expressed exclusively via `data-*` attributes on the
 * avatar button (`data-head`, `data-glance`, `data-stance`, `data-blink`) so
 * the site's strict Content Security Policy (zero inline styles) holds and
 * CSS owns every transition curve.
 */

export type AvatarHead = '' | 'left' | 'right' | 'nod';
export type AvatarGlance = '' | 'soft' | 'near' | 'down' | 'up';
export type AvatarStance = 'center' | 'left' | 'right';
export type AvatarPresenceState = 'neutral' | 'glance' | 'acknowledge' | 'inspect';

export interface AvatarPresenceOptions {
  avatar: HTMLElement | null;
  random: () => number;
}

export interface AvatarPresenceSnapshot {
  mode: AvatarPresenceState;
  head: AvatarHead;
  glance: AvatarGlance;
  stance: AvatarStance;
  blinking: boolean;
}

export interface AvatarPresenceController {
  /** Advance presence timers and return whether an automatic glance wants a target. */
  tick(clock: number, still: boolean): { wantsTarget: boolean };
  /** Direct a gentle glance toward a side and elevation (`soft`, `near`, `down`, `up`). */
  glance(
    clock: number,
    side: 'left' | 'right',
    kind: Exclude<AvatarGlance, ''>,
    seconds: number,
    force?: boolean,
  ): boolean;
  /** Perform a brief polite nod (`< 1 deg` rotation), optionally locking out ambient glances. */
  acknowledge(clock: number, seconds?: number, lockSeconds?: number): void;
  /** Clear dynamic presence attributes when reduced motion or still mode is active. */
  reset(): void;
  /** Diagnostic snapshot for automated tests. */
  snapshot(): AvatarPresenceSnapshot;
}

const STANCES: readonly AvatarStance[] = ['center', 'left', 'right'];

export function createAvatarPresence(options: AvatarPresenceOptions): AvatarPresenceController {
  const { avatar, random } = options;
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);

  let mode: AvatarPresenceState = 'neutral';
  let head: AvatarHead = '';
  let glanceKind: AvatarGlance = '';
  let stance: AvatarStance = 'center';
  let blinking = false;

  let headUntil = 0;
  let lockUntil = 0;
  let nextLook = between(2.6, 5.4);
  let nextBlink = between(2.2, 5.2);
  let blinkUntil = 0;
  let doubleBlinkAt = 0;
  let nextStance = between(6.5, 13);

  function applyHead(
    nextHead: AvatarHead,
    nextGlance: AvatarGlance,
    nextMode: AvatarPresenceState,
  ) {
    head = nextHead;
    glanceKind = nextGlance;
    mode = nextMode;
    if (!avatar) return;
    if (nextHead) avatar.dataset['head'] = nextHead;
    else delete avatar.dataset['head'];
    if (nextGlance) avatar.dataset['glance'] = nextGlance;
    else delete avatar.dataset['glance'];
  }

  function applyStance(next: AvatarStance) {
    stance = next;
    if (!avatar) return;
    if (next === 'center') delete avatar.dataset['stance'];
    else avatar.dataset['stance'] = next;
  }

  function setBlink(active: boolean) {
    blinking = active;
    if (!avatar) return;
    if (active) avatar.dataset['blink'] = '';
    else delete avatar.dataset['blink'];
  }

  function triggerBlink(clock: number, allowDouble: boolean) {
    setBlink(true);
    blinkUntil = clock + 0.13;
    doubleBlinkAt = allowDouble && random() < 0.18 ? clock + 0.24 : 0;
    nextBlink = clock + between(3.4, 8.2);
  }

  function reset() {
    applyHead('', '', 'neutral');
    applyStance('center');
    setBlink(false);
    headUntil = 0;
    lockUntil = 0;
    blinkUntil = 0;
    doubleBlinkAt = 0;
  }

  function glance(
    clock: number,
    side: 'left' | 'right',
    kind: Exclude<AvatarGlance, ''>,
    seconds: number,
    force = false,
  ): boolean {
    if (!avatar) return false;
    if (!force && (clock < lockUntil || mode === 'acknowledge')) return false;
    const prevHead = head;
    const nextMode: AvatarPresenceState = kind === 'up' ? 'inspect' : 'glance';
    applyHead(side, kind, nextMode);
    headUntil = clock + seconds;
    if (force) lockUntil = Math.max(lockUntil, clock + Math.min(seconds, 1.4));
    // Natural human saccadic blink when shifting gaze across center.
    if (prevHead !== side && !blinking && clock > nextBlink - 2.2) {
      triggerBlink(clock, false);
    }
    return true;
  }

  function acknowledge(clock: number, seconds = 1.25, lockSeconds = 2.1) {
    if (!avatar) return;
    applyHead('nod', '', 'acknowledge');
    headUntil = clock + seconds;
    lockUntil = Math.max(lockUntil, clock + lockSeconds);
    nextLook = Math.max(nextLook, clock + seconds + between(2.4, 5.2));
  }

  function tick(clock: number, still: boolean): { wantsTarget: boolean } {
    if (!avatar) return { wantsTarget: false };
    if (still || document.documentElement.hasAttribute('data-avatar-still')) {
      if (head || glanceKind || stance !== 'center' || blinking) reset();
      return { wantsTarget: false };
    }

    // 1. Return head smoothly to resting neutral after glance/acknowledge completes.
    if (head && clock >= headUntil) {
      applyHead('', '', 'neutral');
      nextLook = Math.max(nextLook, clock + between(3.4, 8.6));
    }

    // 2. Subtle natural weight-shifting between resting stances (pivoted at boot soles).
    if (clock >= nextStance) {
      // Bias slightly toward returning to center after leaning left or right.
      const next =
        stance !== 'center' && random() < 0.6
          ? 'center'
          : STANCES[(STANCES.indexOf(stance) + 1 + (random() < 0.5 ? 0 : 1)) % STANCES.length]!;
      applyStance(next);
      nextStance = clock + between(7.5, 15.5);
    }

    // 3. Natural blinking with occasional double-blinks.
    if (blinking && clock >= blinkUntil) {
      setBlink(false);
      blinkUntil = 0;
    } else if (!blinking && doubleBlinkAt > 0 && clock >= doubleBlinkAt) {
      setBlink(true);
      blinkUntil = clock + 0.11;
      doubleBlinkAt = 0;
    } else if (!blinking && doubleBlinkAt === 0 && clock >= nextBlink) {
      triggerBlink(clock, true);
    }

    const wantsTarget = !head && clock >= lockUntil && clock >= nextLook;
    if (wantsTarget) {
      // Postpone next check slightly in case no walker is nearby right now.
      nextLook = clock + between(2.2, 4.6);
    }
    return { wantsTarget };
  }

  return {
    tick,
    glance,
    acknowledge,
    reset,
    snapshot: () => ({ mode, head, glance: glanceKind, stance, blinking }),
  };
}
