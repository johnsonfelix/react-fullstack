// app/administration/currencies/page.tsx
import EntityTable from "@/app/components/form/EntityTable";

export default function UrgencyPage() {
  return (
    <EntityTable
      title="Urgency"
      apiPath="administration/fields/urgency"
      createLink="urgency/create"
      displayField="name"
    />
  );
}