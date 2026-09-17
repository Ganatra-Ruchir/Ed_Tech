import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { recomputeBatchKpis, recomputeCohortKpis } from "@/lib/kpi";
import { logAudit } from "@/lib/audit";

const DEPARTMENT = "Information Technology";
const DEMO_PASSWORD = "password123";

const SUBMISSION_STATUSES = [
  "APPROVED",
  "IN_REVIEW",
  "NEEDS_REVISION",
  "SUBMITTED",
] as const;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Seeding database...");

  // --- Batches -------------------------------------------------------
  const batchA = await prisma.batch.create({
    data: { name: "IT B.Tech - Batch A", department: DEPARTMENT, semester: "7" },
  });
  const batchB = await prisma.batch.create({
    data: { name: "IT B.Tech - Batch B", department: DEPARTMENT, semester: "7" },
  });

  // --- Faculty ---------------------------------------------------------
  const facultyPasswordHash = await hashPassword(DEMO_PASSWORD);

  const priya = await prisma.user.create({
    data: {
      name: "Dr. Priya Sharma",
      email: "priya.sharma@sou.edu",
      passwordHash: facultyPasswordHash,
      role: "FACULTY",
      isCC: true,
      batchMemberships: {
        create: [{ batchId: batchA.id }, { batchId: batchB.id }],
      },
    },
  });

  const anil = await prisma.user.create({
    data: {
      name: "Prof. Anil Mehta",
      email: "anil.mehta@sou.edu",
      passwordHash: facultyPasswordHash,
      role: "FACULTY",
      isCC: false,
      batchMemberships: { create: [{ batchId: batchA.id }] },
    },
  });

  const neha = await prisma.user.create({
    data: {
      name: "Prof. Neha Verma",
      email: "neha.verma@sou.edu",
      passwordHash: facultyPasswordHash,
      role: "FACULTY",
      isCC: false,
      batchMemberships: { create: [{ batchId: batchB.id }] },
    },
  });

  // --- Admin -------------------------------------------------------------
  await prisma.user.create({
    data: {
      name: "Department Admin",
      email: "admin@sou.edu",
      passwordHash: await hashPassword(DEMO_PASSWORD),
      role: "ADMIN",
    },
  });

  // --- Students ------------------------------------------------------
  const studentPasswordHash = await hashPassword(DEMO_PASSWORD);
  const studentNames = [
    "Aarav Patel", "Vivaan Shah", "Aditya Joshi", "Vihaan Desai", "Arjun Trivedi",
    "Sai Chauhan", "Reyansh Rana", "Krishna Solanki", "Ishaan Parikh", "Rohan Pandya",
    "Ananya Modi", "Diya Vyas", "Saanvi Gohil", "Myra Thakkar", "Aadhya Bhatt",
    "Anika Mehta", "Kavya Raval", "Riya Chokshi", "Ira Doshi", "Navya Kapadia",
];

  const students: { id: string; name: string; batchId: string }[] = [];
  for (let i = 0; i < studentNames.length; i++) {
    const batch = i < 10 ? batchA : batchB;
    const rollNo = String(i + 1).padStart(2, "0");
    const email = `student${rollNo}@sou.edu`;
    const user = await prisma.user.create({
      data: {
        name: studentNames[i],
        email,
        passwordHash: studentPasswordHash,
        role: "STUDENT",
        batchMemberships: { create: [{ batchId: batch.id }] },
      },
    });
    students.push({ id: user.id, name: studentNames[i], batchId: batch.id });
  }

  // --- Sample submissions ---------------------------------------------
  const projectTitles = [
    "Requirement Analysis Document",
    "System Design & Architecture",
    "Sprint 1 Progress Report",
    "Final Project Demo Build",
  ];

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const reviewer = student.batchId === batchA.id ? anil : neha;
    // Give each student 1-2 submissions in varying states, deterministically.
    const numSubmissions = i % 3 === 0 ? 2 : 1;

    for (let s = 0; s < numSubmissions; s++) {
      const status = SUBMISSION_STATUSES[(i + s) % SUBMISSION_STATUSES.length];
      const createdAt = daysAgo(20 - i - s * 3);
      const isReviewed = status === "APPROVED" || status === "NEEDS_REVISION";
      const reviewedAt = isReviewed ? daysAgo(20 - i - s * 3 - 2) : null;

      const submission = await prisma.submission.create({
        data: {
          studentId: student.id,
          batchId: student.batchId,
          title: projectTitles[(i + s) % projectTitles.length],
          notes: "Please find attached project artifacts for this milestone.",
          status,
          createdAt,
          updatedAt: reviewedAt ?? createdAt,
          reviewedAt,
          files: {
            create: [
              {
                fileName: "report.pdf",
                fileUrl: "/uploads/demo/report.pdf",
                fileType: "application/pdf",
                fileSize: 245_000,
              },
            ],
          },
        },
      });

      if (isReviewed) {
        await prisma.evidence.create({
          data: {
            submissionId: submission.id,
            tag: status === "APPROVED" ? "meets-criteria" : "needs-revision",
            notes:
              status === "APPROVED"
                ? "Deliverable matches the rubric; well documented."
                : "Missing test coverage section; revise and resubmit.",
            addedByFacultyId: reviewer.id,
            createdAt: reviewedAt!,
          },
        });
        await prisma.feedback.create({
          data: {
            submissionId: submission.id,
            facultyId: reviewer.id,
            comment:
              status === "APPROVED"
                ? "Great work overall. Approved."
                : "Please address the flagged gaps and resubmit by next week.",
            createdAt: reviewedAt!,
          },
        });
        await logAudit({
          actorId: reviewer.id,
          action: status === "APPROVED" ? "submission.approve" : "submission.request_revision",
          entityType: "Submission",
          entityId: submission.id,
          metadata: { status },
        });
      }
    }
  }

  // --- Tests -------------------------------------------------------------
  async function createTest(
    batchId: string,
    facultyId: string,
    title: string,
  ) {
    return prisma.test.create({
      data: {
        title,
        description: "Concept-check covering the current project milestone.",
        createdByFacultyId: facultyId,
        batchId,
        publishedAt: daysAgo(5),
        dueAt: daysFromNow(7),
        questions: {
          create: [
            {
              type: "MCQ",
              text: "Which artifact captures functional requirements before design begins?",
              optionsJson: JSON.stringify([
                "Requirement Specification",
                "Deployment Diagram",
                "Test Plan",
                "Release Notes",
              ]),
              correctAnswer: "Requirement Specification",
              order: 1,
            },
            {
              type: "MCQ",
              text: "In an evidence-linked review workflow, what does 'evidence' refer to?",
              optionsJson: JSON.stringify([
                "A trace back to the actual submission or answer being reviewed",
                "A faculty's personal opinion",
                "An unrelated external reference",
                "A grading rubric template",
              ]),
              correctAnswer:
                "A trace back to the actual submission or answer being reviewed",
              order: 2,
            },
            {
              type: "SHORT_ANSWER",
              text: "Briefly describe one risk in your current project milestone and how you plan to mitigate it.",
              order: 3,
            },
            {
              type: "SHORT_ANSWER",
              text: "What feedback from your last review have you incorporated?",
              order: 4,
            },
          ],
        },
      },
      include: { questions: true },
    });
  }

  const testA = await createTest(batchA.id, anil.id, "Milestone 1 Concept Check");
  const testB = await createTest(batchB.id, neha.id, "Milestone 1 Concept Check");

  // --- Announcements (class stream) --------------------------------------
  await prisma.announcement.createMany({
    data: [
      {
        batchId: batchA.id,
        facultyId: anil.id,
        title: "Milestone 1 Concept Check is live",
        body: "Please complete the concept-check test by the due date. It covers requirement analysis and the evidence-linked review workflow.",
        createdAt: daysAgo(5),
      },
      {
        batchId: batchA.id,
        facultyId: priya.id,
        title: "Office hours this week",
        body: "I'll hold extra office hours on Thursday for anyone who received a 'needs revision' on their last submission.",
        createdAt: daysAgo(2),
      },
      {
        batchId: batchB.id,
        facultyId: neha.id,
        title: "Milestone 1 Concept Check is live",
        body: "Please complete the concept-check test by the due date. It covers requirement analysis and the evidence-linked review workflow.",
        createdAt: daysAgo(5),
      },
      {
        batchId: batchB.id,
        facultyId: priya.id,
        title: "Reminder: attach your PDC canvas notes",
        body: "When you submit your next milestone, include a short note on risks and how you're mitigating them — this feeds directly into your progress report.",
        createdAt: daysAgo(1),
      },
    ],
  });

  async function seedResponses(
    test: Awaited<ReturnType<typeof createTest>>,
    batchStudents: typeof students,
  ) {
    for (let i = 0; i < batchStudents.length; i++) {
      // ~70% of students have already attempted the test.
      if (i % 10 === 3) continue; // one student per batch hasn't started
      const student = batchStudents[i];
      const submittedAt = daysAgo(3 - (i % 3));

      const answerData = test.questions.map((q, idx) => {
        if (q.type === "MCQ") {
          // Most students answer correctly; occasionally wrong, deterministic.
          const correct = (i + idx) % 4 !== 0;
          const answerText = correct
            ? q.correctAnswer!
            : (JSON.parse(q.optionsJson!) as string[])[0];
          return { questionId: q.id, answerText, isCorrect: correct };
        }
        return {
          questionId: q.id,
          answerText: "Identified a scope risk; mitigating via weekly check-ins.",
          isCorrect: null,
        };
      });

      const mcqCount = test.questions.filter((q) => q.type === "MCQ").length;
      const mcqCorrect = answerData.filter((a) => a.isCorrect === true).length;
      // Short answers get a flat partial-credit score in this seed (0.75 each).
      const shortAnswerCount = test.questions.length - mcqCount;
      const score = mcqCorrect + shortAnswerCount * 0.75;
      const maxScore = test.questions.length;

      await prisma.testResponse.create({
        data: {
          testId: test.id,
          studentId: student.id,
          submittedAt,
          score,
          maxScore,
          answers: { create: answerData },
        },
      });
    }
  }

  await seedResponses(testA, students.filter((s) => s.batchId === batchA.id));
  await seedResponses(testB, students.filter((s) => s.batchId === batchB.id));

  // --- KPI recompute ---------------------------------------------------
  await recomputeBatchKpis(batchA.id);
  await recomputeBatchKpis(batchB.id);
  await recomputeCohortKpis();

  console.log("Seed complete.");
  console.log("Demo accounts (all use password: %s)", DEMO_PASSWORD);
  console.log(" Admin:   admin@sou.edu");
  console.log(" CC:      priya.sharma@sou.edu (both batches)");
  console.log(" Faculty: anil.mehta@sou.edu (Batch A), neha.verma@sou.edu (Batch B)");
  console.log(" Student: student01@sou.edu ... student20@sou.edu");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
