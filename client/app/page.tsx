'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new canvas ID and redirect to canvas page
    const newCanvasId = uuidv4();
    router.push(`/canvas/${newCanvasId}`);
  }, [router]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>
          Canvas Drawing App
        </h1>
        <p style={{ color: '#6b7280' }}>Creating a new canvas...</p>
      </div>
    </main>
  );
}
