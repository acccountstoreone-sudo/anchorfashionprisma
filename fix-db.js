const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  console.log('Fetching products...');
  const products = await prisma.product.findMany();
  for (const product of products) {
    if (product.name.includes('(')) {
      const cleanName = product.name.split('(')[0].trim();
      await prisma.product.update({
        where: { id: product.id },
        data: { name: cleanName }
      });
      console.log('Updated Product Name:', product.name, '->', cleanName);
    }
  }

  console.log('Fetching hero banners...');
  const banners = await prisma.banner.findMany();
  for (const banner of banners) {
      if (banner.title && banner.title.length > 30) {
        const cleanTitle = banner.title.split('-')[0].trim();
        await prisma.banner.update({
          where: { id: banner.id },
          data: { 
            title: cleanTitle,
            subtitle: "Anchor Fashion",
            description: "Discover our new collection."
          }
        });
        console.log('Updated Banner:', banner.title, '->', cleanTitle);
      }
  }

  console.log('Checking Store Settings for phone...');
  const settings = await prisma.storeSettings.findFirst();
  if (settings && settings.supportPhone === '+880 1234-567890') {
     await prisma.storeSettings.update({
       where: { id: settings.id },
       data: { supportPhone: '+880 1711-223344' }
     });
     console.log('Updated store phone number');
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
