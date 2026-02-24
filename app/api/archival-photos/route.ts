import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const archivalDir = path.join(process.cwd(), 'public', 'archival');

    // Check if directory exists
    if (!fs.existsSync(archivalDir)) {
      return NextResponse.json({ photos: [] });
    }

    // Get all image files
    const files = fs.readdirSync(archivalDir);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

    const photos = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => `/archival/${file}`);

    // Shuffle the array for random order
    const shuffled = photos.sort(() => Math.random() - 0.5);

    return NextResponse.json({ photos: shuffled });
  } catch (error) {
    console.error('Error reading archival photos:', error);
    return NextResponse.json({ photos: [] });
  }
}
