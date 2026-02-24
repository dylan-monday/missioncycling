import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    // Get users with KOMs
    const { data: usersWithKoms } = await supabase
      .from('users')
      .select('name, first_name, kom_count')
      .gt('kom_count', 0)
      .order('kom_count', { ascending: false })
      .limit(10);

    // Get total KOM count across all users
    const { data: totalKoms } = await supabase
      .from('users')
      .select('kom_count')
      .gt('kom_count', 0);

    const totalKomCount = totalKoms?.reduce((sum, u) => sum + (u.kom_count || 0), 0) || 0;

    // Get some interesting KOMs from the athlete_koms table
    const { data: featuredKoms } = await supabase
      .from('athlete_koms')
      .select(`
        segment_name,
        kom_type,
        time_display,
        users!inner(name, first_name)
      `)
      .limit(20);

    // Build ticker items
    const items: { label: string; value: string }[] = [];

    // Add KOM holder stats
    if (usersWithKoms && usersWithKoms.length > 0) {
      // Top KOM holder
      const topHolder = usersWithKoms[0];
      if (topHolder.kom_count && topHolder.kom_count > 1) {
        items.push({
          label: 'KOM Leader',
          value: `${topHolder.first_name || topHolder.name} holds ${topHolder.kom_count} KOMs`,
        });
      }

      // Total KOMs in club
      if (totalKomCount > 0) {
        items.push({
          label: 'Club KOMs',
          value: `${totalKomCount} KOMs/QOMs held by MC riders`,
        });
      }

      // Multiple KOM holders
      const multiKomHolders = usersWithKoms.filter(u => (u.kom_count || 0) > 1);
      if (multiKomHolders.length > 1) {
        items.push({
          label: 'Crown Collectors',
          value: `${multiKomHolders.length} riders hold multiple KOMs`,
        });
      }
    }

    // Add featured KOMs
    if (featuredKoms && featuredKoms.length > 0) {
      // Pick a few random KOMs to feature
      const shuffled = featuredKoms.sort(() => Math.random() - 0.5).slice(0, 5);
      for (const kom of shuffled) {
        const user = kom.users as any;
        const typeName = kom.kom_type === 'qom' ? 'QOM' : 'KOM';
        items.push({
          label: typeName,
          value: `${user?.first_name || user?.name || 'Unknown'} — ${kom.segment_name}`,
        });
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error fetching ticker stats:', error);
    return NextResponse.json({ items: [] });
  }
}
