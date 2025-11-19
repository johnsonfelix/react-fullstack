import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreateIncotermPage() {
  return (
    <CreateItemForm
      title="Incoterms"
      placeholder="e.g. USD, INR, EUR"
      apiPath="/api/administration/fields/incoterms"
      redirectPath="/administration/fields/incoterms"
    />
  );
}
