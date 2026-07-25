/**
 * Seed demo data for local (or Neon) development.
 *
 * Usage (from backend/, with DATABASE_URL set):
 *   npm run seed
 *
 * Optional:
 *   SEED_EMAIL=demo@example.com SEED_PASSWORD=demopass123 npm run seed
 *   npm run seed -- --executions 5   # also enqueue Newman runs (API must be up)
 *
 * Demo collection hits https://postman-echo.com — safe public echo API.
 */

require('dotenv').config();

const bcrypt = require('bcrypt');
const { pool, query } = require('../src/db/pool');

const DEFAULT_EMAIL = process.env.SEED_EMAIL || 'demo@example.com';
const DEFAULT_PASSWORD = process.env.SEED_PASSWORD || 'demopass123';
const BASE_URL = (process.env.SEED_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

const DEMO_COLLECTION = {
  info: {
    name: 'Postman Echo Demo',
    description: 'Seeded demo collection for API Automation Platform',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  item: [
    {
      name: 'GET Echo',
      request: {
        method: 'GET',
        header: [],
        url: {
          raw: '{{baseUrl}}/get?foo=bar',
          host: ['{{baseUrl}}'],
          path: ['get'],
          query: [{ key: 'foo', value: 'bar' }],
        },
      },
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'pm.test("Status is 200", function () {',
              '  pm.response.to.have.status(200);',
              '});',
            ],
          },
        },
      ],
    },
    {
      name: 'POST Echo',
      request: {
        method: 'POST',
        header: [{ key: 'Content-Type', value: 'application/json' }],
        body: {
          mode: 'raw',
          raw: JSON.stringify({ hello: 'world' }),
        },
        url: {
          raw: '{{baseUrl}}/post',
          host: ['{{baseUrl}}'],
          path: ['post'],
        },
      },
      event: [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'pm.test("Status is 200", function () {',
              '  pm.response.to.have.status(200);',
              '});',
            ],
          },
        },
      ],
    },
  ],
};

const DEMO_ENVIRONMENT = {
  name: 'Postman Echo Env',
  values: [
    {
      key: 'baseUrl',
      value: 'https://postman-echo.com',
      enabled: true,
      type: 'default',
    },
  ],
};

function arg(name, fallback) {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function ensureUser(email, password) {
  const existing = await query(`SELECT id, email FROM users WHERE email = $1`, [email]);
  if (existing.rows[0]) {
    console.log(`User already exists: ${email} (id=${existing.rows[0].id})`);
    return existing.rows[0];
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await query(
    `INSERT INTO users (email, password_hash)
     VALUES ($1, $2)
     RETURNING id, email`,
    [email, passwordHash]
  );
  console.log(`Created user: ${email} (id=${inserted.rows[0].id})`);
  return inserted.rows[0];
}

async function ensureCollection(userId) {
  const existing = await query(
    `SELECT id, name FROM collections
     WHERE user_id = $1 AND name = $2
     LIMIT 1`,
    [userId, DEMO_COLLECTION.info.name]
  );
  if (existing.rows[0]) {
    console.log(
      `Collection already exists: ${existing.rows[0].name} (id=${existing.rows[0].id})`
    );
    return existing.rows[0];
  }

  const inserted = await query(
    `INSERT INTO collections (user_id, name, postman_json)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, name`,
    [userId, DEMO_COLLECTION.info.name, JSON.stringify(DEMO_COLLECTION)]
  );
  console.log(`Created collection: ${inserted.rows[0].name} (id=${inserted.rows[0].id})`);
  return inserted.rows[0];
}

async function ensureEnvironment(userId) {
  const existing = await query(
    `SELECT id, name FROM environments
     WHERE user_id = $1 AND name = $2
     LIMIT 1`,
    [userId, DEMO_ENVIRONMENT.name]
  );
  if (existing.rows[0]) {
    console.log(
      `Environment already exists: ${existing.rows[0].name} (id=${existing.rows[0].id})`
    );
    return existing.rows[0];
  }

  const inserted = await query(
    `INSERT INTO environments (user_id, name, variables_json)
     VALUES ($1, $2, $3::jsonb)
     RETURNING id, name`,
    [userId, DEMO_ENVIRONMENT.name, JSON.stringify(DEMO_ENVIRONMENT)]
  );
  console.log(`Created environment: ${inserted.rows[0].name} (id=${inserted.rows[0].id})`);
  return inserted.rows[0];
}

async function enqueueExecutions({ email, password, collectionId, environmentId, count }) {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    throw new Error(
      loginBody.message ||
        `Login failed (${loginRes.status}). Is the API running at ${BASE_URL}?`
    );
  }

  console.log(`Enqueueing ${count} execution(s) via ${BASE_URL}…`);
  for (let i = 1; i <= count; i += 1) {
    const res = await fetch(`${BASE_URL}/api/executions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${loginBody.token}`,
      },
      body: JSON.stringify({ collectionId, environmentId }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error(`[${i}/${count}] failed:`, body.message || body);
      break;
    }
    console.log(`[${i}/${count}] started execution #${body.id}`);
    if (i < count) await new Promise((r) => setTimeout(r, 500));
  }
}

async function main() {
  const email = DEFAULT_EMAIL.trim().toLowerCase();
  const password = DEFAULT_PASSWORD;
  const execCount = Number(arg('executions', '0')) || 0;

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const user = await ensureUser(email, password);
  const collection = await ensureCollection(user.id);
  const environment = await ensureEnvironment(user.id);

  console.log('\nDemo data ready.');
  console.log(`  Login:        ${email} / ${password}`);
  console.log(`  Collection:   id=${collection.id}`);
  console.log(`  Environment:  id=${environment.id}`);

  if (execCount > 0) {
    await enqueueExecutions({
      email,
      password,
      collectionId: collection.id,
      environmentId: environment.id,
      count: execCount,
    });
  } else {
    console.log(
      '\nTip: start the API, then run more history with:\n' +
        `  npm run seed -- --executions 5\n` +
        'or:\n' +
        `  npm run seed:executions -- --collectionId ${collection.id} --environmentId ${environment.id} --count 25`
    );
  }
}

main()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
