// /app/lib/deleteS3Files.ts
export async function deleteS3Files(urls: string[] | string) {
  const body = Array.isArray(urls) ? { urls } : { urls: [urls] };
  try {
    const res = await fetch("/api/s3/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) {
      console.warn("deleteS3Files failed:", json);
      return { ok: false, data: json };
    }
    return { ok: true, data: json };
  } catch (err) {
    console.error("deleteS3Files network error:", err);
    return { ok: false, error: err };
  }
}
