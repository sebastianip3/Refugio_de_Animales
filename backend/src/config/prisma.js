import { PrismaClient } from "@prisma/client";

// Una sola instancia de Prisma para toda la app
const prisma = new PrismaClient();

export default prisma;