import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreateIncotermPage() {
  return (
    <CreateItemForm
      title="Service Type"
      placeholder="e.g. Goods, Service"
      apiPath="/api/administration/fields/serviceType"
      redirectPath="/administration/fields/serviceType"
    />
  );
}
