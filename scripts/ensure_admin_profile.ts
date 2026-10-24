import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminRole = await prisma.role.findFirst({
    where: { name: { in: ["admin", "ADMIN", "SuperAdmin", "SUPER_ADMIN"] } },
  });

  if (!adminRole) {
    console.error("No admin role found!");
    return;
  }

  const emails = ["accountstoreone@gmail.com", "acccountstoreone@gmail.com"];

  for (const email of emails) {
    const existing = await prisma.profile.findUnique({
      where: { email },
    });

    if (existing) {
      await prisma.profile.update({
        where: { id: existing.id },
        data: { roleId: adminRole.id, isActive: true },
      });
      console.log(`Updated existing profile for ${email} to admin role.`);
    } else {
      await prisma.profile.create({
        data: {
          email,
          firstName: "Account",
          lastName: "One",
          roleId: adminRole.id,
          isActive: true,
        },
      });
      console.log(`Created new admin profile for ${email}.`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
