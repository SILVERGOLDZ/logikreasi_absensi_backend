import prisma from "#prisma/prisma.js";
import bcrypt from "bcrypt";
import { generateRandomPassword } from "#utils/generatePassword";

export async function registerUserByAdmin({ username, email, role }) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existing) {
    const err = new Error(
      existing.username === username
        ? "Username sudah digunakan"
        : "Email sudah digunakan"
    );
    err.statusCode = 409;
    throw err;
  }

  const plainPassword = generateRandomPassword(10);
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return { user, generatedPassword: plainPassword };
}