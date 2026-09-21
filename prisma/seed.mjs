import crypto from "node:crypto";
import path from "node:path";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";

const DEMO_PASSWORD = "password123";
const database = new Database(path.join(process.cwd(), "dev.db"));
database.pragma("foreign_keys = ON");

const faculty = [
  { name: "Priya Sharma", email: "priya.sharma@sou.edu", isCC: 1, facultyType: "Course Coordinator" },
  { name: "Anil Mehta", email: "anil.mehta@sou.edu", isCC: 0, facultyType: "Faculty" },
  { name: "Neha Verma", email: "neha.verma@sou.edu", isCC: 0, facultyType: "Faculty" },
  { name: "Arkazi", email: "arkazi@silveroakuni.ac.in", isCC: 0, facultyType: "Faculty" },
  { name: "Rashmi Jadhav", email: "rashmijadhav@silveroakuni.ac.in", isCC: 1, facultyType: "Course Coordinator" },
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

const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

const upsertUser = database.prepare(`
  INSERT INTO "User" (
    id, name, email, passwordHash, role, isCC, branch, college, facultyType, studentNumber
  ) VALUES (
    @id, @name, @email, @passwordHash, @role, @isCC, @branch, @college, @facultyType, @studentNumber
  )
  ON CONFLICT(email) DO UPDATE SET
    name = excluded.name,
    passwordHash = excluded.passwordHash,
    role = excluded.role,
    isCC = excluded.isCC,
    branch = COALESCE(excluded.branch, "User".branch),
    college = COALESCE(excluded.college, "User".college),
    facultyType = COALESCE(excluded.facultyType, "User".facultyType),
    studentNumber = COALESCE(excluded.studentNumber, "User".studentNumber)
`);

const upsertBatch = database.prepare(`
  INSERT INTO "Batch" (id, name, department, semester)
  VALUES (@id, @name, @department, @semester)
  ON CONFLICT(name, department, semester) DO NOTHING
`);

const upsertMembership = database.prepare(`
  INSERT INTO "UserBatch" (id, userId, batchId)
  VALUES (@id, @userId, @batchId)
  ON CONFLICT(userId, batchId) DO NOTHING
`);

const userId = database.prepare('SELECT id FROM "User" WHERE email = ?');
const batchId = database.prepare('SELECT id FROM "Batch" WHERE name = ? AND department = ? AND semester = ?');

const seed = database.transaction(() => {
  upsertUser.run({
    id: crypto.randomUUID(),
    name: "System Admin",
    email: "admin@sou.edu",
    passwordHash,
    role: "ADMIN",
    isCC: 0,
    branch: null,
    college: "Silver Oak University",
    facultyType: null,
    studentNumber: null,
  });

  for (const member of faculty) {
    upsertUser.run({
      id: crypto.randomUUID(),
      ...member,
      passwordHash,
      role: "FACULTY",
      branch: "Computer Engineering",
      college: "Silver Oak University",
      studentNumber: null,
    });
  }

  for (const student of students) {
    upsertUser.run({
      id: crypto.randomUUID(),
      ...student,
      passwordHash,
      role: "STUDENT",
      isCC: 0,
      branch: "Computer Engineering",
      college: "Silver Oak University",
      facultyType: null,
    });
  }

  const batchDefinitions = [
    { name: "CE Batch A", department: "Computer Engineering", semester: "6" },
    { name: "CE Batch B", department: "Computer Engineering", semester: "6" },
  ];
  for (const batch of batchDefinitions) upsertBatch.run({ id: crypto.randomUUID(), ...batch });

  const batches = batchDefinitions.map((batch) => batchId.get(batch.name, batch.department, batch.semester));
  const facultyIds = faculty.map((member) => userId.get(member.email).id);
  const studentIds = students.map((student) => userId.get(student.email).id);
  const memberships = [
    { userId: facultyIds[0], batchId: batches[0].id },
    { userId: facultyIds[0], batchId: batches[1].id },
    { userId: facultyIds[1], batchId: batches[0].id },
    { userId: facultyIds[2], batchId: batches[1].id },
    { userId: facultyIds[3], batchId: batches[0].id },
    { userId: facultyIds[4], batchId: batches[0].id },
    { userId: facultyIds[4], batchId: batches[1].id },
    ...studentIds.map((id, index) => ({ userId: id, batchId: batches[index < 10 || index >= 20 ? 0 : 1].id })),
  ];
  for (const membership of memberships) {
    upsertMembership.run({ id: crypto.randomUUID(), ...membership });
  }
});

try {
  seed();
  console.log("Demo seed complete: 1 admin, 5 faculty, 23 students, 2 batches.");
  console.log("All demo accounts use password: %s", DEMO_PASSWORD);
} finally {
  database.close();
}
