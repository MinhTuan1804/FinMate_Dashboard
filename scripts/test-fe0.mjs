import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { categorySlugError } from '../src/shared/catalogValidation.ts';

test('Category slugs accepted by the backend remain editable in the UI', () => {
  for (const value of ['food', 'eating_out', 'category2', '2', '_', 'a'.repeat(100)]) {
    assert.equal(categorySlugError(value), '', `Valid backend slug rejected: ${value}`);
  }
});

test('Category slugs reject hyphens, spaces, accents, uppercase and oversized values', () => {
  for (const value of ['', 'eating-out', 'eating out', 'Ăn_uống', 'Food', 'a'.repeat(101)]) {
    assert.ok(categorySlugError(value), `Invalid backend slug accepted: ${value}`);
  }
});

test('Vite watches source but ignores a real browser-cache directory', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const probe = await mkdtemp(join(root, '.chrome-qa-regression-'));
  let server;
  try {
    await writeFile(join(probe, 'cache.db'), 'browser-cache-regression');
    server = await createServer({ root, logLevel: 'silent', server: { middlewareMode: true } });
    await new Promise(resolveReady => {
      const timer = setTimeout(resolveReady, 1500);
      server.watcher.once('ready', () => { clearTimeout(timer); resolveReady(); });
    });
    const watched = Object.keys(server.watcher.getWatched()).map(path => resolve(path));
    assert.ok(watched.includes(resolve(root, 'src')), 'Source watcher must be active');
    assert.ok(!watched.some(path => path === resolve(probe) || path.startsWith(resolve(probe) + sep)), 'Browser cache must not be watched');
  } finally {
    await server?.close();
    // The recursive removal is confined to the test-created folder under this repo.
    assert.ok(resolve(probe).startsWith(resolve(root) + sep));
    await rm(probe, { recursive: true, force: true });
  }
});
