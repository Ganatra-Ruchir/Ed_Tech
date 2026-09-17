import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#555555", marginBottom: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: "1px solid #cccccc",
  },
  row: { flexDirection: "row" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  kpiCard: {
    width: "23%",
    padding: 8,
    backgroundColor: "#f4f5f7",
    borderRadius: 4,
    marginBottom: 8,
  },
  kpiValue: { fontSize: 15, fontWeight: 700 },
  kpiLabel: { fontSize: 8, color: "#555555", marginTop: 2 },
  table: { display: "flex", width: "100%", marginTop: 4 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #e5e5e5", paddingVertical: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #333333",
    paddingVertical: 4,
    fontWeight: 700,
  },
  cell: { flex: 1, paddingRight: 4 },
  badge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  canvasBox: {
    border: "1px solid #cccccc",
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
  },
  canvasLabel: { fontSize: 9, fontWeight: 700, marginBottom: 3, color: "#333333" },
  canvasBody: { fontSize: 9, color: "#222222", lineHeight: 1.4 },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: "#999999",
    textAlign: "center",
  },
  emptyNote: { fontSize: 9, color: "#888888", fontStyle: "italic" },
});

export function statusColor(status: string): { backgroundColor: string; color: string } {
  switch (status) {
    case "APPROVED":
      return { backgroundColor: "#dcfce7", color: "#166534" };
    case "NEEDS_REVISION":
      return { backgroundColor: "#fee2e2", color: "#991b1b" };
    case "IN_REVIEW":
      return { backgroundColor: "#fef9c3", color: "#854d0e" };
    default:
      return { backgroundColor: "#e0e7ff", color: "#3730a3" };
  }
}
