import RfpLayout from "./RfpLayout";

export default async function RfpPage({ params }: any) {
  const { id } = params; // ✅ Do not await, id is a string here

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/rfp/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    return <div className="p-8 text-red-600">RFP not found.</div>;
  }

  const procurement = await res.json();

  return <RfpLayout procurement={procurement} />;
}
