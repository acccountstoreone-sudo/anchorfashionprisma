import { loginUser } from './test_all_logins';
import { prisma } from '../lib/prisma';

async function main() {
  const login = await loginUser('qa_customer@anchorfashion.com', 'Password123!');
  console.log('Customer User from login:', login.user);

  // Check what profile is in DB for this customer:
  const profile = await prisma.profile.findFirst({
    where: {
      OR: [
        { id: login.user.id },
        { email: login.user.email },
      ],
    },
    include: { role: true },
  });

  console.log('Profile in DB:', {
    id: profile?.id,
    email: profile?.email,
    roleId: profile?.roleId,
    roleName: profile?.role?.name,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
