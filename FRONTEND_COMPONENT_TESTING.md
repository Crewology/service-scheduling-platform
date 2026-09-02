# Frontend Component Testing

OlogyCrew uses **Vitest, jsdom, React Testing Library, and jest-dom** for rendered frontend component tests. The repository’s established Vitest include pattern is `server/**/*.test.ts`, so DOM component suites live in `server/` with the suffix `.component.test.ts` while importing the real component from `client/src/`.

Every DOM component suite must begin with:

```ts
// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
```

Tests should render the actual React component and assert visible copy, semantic roles, links, state attributes, and meaningful style-state classes. Source-string tests remain useful for route wiring and regression contracts, but they do not replace DOM rendering tests.

Current rendered coverage includes the shared adaptive direct/quote badge, provider Business Pulse metrics, and customer empty/recovery states. Run all component suites with:

```bash
npx vitest run server/*.component.test.ts
```
