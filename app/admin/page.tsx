'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import segmentsData from '@/data/segments.json';

interface Segment {
  id: string;
  name: string;
  strava_id: number;
  location: string;
  category: string;
  visible: boolean;
  clubBestTime: string;
  clubMembers: number;
}

export default function AdminPage() {
  const [segments, setSegments] = useState<Segment[]>(segmentsData.segments);
  const [newStravaId, setNewStravaId] = useState('');
  const [previewSegment, setPreviewSegment] = useState<string | null>(null);

  const toggleVisibility = (id: string) => {
    setSegments(prev =>
      prev.map(s =>
        s.id === id ? { ...s, visible: !s.visible } : s
      )
    );
  };

  const handleAddSegment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStravaId) return;

    // In a real implementation, this would fetch segment data from Strava API
    const newSegment: Segment = {
      id: `segment-${newStravaId}`,
      name: `New Segment #${newStravaId}`,
      strava_id: parseInt(newStravaId),
      location: 'Unknown Location',
      category: 'Cat 4',
      visible: false,
      clubBestTime: '—',
      clubMembers: 0,
    };

    setSegments(prev => [...prev, newSegment]);
    setNewStravaId('');
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-yellow-400">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-1">
              Mission Cycling Retrospective
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            &larr; Back to Display
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {/* Segment List */}
        <section className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-yellow-400 rounded-full" />
            Segments
          </h2>

          <div className="space-y-3">
            {segments.map((segment) => (
              <div
                key={segment.id}
                className={`
                  p-4 rounded-lg border transition-all
                  ${segment.visible
                    ? 'bg-gray-700/50 border-yellow-400/30'
                    : 'bg-gray-800 border-gray-700'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold">{segment.name}</h3>
                      <span
                        className={`
                          text-xs px-2 py-0.5 rounded
                          ${segment.category === 'HC' ? 'bg-red-600' : ''}
                          ${segment.category === 'Cat 3' ? 'bg-orange-500' : ''}
                          ${segment.category === 'Cat 4' ? 'bg-green-600' : ''}
                        `}
                      >
                        {segment.category}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {segment.location} &bull; Strava ID: {segment.strava_id}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Club Best: {segment.clubBestTime} &bull; {segment.clubMembers} members
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Preview button */}
                    <button
                      onClick={() => setPreviewSegment(
                        previewSegment === segment.id ? null : segment.id
                      )}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {previewSegment === segment.id ? 'Hide Preview' : 'Preview'}
                    </button>

                    {/* Visibility toggle */}
                    <button
                      onClick={() => toggleVisibility(segment.id)}
                      className={`
                        relative w-14 h-7 rounded-full transition-colors
                        ${segment.visible ? 'bg-yellow-500' : 'bg-gray-600'}
                      `}
                    >
                      <span
                        className={`
                          absolute top-1 w-5 h-5 bg-white rounded-full transition-transform
                          ${segment.visible ? 'left-8' : 'left-1'}
                        `}
                      />
                    </button>
                  </div>
                </div>

                {/* Preview panel */}
                {previewSegment === segment.id && (
                  <div className="mt-4 p-4 bg-gray-900 rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Preview:</div>
                    <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 py-2 px-4 rounded">
                      <h4
                        className="font-bold text-yellow-400 text-center uppercase"
                        style={{
                          fontFamily: 'Impact, sans-serif',
                          fontStyle: 'italic',
                          textShadow: '2px 2px 0 #000',
                        }}
                      >
                        {segment.name}
                      </h4>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 text-center">
                      This is how the segment title will appear on the broadcast display
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Add New Segment */}
        <section className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-green-400 rounded-full" />
            Add New Segment
          </h2>

          <form onSubmit={handleAddSegment} className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">
                Strava Segment ID
              </label>
              <input
                type="text"
                value={newStravaId}
                onChange={(e) => setNewStravaId(e.target.value)}
                placeholder="e.g., 229781"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-yellow-400 focus:outline-none transition-colors"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors"
              >
                Add Segment
              </button>
            </div>
          </form>

          <p className="text-xs text-gray-500 mt-3">
            Find the Segment ID in the Strava URL: strava.com/segments/<strong>229781</strong>
          </p>
        </section>

        {/* Data Export Info */}
        <section className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-bold mb-2 text-gray-300">Data Storage</h2>
          <p className="text-sm text-gray-400">
            Changes are stored locally in this session. To persist changes, update the
            JSON files in <code className="bg-gray-700 px-1 rounded">/data/segments.json</code>.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            In a future version, this will connect to the Strava API to fetch real segment data
            and leaderboards for Mission Cycling members.
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto mt-12 text-center text-gray-500 text-sm">
        Mission Cycling Retrospective Admin &bull; v0.1
      </footer>
    </div>
  );
}
