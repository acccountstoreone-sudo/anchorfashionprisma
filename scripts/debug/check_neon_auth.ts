import { prisma } from '../lib/prisma';

async function main() {
  try {
    const tables: any = await prisma.$queryRawUnsafe(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'neon_auth'
    `);
    console.log('neon_auth tables:', tables);

    const users: any = await prisma.$queryRawUnsafe(`
      SELECT id, name, email, role, created_at FROM neon_auth.users LIMIT 10
    `);
    console.log('neon_auth users:', users);

    const accounts: any = await prisma.$queryRawUnsafe(`
      SELECT id, account_id, provider_id, user_id FROM neon_auth.accounts LIMIT 10
    `);
    console.log('neon_auth accounts:', accounts);
  } catch (err) {
    console.error('Error querying neon_auth:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
