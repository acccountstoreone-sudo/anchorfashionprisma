/**
 * script to wipe only transactional data for handover
 * Run with: npx ts-node prisma/clean-transactions.ts
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('Cleaning transactional data for client handover...')
  
  // 1. Delete order related data (cascades handle items if configured properly, but doing explicitly is safer)
  console.log('Deleting Orders...')
  await prisma.orderItem.deleteMany()
  await prisma.orderStatusHistory.deleteMany()
  await prisma.order.deleteMany()

  // 2. Delete Cart & Wishlist
  console.log('Deleting Carts & Wishlists...')
  await prisma.cartItem.deleteMany()
  await prisma.wishlistItem.deleteMany()

  // 3. Delete CRM / Support / Reviews
  console.log('Deleting Reviews & Support Tickets...')
  await prisma.review.deleteMany()
  await prisma.ticketMessage.deleteMany()
  await prisma.supportTicket.deleteMany()

  // 4. Delete Users / Profiles (Keep Admin?)
  // Assuming we want to delete all profiles EXCEPT admin.
  // Note: Adjust the email string to your actual admin email if needed.
  const adminEmail = 'dev.sazzadali@gmail.com'
  console.log(`Deleting Profiles (Except Admin: ${adminEmail})...`)
  await prisma.profile.deleteMany({
    where: {
      email: {
        not: adminEmail
      }
    }
  })

  console.log('Transaction data cleanup complete!')
  console.log('Catalog (Products, Categories, Brands) remains intact.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
