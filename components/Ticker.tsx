'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import segmentsData from '@/data/segments.json';
import { CLUB_LORE_TICKER } from '@/data/club-lore';

// Updated sponsor list with new logos
const SPONSORS = [
  { name: 'Tartine', logo: '/sponsors/tartine bakery.png' },
  { name: 'Bi-Rite', logo: '/sponsors/bi rite market.png' },
  { name: 'Ritual', logo: '/sponsors/ritual coffee roasters.png' },
  { name: 'Delfina', logo: '/sponsors/delfina.png' },
  { name: 'Flour + Water', logo: '/sponsors/flour and water.png' },
  { name: 'Range', logo: '/sponsors/range.png' },
  { name: '500 Club', logo: '/sponsors/the 500 club.png' },
  { name: 'Weird Fish', logo: '/sponsors/weird fish.png' },
  { name: 'Amnesia', logo: '/sponsors/amnesia.png' },
  { name: 'Anchor Brewing', logo: '/sponsors/anchor brewing.png' },
  { name: 'Coffee Bar', logo: '/sponsors/coffee bar.png' },
  { name: 'Monks Kettle', logo: '/sponsors/the monks kettle.png' },
];

// Member spotlights - fun facts about club members
const MEMBER_SPOTLIGHTS = [
  { label: 'Most Versatile', value: 'Trevor Gilmore — Top 5 on every segment' },
  { label: 'Iron Legs', value: 'Nick Kreeger — 464W on Hawk Hill' },
  { label: 'Consistency King', value: 'Joe Mulvaney — Podium on 4 segments' },
  { label: 'Euro Crusher', value: "G™ — 53:39 up Alpe d'Huez" },
  { label: 'Power Move', value: 'C P — 380W climbing Radio Road' },
  { label: 'Old School', value: 'Wayne Rickenbacker — 6:51 Hawk Hill since 2012' },
];

function generateTickerItems() {
  const items: { label: string; value: string }[] = [];
  const segments = segmentsData.segments.filter(s => s.visible);

  // Add segment records
  segments.forEach(segment => {
    const leader = segment.mission_cycling_leaderboard[0];
    if (leader?.claimed) {
      items.push({
        label: `${segment.name} Record`,
        value: `${leader.name} — ${leader.time}`
      });
    }
  });

  // Add unclaimed spots hooks
  segments.forEach(segment => {
    const unclaimed = segment.mission_cycling_leaderboard.filter(e => !e.claimed).length;
    if (unclaimed > 0) {
      items.push({
        label: 'Open Spots',
        value: `${unclaimed} unclaimed on ${segment.name} — Claim yours`
      });
    }
  });

  // Add newest/latest times (most recent dates)
  const allEntries = segments.flatMap(segment =>
    segment.mission_cycling_leaderboard
      .filter(e => e.claimed && e.date)
      .map(e => ({ ...e, segmentName: segment.name }))
  );

  const sortedByDate = allEntries
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime())
    .slice(0, 3);

  sortedByDate.forEach(entry => {
    const date = new Date(entry.date!);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    items.push({
      label: `Latest ${entry.segmentName} PR`,
      value: `${entry.name} — ${entry.time} (${dateStr})`
    });
  });

  // Add club stats
  items.push({
    label: 'Club Miles 2008-2022',
    value: '847,293 total'
  });

  items.push({
    label: 'Active Members',
    value: '149 riders strong'
  });

  items.push({
    label: 'Segments Conquered',
    value: '5 legendary climbs'
  });

  // Add total club members across segments
  const totalClubMembers = segments.reduce((sum, s) => sum + s.clubMembers, 0);
  items.push({
    label: 'Segment Efforts',
    value: `${totalClubMembers.toLocaleString()} club leaderboard entries`
  });

  // Add member spotlights
  items.push(...MEMBER_SPOTLIGHTS);

  // Add power stats
  const highPowerEntries = allEntries
    .filter(e => e.power && parseInt(e.power) > 350)
    .slice(0, 2);

  highPowerEntries.forEach(entry => {
    items.push({
      label: 'Power Record',
      value: `${entry.name} — ${entry.power} on ${entry.segmentName}`
    });
  });

  // Add club lore (Tier 3 content)
  CLUB_LORE_TICKER.forEach(lore => {
    // Skip items with [FILL] placeholders
    if (lore.text.includes('[FILL]')) return;
    items.push({
      label: '',
      value: lore.text,
    });
  });

  // Insert slogan after every 5th item
  const itemsWithSlogan: { label: string; value: string; isSlogan?: boolean }[] = [];
  items.forEach((item, index) => {
    itemsWithSlogan.push(item);
    if ((index + 1) % 5 === 0) {
      itemsWithSlogan.push({ label: '', value: 'PREMIUM SUFFERING SINCE 2008', isSlogan: true });
    }
  });

  return itemsWithSlogan;
}

export default function Ticker() {
  const [sponsorIndex, setSponsorIndex] = useState(0);
  const [komItems, setKomItems] = useState<{ label: string; value: string }[]>([]);

  // Fetch KOM stats for ticker
  useEffect(() => {
    fetch('/api/ticker-stats')
      .then(res => res.json())
      .then(data => {
        if (data.items && data.items.length > 0) {
          setKomItems(data.items);
        }
      })
      .catch(() => {});
  }, []);

  const tickerItems = useMemo(() => {
    const items = generateTickerItems();
    // Insert KOM items after position 3 if we have them
    if (komItems.length > 0) {
      items.splice(3, 0, ...komItems);
    }
    return items;
  }, [komItems]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSponsorIndex((prev) => (prev + 1) % SPONSORS.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="ticker">
      {/* Double line - Mission Cycling signature */}
      <div className="ticker-lines">
        <div className="ticker-line"></div>
        <div className="ticker-line"></div>
      </div>

      {/* Ticker content */}
      <div className="ticker-content">
        {/* Sponsor - white background extends to left edge */}
        <div className="ticker-sponsor">
          <AnimatePresence mode="wait">
            <motion.div
              key={sponsorIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              <Image
                src={SPONSORS[sponsorIndex].logo}
                alt={SPONSORS[sponsorIndex].name}
                width={140}
                height={36}
                className="object-contain"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Scrolling items */}
        <div className="ticker-scroll">
          <div className="ticker-scroll-inner">
            {/* Duplicate items for seamless loop */}
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <div key={index} className="ticker-item">
                {item.isSlogan ? (
                  <span className="ticker-slogan">{item.value}</span>
                ) : item.label ? (
                  <>
                    <span className="ticker-item-label">{item.label}:</span>
                    <span className="ticker-item-highlight">{item.value}</span>
                  </>
                ) : (
                  <span className="ticker-item-highlight">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Strava CTA */}
        <button className="ticker-cta">
          <svg viewBox="0 0 24 24">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
          <span>Claim Your Spot</span>
        </button>
      </div>
    </div>
  );
}
