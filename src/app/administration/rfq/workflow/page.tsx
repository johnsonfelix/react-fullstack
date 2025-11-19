// app/admin/workflow/page.tsx
import { redirect } from "next/navigation";

export default function Page() {
  // redirect to default tab
  redirect("/administration/rfq/workflow/approval");
}
