import EntityTable from "@/app/components/form/EntityTable";

export default function CurrenciesPage() {
  return (
    <EntityTable
      title="Carrier"
      apiPath="administration/fields/carrier"
      createLink="carrier/create"
      displayField="name"
    />
  );
}