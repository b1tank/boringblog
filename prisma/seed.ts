import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const adminName = process.env.SEED_ADMIN_NAME || "管理员";

  const authorEmail = process.env.SEED_AUTHOR_EMAIL || "author@example.com";
  const authorPassword = process.env.SEED_AUTHOR_PASSWORD || "author123";
  const authorName = process.env.SEED_AUTHOR_NAME || "爸爸";

  const adminHash = await hash(adminPassword, 12);
  const authorHash = await hash(authorPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: adminName,
      role: "ADMIN",
    },
  });

  const author = await prisma.user.upsert({
    where: { email: authorEmail },
    update: {},
    create: {
      email: authorEmail,
      passwordHash: authorHash,
      name: authorName,
      role: "AUTHOR",
    },
  });

  console.log("Seeded users:", { admin: admin.email, author: author.email });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
