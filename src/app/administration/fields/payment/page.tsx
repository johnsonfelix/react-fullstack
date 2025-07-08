// app/administration/currencies/page.tsx
import EntityTable from "@/app/components/form/EntityTable";

export default function CurrenciesPage() {
  return (
    <EntityTable
      title="Payment"
      apiPath="administration/fields/payment"
      createLink="payment/create"
      displayField="name"
    />
  );
}