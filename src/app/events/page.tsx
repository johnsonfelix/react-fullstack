"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BrfqList() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
  try {
    const [brfqRes, rfpRes] = await Promise.all([
      fetch("/api/brfq", { cache: "no-store" }),
      fetch("/api/procurement", { cache: "no-store" }),
    ]);

    const [brfqs, rfps] = await Promise.all([
      brfqRes.json(),
      rfpRes.json(),
    ]);

    const formattedBrfqs = brfqs.map((item: any) => ({
      id: item.id,
      title: item.title,
      closeDate: item.closeDate,
      createdAt: item.createdAt,
      eventType: "RFQ",
    }));


    const formattedRfps = rfps.map((item: any) => ({
      id: item.id,
      title: item.title,
      closeDate: item.additionalFields?.closeDate ?? null, // ✅ fixed
      createdAt: item.createdAt,
      eventType: "RFP",
    }));

    const combinedEvents = [...formattedBrfqs, ...formattedRfps];
    combinedEvents.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setEvents(combinedEvents);
  } catch (error) {
    console.error("Error fetching events:", error);
  }
};


  const handleDelete = async (id: string, type: string) => {
    if (confirm("Are you sure you want to delete this event?")) {
      if (type === "RFQ") {
        await fetch(`/api/brfq/${id}`, { method: "DELETE" });
      } else if (type === "RFP") {
        await fetch(`/api/procurement/${id}`, { method: "DELETE" });
      }
      fetchEvents();
      router.refresh();
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
      </div>

      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full bg-white">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600 uppercase text-sm leading-normal">
              <th className="py-3 px-6">#</th>
              <th className="py-3 px-6">Title</th>
              <th className="py-3 px-6">Event Type</th>
              <th className="py-3 px-6">Close Date</th>
              <th className="py-3 px-6">Created At</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-700 text-sm">
            {events.length > 0 ? (
              events.map((event, index) => (
                <tr key={event.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6">{index + 1}</td>
                  <td className="py-3 px-6">
                    <Link
  href={event.eventType === "RFQ" ? `/events/${event.id}` : `/buyer/rfp/${event.id}`}
  className="text-blue-600 hover:underline"
>
  {event.title}
</Link>
                  </td>
                  <td className="py-3 px-6">{event.eventType}</td>
                  <td className="py-3 px-6">
                    {event.closeDate
                      ? new Date(event.closeDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-3 px-6">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-6">
                    <button
                      onClick={() => handleDelete(event.id, event.eventType)}
                      className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  No events found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
