/** Serializable row shapes shared between the admin server pages (which load
 * them from Prisma) and the admin client tables/charts (which render them).
 * Kept free of any Prisma / server-only import so client components can type
 * their props without pulling the database client into the browser bundle. */

export type StudentRow = {
  id: string;
  name: string;
  email: string;
  branch: string | null;
  college: string | null;
  studentNumber: string | null;
  enrollmentNumber: string | null;
  profileImageUrl: string | null;
  dateOfBirth: string | null;
  ccName: string | null;
  scName: string | null;
  batches: string[];
  departments: string[];
  submissionCount: number;
  completionRate: number;
  avgScorePct: number;
  hasTestData: boolean;
  atRisk: boolean;
  joinedAt: string;
};

export type FacultyRow = {
  id: string;
  name: string;
  email: string;
  isCC: boolean;
  branch: string | null;
  college: string | null;
  facultyType: string | null;
  profileImageUrl: string | null;
  salary: number | null;
  dateOfBirth: string | null;
  joiningDate: string | null;
  batches: string[];
  departments: string[];
  testsCreated: number;
  feedbackGiven: number;
  announcements: number;
  joinedAt: string;
};

export type BatchRow = {
  id: string;
  name: string;
  department: string;
  semester: string;
  studentCount: number;
  facultyCount: number;
  submissionCount: number;
  testCount: number;
  atRiskCount: number;
  completionRate: number;
  avgScorePct: number;
  createdAt: string;
};

export type AuditRow = {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  createdAt: string;
};

export type ReportRow = {
  id: string;
  scope: string;
  subject: string;
  pdfPath: string;
  generatedAt: string;
};

/** One month bucket of the dashboard submission-trend line chart. */
export type TrendPoint = { label: string; submitted: number; reviewed: number };

/** One slice of a donut chart. `color` is a literal hex — recharts needs one. */
export type DonutSlice = { name: string; value: number; color: string };

/** One bar of a categorical bar chart. */
export type BarPoint = { name: string; value: number };

export type ActivityItem = {
  id: string;
  title: string;
  meta: string;
  ago: string;
  kind: "submission" | "audit";
  href: string | null;
};
