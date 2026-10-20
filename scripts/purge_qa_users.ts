import { prisma } from "../lib/prisma";

export async function purgeQAUsers(dryRun = false) {
  console.log("========================================================================");
  console.log(`       ANCHOR FASHION - QA ACCOUNTS PURGE UTILITY (${dryRun ? "DRY RUN" : "LIVE"})       `);
  console.log("========================================================================\n");

  const qaProfiles = await prisma.profile.findMany({
    where: {
      email: {
        contains: "qa_",
      },
    },
    include: {
      role: true,
    },
  });

  if (qaProfiles.length === 0) {
    console.log("✅ No QA accounts found in the database. Environment is clean.");
    return;
  }

  console.log(`Found ${qaProfiles.length} QA account(s) in the database:\n`);
  for (const p of qaProfiles) {
    console.log(` - ${p.email} [Role: ${p.role?.name || "NONE"}, ID: ${p.id}]`);
  }

  if (dryRun) {
    console.log("\n⚠️ Dry-run mode enabled. No records were deleted.");
    console.log("Run with `npx tsx scripts/purge_qa_users.ts --execute` to permanently remove these accounts.");
    return;
  }

  console.log("\n>>> Deleting QA profiles from database...");
  const deleteResult = await prisma.profile.deleteMany({
    where: {
      email: {
        contains: "qa_",
      },
    },
  });

  console.log(`✅ Successfully removed ${deleteResult.count} QA profile(s) from database.`);
  console.log("Note: If using Neon Auth hosted accounts, ensure to delete corresponding auth users from Neon Auth console as well.");
}

const isExecute = process.argv.includes("--execute");
purgeQAUsers(!isExecute)
  .catch((err) => {
    console.error("Purge error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
