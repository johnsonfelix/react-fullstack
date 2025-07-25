import React, { Suspense } from 'react';
import SubmitQuote from './SubmitQuote';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading Quote Form...</div>}>
      <SubmitQuote />
    </Suspense>
  );
}
