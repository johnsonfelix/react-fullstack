// app/admin/suppliers/page.tsx

'use client';

import { useState } from 'react';

export default function AdminSuppliersPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setMessage(`Invitation successfully sent to ${email}`);
      setEmail(''); // Clear the input field on success

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: '20px' }}>Invite a New Supplier</h1>
      <p style={{ marginBottom: '20px', color: '#666' }}>
        Enter the email address of the supplier you want to invite. They will receive a secure link to begin their registration.
      </p>

      <form onSubmit={handleSendInvitation}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="supplier@example.com"
          required
          style={inputStyle}
        />
        <button type="submit" disabled={isLoading} style={buttonStyle}>
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </button>
      </form>

      {message && <p style={{ color: 'green', marginTop: '15px' }}>{message}</p>}
      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
    </div>
  );
}

// Basic styling
const containerStyle = { 
  maxWidth: '600px', 
  margin: '50px auto', 
  padding: '30px', 
  border: '1px solid #e1e1e1', 
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
};

const inputStyle = { 
  width: '100%', 
  padding: '12px', 
  marginBottom: '15px',
  border: '1px solid #ccc',
  borderRadius: '5px',
  fontSize: '16px'
};

const buttonStyle = { 
  width: '100%', 
  padding: '12px', 
  backgroundColor: '#007bff', 
  color: 'white', 
  border: 'none', 
  borderRadius: '5px', 
  cursor: 'pointer',
  fontSize: '16px',
  opacity: 1 // We'll handle disabled state visually if needed
};
