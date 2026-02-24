import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { generateTier1Stories, generateTier2Stories } from '@/lib/ticker-stories';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const items: { label: string; value: string }[] = [];

    // =========================================================================
    // KOM Stats
    // =========================================================================
    const { data: usersWithKoms } = await supabase
      .from('users')
      .select('name, first_name, kom_count')
      .gt('kom_count', 0)
      .order('kom_count', { ascending: false })
      .limit(10);

    if (usersWithKoms && usersWithKoms.length > 0) {
      const topHolder = usersWithKoms[0];
      if (topHolder.kom_count && topHolder.kom_count > 1) {
        items.push({
          label: 'KOM Leader',
          value: `${topHolder.first_name || topHolder.name} holds ${topHolder.kom_count} KOMs`,
        });
      }

      const totalKomCount = usersWithKoms.reduce((sum, u) => sum + (u.kom_count || 0), 0);
      if (totalKomCount > 0) {
        items.push({
          label: 'Club KOMs',
          value: `${totalKomCount} KOMs/QOMs held by MC riders`,
        });
      }
    }

    // =========================================================================
    // Tier 1: Activity-based stats (longest rides, elevation, etc.)
    // =========================================================================
    const { data: activities } = await supabase
      .from('activities')
      .select(`
        strava_activity_id,
        distance_mi,
        total_elevation_gain_ft,
        start_date_local,
        users!inner(name, first_name)
      `)
      .gt('distance_mi', 10)
      .order('distance_mi', { ascending: false })
      .limit(1000);

    if (activities && activities.length > 0) {
      // Format for Tier 1 generator
      const activityRows = activities.map((a: any) => ({
        user_name: a.users?.first_name || a.users?.name || 'Unknown',
        distance_mi: a.distance_mi,
        total_elevation_gain_ft: a.total_elevation_gain_ft || 0,
        start_date_local: a.start_date_local,
        ride_date: a.start_date_local?.split('T')[0] || '',
      }));

      // Get segment effort stats
      const { data: effortStats } = await supabase
        .from('segment_efforts')
        .select(`
          segment_id,
          user_id,
          users!inner(name, first_name)
        `);

      // Count efforts per user per segment
      const effortCounts = new Map<string, { user_name: string; segment_id: string; count: number }>();
      if (effortStats) {
        for (const e of effortStats as any[]) {
          const key = `${e.user_id}-${e.segment_id}`;
          const userName = e.users?.first_name || e.users?.name || 'Unknown';
          if (!effortCounts.has(key)) {
            effortCounts.set(key, { user_name: userName, segment_id: e.segment_id, count: 0 });
          }
          effortCounts.get(key)!.count++;
        }
      }

      const effortStatsRows = Array.from(effortCounts.values()).map(e => ({
        user_name: e.user_name,
        segment_id: e.segment_id,
        segment_name: formatSegmentName(e.segment_id),
        effort_count: e.count,
        best_time: 0,
        first_effort_date: '',
        latest_effort_date: '',
      }));

      // Generate Tier 1 stories
      const tier1Stories = generateTier1Stories([], effortStatsRows, activityRows);

      // Add interesting Tier 1 stories
      for (const story of tier1Stories) {
        if (story.category === 'club_stat' && story.weight >= 6) {
          items.push({ label: '', value: story.text });
        }
      }
    }

    // =========================================================================
    // Tier 2: Weather crossover stats
    // =========================================================================
    const { data: weather } = await supabase
      .from('weather_daily')
      .select('*')
      .order('date', { ascending: true });

    if (weather && weather.length > 0 && activities && activities.length > 0) {
      const activityRows = activities.map((a: any) => ({
        user_name: a.users?.first_name || a.users?.name || 'Unknown',
        distance_mi: a.distance_mi,
        total_elevation_gain_ft: a.total_elevation_gain_ft || 0,
        start_date_local: a.start_date_local,
        ride_date: a.start_date_local?.split('T')[0] || '',
      }));

      const weatherRows = weather.map((w: any) => ({
        date: w.date,
        temperature_max_f: w.temperature_max_f,
        temperature_min_f: w.temperature_min_f,
        precipitation_inches: w.precipitation_inches,
        wind_gusts_max_mph: w.wind_gusts_max_mph,
      }));

      const tier2Stories = generateTier2Stories(activityRows, weatherRows);

      // Add interesting Tier 2 stories
      for (const story of tier2Stories) {
        if (story.weight >= 7) {
          items.push({ label: '', value: story.text });
        }
      }
    }

    // =========================================================================
    // Shuffle and return
    // =========================================================================
    const shuffled = items.sort(() => Math.random() - 0.5);

    return NextResponse.json({ items: shuffled });
  } catch (error) {
    console.error('Error fetching ticker stats:', error);
    return NextResponse.json({ items: [] });
  }
}

function formatSegmentName(segmentId: string): string {
  const names: Record<string, string> = {
    'hawk-hill': 'Hawk Hill',
    'radio-road': 'Radio Road',
    'old-la-honda': 'Old La Honda',
    'hwy1-muir-beach': 'Hwy 1 from Muir Beach',
    'alpe-dhuez': "Alpe d'Huez",
    'four-corners': 'Four Corners',
    'bofax-climb': 'BoFax Climb',
    'bourg-doisans': "Bourg d'Oisans",
  };
  return names[segmentId] || segmentId;
}
