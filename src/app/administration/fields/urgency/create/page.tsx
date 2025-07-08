import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreateUrgencyPage() {
  return (
    <CreateItemForm
      title="Urgency"
      placeholder="e.g. One Day, Two Days"
      apiPath="/api/administration/fields/urgency"
      redirectPath="/administration/fields/urgency"
    />
  );
}
