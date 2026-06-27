# Version Footer Supabase Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the local app version in a footer and add `npm run update` to sync that version to Supabase.

**Architecture:** Store local version in `src/data/version.json`. Add a reusable semantic-version comparison helper with tests. Add a Node script that reads local version and `supabaseServiceKey.json`, then upserts/updates the `version/current` row in Supabase.

**Tech Stack:** React, TypeScript, Vite, Supabase JS, Node.js, Vitest.

## Global Constraints

- Do not store the Supabase service role key in frontend code.
- `npm run update` must not modify local files.
- Use table `version`, row `id = "current"`.
- Verify with `npx vitest run`, `npm run build`, and `npm run lint`.

---

### Task 1: Version Comparison

**Files:**
- Create: `scripts/version-utils.js`
- Create: `scripts/version-utils.test.js`

**Interfaces:**
- Produces: `compareVersions(localVersion, remoteVersion): -1 | 0 | 1`

- [ ] Write tests for greater, equal, lower, and invalid semantic versions.
- [ ] Run `npx vitest run scripts/version-utils.test.js` and confirm failure.
- [ ] Implement `compareVersions`.
- [ ] Run `npx vitest run scripts/version-utils.test.js` and confirm pass.

### Task 2: Version Data and Footer

**Files:**
- Create: `src/data/version.json`
- Modify: `src/pages/Home.tsx`

**Interfaces:**
- Consumes: `{ "version": "0.0.0" }`

- [ ] Add `src/data/version.json`.
- [ ] Import version JSON in `Home.tsx`.
- [ ] Render footer text `v0.0.0`.

### Task 3: Supabase Update Script

**Files:**
- Create: `scripts/update-version.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `supabaseServiceKey.json` with `supabaseUrl` and `serviceRoleKey`.
- Writes remote table `version`, row `current`.

- [ ] Add `update` script to `package.json`.
- [ ] Implement file reads, credential validation, Supabase client initialization, remote comparison, insert/update/no-op/warn behavior.
- [ ] Add `supabaseServiceKey.json` to `.gitignore`.

### Task 4: Verification

- [ ] Run `npx vitest run`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint`.
