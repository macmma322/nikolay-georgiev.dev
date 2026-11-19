export type FooterScenario = 'street' | 'cafe';

export const SCENARIO_SESSION_KEY = 'nikolay.footer.scene';
export const SCENARIO_OVERRIDE_KEY = 'ng-footer:scene';
export const STREET_TEST_KEY = 'ng-street:test';
export const CAFE_TEST_KEY = 'ng-cafe:test';

// Session-stable weighted distribution: Street 60%, Café 40%.
export const STREET_WEIGHT = 0.6;

const listeners = new Set<(scenario: FooterScenario) => void>();
let resolvedScenario: FooterScenario | undefined;

function isValidScenario(val: string | null | undefined): val is FooterScenario {
  return val === 'street' || val === 'cafe';
}

export function resolveInitialScenario(): {
  scenario: FooterScenario;
  testing: boolean;
  seed?: number | undefined;
} {
  if (typeof window === 'undefined') {
    return { scenario: 'street', testing: false };
  }

  let testing = false;
  let seed: number | undefined;

  try {
    const params = new URLSearchParams(window.location.search);
    const urlScene = params.get('scene');
    const urlSeed = params.get('seed');
    if (urlSeed && /^\d+$/.test(urlSeed)) seed = Number(urlSeed);

    const cafeTest = localStorage.getItem(CAFE_TEST_KEY);
    const streetTest = localStorage.getItem(STREET_TEST_KEY);
    const explicitOverride =
      localStorage.getItem(SCENARIO_OVERRIDE_KEY) ?? sessionStorage.getItem(SCENARIO_OVERRIDE_KEY);

    if (cafeTest !== null) {
      testing = true;
      if (cafeTest && /^\d+$/.test(cafeTest)) seed = Number(cafeTest);
      resolvedScenario = 'cafe';
      sessionStorage.setItem(SCENARIO_SESSION_KEY, 'cafe');
      return { scenario: 'cafe', testing, seed };
    }

    if (isValidScenario(urlScene)) {
      resolvedScenario = urlScene;
      sessionStorage.setItem(SCENARIO_SESSION_KEY, urlScene);
      if (streetTest !== null) {
        testing = true;
        if (streetTest && /^\d+$/.test(streetTest)) seed = Number(streetTest);
      }
      return { scenario: urlScene, testing, seed };
    }

    if (isValidScenario(explicitOverride)) {
      resolvedScenario = explicitOverride;
      sessionStorage.setItem(SCENARIO_SESSION_KEY, explicitOverride);
      if (streetTest !== null) {
        testing = true;
        if (streetTest && /^\d+$/.test(streetTest)) seed = Number(streetTest);
      }
      return { scenario: explicitOverride, testing, seed };
    }

    if (streetTest !== null) {
      testing = true;
      if (streetTest && /^\d+$/.test(streetTest)) seed = Number(streetTest);
      resolvedScenario = 'street';
      return { scenario: 'street', testing, seed };
    }

    const existing = sessionStorage.getItem(SCENARIO_SESSION_KEY);
    if (isValidScenario(existing)) {
      resolvedScenario = existing;
      return { scenario: existing, testing: false, seed };
    }

    const chosen: FooterScenario = Math.random() < STREET_WEIGHT ? 'street' : 'cafe';
    sessionStorage.setItem(SCENARIO_SESSION_KEY, chosen);
    resolvedScenario = chosen;
    return { scenario: chosen, testing: false, seed };
  } catch {
    if (!resolvedScenario) {
      resolvedScenario = Math.random() < STREET_WEIGHT ? 'street' : 'cafe';
    }
    return { scenario: resolvedScenario, testing, seed };
  }
}

export function getFooterScenario(): FooterScenario {
  if (!resolvedScenario) {
    return resolveInitialScenario().scenario;
  }
  return resolvedScenario;
}

export function setFooterScenario(next: FooterScenario) {
  resolvedScenario = next;
  try {
    sessionStorage.setItem(SCENARIO_SESSION_KEY, next);
  } catch {
    /* Private session */
  }
  for (const listener of listeners) listener(next);
}

export function toggleFooterScenario(): FooterScenario {
  const next: FooterScenario = getFooterScenario() === 'street' ? 'cafe' : 'street';
  setFooterScenario(next);
  return next;
}

export function observeFooterScenario(listener: (scenario: FooterScenario) => void): () => void {
  listeners.add(listener);
  listener(getFooterScenario());
  return () => {
    listeners.delete(listener);
  };
}
