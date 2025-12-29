import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Canvas Drawing App',
  description: 'A minimal drawing application inspired by Excalidraw',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
