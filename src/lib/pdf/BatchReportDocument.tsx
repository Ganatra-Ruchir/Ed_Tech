import { Document, Page, Text, View } from "@react-pdf/renderer";
import { styles } from "./styles";
import type { BatchReportData } from "./data";

function fmtNum(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "-";
}

export function BatchReportDocument({ data }: { data: BatchReportData }) {
  const { batch, students, kpi, submissionsByStatus } = data;

  return (
    <Document title={`Batch Report - ${batch.name}`} author="Student Progress & Evaluation Platform">
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Batch Progress Report</Text>
        <Text style={styles.subtitle}>
          {batch.name} · {batch.department} · Semester {batch.semester}
        </Text>
        <Text style={styles.subtitle}>Generated {new Date().toLocaleDateString("en-IN")}</Text>

        <Text style={styles.sectionTitle}>Cohort KPIs</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpi.studentCount}</Text>
            <Text style={styles.kpiLabel}>Students</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, kpi.atRiskCount > 0 ? { color: "#b91c1c" } : {}]}>
              {kpi.atRiskCount}
            </Text>
            <Text style={styles.kpiLabel}>At-risk students</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtNum(kpi.submissionCompletionRate)}%</Text>
            <Text style={styles.kpiLabel}>Avg completion rate</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtNum(kpi.avgTestScorePct)}%</Text>
            <Text style={styles.kpiLabel}>Avg test score</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{fmtNum(kpi.reviewTurnaroundHours)}h</Text>
            <Text style={styles.kpiLabel}>Avg review turnaround</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{kpi.totalSubmissions}</Text>
            <Text style={styles.kpiLabel}>Total submissions</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Submissions by Status</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.cell}>Status</Text>
            <Text style={styles.cell}>Count</Text>
          </View>
          {submissionsByStatus.map((row) => (
            <View style={styles.tableRow} key={row.status}>
              <Text style={styles.cell}>{row.status}</Text>
              <Text style={styles.cell}>{row._count._all}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Student Roster</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.cell}>Name</Text>
            <Text style={styles.cell}>Completion</Text>
            <Text style={styles.cell}>Avg Score</Text>
            <Text style={styles.cell}>Status</Text>
          </View>
          {students.map((s) => (
            <View style={styles.tableRow} key={s.id}>
              <Text style={styles.cell}>{s.name}</Text>
              <Text style={styles.cell}>{fmtNum(s.submissionCompletionRate)}%</Text>
              <Text style={styles.cell}>{fmtNum(s.avgTestScorePct)}%</Text>
              <Text style={[styles.cell, s.atRisk ? { color: "#b91c1c" } : {}]}>
                {s.atRisk ? "At risk" : "On track"}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Generated automatically from live platform data — Student Progress & Evaluation Platform
        </Text>
      </Page>
    </Document>
  );
}
