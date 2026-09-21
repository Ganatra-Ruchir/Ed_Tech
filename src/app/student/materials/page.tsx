import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { BookOpen, Sparkles } from "lucide-react";
import { StudentMaterialLibrary } from "@/components/materials/StudentMaterialLibrary";
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

  return <div className="space-y-5">
    <section className="relative overflow-hidden rounded-md border border-[#e5e0d7] bg-[linear-gradient(105deg,#fff_0%,#fbf8f3_62%,#f4eee3_100%)] px-5 py-5 sm:px-7">
      <div className="relative z-10 max-w-2xl">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase text-[#a43f31]">
          <Sparkles size={13} /> Learning library
        </div>
        <h1 className="text-2xl font-bold text-[#17212b] sm:text-[28px]">Study materials</h1>
        <p className="mt-1 text-sm text-[#5f6b7a]">Notes, presentations, references, and assignments shared by your faculty.</p>
      </div>
      <BookOpen className="absolute -bottom-5 right-5 hidden h-28 w-28 rotate-[-4deg] text-[#b07a43]/25 sm:block" strokeWidth={1.2} />
    </section>
    <StudentMaterialLibrary materials={materials} userId={session!.sub} />
  </div>;
}
