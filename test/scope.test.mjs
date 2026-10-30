// Pins the npm scope rename — @flashylabs/wdk-staking-kit moved to
// @flashyfinancial/wdk-staking-kit (finance packages move to the
// FlashyFinancial scope) — so the new name cannot quietly drift back to the
// old one in the places a consumer actually reads: the manifest, the
// published-facing README text, the type-level test's import, and the
// deprecation workflow that announces the move on the old scope.
//
// Deliberately NOT asserted here: `flashyos.roles.json`'s `repositories[].url`
// and `package.json`'s `repository`/`homepage`/`bugs` fields, which name the
// GitHub *repository location* (`github.com/FlashyLabs/wdk-staking-kit`) —
// a separate fact from the npm scope, and this is a scope rename, not a repo
// move. CHANGELOG.md's historical entries also legitimately keep the old
// scope, since they describe what shipped under it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
const bugReport = readFileSync(join(ROOT, '.github/ISSUE_TEMPLATE/bug_report.md'), 'utf8')
const consumer = readFileSync(join(ROOT, 'test-types/consumer.ts'), 'utf8')
const testTypesTsconfig = JSON.parse(readFileSync(join(ROOT, 'test-types/tsconfig.json'), 'utf8'))
const publishWorkflow = readFileSync(join(ROOT, '.github/workflows/publish.yml'), 'utf8')
const deprecateWorkflow = readFileSync(join(ROOT, '.github/workflows/deprecate-old-scope.yml'), 'utf8')

const NEW_SCOPE = '@flashyfinancial/wdk-staking-kit'
const OLD_SCOPE = '@flashylabs/wdk-staking-kit'

test('package.json publishes under the new scope', () => {
  assert.equal(pkg.name, NEW_SCOPE)
})

test('package.json declares a public publishConfig', () => {
  assert.equal(pkg.publishConfig?.access, 'public')
  assert.equal(pkg.publishConfig?.registry, 'https://registry.npmjs.org/')
})

test('package.json\'s GitHub-facing fields are untouched by the scope rename', () => {
  // This is a scope rename, not a repo move — the repository really does
  // live at github.com/FlashyLabs/wdk-staking-kit.
  assert.match(pkg.repository.url, /FlashyLabs\/wdk-staking-kit/)
  assert.match(pkg.homepage, /FlashyLabs\/wdk-staking-kit/)
  assert.match(pkg.bugs.url, /FlashyLabs\/wdk-staking-kit/)
})

test('README install command and import statements use the new scope', () => {
  assert.ok(readme.includes(`npm install ${NEW_SCOPE}`), 'README install command still names the old scope')
  const importLines = [...readme.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1])
  assert.ok(importLines.length > 0, 'expected at least one import statement in README')
  for (const spec of importLines) assert.equal(spec, NEW_SCOPE, `README imports from "${spec}"`)
})

test('README\'s npm badges point at the new scope', () => {
  assert.ok(readme.includes(`img.shields.io/npm/v/${NEW_SCOPE}.svg`))
  assert.ok(readme.includes(`img.shields.io/npm/dm/${NEW_SCOPE}.svg`))
  assert.ok(readme.includes(`npmjs.com/package/${NEW_SCOPE}`))
})

test('README does not name the old scope as something to install or import today', () => {
  assert.ok(!readme.includes(`npm install ${OLD_SCOPE}`))
  assert.ok(!/from\s+'@flashylabs\/wdk-staking-kit'/.test(readme))
})

test('the bug report template uses the new scope', () => {
  assert.ok(bugReport.includes(`from '${NEW_SCOPE}'`))
  assert.ok(bugReport.includes(`npm ls ${NEW_SCOPE}`))
})

test('the type-level consumer test imports the new scope, resolved through the matching tsconfig path', () => {
  assert.match(consumer, /from\s+'@flashyfinancial\/wdk-staking-kit'/)
  assert.ok(Object.keys(testTypesTsconfig.compilerOptions.paths).includes(NEW_SCOPE))
})

test('the publish workflow targets the new scope', () => {
  assert.ok(publishWorkflow.includes(`${NEW_SCOPE}@`))
  assert.ok(publishWorkflow.includes('@flashyfinancial scope'))
  assert.ok(!publishWorkflow.includes(OLD_SCOPE))
})

test('the deprecate-old-scope workflow is workflow_dispatch only, never scheduled or push-triggered', () => {
  const lines = deprecateWorkflow.split('\n')
  const onIndex = lines.findIndex((l) => l.trim() === 'on:')
  assert.ok(onIndex !== -1, 'deprecate-old-scope.yml has no `on:` block')
  const nextTopLevel = lines.findIndex((l, i) => i > onIndex && /^\S/.test(l))
  const onBlock = lines.slice(onIndex + 1, nextTopLevel === -1 ? undefined : nextTopLevel).join('\n')
  assert.match(onBlock, /^\s*workflow_dispatch:\s*$/m, 'deprecate-old-scope.yml has no workflow_dispatch trigger')
  assert.ok(!onBlock.includes('schedule:'), 'deprecate-old-scope.yml must never run on a schedule')
  assert.ok(!onBlock.includes('push:'), 'deprecate-old-scope.yml must never run on push')
})

test('the deprecate-old-scope workflow runs exactly the documented npm deprecate command', () => {
  assert.ok(
    deprecateWorkflow.includes(`npm deprecate ${OLD_SCOPE}@* "moved to ${NEW_SCOPE}"`),
    'deprecate-old-scope.yml does not run the expected `npm deprecate` command',
  )
})

test('the deprecate-old-scope workflow reuses the existing npm secret rather than inventing a new one', () => {
  assert.match(deprecateWorkflow, /secrets\.NPM_TOKEN_FLASHYOS_CI \|\| secrets\.NPM_TOKEN/)
})
