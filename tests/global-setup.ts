import { execFileSync } from 'child_process';

/**
 * Resets the backend database and re-seeds it before E2E tests run.
 * This ensures test data matches seed-data.ts constants exactly.
 *
 * Skip with: SKIP_DB_RESET=1 npx playwright test
 */
export default function globalSetup() {
  if (process.env.SKIP_DB_RESET) {
    console.log('[global-setup] Skipping DB reset (SKIP_DB_RESET is set)');
    return;
  }

  console.log('[global-setup] Resetting and re-seeding backend database...');
  try {
    execFileSync(
      'docker-compose',
      ['exec', '-T', 'backend', 'npx', 'prisma', 'migrate', 'reset', '--force'],
      { cwd: '/Users/yuezhu/projects/doooo/dooooBackend', stdio: 'pipe', timeout: 60000 },
    );
    console.log('[global-setup] Database reset complete.');
  } catch (err) {
    console.error('[global-setup] Database reset failed:', (err as Error).message);
    throw err;
  }
}
