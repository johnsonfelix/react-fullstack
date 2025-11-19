import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreateCarrierPage() {
  return (
    <CreateItemForm
      title="Carrier"
      placeholder="e.g. Goods, Service"
      apiPath="/api/administration/fields/carrier"
      redirectPath="/administration/fields/carrier"
    />
  );
}
