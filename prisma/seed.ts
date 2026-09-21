import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const DEMO_PASSWORD = "password123";

const faculty = [
  { name: "Priya Sharma", email: "priya.sharma@sou.edu", isCC: true, facultyType: "Course Coordinator" },
  { name: "Anil Mehta", email: "anil.mehta@sou.edu", isCC: false, facultyType: "Faculty" },
  { name: "Neha Verma", email: "neha.verma@sou.edu", isCC: false, facultyType: "Faculty" },
  { name: "Arkazi", email: "arkazi@silveroakuni.ac.in", isCC: false, facultyType: "Faculty" },
  { name: "Rashmi Jadhav", email: "rashmijadhav@silveroakuni.ac.in", isCC: true, facultyType: "Course Coordinator" },
];

const students = [
  ...Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      name: `Student ${number}`,
      email: `student${number}@sou.edu`,
      studentNumber: `SOU${String(index + 1).padStart(3, "0")}`,
    };
  }),
  { name: "Abdul", email: "abdul@gmail.com", studentNumber: "SOU021" },
  { name: "Milan", email: "milan@gmail.com", studentNumber: "SOU022" },
  { name: "Thakker Ruchir", email: "thakkerruchir044@gmail.com", studentNumber: "SOU023" },
];

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL_UNPOOLED or DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

async function main() {
  if (await prisma.user.count()) {
    console.log("Database already contains users; demo seed skipped.");
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        name: "System Admin",
        email: "admin@sou.edu",
        passwordHash,
        role: "ADMIN",
        college: "Silver Oak University",
      },
    });

    const facultyUsers = [];
    for (const member of faculty) {
      facultyUsers.push(await tx.user.create({
        data: {
          ...member,
          passwordHash,
          role: "FACULTY",
          branch: "Computer Engineering",
          college: "Silver Oak University",
        },
      }));
    }

    const studentUsers = [];
    for (const student of students) {
      studentUsers.push(await tx.user.create({
        data: {
          ...student,
          passwordHash,
          role: "STUDENT",
          branch: "Computer Engineering",
          college: "Silver Oak University",
        },
      }));
    }

    const batchA = await tx.batch.create({
      data: { name: "CE Batch A", department: "Computer Engineering", semester: "6" },
    });
    const batchB = await tx.batch.create({
      data: { name: "CE Batch B", department: "Computer Engineering", semester: "6" },
    });

    const memberships = [
      { userId: facultyUsers[0].id, batchId: batchA.id },
      { userId: facultyUsers[0].id, batchId: batchB.id },
      { userId: facultyUsers[1].id, batchId: batchA.id },
      { userId: facultyUsers[2].id, batchId: batchB.id },
      { userId: facultyUsers[3].id, batchId: batchA.id },
      { userId: facultyUsers[4].id, batchId: batchA.id },
      { userId: facultyUsers[4].id, batchId: batchB.id },
      ...studentUsers.map((student, index) => ({
        userId: student.id,
        batchId: index < 10 || index >= 20 ? batchA.id : batchB.id,
      })),
    ];
    await tx.userBatch.createMany({ data: memberships });
  });

  console.log("Demo seed complete: 1 admin, 5 faculty, 23 students, 2 batches.");
  console.log("All demo accounts use password: %s", DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
