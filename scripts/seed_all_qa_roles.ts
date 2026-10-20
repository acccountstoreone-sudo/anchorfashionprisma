import { prisma } from '../lib/prisma';

export const QA_USERS = [
  {
    roleName: "SUPERADMIN",
    email: "qa_superadmin@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "SuperAdmin",
    phone: "+8801700000001",
  },
  {
    roleName: "ADMIN",
    email: "qa_admin@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "Admin",
    phone: "+8801700000002",
  },
  {
    roleName: "MANAGER",
    email: "qa_manager@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "Manager",
    phone: "+8801700000003",
  },
  {
    roleName: "WAREHOUSE_MANAGER",
    email: "qa_warehouse@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "Warehouse",
    phone: "+8801700000004",
  },
  {
    roleName: "MARKETING_MANAGER",
    email: "qa_marketing_mgr@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "MarketingMgr",
    phone: "+8801700000005",
  },
  {
    roleName: "FINANCE_MANAGER",
    email: "qa_finance_mgr@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "FinanceMgr",
    phone: "+8801700000006",
  },
  {
    roleName: "MARKETING",
    email: "qa_marketing@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "Marketing",
    phone: "+8801700000007",
  },
  {
    roleName: "STAFF",
    email: "qa_staff@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "Staff",
    phone: "+8801700000008",
  },
  {
    roleName: "SUPPORT",
    email: "qa_support@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "Support",
    phone: "+8801700000009",
  },
  {
    roleName: "CUSTOMER",
    email: "qa_customer@anchorfashion.com",
    password: "Password123!",
    firstName: "QA",
    lastName: "Customer",
    phone: "+8801700000010",
  },
];

async function setupAccounts() {
  console.log("=== STEP 1: VERIFY ROLES IN DATABASE ===");
  const allRoles = await prisma.role.findMany();
  const roleMap = new Map(allRoles.map(r => [r.name.toUpperCase(), r.id]));

  for (const u of QA_USERS) {
    if (!roleMap.has(u.roleName.toUpperCase())) {
      console.log(`Creating missing role: ${u.roleName}`);
      const newRole = await prisma.role.create({
        data: {
          name: u.roleName,
          description: `System role for ${u.roleName}`,
          isSystem: true,
        },
      });
      roleMap.set(u.roleName.toUpperCase(), newRole.id);
    }
  }

  console.log("=== STEP 2: CREATE NEON AUTH ACCOUNTS & PRISMA PROFILES ===");
  for (const u of QA_USERS) {
    console.log(`\nProcessing ${u.roleName}: ${u.email}...`);

    let userId: string | null = null;

    // 2a. Call Neon Auth Sign Up
    try {
      const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://localhost:3000",
        },
        body: JSON.stringify({
          email: u.email,
          password: u.password,
          name: `${u.firstName} ${u.lastName}`,
        }),
      });

      const body: any = await res.json().catch(() => null);
      if (res.ok && body?.user?.id) {
        userId = body.user.id;
        console.log(`  -> Neon Auth created user ID: ${userId}`);
      } else {
        console.log(`  -> Sign-up response (${res.status}):`, body?.message || body?.error || "Already exists or error");
      }
    } catch (err: any) {
      console.log(`  -> Sign-up request error:`, err.message);
    }

    // 2b. If sign-up returned already exists or didn't return user, try sign-in to get user id
    if (!userId) {
      try {
        const signinRes = await fetch("http://localhost:3000/api/auth/sign-in/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Origin": "http://localhost:3000",
          },
          body: JSON.stringify({
            email: u.email,
            password: u.password,
          }),
        });
        const signinBody: any = await signinRes.json().catch(() => null);
        if (signinRes.ok && signinBody?.user?.id) {
          userId = signinBody.user.id;
          console.log(`  -> Neon Auth sign-in resolved user ID: ${userId}`);
        }
      } catch (err: any) {
        console.log(`  -> Sign-in check error:`, err.message);
      }
    }

    // 2c. Upsert Prisma Profile
    const roleId = roleMap.get(u.roleName.toUpperCase());
    const existingProfile = await prisma.profile.findFirst({
      where: {
        OR: [
          ...(userId ? [{ id: userId }] : []),
          { email: u.email },
        ],
      },
    });

    if (existingProfile) {
      const updated = await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          roleId,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          isActive: true,
          email: u.email,
        },
      });
      console.log(`  -> Updated existing Profile: ${updated.id} with role ${u.roleName}`);
    } else {
      const created = await prisma.profile.create({
        data: {
          ...(userId ? { id: userId } : {}),
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          roleId,
          isActive: true,
        },
      });
      console.log(`  -> Created new Profile: ${created.id} with role ${u.roleName}`);
    }
  }

  console.log("\n=== STEP 3: VERIFY ALL PROFILES IN DB ===");
  const profiles = await prisma.profile.findMany({
    where: {
      email: { in: QA_USERS.map(u => u.email) }
    },
    include: { role: true }
  });

  for (const p of profiles) {
    console.log(`Profile: ${p.email} | Name: ${p.firstName} ${p.lastName} | Role: ${p.role?.name} | Active: ${p.isActive}`);
  }
}

if (require.main === module) {
  setupAccounts().catch(console.error).finally(() => prisma.$disconnect());
}
