import { prisma } from '../lib/prisma';

async function main() {
  const roles = await prisma.role.findMany();
  console.log('=== ROLES IN DB ===');
  console.log(roles.map(r => ({ id: r.id, name: r.name, isSystem: r.isSystem })));

  const profiles = await prisma.profile.findMany({
    include: { role: true },
  });
  console.log('=== PROFILES IN DB ===');
  console.log(profiles.map(p => ({
    id: p.id,
    email: p.email,
    name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
    role: p.role?.name,
    isActive: p.isActive,
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
