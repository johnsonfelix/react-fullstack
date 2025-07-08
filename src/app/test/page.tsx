'use client';

import { useState } from 'react';

export default function TestEmailButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleSendEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/test-email');
      const data = await res.json();
      setResult(data.message || data.error);
    } catch (err) {
      setResult('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleSendEmail}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Sending...' : 'Send Test Email'}
      </button>
      {result && <p className="mt-2">{result}</p>}
    </div>
  );
}
