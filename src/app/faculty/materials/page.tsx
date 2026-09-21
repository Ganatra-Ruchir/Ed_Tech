import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { MaterialLibrary } from "@/components/materials/MaterialLibrary";
import type { LearningMaterialDTO } from "@/lib/materials";
import { MaterialUploadForm } from "./MaterialUploadForm";

export default async function FacultyMaterialsPage() {
  const session = await getSession();
  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((batch) => batch.id)
    : await userBatchIds(session!.sub);
  const [batches, records] = await Promise.all([
    prisma.batch.findMany({ where: { id: { in: batchIds } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.learningMaterial.findMany({
      where: { batchId: { in: batchIds } },
      include: { batch: { select: { name: true } }, faculty: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const materials: LearningMaterialDTO[] = records.map((material) => ({
    id: material.id, batchId: material.batchId, batchName: material.batch.name,
    subject: material.subject, title: material.title, description: material.description,
    fileUrl: material.fileUrl, fileName: material.fileName, fileType: material.fileType,
    fileSize: material.fileSize, facultyName: material.faculty.name, createdAt: material.createdAt.toISOString(),
  }));

  return <div className="space-y-6">
    <PageHeader title="Study materials" description="Upload notes, slides, reference files, and other subject resources for your batches." />
    {batches.length > 0 ? <div className="flex justify-end"><MaterialUploadForm batches={batches} /></div> : <p className="rounded-md border border-dashed border-[#cbd1c8] bg-white p-8 text-center text-sm text-[#667085]">No batches are assigned to your account.</p>}
    <MaterialLibrary materials={materials} />
  </div>;
}
