import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mission Cycling Retrospective | 2008-2022',
  description: 'The sexiest cycling club on 18th Street. A retrospective of Mission Cycling\'s glory years.',
  keywords: ['cycling', 'San Francisco', 'Mission Cycling', 'Strava', 'leaderboard'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/kyf7yii.css" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
