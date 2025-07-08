export default function AgreementPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-3xl font-bold mb-6">Terms and Conditions for Request for Quotation (RFQ)</h1>
      <p className="mb-6 text-sm text-gray-500">Effective Date: [Insert Date]</p>

      <p className="mb-6">
        Thank you for choosing to submit a Request for Quotation (RFQ) through our platform. Before proceeding,
        please review the following terms and conditions carefully. By agreeing to these terms, you acknowledge your
        understanding and acceptance of the responsibilities and legal obligations related to submitting an RFQ.
      </p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">1. General Agreement</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>The information provided in the RFQ form is complete and accurate to the best of your knowledge.</li>
          <li>You are authorized to act on behalf of your organization to initiate procurement requests.</li>
          <li>You agree to be contacted by selected suppliers based on your submission.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">2. Confidentiality</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>All supplier information, including pricing and quotes, must be treated as confidential.</li>
          <li>You agree not to disclose or republish supplier data outside your organization.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">3. No Obligation Clause</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Submission of an RFQ does not constitute a binding commitment to purchase.</li>
          <li>You may accept or reject any quote at your discretion.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">4. Supplier Communication</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>All communication must remain professional and within the scope of the RFQ.</li>
          <li>Any resulting contracts must comply with your internal procurement policies.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">5. File Uploads</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Uploaded files must be virus-free and appropriate for the RFQ.</li>
          <li>You are responsible for compliance with legal and regulatory standards.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">6. Limitation of Liability</h2>
        <p>
          Our platform serves as an intermediary and is not responsible for the accuracy of supplier responses or order fulfillment.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">7. Updates to Terms</h2>
        <p>
          We reserve the right to update these terms. You will be notified of changes and must accept them to continue submitting RFQs.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Acknowledgment</h2>
        <p>
          By checking the box on the RFQ submission form, you acknowledge that you have read, understood,
          and agree to be bound by these terms and conditions.
        </p>
      </section>

      <p className="text-sm text-gray-600 mt-6">
        For questions, please contact our support team at <a href="mailto:support@example.com" className="text-blue-600 underline">support@example.com</a>.
      </p>
    </div>
  );
}
