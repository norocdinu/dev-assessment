import bcrypt from 'bcrypt';
import { db } from './client.js';

async function seedAdmin() {
  const email = 'admin@example.com';
  const password = 'Admin1234!';

  const existing = await db`SELECT id FROM admin_users WHERE email = ${email}`;
  if (existing.length > 0) {
    console.log('Admin user already exists — skipping');
    await db.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db`
    INSERT INTO admin_users (email, password_hash, role)
    VALUES (${email}, ${passwordHash}, 'owner')
  `;

  console.log(`Admin created: ${email} / ${password}`);
  await db.end();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
