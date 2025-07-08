'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdministrationRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/administration/address'); // redirect to default subpage
  }, [router]);

  return null; // or loading spinner
}
