export type QualityTier = 'high' | 'balanced' | 'low';
export type QualityPreference = QualityTier | 'auto';
export type FramePriority = 'high' | 'normal' | 'low';
export type FrameTask = (now: number, dt: number) => void;

interface TaskEntry {
  task: FrameTask;
  priority: FramePriority;
}

const QUALITY_KEY = 'nikolay.runtime.quality';
const ORDER: readonly FramePriority[] = ['high', 'normal', 'low'];

const entries = new Set<TaskEntry>();
const qualityListeners = new Set<(tier: QualityTier) => void>();

let request = 0;
let lastFrameAt = 0;
let meanFrameMs = 16.6;
let slowSeconds = 0;
let fastSeconds = 0;
let lastSwitchAt = -Infinity;

function detectInitialTier(): QualityTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'high';
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData) return 'low';
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory ?? 8;
  if (cores <= 2 || mem <= 2) return 'low';
  if (cores <= 4 || mem <= 4) return 'balanced';
  return 'high';
}

function readPreference(): QualityPreference {
  if (typeof window === 'undefined') return 'auto';
  try {
    const saved = localStorage.getItem(QUALITY_KEY);
    if (saved === 'high' || saved === 'balanced' || saved === 'low' || saved === 'auto') {
      return saved;
    }
  } catch {
    // Storage may be unavailable in restricted sessions.
  }
  return 'auto';
}

let preference: QualityPreference = readPreference();
let currentTier: QualityTier = preference === 'auto' ? detectInitialTier() : preference;

function syncRootAttribute() {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset['quality'] = currentTier;
  }
}

syncRootAttribute();

function applyTier(next: QualityTier) {
  if (next === currentTier) return;
  currentTier = next;
  syncRootAttribute();
  for (const listener of qualityListeners) listener(currentTier);
}

export function getQualityTier(): QualityTier {
  return currentTier;
}

export function getQualityPreference(): QualityPreference {
  return preference;
}

export function setQualityPreference(next: QualityPreference) {
  preference = next;
  try {
    if (next === 'auto') localStorage.removeItem(QUALITY_KEY);
    else localStorage.setItem(QUALITY_KEY, next);
  } catch {
    // Keep in-memory preference when storage is blocked.
  }
  slowSeconds = 0;
  fastSeconds = 0;
  applyTier(next === 'auto' ? detectInitialTier() : next);
}

export function observeQualityTier(listener: (tier: QualityTier) => void) {
  qualityListeners.add(listener);
  listener(currentTier);
  return () => {
    qualityListeners.delete(listener);
  };
}

function monitorFrameBudget(now: number, rawDelta: number) {
  if (preference !== 'auto') return;
  // Ignore tab-resume jumps or inactive pauses.
  if (rawDelta <= 0 || rawDelta > 150) return;
  meanFrameMs += (rawDelta - meanFrameMs) * 0.08;
  const seconds = rawDelta / 1000;
  const cooldownMet = now - lastSwitchAt >= 8000;

  if (meanFrameMs > 34) {
    slowSeconds += seconds;
    fastSeconds = 0;
    if (slowSeconds >= 2.5 && cooldownMet) {
      slowSeconds = 0;
      lastSwitchAt = now;
      if (currentTier === 'high') applyTier('balanced');
      else if (currentTier === 'balanced') applyTier('low');
    }
  } else if (meanFrameMs < 19.5) {
    fastSeconds += seconds;
    slowSeconds = 0;
    if (fastSeconds >= 6 && cooldownMet) {
      fastSeconds = 0;
      lastSwitchAt = now;
      if (currentTier === 'low') applyTier('balanced');
      else if (currentTier === 'balanced' && detectInitialTier() === 'high') applyTier('high');
    }
  } else {
    slowSeconds = Math.max(0, slowSeconds - seconds * 0.5);
    fastSeconds = 0;
  }
}

function frame(now: number) {
  request = 0;
  const rawDelta = lastFrameAt ? now - lastFrameAt : 16.6;
  lastFrameAt = now;
  const dt = Math.min(0.05, Math.max(0, rawDelta / 1000));
  monitorFrameBudget(now, rawDelta);

  for (const priority of ORDER) {
    for (const entry of entries) {
      if (entry.priority === priority) entry.task(now, dt);
    }
  }
  if (entries.size && !request) request = requestAnimationFrame(frame);
}

/**
 * Shared frame scheduler for interactive visual subsystems.
 * Suspends completely (zero rAFs) when no subscribers remain active.
 */
export function watchCircuitClock(
  task: FrameTask,
  options?: { priority?: FramePriority },
): () => void {
  const entry: TaskEntry = { task, priority: options?.priority ?? 'normal' };
  entries.add(entry);
  if (!request) {
    lastFrameAt = performance.now();
    request = requestAnimationFrame(frame);
  }
  return () => {
    entries.delete(entry);
    if (!entries.size) {
      cancelAnimationFrame(request);
      request = 0;
      lastFrameAt = 0;
    }
  };
}

// ---------- Shared passive scroll pulse (zero layout reads) ----------
let scrollUsers = 0;
let lastScrollY = 0;
let scrollImpulse = 0;
let scrollOffset = 0;

function onScroll() {
  const y = window.scrollY;
  const delta = Math.abs(y - lastScrollY);
  lastScrollY = y;
  scrollOffset = y;
  if (delta > 0) {
    scrollImpulse = Math.min(1, scrollImpulse + Math.min(delta / 260, 0.42));
  }
}

export function watchScrollEnergy() {
  if (scrollUsers++ === 0 && typeof window !== 'undefined') {
    lastScrollY = window.scrollY;
    scrollOffset = lastScrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  return () => {
    if (--scrollUsers === 0 && typeof window !== 'undefined') {
      window.removeEventListener('scroll', onScroll);
      scrollImpulse = 0;
    }
  };
}

export function sampleScrollEnergy(dt: number) {
  const value = scrollImpulse;
  if (scrollImpulse > 0.001) {
    scrollImpulse *= Math.exp(-dt / 0.36);
  } else {
    scrollImpulse = 0;
  }
  return { impulse: value, offset: scrollOffset };
}
