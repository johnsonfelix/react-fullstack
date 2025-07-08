import CreateItemForm from "@/app/components/form/CreateItemForm";

export default function CreatePaymentPage() {
  return (
    <CreateItemForm
      title="Payment"
      placeholder="e.g. Credit Card,COD"
      apiPath="/api/administration/fields/payment"
      redirectPath="/administration/fields/payment"
    />
  );
}
