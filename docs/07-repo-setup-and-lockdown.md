# 07 — Repo Setup & Lockdown

Covers Stage 0: scaffolding the project and **keeping the public repo write-protected so others can't change the code** (open-source: fork + PR allowed, direct changes not).

Current state (verified): `github.com/vicArc/kty` is **public**, owned by `vicArc`, **no commits**, default branch `main`. Local `C:\Projects\kty` is an initialized git repo with that remote. `gh` is authenticated as `vicArc`. Toolchain: Node v22.12.0, npm 11.0.0, gh 2.89.0.

**Decision:** repo stays **public**, **MIT-licensed**. The goal is "others can't change the code," which the open-source model already gives you.

## A. How write-protection works (read this first)

> **A public repo is not the same as a writable repo.** On GitHub, only the owner and accounts explicitly added as **collaborators** can push. Everyone else can read, **fork**, and open **pull requests** — none of which alter _your_ repository. A PR only changes your code if _you_ merge it. So the single most important "lockdown" action is simply: **don't add collaborators.** MIT licensing changes none of this — it governs what people may do with _their own copies_, not write access to yours.

The steps below add belt-and-suspenders protection on top of that default.

### A1. Add the MIT license

```
kty/LICENSE   ->   MIT, "Copyright (c) 2026 vicArc"
```

(Created in the repo root; edit the copyright holder/year to taste. `package.json` should set `"license": "MIT"`.)

### A2. Protect `main` (defense in depth, and for future collaborators)

Branch protection requires the branch to **exist**, so run this **after** the first push (S0.7). Using a **repo ruleset** (the modern mechanism):

```powershell
# requires a commit on main first (see section B/S0.7)
gh api -X POST repos/vicArc/kty/rulesets `
  -f name='protect-main' `
  -f target='branch' `
  -f enforcement='active' `
  -F conditions='{"ref_name":{"include":["refs/heads/main"],"exclude":[]}}' `
  -F rules='[{"type":"deletion"},{"type":"non_fast_forward"},{"type":"required_linear_history"},{"type":"pull_request","parameters":{"required_approving_review_count":1,"dismiss_stale_reviews_on_push":true,"require_code_owner_review":false,"required_review_thread_resolution":true}},{"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":true,"required_status_checks":[{"context":"build-and-test"}]}}]'
```

This blocks force-pushes and deletion of `main`, requires a PR with ≥1 approval, and requires the CI check `build-and-test` (from [doc 06](./06-testing-strategy.md)) to pass before merge.

Classic branch-protection equivalent (if you prefer it over rulesets):

```powershell
gh api -X PUT repos/vicArc/kty/branches/main/protection `
  -F required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' `
  -F required_status_checks='{"strict":true,"contexts":["build-and-test"]}' `
  -F enforce_admins=true `
  -F restrictions=null
```

> **Note on solo work:** requiring PR review on a one-person repo means you must open PRs to merge (you can't self-approve your own PR on GitHub free; either drop `required_approving_review_count` to `0` and rely on the status check, or merge via admin override). Recommended solo config: keep `non_fast_forward` + `required_status_checks`, set review count to `0`. Re-enable reviews when collaborators join.

### A3. Optional hardening

```powershell
gh api -X PATCH repos/vicArc/kty -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false -F delete_branch_on_merge=true
```

> I can execute A2–A3 on confirmation — adding rulesets is an outward-facing change, so I'll only run it when you say go (and it requires `main` to exist, i.e. after the first push). The MIT `LICENSE` (A1) is a local file I can add now.

## B. Project scaffold (Stage 0)

```
kty/
├─ docs/                     # this plan
├─ progress.md               # migration tracker
├─ package.json              # "type": "module"
├─ vite.config.js
├─ vitest.config.js
├─ playwright.config.js
├─ eslint.config.js          # flat config
├─ jsconfig.json             # checkJs for JSDoc hints (optional)
├─ .github/workflows/ci.yml
├─ .gitignore
├─ index.html                # dev harness / live editor host
├─ src/                      # see doc 01 layering
│  ├─ foundation/  data/  mobject/  animation/  scene/  camera/  render/  authoring/  export/
│  └─ index.js               # barrel
├─ tests/  ├─ unit/  ├─ parity/  ├─ visual/  └─ fixtures/
└─ reference/                # golden PNGs (Git LFS)
```

Dependencies:

```powershell
npm init -y
npm pkg set type=module
npm i three
npm i -D vite vitest @playwright/test pixelmatch pngjs eslint prettier
# rendering/text/tex/export libs added as their stages arrive:
#   mathjax-full (or katex), opentype.js, troika-three-text, paper, earcut,
#   culori, mp4-muxer
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:visual": "playwright test",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write ."
  }
}
```

## C. CI (`.github/workflows/ci.yml`)

The job name must match the `build-and-test` status check referenced in A2.

```yaml
name: ci
on:
  pull_request: { branches: [main] }
  push: { branches: [main] }
jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { lfs: true }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run test # -> reports/junit/unit.xml
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:visual # -> reports/junit/visual.xml
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: junit-and-diffs, path: reports/ }
```

## D. First-commit sequence (S0.7)

```powershell
# from C:\Projects\kty
git add .
git commit -m "Stage 0: project scaffold, tooling, CI, migration plan"
git branch -M main
git push -u origin main
# then apply A2 (branch protection needs main to exist) and verify:
gh repo view vicArc/kty --json visibility,defaultBranchRef
gh api repos/vicArc/kty/rulesets
```

After this, `main` is protected and CI gates every PR — the lockdown is complete.
