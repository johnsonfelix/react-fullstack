import RfpLayout from "./RfpLayout";
import prisma from "@/app/prisma";

interface RfpPageProps {
  params: { id: string };
}

export default async function RfpPage({ params }: RfpPageProps) {
  const procurement = await prisma.procurementRequest.findUnique({
    where: { id: params.id },
    include: { scopeOfWork: true, items: true, suppliers: true },
  });

  if (!procurement) {
    return <div className="p-8 text-red-600">RFP not found.</div>;
  }

  return <RfpLayout procurement={procurement} />;
}
