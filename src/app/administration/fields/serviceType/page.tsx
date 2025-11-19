import EntityTable from "@/app/components/form/EntityTable";

export default function CurrenciesPage() {
  return (
    <EntityTable
      title="Service Type"
      apiPath="administration/fields/serviceType"
      createLink="serviceType/create"
      displayField="name"
    />
  );
}