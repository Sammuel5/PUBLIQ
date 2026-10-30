import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { connectMongo } from '../src/store.js';
import { GLOBAL_ROLE } from '../src/rbac.js';
import { assertValidPassword, hashPassword, normalizeEmail } from '../src/security.js';

async function hiddenPrompt(prompt) {
  if (!stdin.isTTY || !stdout.isTTY) return null;
  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
      error ? reject(error) : resolve(value);
    };
    const onData = (chunk) => {
      if (chunk === '\u0003') return finish(new Error('Cancelled.'));
      if (chunk === '\r' || chunk === '\n') return finish();
      if (chunk === '\u007f' || chunk === '\b') value = value.slice(0, -1);
      else if (chunk >= ' ') value += chunk;
    };
    stdin.on('data', onData);
  });
}

async function main() {
  if (process.env.DEMO_MODE === 'true') throw new Error('Bootstrap cannot run in DEMO_MODE.');
  let emailInput = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
  if (!emailInput && stdin.isTTY) {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    emailInput = await rl.question('Super Admin email: ');
    rl.close();
  }
  const email = normalizeEmail(emailInput);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Set a valid BOOTSTRAP_SUPER_ADMIN_EMAIL or run interactively.');
  const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD || await hiddenPrompt('Super Admin password (input hidden): ');
  if (!password) throw new Error('Set BOOTSTRAP_SUPER_ADMIN_PASSWORD in a secure environment or run this command in a TTY.');
  assertValidPassword(password);

  const store = await connectMongo({ uri: process.env.MONGODB_URI, dbName: process.env.MONGODB_DB || 'qr_restaurant_menu' });
  try {
    const users = store.db.collection('users');
    const existingSuper = await users.findOne({ globalRole: GLOBAL_ROLE.SUPER_ADMIN });
    if (existingSuper) throw new Error('A Super Admin already exists; bootstrap can only be used once.');
    const existingUser = await users.findOne({ emailNormalized: email });
    if (existingUser) throw new Error('That email already belongs to an account; bootstrap will not promote existing accounts.');
    const createdAt = new Date();
    await users.insertOne({
      _id: randomUUID(),
      name: process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim() || 'Platform Administrator',
      email,
      emailNormalized: email,
      passwordHash: await hashPassword(password),
      globalRole: GLOBAL_ROLE.SUPER_ADMIN,
      isActive: true,
      emailVerifiedAt: createdAt,
      lastLoginAt: null,
      createdAt,
      updatedAt: createdAt,
    });
    console.log(`Bootstrapped Super Admin account for ${email}. No password was printed or logged.`);
  } finally {
    await store.close();
  }
}

main().catch((error) => {
  console.error(`Bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});
