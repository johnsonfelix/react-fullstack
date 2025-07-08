import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreateUomPage() {
  return (
    <CreateItemForm
      title="UOM"
      placeholder="e.g. KG, mm"
      apiPath="/api/administration/fields/uom"
      redirectPath="/administration/fields/uom"
    />
  );
}
