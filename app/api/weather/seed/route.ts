import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { fetchYearWeather } from '@/lib/weather';

/**
 * GET /api/weather/seed
 *
 * One-time endpoint to populate weather_daily table with 2008-2022 SF weather.
 * Takes about 30 seconds to fetch all data from Open-Meteo.
 * Safe to run multiple times (uses upsert).
 */
export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Check if we already have data
    const { count } = await supabase
      .from('weather_daily')
      .select('*', { count: 'exact', head: true });

    if (count && count > 5000) {
      return NextResponse.json({
        message: 'Weather data already seeded',
        rowCount: count,
      });
    }

    console.log('[Weather Seed] Starting fetch from Open-Meteo...');

    const allRows: any[] = [];

    // Fetch year by year (2008-2022)
    for (let year = 2008; year <= 2022; year++) {
      console.log(`[Weather Seed] Fetching ${year}...`);

      const rows = await fetchYearWeather(year);
      allRows.push(...rows);

      // Be polite to the free API
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`[Weather Seed] Fetched ${allRows.length} days, inserting to Supabase...`);

    // Batch insert in chunks of 500
    const chunkSize = 500;
    let inserted = 0;

    for (let i = 0; i < allRows.length; i += chunkSize) {
      const chunk = allRows.slice(i, i + chunkSize);

      const { error } = await supabase
        .from('weather_daily')
        .upsert(chunk, { onConflict: 'date' });

      if (error) {
        console.error(`[Weather Seed] Error inserting chunk:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      inserted += chunk.length;
      console.log(`[Weather Seed] Inserted ${inserted}/${allRows.length}`);
    }

    console.log('[Weather Seed] Complete!');

    return NextResponse.json({
      message: 'Weather data seeded successfully',
      rowCount: allRows.length,
      years: '2008-2022',
    });
  } catch (error) {
    console.error('[Weather Seed] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
