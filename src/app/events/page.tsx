'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type EventItem = {
  id: string;
  title: string;
  closeDate?: string | null;
  createdAt: string;
  eventType: "RFQ" | "RFP" | string;
  status?: string;
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  // helper to normalize API result which may be either an array or { data: [...] }
  const normalizeList = async (res: Response) => {
    if (!res.ok) return [];
    try {
      const json = await res.json();
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      // in some endpoints single object is returned — wrap it
      if (json && typeof json === 'object') return [json];
    } catch (e) {
      console.warn('Failed to parse JSON list', e);
    }
    return [];
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const [brfqRes, rfpRes] = await Promise.all([
        fetch("/api/brfq", { cache: "no-store" }),
        fetch("/api/procurement", { cache: "no-store" }),
      ]);

      const [brfqsRaw, rfpsRaw] = await Promise.all([normalizeList(brfqRes), normalizeList(rfpRes)]);

      const formattedBrfqs = (brfqsRaw || []).map((item: any) => ({
        id: item.id,
        title: item.title || item.rfqId || 'Untitled RFQ',
        closeDate: item.closeDate ?? item.closeDateTime ?? item.close ?? null,
        createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
        eventType: "RFQ",
        status: item.status ?? item.state ?? "draft",
      }));

      const formattedRfps = (rfpsRaw || []).map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled RFP',
        closeDate: item.additionalFields?.closeDate ?? item.closeDate ?? null,
        createdAt: item.createdAt ?? item.created_at ?? new Date().toISOString(),
        eventType: "RFP",
        status: item.status ?? item.state ?? "draft",
      }));

      const combinedEvents = [...formattedBrfqs, ...formattedRfps];
      combinedEvents.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setEvents(combinedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      if (type === "RFQ") {
        await fetch(`/api/brfq/${id}`, { method: "DELETE" });
      } else if (type === "RFP") {
        await fetch(`/api/procurement/${id}`, { method: "DELETE" });
      }
      await fetchEvents();
      router.refresh();
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete");
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Events</h1>
        <div>
          {/* <Link href="/events/new" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">Create RFQ</Link> */}
        </div>
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
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6">Actions</th>
            </tr>
          </thead>

          <tbody className="text-gray-700 text-sm">
            {loading ? (
              <tr><td colSpan={7} className="py-6 text-center">Loading...</td></tr>
            ) : events.length > 0 ? (
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
                    {event.closeDate ? new Date(event.closeDate).toLocaleDateString() : "-"}
                  </td>
                  <td className="py-3 px-6">{new Date(event.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-6">
                    <span className={`px-2 py-1 rounded text-xs ${event.status === 'published' ? 'bg-green-100 text-green-800' : event.status === 'approval_pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                      {event.status || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      {/* Pass rfqId in querystring so the RFQ form that reads window.location.search can resume the draft */}
                      <Link
                        href={
                          event.eventType === "RFQ"
                            ? `/buyer/events/edit/${event.id}?rfqId=${encodeURIComponent(event.id)}`
                            : `/buyer/rfp/${event.id}/edit?id=${encodeURIComponent(event.id)}`
                        }
                        className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(event.id, event.eventType)}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-400">No events found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
