import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreateShippingPage() {
  return (
    <CreateItemForm
      title="Shipping"
      placeholder="e.g. Air, Land"
      apiPath="/api/administration/fields/shipping"
      redirectPath="/administration/fields/shipping"
    />
  );
}
