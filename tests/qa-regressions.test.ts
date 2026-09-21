import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_UPLOAD_BYTES, validateDocumentUpload } from "../src/lib/uploads.ts";
import { calculateAttendanceSummary } from "../src/lib/attendance-summary.ts";
import { backgroundMeta } from "../src/lib/announcement-types.ts";
import { isValidDateKey, isValidTime } from "../src/lib/calendar.ts";
import { leaveDayCount } from "../src/lib/leave-requests.ts";
import { calculateStudentPerformance } from "../src/lib/student-performance.ts";
import {
  normalizeSubmissionTitle,
  parseDateInput,
  validateQuestionSubmissionPayload,
} from "../src/lib/qa-validation.ts";

describe("QA regression checks", () => {
  it("keeps the document upload limit aligned to the 50 MB UI contract", () => {
    assert.equal(MAX_UPLOAD_BYTES, 50 * 1024 * 1024);
    assert.equal(validateDocumentUpload({ name: "test.txt", size: 26 * 1024 * 1024 }), null);
    assert.notEqual(validateDocumentUpload({ name: "test.txt", size: 51 * 1024 * 1024 }), null);
  });

  it("normalizes assignment-backed submission titles without empty-state validation errors", () => {
    assert.equal(normalizeSubmissionTitle("Milestone 1", ""), "Milestone 1");
    assert.equal(normalizeSubmissionTitle("", "Draft 1"), "Draft 1");
  });

  it("rejects malformed date inputs and duplicate test answers", () => {
    assert.throws(() => parseDateInput("not-a-date"));

    const invalidPayload = {
      answers: [
        { questionId: "q1", answerText: "A" },
        { questionId: "q1", answerText: "B" },
      ],
    };

    const validPayload = {
      answers: [
        { questionId: "q1", answerText: "A" },
        { questionId: "q2", answerText: "Text" },
      ],
    };

    assert.throws(() => validateQuestionSubmissionPayload(invalidPayload, ["q1", "q2"]));
    assert.throws(() => validateQuestionSubmissionPayload({ answers: [{ questionId: "q3", answerText: "A" }] }, ["q1", "q2"]));
    assert.throws(() => validateQuestionSubmissionPayload({ answers: [{ questionId: "q1", answerText: " " }] }, ["q1"]));
    assert.equal(validateQuestionSubmissionPayload(validPayload, ["q1", "q2"]).answers.length, 2);
  });

  it("calculates attendance percentages from saved lecture marks", () => {
    const summary = calculateAttendanceSummary([
      { studentId: "s1", status: "PRESENT", date: "2026-09-20T00:00:00.000Z" },
      { studentId: "s1", status: "ABSENT", date: "2026-09-21T00:00:00.000Z" },
      { studentId: "s2", status: "PRESENT", date: "2026-09-20T00:00:00.000Z" },
      { studentId: "s2", status: "PRESENT", date: "2026-09-21T00:00:00.000Z" },
    ]);

    assert.deepEqual(summary.studentStats.s1, { present: 1, absent: 1, total: 2, percentage: 50 });
    assert.deepEqual(summary.studentStats.s2, { present: 2, absent: 0, total: 2, percentage: 100 });
    assert.equal(summary.history[0].percentage, 50);
    assert.equal(summary.history[1].percentage, 100);
  });

  it("keeps announcement backgrounds on the approved readable palette", () => {
    assert.equal(backgroundMeta("INK").dark, true);
    assert.equal(backgroundMeta("NOT_A_THEME").value, "PLAIN");
  });

  it("validates calendar dates and times strictly", () => {
    assert.equal(isValidDateKey("2026-09-21"), true);
    assert.equal(isValidDateKey("2026-02-30"), false);
    assert.equal(isValidTime("23:59"), true);
    assert.equal(isValidTime("24:00"), false);
  });

  it("counts leave dates inclusively", () => {
    assert.equal(leaveDayCount("2026-09-21", "2026-09-21"), 1);
    assert.equal(leaveDayCount("2026-09-21", "2026-09-23"), 3);
  });

  it("calculates student performance only from measurable records", () => {
    const performance = calculateStudentPerformance({
      submissions: [
        { submittedAt: new Date("2026-09-20T10:00:00Z"), dueAt: new Date("2026-09-20T12:00:00Z") },
        { submittedAt: new Date("2026-09-21T13:00:00Z"), dueAt: new Date("2026-09-21T12:00:00Z") },
        { submittedAt: new Date("2026-09-22T10:00:00Z"), dueAt: null },
      ],
      ratings: [5, 4, null],
      attendance: [{ status: "PRESENT" }, { status: "ABSENT" }, { status: "PRESENT" }],
    });

    assert.deepEqual(performance.onTimeDelivery, { count: 1, total: 2, percentage: 50 });
    assert.deepEqual(performance.feedback, { count: 2, average: 4.5 });
    assert.equal(performance.attendance.present, 2);
    assert.equal(performance.attendance.absent, 1);
    assert.equal(performance.attendance.total, 3);
    assert.ok(Math.abs(performance.attendance.percentage! - 200 / 3) < 0.000001);
  });
});
