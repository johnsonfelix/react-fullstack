// File: src/app/administration/questionnaires/new/page.tsx
import React, { Suspense } from "react";
import QuestionnaireFormClient from "./QuestionnaireFormClient";

export default function Page() {
  return (
    <main>
      <h1 className="sr-only">Create New Questionnaire</h1>

      <Suspense fallback={<div className="p-8 text-center">Loading form…</div>}>
        <QuestionnaireFormClient />
      </Suspense>
    </main>
  );
}
