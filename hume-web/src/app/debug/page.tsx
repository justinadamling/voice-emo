'use client';

export default function DebugPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Environment Debug</h1>
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="text-xl mb-2">Environment Variables:</h2>
        <pre className="bg-white p-2 rounded">
          {JSON.stringify(
            {
              NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
              NODE_ENV: process.env.NODE_ENV,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
} 