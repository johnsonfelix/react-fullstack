import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreateCurrencyPage() {
  return (
    <CreateItemForm
      title="Currency"
      placeholder="e.g. USD, INR, EUR"
      apiPath="/api/administration/fields/currency"
      redirectPath="/administration/fields/currency"
    />
  );
}
