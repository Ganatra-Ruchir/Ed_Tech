import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userBatchIds } from "@/lib/permissions";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Table, THead, Th, Tr, Td } from "@/components/Table";
import { CreateBatchForm } from "./CreateBatchForm";

export default async function FacultyBatchesPage() {
  const session = await getSession();

  const batches = await prisma.batch.findMany({
    where: session!.isCC ? {} : { id: { in: await userBatchIds(session!.sub) } },
    include: { _count: { select: { members: true, submissions: true, tests: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Batches" description="Create batches and manage rosters." />

      <CreateBatchForm />

      <Card className="overflow-hidden">
        {batches.length === 0 ? (
          <EmptyState icon={Building2} title="No batches yet" description="Create one above to get started." />
        ) : (
          <Table>
            <THead>
              <Th>Batch</Th>
              <Th>Department</Th>
              <Th>Semester</Th>
              <Th>Students</Th>
              <Th></Th>
            </THead>
            <tbody>
              {batches.map((b) => (
                <Tr key={b.id}>
                  <Td className="font-medium text-zinc-900">{b.name}</Td>
                  <Td className="text-zinc-500">{b.department}</Td>
                  <Td className="text-zinc-500">{b.semester}</Td>
                  <Td>{b._count.members}</Td>
                  <Td>
                    <Link
                      href={`/faculty/batches/${b.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      Manage roster <ArrowRight size={12} />
                    </Link>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
