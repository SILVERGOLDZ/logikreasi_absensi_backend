import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Admin
  await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      username: "admin",
      email: "admin@gmail.com",
      password: await bcrypt.hash("admin123", 10),
      role: "admin",
    },
  });

  const passwordHash = await bcrypt.hash("user123", 10);

  // 30 User
  for (let i = 1; i <= 30; i++) {
    await prisma.user.upsert({
      where: {
        email: `user${i}@gmail.com`,
      },
      update: {},
      create: {
        username: `user${i}`,
        email: `user${i}@gmail.com`,
        password: passwordHash,
        role: "user",
      },
    });
  }

  console.log("✅ Database seeded");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });