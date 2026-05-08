import { getRadioSuggestions, getTrendingTracks, getNewReleases, searchSaavn } from './ApiService';

/**
 * K-ECHO AI Recommendation Engine (Memory Optimized)
 */

class RecommendationService {
  constructor() {
    this.weights = {
      similarity: 0.20,
      history: 0.40,
      trending: 0.20,
      freshness: 0.10,
      discovery: 0.10,
    };
  }

  /**
   * Detects the "vibe" or mood of a track based on its metadata.
   */
  getTrackVibe(track) {
    if (!track) return 'neutral';
    const title = (track.title || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();

    const vibes = {
      romantic: ['romantic', 'love', 'pyar', 'ishq', 'dil', 'shreya ghoshal', 'arijit singh', 'romantic hits', 'soft'],
      sad: ['sad', 'dard', 'emotional', 'broken', 'lofi', 'slowed', 'reverb', 'sad songs', 'emotional'],
      party: ['party', 'dance', 'club', 'honey singh', 'badshah', 'workout', 'gym', 'energetic', 'punjabi pop', 'daru'],
      punjabi: ['punjabi', 'sidhu moose wala', 'diljit', 'ap dhillon', 'karan aujla', 'shubh'],
      pop: ['pop', 'english', 'top hits', 'rhythm', 'taylor swift', 'weekend', 'justin'],
      chill: ['chill', 'relax', 'soothing', 'nature', 'instrumental', 'meditation'],
    };

    for (const [vibe, keywords] of Object.entries(vibes)) {
      if (keywords.some(k => title.includes(k) || artist.includes(k))) {
        return vibe;
      }
    }
    return 'neutral';
  }

  /**
   * Generates a dynamic recommendation queue (Spotify/YT Music style).
   */
  async generateSmartQueue(seedTrack, context, count = 20) {
    if (!seedTrack || !seedTrack.id) return [];
    
    try {
      const { playedIds = new Set(), history = [], likedIds = new Set(), feedback = {} } = context;
      const seedVibe = this.getTrackVibe(seedTrack);
      
      const skipsMap = feedback?.skips || {};
      const playsMap = feedback?.plays || {};

      // 1. Fetch from multiple sources (Reduced limits for memory safety)
      const [radioResults, trendingResults, freshResults] = await Promise.all([
        getRadioSuggestions(seedTrack, playedIds, 20).catch(() => []),
        getTrendingTracks(10).catch(() => []),
        getNewReleases(10).catch(() => [])
      ]);

      // 2. Combine and De-duplicate
      const uniqueMap = new Map();
      const addTracks = (list, source) => {
        if (!Array.isArray(list)) return;
        list.forEach(t => {
          if (!t || !t.id) return;
          const tid = String(t.id);
          // Never repeat same track in session, and ignore if already played
          if (!playedIds.has(tid) && !uniqueMap.has(tid)) {
            uniqueMap.set(tid, { track: t, source });
          }
        });
      };

      addTracks(radioResults, 'similarity');
      addTracks(trendingResults, 'trending');
      addTracks(freshResults, 'freshness');

      const candidates = Array.from(uniqueMap.values());

      // 3. Scoring
      const scored = candidates.map(({ track, source }) => {
        try {
          if (!track) return null;
          let sim = 0, hist = 0, trend = 0, fresh = 0, disc = Math.random();

          if (source === 'similarity') sim = 1.0;
          else if (track.artist && seedTrack.artist && track.artist === seedTrack.artist) sim = 0.8;
          else if (track.language && seedTrack.language && track.language === seedTrack.language) sim = 0.4;

          const historyList = history.filter(Boolean);
          const artistInHistory = historyList.some(t => t.artist && track.artist && t.artist === track.artist);
          const langInHistory = historyList.some(t => t.language && track.language && t.language === track.language);
          if (artistInHistory) hist = 1.0; else if (langInHistory) hist = 0.5;
          
          if (track.id && likedIds.has(String(track.id))) hist = Math.min(1.0, hist + 0.3);

          const skips = skipsMap[track.id] || 0;
          const plays = playsMap[track.id] || 0;
          hist = Math.max(0, hist - (skips * 0.3) + (plays * 0.1));

          if (source === 'trending') trend = 1.0;
          if (source === 'freshness') fresh = 1.0;

          const score = (sim * this.weights.similarity) + 
                        (hist * this.weights.history) + 
                        (trend * this.weights.trending) + 
                        (fresh * this.weights.freshness) + 
                        (disc * this.weights.discovery);
          return { track, score };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);

      return scored.sort((a, b) => b.score - a.score).slice(0, count).map(s => s.track);
    } catch (err) {
      console.error('SmartQueue Error:', err);
      return [];
    }
  }
}

export default new RecommendationService();
