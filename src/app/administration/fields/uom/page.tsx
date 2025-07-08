// app/administration/currencies/page.tsx
import EntityTable from "@/app/components/form/EntityTable";

export default function UomPage() {
  return (
    <EntityTable
      title="UOM"
      apiPath="administration/fields/uom"
      createLink="uom/create"
      displayField="name"
    />
  );
}