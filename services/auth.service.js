import prisma from "#prisma/prisma.js";

export async function getLoginInfo(email){
    return await prisma.user.findUnique({
      where: {
          email: email 
      }
    });
}