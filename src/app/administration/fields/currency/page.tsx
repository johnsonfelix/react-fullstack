// app/administration/currencies/page.tsx
import EntityTable from "@/app/components/form/EntityTable";

export default function CurrenciesPage() {
  return (
    <EntityTable
      title="Currency"
      apiPath="administration/fields/currency"
      createLink="currency/create"
      displayField="name"
    />
  );
}