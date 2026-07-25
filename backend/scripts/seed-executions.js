/**
 * Fire many Newman executions quickly so pagination / filters can be tested.
 *
 * Usage (from backend/):
 *   node scripts/seed-executions.js --token <JWT> --collectionId 5 --environmentId 5 --count 25
 *
 * Or login first:
 *   node scripts/seed-executions.js --email you@example.com --password secret --collectionId 5 --environmentId 5 --count 25
 *
 * Options:
 *   --baseUrl   default http://localhost:5000
 *   --count     default 25
 *   --delayMs   pause between starts (default 500) so the server is not flooded
 *
 * Notes:
 * - Each call returns 202 immediately; Newman still runs async (up to ~10 min / run).
 * - Prefer a small postman-echo collection so runs finish quickly.
 * - With delayMs=500 and count=25, expect ~12s to enqueue; finishing all runs takes longer.
 */

const DEFAULT_BASE = 'http://localhost:5000';

function arg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function main() {
  const baseUrl = (arg('baseUrl', DEFAULT_BASE) || DEFAULT_BASE).replace(/\/$/, '');
  const count = Number(arg('count', '25')) || 25;
  const delayMs = Number(arg('delayMs', '500')) || 0;
  const collectionId = Number(arg('collectionId'));
  const environmentId = Number(arg('environmentId'));
  let token = arg('token', '');

  if (!Number.isInteger(collectionId) || collectionId < 1) {
    throw new Error('--collectionId is required');
  }
  if (!Number.isInteger(environmentId) || environmentId < 1) {
    throw new Error('--environmentId is required');
  }

  if (!token) {
    const email = arg('email');
    const password = arg('password');
    if (!email || !password) {
      throw new Error('Provide --token OR --email and --password');
    }
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const loginBody = await loginRes.json().catch(() => ({}));
    if (!loginRes.ok) {
      throw new Error(loginBody.message || `Login failed (${loginRes.status})`);
    }
    token = loginBody.token;
  }

  console.log(`Enqueueing ${count} executions against ${baseUrl}…`);

  for (let i = 1; i <= count; i += 1) {
    const res = await fetch(`${baseUrl}/api/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ collectionId, environmentId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[${i}/${count}] FAILED ${res.status}:`, body.message || body);
      break;
    }
    console.log(`[${i}/${count}] started execution #${body.id} (${body.status})`);
    if (delayMs > 0 && i < count) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  console.log('Done. Open /executions — page size is 20, so page 2 should appear.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
