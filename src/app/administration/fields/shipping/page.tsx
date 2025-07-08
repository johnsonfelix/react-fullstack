// app/administration/currencies/page.tsx
import EntityTable from "@/app/components/form/EntityTable";

export default function CurrenciesPage() {
  return (
    <EntityTable
      title="Shipping"
      apiPath="administration/fields/shipping"
      createLink="shipping/create"
      displayField="name"
    />
  );
}