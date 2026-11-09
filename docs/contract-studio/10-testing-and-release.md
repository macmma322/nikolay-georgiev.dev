# 10. Testing and release

## Commands

Run from `contract-studio/`. They start a throwaway PostgreSQL and touch no other database.

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run test:e2e
```

`npm test` covers unit, integration, security, AI (the real SDK against a local mock server) and document tests. `npm run test:e2e` drives real Chromium with a virtual passkey through the full contract journey.

## Not yet done before release

- Independent security review: started, not finished.
- Railway provisioning and every check in [06-railway-deployment.md](06-railway-deployment.md).
- A real Claude call: all AI tests use the mock.
- Windows tunnel against a real Railway project.
- Lawyer review of the templates.

## Before pushing this branch

`origin` (`nikolay-georgiev.dev`) is a **public** repository. Pushing `contract-studio/`, these docs or the Caddy route publishes the workspace's existence, path and code. Moving `contract-studio/` to a private repository first is recommended; only the `Caddyfile` change has to reach the public repository. The portfolio's CI does not run this module's tests.
