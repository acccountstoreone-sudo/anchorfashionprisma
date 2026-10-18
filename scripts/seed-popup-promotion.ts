import { prisma } from "../lib/prisma";

async function main() {
  const existing = await prisma.promotions.findFirst({
    where: { code: "ANCHORVIP15" },
  });

  if (!existing) {
    const created = await prisma.promotions.create({
      data: {
        title: "Join Anchor VIP",
        description: "Get 15% off your first order when you sign up for our loyalty program.",
        code: "ANCHORVIP15",
        type: "PERCENTAGE",
        value: 15,
        is_active: true,
      },
    });
    console.log("SUCCESS_CREATED:", created.id, created.title);
  } else {
    console.log("SUCCESS_EXISTS:", existing.id, existing.title);
  }
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
