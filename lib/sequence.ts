// =============================================================================
// Mission Cycling — Broadcast Sequence Engine
// =============================================================================
//
// Orchestrates the viewing experience: what plays when.
//
// The broadcast is a sequence of items:
// - Leaderboard segments (top 10, find me, KOM standings)
// - Commercial breaks (2-3 interstitials in a row)
// - Single interstitials (between segments)
//
// Rules:
// 1. Never interrupt mid-leaderboard
// 2. Insert a commercial break every 2-3 segments
// 3. Vary the interstitial types within a break
// 4. If user is authenticated, sprinkle in "Find Me" views
// 5. Special leaderboards (KOM, Iron Rider) appear once per full rotation
// 6. Greatest Hits card appears right after a user authenticates
// =============================================================================

interface Segment {
  id: string;
  name: string;
  visible: boolean;
}

interface Interstitial {
  id: string;
  type: string;
  weight: number;
  active: boolean;
}

export type SequenceItemType =
  | 'leaderboard_top10'
  | 'leaderboard_find_me'
  | 'leaderboard_kom'
  | 'leaderboard_iron_rider'
  | 'commercial_break'
  | 'interstitial'
  | 'greatest_hits'
  | 'club_intro';

export interface SequenceItem {
  type: SequenceItemType;
  segmentId?: string;
  interstitialIds?: string[]; // For commercial breaks (2-3 interstitials)
  interstitialId?: string; // For single interstitials
  userId?: string; // For greatest hits / find me
  duration?: number; // Override default timing
}

// =============================================================================
// Sequence Builder
// =============================================================================

export interface SequenceConfig {
  segments: Segment[];
  interstitials: Interstitial[];
  authenticatedUserId: string | null;
  isFirstVisit: boolean;
  commercialBreakInterval: number; // Insert break every N segments (default: 3)
  includeKomLeaderboard: boolean;
  includeIronRiderLeaderboard: boolean;
  showGreatestHitsOnAuth: boolean;
}

export function buildSequence(config: SequenceConfig): SequenceItem[] {
  const sequence: SequenceItem[] = [];
  const visibleSegments = config.segments.filter(s => s.visible);
  const interval = config.commercialBreakInterval || 3;

  // 1. Club intro (first visit only)
  if (config.isFirstVisit) {
    sequence.push({ type: 'club_intro', duration: 25000 });
  }

  // 2. Greatest Hits (if user just authenticated)
  if (config.showGreatestHitsOnAuth && config.authenticatedUserId) {
    sequence.push({
      type: 'greatest_hits',
      userId: config.authenticatedUserId,
      duration: 15000,
    });
  }

  // 3. Build the main rotation
  let segmentsSinceBreak = 0;
  let komInserted = false;
  let ironRiderInserted = false;

  for (let i = 0; i < visibleSegments.length; i++) {
    const segment = visibleSegments[i];

    // Standard leaderboard (top 10)
    sequence.push({
      type: 'leaderboard_top10',
      segmentId: segment.id,
    });
    segmentsSinceBreak++;

    // Optionally add "Find Me" for authenticated users (every other segment)
    if (config.authenticatedUserId && i % 2 === 1) {
      sequence.push({
        type: 'leaderboard_find_me',
        segmentId: segment.id,
        userId: config.authenticatedUserId,
      });
    }

    // Insert commercial break?
    if (segmentsSinceBreak >= interval) {
      const breakItems = selectCommercialBreak(config.interstitials);
      if (breakItems.length > 0) {
        sequence.push({
          type: 'commercial_break',
          interstitialIds: breakItems.map(b => b.id),
          duration: breakItems.length * 5000,
        });
      }
      segmentsSinceBreak = 0;

      // Insert special leaderboard after a commercial break
      if (config.includeKomLeaderboard && !komInserted) {
        sequence.push({ type: 'leaderboard_kom' });
        komInserted = true;
      } else if (config.includeIronRiderLeaderboard && !ironRiderInserted) {
        sequence.push({ type: 'leaderboard_iron_rider' });
        ironRiderInserted = true;
      }
    }
  }

  return sequence;
}

// =============================================================================
// Commercial Break Selection
// =============================================================================

function selectCommercialBreak(interstitials: Interstitial[]): Interstitial[] {
  const active = interstitials.filter(i => i.active);
  if (active.length === 0) return [];

  // Pick 2-3 items, preferring variety in type
  const breakSize = Math.min(active.length, Math.random() > 0.5 ? 3 : 2);
  const selected: Interstitial[] = [];
  const usedTypes = new Set<string>();

  // First pass: pick one of each type
  const shuffled = [...active].sort(() => Math.random() - 0.5);
  for (const item of shuffled) {
    if (selected.length >= breakSize) break;
    if (!usedTypes.has(item.type)) {
      selected.push(item);
      usedTypes.add(item.type);
    }
  }

  // Second pass: fill remaining slots
  if (selected.length < breakSize) {
    for (const item of shuffled) {
      if (selected.length >= breakSize) break;
      if (!selected.includes(item)) {
        selected.push(item);
      }
    }
  }

  return selected;
}

// =============================================================================
// Sequence Runtime Manager
// =============================================================================

export class SequenceManager {
  private sequence: SequenceItem[];
  private currentIndex: number = 0;
  private onItemChange?: (item: SequenceItem, index: number) => void;

  constructor(sequence: SequenceItem[]) {
    this.sequence = sequence;
  }

  get current(): SequenceItem {
    return this.sequence[this.currentIndex];
  }

  get totalItems(): number {
    return this.sequence.length;
  }

  get progress(): number {
    return this.currentIndex / this.sequence.length;
  }

  next(): SequenceItem {
    this.currentIndex = (this.currentIndex + 1) % this.sequence.length;
    this.onItemChange?.(this.current, this.currentIndex);
    return this.current;
  }

  previous(): SequenceItem {
    this.currentIndex =
      (this.currentIndex - 1 + this.sequence.length) % this.sequence.length;
    this.onItemChange?.(this.current, this.currentIndex);
    return this.current;
  }

  goTo(index: number): SequenceItem {
    this.currentIndex = index % this.sequence.length;
    this.onItemChange?.(this.current, this.currentIndex);
    return this.current;
  }

  onChange(callback: (item: SequenceItem, index: number) => void): void {
    this.onItemChange = callback;
  }

  // Insert a greatest hits card at the current position (for just-authenticated users)
  insertGreatestHits(userId: string): void {
    const item: SequenceItem = {
      type: 'greatest_hits',
      userId,
      duration: 15000,
    };
    this.sequence.splice(this.currentIndex + 1, 0, item);
  }

  // Get the full sequence for debugging
  getSequence(): SequenceItem[] {
    return [...this.sequence];
  }
}
