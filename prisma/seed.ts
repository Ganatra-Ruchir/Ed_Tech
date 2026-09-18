import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

const ADMIN_EMAIL = "admin@sou.edu";
const ADMIN_PASSWORD = "password123";

async function resetDemoData() {
  await prisma.answer.deleteMany();
  await prisma.testResponse.deleteMany();
  await prisma.question.deleteMany();
  await prisma.test.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.submissionFile.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.userBatch.deleteMany();
  await prisma.kPI.deleteMany();
  await prisma.report.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.batch.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log("Resetting database to admin-only baseline...");

  await resetDemoData();

  const adminPasswordHash = await hashPassword(ADMIN_PASSWORD);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      name: "System Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
    create: {
      name: "System Admin",
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  console.log("Admin-only seed complete.");
  console.log("Admin account created/retained: %s (%s)", ADMIN_EMAIL, ADMIN_PASSWORD);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
