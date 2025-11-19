import EntityTable from "@/app/components/form/EntityTable";

export default function CurrenciesPage() {
  return (
    <EntityTable
      title="Incoterms"
      apiPath="administration/fields/incoterms"
      createLink="incoterms/create"
      displayField="name"
    />
  );
}