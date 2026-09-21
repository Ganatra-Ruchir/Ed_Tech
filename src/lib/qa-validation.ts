export function normalizeSubmissionTitle(assignmentTitle: string | null | undefined, localTitle: string | null | undefined): string {
  const assignmentText = assignmentTitle?.trim();
  if (assignmentText) return assignmentText;

  const localText = localTitle?.trim();
  if (localText) return localText;

  return "";
}

export function parseDateInput(value: string | null | undefined): Date {
  if (value === null || value === undefined || !value.trim()) {
    throw new Error("Date is required");
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }

  return date;
}

export function validateQuestionSubmissionPayload(
  payload: { answers?: Array<{ questionId: string; answerText: string }> | null },
  expectedQuestionIds: string[],
): { answers: Array<{ questionId: string; answerText: string }> } {
  const answers = payload?.answers ?? [];
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error("At least one answer is required");
  }

  const ids = answers.map((answer) => answer.questionId);
  if (new Set(ids).size !== ids.length) {
    throw new Error("Duplicate question IDs are not allowed");
  }

  const missing = expectedQuestionIds.filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    throw new Error("All questions must be answered");
  }

  const unknown = ids.filter((id) => !expectedQuestionIds.includes(id));
  if (unknown.length > 0) {
    throw new Error("Unknown question IDs are not allowed");
  }

  const normalized = answers.map((answer) => ({
    questionId: answer.questionId,
    answerText: answer.answerText.trim(),
  }));

  if (normalized.some((answer) => !answer.answerText)) {
    throw new Error("Answer text cannot be blank");
  }

  return { answers: normalized };
}
