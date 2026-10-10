import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database cleanup...');

  try {
    // Clean Transactions & Orders
    console.log('Deleting Payments and Orders...');
    await prisma.payment.deleteMany({});
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});

    // Clean Carts
    console.log('Deleting Carts...');
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.checkoutSession.deleteMany({});

    // Clean Reviews, Wishlists, Notifications
    console.log('Deleting Reviews, Wishlists, Notifications, and Audit Logs...');
    await prisma.review.deleteMany({});
    await prisma.wishlistItem.deleteMany({});
    await prisma.wishlist.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.auditLog.deleteMany({});

    // Clean Customer Addresses
    console.log('Deleting Customer Addresses...');
    await prisma.customerAddress.deleteMany({});

    // Keep the Admin but delete other users if needed
    console.log('Deleting Non-Admin Profiles and related data...');
    const ADMIN_EMAIL = 'dev.sazzadali@gmail.com';
    const admin = await prisma.profile.findUnique({
      where: { email: ADMIN_EMAIL }
    });

    if (admin) {
      await prisma.profile.deleteMany({
        where: { id: { not: admin.id } }
      });
    }

    console.log('Database cleanup completed successfully!');
  } catch (error) {
    console.error('Error during database cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
