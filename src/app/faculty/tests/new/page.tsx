import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { TestBuilder } from "./TestBuilder";

export default async function NewTestPage() {
  const session = await getSession();

  const batchIds = session!.isCC
    ? (await prisma.batch.findMany({ select: { id: true } })).map((b) => b.id)
    : await userBatchIds(session!.sub);

  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds } },
    orderBy: { name: "asc" },
  });

  return <TestBuilder batches={batches.map((b) => ({ id: b.id, name: b.name }))} />;
}
