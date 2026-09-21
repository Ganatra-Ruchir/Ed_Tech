import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { MaterialLibrary } from "@/components/materials/MaterialLibrary";
import type { LearningMaterialDTO } from "@/lib/materials";

export default async function StudentMaterialsPage() {
  const session = await getSession();
  const batchIds = await userBatchIds(session!.sub);
  const records = await prisma.learningMaterial.findMany({
    where: { batchId: { in: batchIds } },
    include: { batch: { select: { name: true } }, faculty: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const materials: LearningMaterialDTO[] = records.map((material) => ({
    id: material.id, batchId: material.batchId, batchName: material.batch.name,
    subject: material.subject, title: material.title, description: material.description,
    fileUrl: material.fileUrl, fileName: material.fileName, fileType: material.fileType,
    fileSize: material.fileSize, facultyName: material.faculty.name, createdAt: material.createdAt.toISOString(),
  }));

  return <div className="space-y-6">
    <PageHeader title="Study materials" description="Browse notes and resources shared with your batches, organized by subject." />
    <MaterialLibrary materials={materials} />
  </div>;
}
