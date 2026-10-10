import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Looking for an existing profile...");
  const firstProfile = await prisma.profile.findFirst();

  if (!firstProfile) {
    console.log("No profiles found! Please create an account via the website first.");
    return;
  }

  console.log(`Found profile for ${firstProfile.email || firstProfile.id}.`);

  // Ensure Admin role exists
  let adminRole = await prisma.role.findUnique({ where: { name: "admin" } });
  
  if (!adminRole) {
    console.log("Creating 'admin' role...");
    adminRole = await prisma.role.create({
      data: {
        name: "admin",
        description: "Administrator with full access",
        isSystem: true
      }
    });
  } else {
    console.log("'admin' role already exists.");
  }

  // Update profile
  await prisma.profile.update({
    where: { id: firstProfile.id },
    data: { roleId: adminRole.id }
  });

  console.log(`✅ Profile ${firstProfile.email || firstProfile.id} has been successfully made an admin!`);
}

main()
  .catch((e) => {
    console.error("Error running script:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
