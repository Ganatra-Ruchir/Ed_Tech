import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles, statusColor } from "./styles";
import type { StudentReportData } from "./data";

function fmtDate(d: Date | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function fmtNum(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "-";
}

function fmtPercent(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

export function StudentReportDocument({ data }: { data: StudentReportData }) {
  const { student, batch, submissions, testResponses, kpi, performance, shortAnswerReflections, evidenceLog, feedbackLog } = data;

  return (
    <Document
      title={`Student Report - ${student.name}`}
      author="Student Progress & Evaluation Platform"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Student Progress Report</Text>
        <Text style={styles.subtitle}>
          {student.name} · {student.email} · {batch ? `${batch.name} (${batch.department}, Sem ${batch.semester})` : "Unassigned batch"}
        </Text>
        <Text style={styles.subtitle}>Generated {fmtDate(new Date())}</Text>

        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtNum(kpi.submissionCompletionRate)}%</Text>
            <Text style={styles.kpiLabel}>Submission completion rate</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtNum(kpi.avgTestScorePct)}%</Text>
            <Text style={styles.kpiLabel}>Average test score</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtNum(kpi.reviewTurnaroundHours)}h</Text>
            <Text style={styles.kpiLabel}>Avg review turnaround</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, kpi.atRisk ? { color: "#b91c1c" } : {}]}>
              {kpi.atRisk ? "At risk" : "On track"}
            </Text>
            <Text style={styles.kpiLabel}>Overall status</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Student Performance</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtPercent(performance.onTimeDelivery.percentage)}</Text>
            <Text style={styles.kpiLabel}>
              On-time delivery ({performance.onTimeDelivery.count}/{performance.onTimeDelivery.total} dated assignments)
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>
              {performance.feedback.average === null ? "-" : `${performance.feedback.average.toFixed(1)} / 5`}
            </Text>
            <Text style={styles.kpiLabel}>Faculty feedback ({performance.feedback.count} ratings)</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtPercent(performance.attendance.percentage)}</Text>
            <Text style={styles.kpiLabel}>
              Lecture attendance ({performance.attendance.present} present, {performance.attendance.absent} absent)
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Submission History</Text>
        {submissions.length === 0 ? (
          <Text style={styles.emptyNote}>No submissions on record.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.cell}>Title</Text>
              <Text style={styles.cell}>Status</Text>
              <Text style={styles.cell}>Submitted</Text>
              <Text style={styles.cell}>Reviewed</Text>
            </View>
            {submissions.map((s) => (
              <View style={styles.tableRow} key={s.id}>
                <Text style={styles.cell}>{s.title}</Text>
                <Text style={[styles.cell, styles.badge, statusColor(s.status)]}>{s.status}</Text>
                <Text style={styles.cell}>{fmtDate(s.createdAt)}</Text>
                <Text style={styles.cell}>{fmtDate(s.reviewedAt)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Test Performance</Text>
        {testResponses.length === 0 ? (
          <Text style={styles.emptyNote}>No test attempts on record.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.cell}>Test</Text>
              <Text style={styles.cell}>Score</Text>
              <Text style={styles.cell}>Submitted</Text>
            </View>
            {testResponses.map((r) => (
              <View style={styles.tableRow} key={r.id}>
                <Text style={styles.cell}>{r.test.title}</Text>
                <Text style={styles.cell}>
                  {r.score ?? "-"} / {r.maxScore ?? "-"}
                </Text>
                <Text style={styles.cell}>{fmtDate(r.submittedAt)}</Text>
              </View>
            ))}
          </View>
        )}
      </Page>

      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Project Development Canvas</Text>
        <Text style={styles.subtitle}>
          Auto-populated from {student.name}&apos;s submission and evidence history
        </Text>

        <View style={styles.canvasBox}>
          <Text style={styles.canvasLabel}>MILESTONES (from submissions)</Text>
          {submissions.length === 0 ? (
            <Text style={styles.emptyNote}>No milestones recorded yet.</Text>
          ) : (
            submissions.map((s) => (
              <Text style={styles.canvasBody} key={s.id}>
                • {s.title} — {s.status} ({fmtDate(s.createdAt)})
                {s.notes ? `: ${s.notes}` : ""}
              </Text>
            ))
          )}
        </View>

        <View style={styles.canvasBox}>
          <Text style={styles.canvasLabel}>SELF-REPORTED RISKS &amp; REFLECTIONS (from test responses)</Text>
          {shortAnswerReflections.length === 0 ? (
            <Text style={styles.emptyNote}>No reflection answers on record.</Text>
          ) : (
            shortAnswerReflections.map((r, idx) => (
              <Text style={styles.canvasBody} key={idx}>
                • [{r.test}] {r.question} — &quot;{r.answer}&quot;
              </Text>
            ))
          )}
        </View>

        <View style={styles.canvasBox}>
          <Text style={styles.canvasLabel}>EVIDENCE TRAIL (faculty-tagged)</Text>
          {evidenceLog.length === 0 ? (
            <Text style={styles.emptyNote}>No evidence tags recorded yet.</Text>
          ) : (
            evidenceLog.map((e, idx) => (
              <Text style={styles.canvasBody} key={idx}>
                • [{fmtDate(e.date)}] {e.tag} — {e.source} (tagged by {e.faculty})
                {e.notes ? `: ${e.notes}` : ""}
              </Text>
            ))
          )}
        </View>

        <View style={styles.canvasBox}>
          <Text style={styles.canvasLabel}>FEEDBACK INCORPORATED</Text>
          {feedbackLog.length === 0 ? (
            <Text style={styles.emptyNote}>No feedback recorded yet.</Text>
          ) : (
            feedbackLog.map((f, idx) => (
              <Text style={styles.canvasBody} key={idx}>
                • [{fmtDate(f.date)}] {f.source} — {f.faculty}
                {f.rating === null ? "" : ` (${f.rating}/5)`}: &quot;{f.comment}&quot;
              </Text>
            ))
          )}
        </View>

        <Text style={styles.footer}>
          Generated automatically from live platform data — Student Progress & Evaluation Platform
        </Text>
      </Page>
    </Document>
  );
}
