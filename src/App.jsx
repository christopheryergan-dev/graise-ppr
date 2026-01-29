import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  'https://bgnnwzjczawtqgqpusab.supabase.co',
  'sb_publishable_CakcCvb1XeQLHF9LZVs7pw_nr0FhfQe'
);

// PPR Calculation Engine
const calculateExpectedScore = (ratingA, ratingB) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

const processMatches = (matches, players) => {
  const K = 32;
  const ratings = {};
  const history = {};
  
  players.forEach(p => {
    ratings[p.id] = 1500;
    history[p.id] = [{ date: 'Start', rating: 1500, match: 'Initial', timestamp: 0 }];
  });
  
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  sortedMatches.forEach((match, matchIndex) => {
    const { player1_id, player2_id, player1_wins, player2_wins, date } = match;
    
    if (!ratings[player1_id]) ratings[player1_id] = 1500;
    if (!ratings[player2_id]) ratings[player2_id] = 1500;
    if (!history[player1_id]) history[player1_id] = [{ date: 'Start', rating: 1500, match: 'Initial', timestamp: 0 }];
    if (!history[player2_id]) history[player2_id] = [{ date: 'Start', rating: 1500, match: 'Initial', timestamp: 0 }];
    
    const p1Name = players.find(p => p.id === player1_id)?.name || 'Unknown';
    const p2Name = players.find(p => p.id === player2_id)?.name || 'Unknown';
    
    for (let i = 0; i < player1_wins; i++) {
      const exp1 = calculateExpectedScore(ratings[player1_id], ratings[player2_id]);
      ratings[player1_id] += K * (1 - exp1);
      ratings[player2_id] += K * (0 - (1 - exp1));
    }
    
    for (let i = 0; i < player2_wins; i++) {
      const exp2 = calculateExpectedScore(ratings[player2_id], ratings[player1_id]);
      ratings[player2_id] += K * (1 - exp2);
      ratings[player1_id] += K * (0 - (1 - exp2));
    }
    
    history[player1_id].push({
      date: date,
      rating: Math.round(ratings[player1_id]),
      match: `vs ${p2Name}: ${player1_wins}-${player2_wins}`,
      timestamp: matchIndex + 1
    });
    history[player2_id].push({
      date: date,
      rating: Math.round(ratings[player2_id]),
      match: `vs ${p1Name}: ${player2_wins}-${player1_wins}`,
      timestamp: matchIndex + 1
    });
  });
  
  return { ratings, history };
};

// Get ratings at a specific point in time (for calculating changes)
const getRatingsAtPoint = (matches, players, upToIndex) => {
  const K = 32;
  const ratings = {};
  players.forEach(p => { ratings[p.id] = 1500; });
  
  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  for (let i = 0; i < upToIndex && i < sortedMatches.length; i++) {
    const match = sortedMatches[i];
    const { player1_id, player2_id, player1_wins, player2_wins } = match;
    
    if (!ratings[player1_id]) ratings[player1_id] = 1500;
    if (!ratings[player2_id]) ratings[player2_id] = 1500;
    
    for (let j = 0; j < player1_wins; j++) {
      const exp1 = calculateExpectedScore(ratings[player1_id], ratings[player2_id]);
      ratings[player1_id] += K * (1 - exp1);
      ratings[player2_id] += K * (0 - (1 - exp1));
    }
    
    for (let j = 0; j < player2_wins; j++) {
      const exp2 = calculateExpectedScore(ratings[player2_id], ratings[player1_id]);
      ratings[player2_id] += K * (1 - exp2);
      ratings[player1_id] += K * (0 - (1 - exp2));
    }
  }
  
  return ratings;
};

const ADMIN_PASSWORD = 'PongPingGRAISE';

const PLAYER_COLORS = [
  '#00ff88', '#00d4ff', '#ff00ff', '#ffff00', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4'
];

export default function GraisePPR() {
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('leaderboard');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerNameError, setPlayerNameError] = useState('');
  const [newMatch, setNewMatch] = useState({ player1_id: '', player2_id: '', player1_wins: 0, player2_wins: 0 });
  const [matchResult, setMatchResult] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);
  const [newPlayerAlias, setNewPlayerAlias] = useState('');
  const [editingPlayer, setEditingPlayer] = useState(null);

  // Fetch data from Supabase
  useEffect(() => {
    fetchData();
    
    // Set up real-time subscriptions
    const playersSubscription = supabase
      .channel('players-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => {
        fetchPlayers();
      })
      .subscribe();
    
    const matchesSubscription = supabase
      .channel('matches-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
        fetchMatches();
      })
      .subscribe();
    
    return () => {
      playersSubscription.unsubscribe();
      matchesSubscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPlayers(), fetchMatches()]);
    setLoading(false);
  };

  const fetchPlayers = async () => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching players:', error);
    }
    if (data) setPlayers(data);
  };

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Error fetching matches:', error);
    }
    if (data) setMatches(data);
  };

  const { ratings, history } = useMemo(() => processMatches(matches, players), [matches, players]);

  const leaderboard = useMemo(() => {
    return players
      .map(p => {
        const playerMatches = matches.filter(m => m.player1_id === p.id || m.player2_id === p.id);
        let wins = 0, losses = 0, matchWins = 0, matchLosses = 0;
        playerMatches.forEach(m => {
          if (m.player1_id === p.id) {
            wins += m.player1_wins;
            losses += m.player2_wins;
            if (m.player1_wins > m.player2_wins) matchWins++; else matchLosses++;
          } else {
            wins += m.player2_wins;
            losses += m.player1_wins;
            if (m.player2_wins > m.player1_wins) matchWins++; else matchLosses++;
          }
        });
        return {
          ...p,
          rating: Math.round(ratings[p.id] || 1500),
          wins,
          losses,
          matchWins,
          matchLosses,
          winPct: wins + losses > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0'
        };
      })
      .sort((a, b) => b.rating - a.rating);
  }, [players, matches, ratings]);

  // Calculate fun stats
  const funStats = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Find index for week ago and month ago
    const weekAgoIndex = sortedMatches.findIndex(m => new Date(m.date) >= oneWeekAgo);
    const monthAgoIndex = sortedMatches.findIndex(m => new Date(m.date) >= oneMonthAgo);
    
    // Get ratings at those points (use index 0 if all matches are within the timeframe)
    const ratingsWeekAgo = weekAgoIndex >= 0 ? getRatingsAtPoint(matches, players, weekAgoIndex) : null;
    const ratingsMonthAgo = monthAgoIndex >= 0 ? getRatingsAtPoint(matches, players, monthAgoIndex) : null;
    
    // Top gainers
    let topGainerWeek = null;
    let topGainerMonth = null;
    
    if (ratingsWeekAgo) {
      const gains = players.map(p => ({
        player: p,
        gain: (ratings[p.id] || 1500) - (ratingsWeekAgo[p.id] || 1500)
      })).filter(g => g.gain > 0).sort((a, b) => b.gain - a.gain);
      if (gains.length > 0) topGainerWeek = gains[0];
    }
    
    if (ratingsMonthAgo) {
      const gains = players.map(p => ({
        player: p,
        gain: (ratings[p.id] || 1500) - (ratingsMonthAgo[p.id] || 1500)
      })).filter(g => g.gain > 0).sort((a, b) => b.gain - a.gain);
      if (gains.length > 0) topGainerMonth = gains[0];
    }

    // Hot streak - consecutive match wins (not games, matches) with PPR tracking
    const streaks = {};
    players.forEach(p => { streaks[p.id] = { current: 0, max: 0, streakStartRating: ratings[p.id] || 1500, pprGained: 0 }; });
    
    // We need to track ratings as we go to calculate PPR gained during streak
    const runningRatings = {};
    players.forEach(p => { runningRatings[p.id] = 1500; });
    
    sortedMatches.forEach(m => {
      const p1Won = m.player1_wins > m.player2_wins;
      const winnerId = p1Won ? m.player1_id : m.player2_id;
      const loserId = p1Won ? m.player2_id : m.player1_id;
      
      // Calculate rating change for this match
      const K = 32;
      let winnerRatingBefore = runningRatings[winnerId] || 1500;
      let loserRatingBefore = runningRatings[loserId] || 1500;
      
      // Process games to get new ratings
      const winnerGames = p1Won ? m.player1_wins : m.player2_wins;
      const loserGames = p1Won ? m.player2_wins : m.player1_wins;
      
      for (let i = 0; i < winnerGames; i++) {
        const exp = calculateExpectedScore(runningRatings[winnerId], runningRatings[loserId]);
        runningRatings[winnerId] += K * (1 - exp);
        runningRatings[loserId] += K * (0 - (1 - exp));
      }
      for (let i = 0; i < loserGames; i++) {
        const exp = calculateExpectedScore(runningRatings[loserId], runningRatings[winnerId]);
        runningRatings[loserId] += K * (1 - exp);
        runningRatings[winnerId] += K * (0 - (1 - exp));
      }
      
      // If starting a new streak, record starting rating
      if (streaks[winnerId].current === 0) {
        streaks[winnerId].streakStartRating = winnerRatingBefore;
      }
      
      streaks[winnerId].current++;
      streaks[winnerId].max = Math.max(streaks[winnerId].max, streaks[winnerId].current);
      streaks[winnerId].pprGained = runningRatings[winnerId] - streaks[winnerId].streakStartRating;
      
      // Loser's streak ends
      streaks[loserId].current = 0;
      streaks[loserId].pprGained = 0;
      streaks[loserId].streakStartRating = runningRatings[loserId];
    });
    
    // Get all current streaks for leaderboard display (3+ wins)
    const allStreaks = {};
    players.forEach(p => {
      if (streaks[p.id]?.current >= 3) {
        allStreaks[p.id] = {
          streak: streaks[p.id].current,
          pprGained: Math.round(streaks[p.id].pprGained)
        };
      }
    });
    
    const hotStreak = players
      .map(p => ({ player: p, streak: streaks[p.id]?.current || 0, maxStreak: streaks[p.id]?.max || 0, pprGained: streaks[p.id]?.pprGained || 0 }))
      .filter(s => s.streak > 0)
      .sort((a, b) => b.streak - a.streak)[0];
    
    const longestStreak = players
      .map(p => ({ player: p, maxStreak: streaks[p.id]?.max || 0 }))
      .sort((a, b) => b.maxStreak - a.maxStreak)[0];
    
    // Biggest upset (biggest rating difference where underdog won)
    let biggestUpset = null;
    sortedMatches.forEach((m, idx) => {
      const ratingsAtTime = getRatingsAtPoint(matches, players, idx);
      const p1Rating = ratingsAtTime[m.player1_id] || 1500;
      const p2Rating = ratingsAtTime[m.player2_id] || 1500;
      const p1Won = m.player1_wins > m.player2_wins;
      const p1Favored = p1Rating > p2Rating;
      
      if ((p1Won && !p1Favored) || (!p1Won && p1Favored)) {
        const diff = Math.abs(p1Rating - p2Rating);
        if (!biggestUpset || diff > biggestUpset.ratingDiff) {
          const winner = players.find(p => p.id === (p1Won ? m.player1_id : m.player2_id));
          const loser = players.find(p => p.id === (p1Won ? m.player2_id : m.player1_id));
          biggestUpset = {
            winner,
            loser,
            ratingDiff: diff,
            date: m.date,
            score: p1Won ? `${m.player1_wins}-${m.player2_wins}` : `${m.player2_wins}-${m.player1_wins}`
          };
        }
      }
    });
    
    // Most games played
    const gamesPlayed = {};
    players.forEach(p => { gamesPlayed[p.id] = 0; });
    matches.forEach(m => {
      gamesPlayed[m.player1_id] = (gamesPlayed[m.player1_id] || 0) + m.player1_wins + m.player2_wins;
      gamesPlayed[m.player2_id] = (gamesPlayed[m.player2_id] || 0) + m.player1_wins + m.player2_wins;
    });
    const mostActive = players
      .map(p => ({ player: p, games: gamesPlayed[p.id] || 0 }))
      .sort((a, b) => b.games - a.games)[0];
    
    return { topGainerWeek, topGainerMonth, hotStreak, longestStreak, biggestUpset, mostActive, allStreaks };
  }, [matches, players, ratings]);

  // All-time PPR chart data (top 8 players) - only show from first match
  const allTimePPRData = useMemo(() => {
    const top8 = leaderboard.slice(0, 8);
    
    // Get first match date for each player
    const playerFirstMatch = {};
    top8.forEach(p => {
      const playerHistory = history[p.id] || [];
      const firstRealMatch = playerHistory.find(h => h.date !== 'Start');
      playerFirstMatch[p.id] = firstRealMatch?.date || null;
    });
    
    // Collect all unique dates
    const allDates = new Set();
    top8.forEach(p => {
      (history[p.id] || []).forEach(h => {
        if (h.date !== 'Start') allDates.add(h.date);
      });
    });
    
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a) - new Date(b));
    
    return sortedDates.map(date => {
      const point = { date };
      top8.forEach(p => {
        const playerHistory = history[p.id] || [];
        // Only include data if this date is on or after player's first match
        if (playerFirstMatch[p.id] && date >= playerFirstMatch[p.id]) {
          const entry = [...playerHistory].reverse().find(h => h.date <= date && h.date !== 'Start');
          point[p.name] = entry?.rating || null;
        } else {
          point[p.name] = null; // null values won't be plotted
        }
      });
      return point;
    });
  }, [leaderboard, history]);

  const validatePlayerName = (name, excludeId = null) => {
    const trimmed = name.trim().toLowerCase();
    const exists = players.some(p => p.name.toLowerCase() === trimmed && p.id !== excludeId);
    if (exists) {
      setPlayerNameError('A player with this name already exists');
      return false;
    }
    setPlayerNameError('');
    return true;
  };

  const addPlayer = async () => {
    // Strip @ and everything after from the name
    let trimmedName = newPlayerName.trim();
    if (trimmedName.includes('@')) {
      trimmedName = trimmedName.split('@')[0].trim();
    }
    const trimmedAlias = newPlayerAlias.trim();
    
    if (!trimmedName || !trimmedAlias) {
      alert('Both name and alias are required');
      return;
    }
    
    if (trimmedName && trimmedAlias && validatePlayerName(trimmedName)) {
      console.log('Attempting to add player:', trimmedName, 'alias:', trimmedAlias);
      
      const { data, error } = await supabase
        .from('players')
        .insert([{ name: trimmedName, alias: trimmedAlias }])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        alert('Error adding player: ' + error.message);
        return;
      }
      
      if (data) {
        setNewPlayerName('');
        setNewPlayerAlias('');
        setPlayerNameError('');
        setShowAddPlayer(false);
        fetchPlayers();
      }
    }
  };

  const addMatch = async () => {
    if (newMatch.player1_id && newMatch.player2_id && newMatch.player1_id !== newMatch.player2_id) {
      const p1Wins = parseInt(newMatch.player1_wins) || 0;
      const p2Wins = parseInt(newMatch.player2_wins) || 0;
      
      // Calculate before ratings
      const p1Before = Math.round(ratings[newMatch.player1_id] || 1500);
      const p2Before = Math.round(ratings[newMatch.player2_id] || 1500);
      
      console.log('Attempting to insert match:', {
        player1_id: newMatch.player1_id,
        player2_id: newMatch.player2_id,
        player1_wins: p1Wins,
        player2_wins: p2Wins
      });
      
      const { data, error } = await supabase
        .from('matches')
        .insert([{
          player1_id: newMatch.player1_id,
          player2_id: newMatch.player2_id,
          player1_wins: p1Wins,
          player2_wins: p2Wins,
          date: new Date().toISOString().split('T')[0]
        }])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        alert('Error recording match: ' + error.message);
        return;
      }
      
      if (data) {
        // Fetch updated matches to calculate new ratings
        await fetchMatches();
        
        // Calculate after ratings with new match
        const newMatches = [...matches, data[0]];
        const { ratings: afterRatings } = processMatches(newMatches, players);
        const p1After = Math.round(afterRatings[newMatch.player1_id] || 1500);
        const p2After = Math.round(afterRatings[newMatch.player2_id] || 1500);
        
        // Determine if upset
        const p1Won = p1Wins > p2Wins;
        const p1Favored = p1Before > p2Before;
        const isUpset = (p1Won && !p1Favored && p1Before !== p2Before) || (!p1Won && p1Favored && p1Before !== p2Before);
        
        const p1 = players.find(p => p.id === newMatch.player1_id);
        const p2 = players.find(p => p.id === newMatch.player2_id);
        
        setMatchResult({
          player1: p1,
          player2: p2,
          p1Wins,
          p2Wins,
          p1Before,
          p2Before,
          p1After,
          p2After,
          isUpset
        });
        
        setNewMatch({ player1_id: '', player2_id: '', player1_wins: 0, player2_wins: 0 });
        setShowAddMatch(false);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => setMatchResult(null), 10000);
      }
    }
  };

  const deleteMatch = async (matchId) => {
    if (isAdmin) {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);
      
      if (!error) {
        fetchMatches();
      }
    }
  };

  const updateMatch = async (matchId, updates) => {
    if (isAdmin) {
      const { error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId);
      
      if (!error) {
        fetchMatches();
        setEditingMatch(null);
      }
    }
  };

  const deletePlayer = async (playerId) => {
    if (isAdmin) {
      // Check if player has any matches
      const playerMatches = matches.filter(m => m.player1_id === playerId || m.player2_id === playerId);
      if (playerMatches.length > 0) {
        if (!confirm(`This player has ${playerMatches.length} matches. Deleting will also delete all their matches. Continue?`)) {
          return;
        }
      }
      
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);
      
      if (error) {
        console.error('Error deleting player:', error);
        alert('Error deleting player: ' + error.message);
      } else {
        fetchPlayers();
        fetchMatches();
        setSelectedPlayer(null);
      }
    }
  };

  const updatePlayer = async (playerId, updates) => {
    // Validate name if being changed
    if (updates.name && !validatePlayerName(updates.name, playerId)) {
      return;
    }
    
    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', playerId);
    
    if (error) {
      console.error('Error updating player:', error);
      alert('Error updating player: ' + error.message);
    } else {
      fetchPlayers();
      setEditingPlayer(null);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const getPlayerMatches = (playerId) => {
    return matches
      .filter(m => m.player1_id === playerId || m.player2_id === playerId)
      .map(m => {
        const isPlayer1 = m.player1_id === playerId;
        const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
        const opponent = players.find(p => p.id === opponentId);
        const wins = isPlayer1 ? m.player1_wins : m.player2_wins;
        const losses = isPlayer1 ? m.player2_wins : m.player1_wins;
        return {
          id: m.id,
          date: m.date,
          opponent: opponent?.name || 'Unknown',
          result: `${wins}-${losses}`,
          won: wins > losses
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getRankBadge = (index) => {
    if (index === 0) return { emoji: '🥇', color: '#FFD700', label: 'Champion' };
    if (index === 1) return { emoji: '🥈', color: '#C0C0C0', label: 'Challenger' };
    if (index === 2) return { emoji: '🥉', color: '#CD7F32', label: 'Contender' };
    return { emoji: '🏓', color: '#4A5568', label: 'Player' };
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Courier New', monospace",
        color: '#00ff88',
        fontSize: '24px'
      }}>
        Loading GRAISE PPR...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      fontFamily: "'Courier New', monospace",
      color: '#e0e0e0',
      padding: '20px'
    }}>
      {/* Match Result Popup */}
      {matchResult && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2000,
          background: '#1a1a2e',
          border: matchResult.isUpset ? '2px solid #ff4444' : '2px solid #00ff88',
          padding: '30px',
          minWidth: '400px',
          textAlign: 'center',
          boxShadow: matchResult.isUpset 
            ? '0 0 40px rgba(255, 68, 68, 0.5)' 
            : '0 0 40px rgba(0, 255, 136, 0.3)'
        }}>
          {matchResult.isUpset && (
            <div style={{
              fontSize: '32px',
              fontWeight: '900',
              color: '#ff4444',
              marginBottom: '15px',
              textShadow: '0 0 20px rgba(255, 68, 68, 0.8)',
              animation: 'pulse 0.5s ease-in-out infinite alternate'
            }}>
              🚨 UPSET! 🚨
            </div>
          )}
          <div style={{ fontSize: '14px', color: '#bbb', letterSpacing: '2px', marginBottom: '15px' }}>
            MATCH RECORDED
          </div>
          <div style={{ fontSize: '24px', marginBottom: '20px' }}>
            {matchResult.player1.name} {matchResult.p1Wins} - {matchResult.p2Wins} {matchResult.player2.name}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            <div>
              <div style={{ color: '#bbb', fontSize: '12px', marginBottom: '5px' }}>{matchResult.player1.name}</div>
              <div style={{ fontSize: '20px' }}>
                <span style={{ color: '#9aa' }}>{matchResult.p1Before}</span>
                <span style={{ color: '#888' }}> → </span>
                <span style={{ color: matchResult.p1After > matchResult.p1Before ? '#00ff88' : '#ff4444' }}>
                  {matchResult.p1After}
                </span>
                <span style={{ 
                  fontSize: '14px', 
                  marginLeft: '8px',
                  color: matchResult.p1After > matchResult.p1Before ? '#00ff88' : '#ff4444'
                }}>
                  ({matchResult.p1After > matchResult.p1Before ? '+' : ''}{matchResult.p1After - matchResult.p1Before})
                </span>
              </div>
            </div>
            <div>
              <div style={{ color: '#bbb', fontSize: '12px', marginBottom: '5px' }}>{matchResult.player2.name}</div>
              <div style={{ fontSize: '20px' }}>
                <span style={{ color: '#9aa' }}>{matchResult.p2Before}</span>
                <span style={{ color: '#888' }}> → </span>
                <span style={{ color: matchResult.p2After > matchResult.p2Before ? '#00ff88' : '#ff4444' }}>
                  {matchResult.p2After}
                </span>
                <span style={{ 
                  fontSize: '14px', 
                  marginLeft: '8px',
                  color: matchResult.p2After > matchResult.p2Before ? '#00ff88' : '#ff4444'
                }}>
                  ({matchResult.p2After > matchResult.p2Before ? '+' : ''}{matchResult.p2After - matchResult.p2Before})
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setMatchResult(null)}
            style={{
              marginTop: '20px',
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid #444',
              color: '#9aa',
              fontFamily: 'inherit',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '40px',
        position: 'relative'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '900',
          margin: '0',
          background: 'linear-gradient(90deg, #00ff88, #00d4ff, #ff00ff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 60px rgba(0, 255, 136, 0.3)',
          letterSpacing: '4px'
        }}>
          GRAISE PPR
        </h1>
        <div style={{
          fontSize: '14px',
          color: '#bbb',
          marginTop: '8px',
          letterSpacing: '3px'
        }}>
          Ping-Pong Championship League
        </div>
        
        <div style={{
          width: '200px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
          margin: '20px auto'
        }} />
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {['leaderboard', 'matches', 'stats'].map(v => (
          <button
            key={v}
            onClick={() => { setView(v); setSelectedPlayer(null); }}
            style={{
              padding: '12px 24px',
              background: view === v ? 'linear-gradient(135deg, #00ff88, #00d4ff)' : 'transparent',
              border: view === v ? 'none' : '1px solid #444',
              color: view === v ? '#000' : '#bbb',
              fontFamily: 'inherit',
              fontSize: '12px',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              fontWeight: view === v ? '700' : '400'
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setShowAddPlayer(true)}
          style={{
            padding: '10px 20px',
            background: 'transparent',
            border: '1px solid #00ff88',
            color: '#00ff88',
            fontFamily: 'inherit',
            fontSize: '12px',
            letterSpacing: '1px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          + ADD PLAYER
        </button>
        <button
          onClick={() => setShowAddMatch(true)}
          style={{
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            border: 'none',
            color: '#000',
            fontFamily: 'inherit',
            fontSize: '12px',
            letterSpacing: '1px',
            cursor: 'pointer',
            fontWeight: '700'
          }}
        >
          ⚡ RECORD MATCH
        </button>
      </div>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a2e',
            padding: '30px',
            border: '1px solid #444',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#00ff88', letterSpacing: '2px' }}>ADMIN LOGIN</h3>
            <input
              type="password"
              placeholder="Enter password..."
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid #444',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '14px',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowAdminModal(false); setAdminPassword(''); }} style={{
                flex: 1, padding: '10px', background: 'transparent', border: '1px solid #444',
                color: '#bbb', fontFamily: 'inherit', cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={handleAdminLogin} style={{
                flex: 1, padding: '10px', background: '#00ff88', border: 'none',
                color: '#000', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '700'
              }}>Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Player Modal */}
      {showAddPlayer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a2e',
            padding: '30px',
            border: '1px solid #444',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#00ff88', letterSpacing: '2px' }}>NEW PLAYER</h3>
            <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px', letterSpacing: '1px' }}>NAME *</label>
            <input
              type="text"
              placeholder="Enter name (@ will be stripped)..."
              value={newPlayerName}
              onChange={(e) => {
                setNewPlayerName(e.target.value);
                if (playerNameError) validatePlayerName(e.target.value);
              }}
              onBlur={() => newPlayerName && validatePlayerName(newPlayerName)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: `1px solid ${playerNameError ? '#ff4444' : '#444'}`,
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '14px',
                marginBottom: playerNameError ? '8px' : '15px',
                boxSizing: 'border-box'
              }}
            />
            {playerNameError && (
              <div style={{ color: '#ff4444', fontSize: '12px', marginBottom: '12px' }}>
                {playerNameError}
              </div>
            )}
            <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px', letterSpacing: '1px' }}>ALIAS *</label>
            <input
              type="text"
              placeholder="Enter alias (e.g. nickname)..."
              value={newPlayerAlias}
              onChange={(e) => setNewPlayerAlias(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid #444',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '14px',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => { setShowAddPlayer(false); setNewPlayerName(''); setNewPlayerAlias(''); setPlayerNameError(''); }} style={{
                flex: 1, padding: '10px', background: 'transparent', border: '1px solid #444',
                color: '#bbb', fontFamily: 'inherit', cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={addPlayer} style={{
                flex: 1, padding: '10px', background: '#00ff88', border: 'none',
                color: '#000', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '700'
              }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Match Modal */}
      {showAddMatch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a2e',
            padding: '30px',
            border: '1px solid #444',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#00ff88', letterSpacing: '2px' }}>RECORD MATCH</h3>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px', letterSpacing: '1px' }}>PLAYER 1</label>
                <select
                  value={newMatch.player1_id}
                  onChange={(e) => setNewMatch({...newMatch, player1_id: e.target.value})}
                  style={{
                    width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #444',
                    color: '#fff', fontFamily: 'inherit'
                  }}
                >
                  <option value="">Select...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px', letterSpacing: '1px' }}>PLAYER 2</label>
                <select
                  value={newMatch.player2_id}
                  onChange={(e) => setNewMatch({...newMatch, player2_id: e.target.value})}
                  style={{
                    width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #444',
                    color: '#fff', fontFamily: 'inherit'
                  }}
                >
                  <option value="">Select...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            {/* Expected win % preview */}
            {newMatch.player1_id && newMatch.player2_id && newMatch.player1_id !== newMatch.player2_id && (
              <div style={{
                background: '#0a0a0a',
                padding: '10px',
                marginBottom: '20px',
                textAlign: 'center',
                fontSize: '12px',
                color: '#bbb'
              }}>
                {(() => {
                  const p1 = players.find(p => p.id === newMatch.player1_id);
                  const p2 = players.find(p => p.id === newMatch.player2_id);
                  const p1Rating = ratings[newMatch.player1_id] || 1500;
                  const p2Rating = ratings[newMatch.player2_id] || 1500;
                  const p1Expected = (calculateExpectedScore(p1Rating, p2Rating) * 100).toFixed(0);
                  const p2Expected = (100 - p1Expected);
                  const favorite = p1Rating >= p2Rating ? p1 : p2;
                  const favoriteExpected = p1Rating >= p2Rating ? p1Expected : p2Expected;
                  return (
                    <span>
                      <span style={{ color: '#00ff88' }}>{favorite?.name}</span> favored at {favoriteExpected}% win probability
                    </span>
                  );
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px' }}>GAMES WON</label>
                <input
                  type="number"
                  min="0"
                  value={newMatch.player1_wins}
                  onChange={(e) => setNewMatch({...newMatch, player1_wins: e.target.value})}
                  style={{
                    width: '60px', padding: '10px', background: '#0a0a0a', border: '1px solid #444',
                    color: '#fff', fontFamily: 'inherit', textAlign: 'center', fontSize: '20px'
                  }}
                />
              </div>
              <div style={{ color: '#444', fontSize: '24px' }}>vs</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px' }}>GAMES WON</label>
                <input
                  type="number"
                  min="0"
                  value={newMatch.player2_wins}
                  onChange={(e) => setNewMatch({...newMatch, player2_wins: e.target.value})}
                  style={{
                    width: '60px', padding: '10px', background: '#0a0a0a', border: '1px solid #444',
                    color: '#fff', fontFamily: 'inherit', textAlign: 'center', fontSize: '20px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddMatch(false)} style={{
                flex: 1, padding: '10px', background: 'transparent', border: '1px solid #444',
                color: '#bbb', fontFamily: 'inherit', cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={addMatch} style={{
                flex: 1, padding: '10px', background: '#00ff88', border: 'none',
                color: '#000', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '700'
              }}>Record</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {editingMatch && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a2e',
            padding: '30px',
            border: '1px solid #ff8800',
            maxWidth: '500px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#ff8800', letterSpacing: '2px' }}>EDIT MATCH (ADMIN)</h3>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px' }}>
                  {players.find(p => p.id === editingMatch.player1_id)?.name}
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingMatch.player1_wins}
                  onChange={(e) => setEditingMatch({...editingMatch, player1_wins: parseInt(e.target.value) || 0})}
                  style={{
                    width: '60px', padding: '10px', background: '#0a0a0a', border: '1px solid #444',
                    color: '#fff', fontFamily: 'inherit', textAlign: 'center', fontSize: '20px'
                  }}
                />
              </div>
              <div style={{ color: '#444', fontSize: '24px' }}>vs</div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px' }}>
                  {players.find(p => p.id === editingMatch.player2_id)?.name}
                </label>
                <input
                  type="number"
                  min="0"
                  value={editingMatch.player2_wins}
                  onChange={(e) => setEditingMatch({...editingMatch, player2_wins: parseInt(e.target.value) || 0})}
                  style={{
                    width: '60px', padding: '10px', background: '#0a0a0a', border: '1px solid #444',
                    color: '#fff', fontFamily: 'inherit', textAlign: 'center', fontSize: '20px'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditingMatch(null)} style={{
                flex: 1, padding: '10px', background: 'transparent', border: '1px solid #444',
                color: '#bbb', fontFamily: 'inherit', cursor: 'pointer'
              }}>Cancel</button>
              <button 
                onClick={() => updateMatch(editingMatch.id, { 
                  player1_wins: editingMatch.player1_wins, 
                  player2_wins: editingMatch.player2_wins 
                })} 
                style={{
                  flex: 1, padding: '10px', background: '#ff8800', border: 'none',
                  color: '#000', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '700'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a2e',
            padding: '30px',
            border: '1px solid #ff8800',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#ff8800', letterSpacing: '2px' }}>EDIT PLAYER (ADMIN)</h3>
            
            <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px', letterSpacing: '1px' }}>NAME *</label>
            <input
              type="text"
              value={editingPlayer.name}
              onChange={(e) => setEditingPlayer({...editingPlayer, name: e.target.value})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid #444',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '14px',
                marginBottom: '15px',
                boxSizing: 'border-box'
              }}
            />
            
            <label style={{ display: 'block', marginBottom: '8px', color: '#bbb', fontSize: '12px', letterSpacing: '1px' }}>ALIAS *</label>
            <input
              type="text"
              value={editingPlayer.alias || ''}
              onChange={(e) => setEditingPlayer({...editingPlayer, alias: e.target.value})}
              style={{
                width: '100%',
                padding: '12px',
                background: '#0a0a0a',
                border: '1px solid #444',
                color: '#fff',
                fontFamily: 'inherit',
                fontSize: '14px',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setEditingPlayer(null)} style={{
                flex: 1, padding: '10px', background: 'transparent', border: '1px solid #444',
                color: '#bbb', fontFamily: 'inherit', cursor: 'pointer'
              }}>Cancel</button>
              <button 
                onClick={() => {
                  if (!editingPlayer.name.trim() || !editingPlayer.alias?.trim()) {
                    alert('Both name and alias are required');
                    return;
                  }
                  updatePlayer(editingPlayer.id, { 
                    name: editingPlayer.name.trim(), 
                    alias: editingPlayer.alias.trim() 
                  });
                }} 
                style={{
                  flex: 1, padding: '10px', background: '#ff8800', border: 'none',
                  color: '#000', fontFamily: 'inherit', cursor: 'pointer', fontWeight: '700'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile View */}
      {selectedPlayer && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <button
            onClick={() => setSelectedPlayer(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#00ff88',
              fontFamily: 'inherit',
              fontSize: '12px',
              cursor: 'pointer',
              marginBottom: '20px',
              letterSpacing: '1px'
            }}
          >
            ← BACK TO LEADERBOARD
          </button>

          {(() => {
            const player = leaderboard.find(p => p.id === selectedPlayer);
            const fullPlayer = players.find(p => p.id === selectedPlayer);
            const rank = leaderboard.findIndex(p => p.id === selectedPlayer);
            const badge = getRankBadge(rank);
            const playerHistory = history[selectedPlayer] || [];
            const playerMatches = getPlayerMatches(selectedPlayer);

            return (
              <div>
                {/* Player Header */}
                <div style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)',
                  border: '1px solid #444',
                  padding: '30px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '30px',
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    fontSize: '60px',
                    width: '100px',
                    height: '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `linear-gradient(135deg, ${badge.color}22, transparent)`,
                    borderRadius: '50%'
                  }}>
                    {badge.emoji}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#bbb', letterSpacing: '2px', marginBottom: '5px' }}>
                      #{rank + 1} • {badge.label}
                    </div>
                    <h2 style={{ margin: '0 0 5px', fontSize: '32px', color: '#fff' }}>{player.name}</h2>
                    {fullPlayer?.alias && (
                      <div style={{ fontSize: '16px', color: '#9aa', marginBottom: '10px', fontStyle: 'italic' }}>
                        aka "{fullPlayer.alias}"
                      </div>
                    )}
                    <div style={{
                      fontSize: '48px',
                      fontWeight: '700',
                      background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      {player.rating} PPR
                    </div>
                    {isAdmin && (
                      <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <button
                          onClick={() => setEditingPlayer({ ...fullPlayer })}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid #ff8800',
                            color: '#ff8800',
                            fontFamily: 'inherit',
                            fontSize: '11px',
                            cursor: 'pointer',
                            letterSpacing: '1px'
                          }}
                        >
                          EDIT PLAYER
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${player.name}? This cannot be undone.`)) {
                              deletePlayer(player.id);
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            border: '1px solid #ff4444',
                            color: '#ff4444',
                            fontFamily: 'inherit',
                            fontSize: '11px',
                            cursor: 'pointer',
                            letterSpacing: '1px'
                          }}
                        >
                          DELETE PLAYER
                        </button>
                      </div>
                    )}
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ color: '#bbb', fontSize: '12px', marginBottom: '5px' }}>Record (Games)</div>
                    <div style={{ fontSize: '24px' }}>
                      <span style={{ color: '#00ff88' }}>{player.wins}W</span>
                      <span style={{ color: '#444' }}> - </span>
                      <span style={{ color: '#ff4444' }}>{player.losses}L</span>
                    </div>
                    <div style={{ color: '#bbb', fontSize: '14px', marginTop: '5px' }}>{player.winPct}%</div>
                  </div>
                </div>

                {/* Rating History Chart */}
                <div style={{
                  background: '#1a1a2e',
                  border: '1px solid #444',
                  padding: '20px',
                  marginBottom: '20px'
                }}>
                  <h3 style={{ margin: '0 0 20px', color: '#bbb', fontSize: '12px', letterSpacing: '2px' }}>PPR HISTORY</h3>
                  <div style={{ height: '200px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={playerHistory}>
                        <XAxis dataKey="date" stroke="#444" tick={{ fill: '#aaa', fontSize: 10 }} />
                        <YAxis domain={['dataMin - 50', 'dataMax + 50']} stroke="#444" tick={{ fill: '#aaa', fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ background: '#0a0a0a', border: '1px solid #444', fontFamily: 'Courier New' }}
                          labelStyle={{ color: '#bbb' }}
                        />
                        <ReferenceLine y={1500} stroke="#444" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="rating" stroke="#00ff88" strokeWidth={2} dot={{ fill: '#00ff88', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Match History */}
                <div style={{
                  background: '#1a1a2e',
                  border: '1px solid #444',
                  padding: '20px'
                }}>
                  <h3 style={{ margin: '0 0 20px', color: '#bbb', fontSize: '12px', letterSpacing: '2px' }}>MATCH HISTORY</h3>
                  {playerMatches.map((match, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: i < playerMatches.length - 1 ? '1px solid #333' : 'none'
                    }}>
                      <div style={{ color: '#9aa', fontSize: '12px' }}>{match.date}</div>
                      <div style={{ color: '#ccc' }}>vs {match.opponent}</div>
                      <div style={{
                        color: match.won ? '#00ff88' : '#ff4444',
                        fontWeight: '700'
                      }}>
                        {match.result} {match.won ? 'W' : 'L'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Leaderboard View */}
      {view === 'leaderboard' && !selectedPlayer && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          {leaderboard.map((player, index) => {
            const badge = getRankBadge(index);
            const playerStreak = funStats.allStreaks?.[player.id];
            return (
              <div
                key={player.id}
                onClick={() => setSelectedPlayer(player.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px',
                  marginBottom: '10px',
                  background: index === 0 
                    ? 'linear-gradient(135deg, rgba(255,215,0,0.1) 0%, transparent 100%)'
                    : '#1a1a2e',
                  border: `1px solid ${index === 0 ? '#FFD70033' : '#444'}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  fontSize: '32px',
                  width: '50px',
                  textAlign: 'center'
                }}>
                  {badge.emoji}
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#444',
                  width: '40px',
                  textAlign: 'center'
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>{player.name}</div>
                  <div style={{ fontSize: '12px', color: '#9aa' }}>
                    {player.wins}W - {player.losses}L ({player.winPct}%)
                  </div>
                </div>
                {playerStreak && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '25px',
                    color: '#ff8800',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '24px', marginBottom: '2px' }}>🔥</span>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{playerStreak.streak} straight</span>
                    <span style={{ color: '#00ff88', fontSize: '12px' }}>+{playerStreak.pprGained} PPR</span>
                  </div>
                )}
                <div style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  background: 'linear-gradient(90deg, #00ff88, #00d4ff)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {player.rating}
                </div>
                <div style={{
                  marginLeft: '15px',
                  color: '#444',
                  fontSize: '20px'
                }}>
                  →
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Matches View */}
      {view === 'matches' && !selectedPlayer && (
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h3 style={{ color: '#bbb', fontSize: '12px', letterSpacing: '2px', marginBottom: '20px' }}>ALL MATCHES</h3>
          {[...matches].sort((a, b) => new Date(b.date) - new Date(a.date)).map((match, i) => {
            const p1 = players.find(p => p.id === match.player1_id);
            const p2 = players.find(p => p.id === match.player2_id);
            const p1Won = match.player1_wins > match.player2_wins;
            return (
              <div key={match.id} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '15px 20px',
                marginBottom: '8px',
                background: '#1a1a2e',
                border: '1px solid #444'
              }}>
                <div style={{ color: '#9aa', fontSize: '12px', width: '100px' }}>{match.date}</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
                  <span style={{ color: p1Won ? '#00ff88' : '#bbb', fontWeight: p1Won ? '700' : '400' }}>
                    {p1?.name}
                  </span>
                  <span style={{
                    padding: '5px 15px',
                    background: '#0a0a0a',
                    border: '1px solid #444',
                    fontSize: '14px',
                    color: '#fff'
                  }}>
                    {match.player1_wins} - {match.player2_wins}
                  </span>
                  <span style={{ color: !p1Won ? '#00ff88' : '#bbb', fontWeight: !p1Won ? '700' : '400' }}>
                    {p2?.name}
                  </span>
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px', marginLeft: '15px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingMatch({...match}); }}
                      style={{
                        padding: '5px 10px',
                        background: 'transparent',
                        border: '1px solid #ff8800',
                        color: '#ff8800',
                        fontFamily: 'inherit',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if(confirm('Delete this match?')) deleteMatch(match.id); }}
                      style={{
                        padding: '5px 10px',
                        background: 'transparent',
                        border: '1px solid #ff4444',
                        color: '#ff4444',
                        fontFamily: 'inherit',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats View */}
      {view === 'stats' && !selectedPlayer && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {/* Basic Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px',
            marginBottom: '30px'
          }}>
            {[
              { label: 'Total Matches', value: matches.length },
              { label: 'Total Games', value: matches.reduce((acc, m) => acc + m.player1_wins + m.player2_wins, 0) },
              { label: 'Active Players', value: players.length },
              { label: 'Highest PPR', value: Math.max(...Object.values(ratings)).toFixed(0) },
            ].map((stat, i) => (
              <div key={i} style={{
                background: '#1a1a2e',
                border: '1px solid #444',
                padding: '20px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '12px', color: '#bbb', letterSpacing: '1px', marginBottom: '10px' }}>
                  {stat.label}
                </div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: '#00ff88'
                }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Fun Stats */}
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #444',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#bbb', fontSize: '12px', letterSpacing: '2px' }}>🏆 ACHIEVEMENTS & STREAKS</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {funStats.hotStreak && (
                <div style={{ padding: '15px', background: '#0a0a0a', border: '1px solid #ff8800' }}>
                  <div style={{ fontSize: '12px', color: '#ff8800', letterSpacing: '1px', marginBottom: '5px' }}>🔥 HOT STREAK</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{funStats.hotStreak.player.name}</div>
                  <div style={{ fontSize: '12px', color: '#bbb' }}>{funStats.hotStreak.streak} consecutive wins • +{funStats.hotStreak.pprGained.toFixed(0)} PPR</div>
                </div>
              )}
              {funStats.longestStreak && (
                <div style={{ padding: '15px', background: '#0a0a0a', border: '1px solid #00d4ff' }}>
                  <div style={{ fontSize: '12px', color: '#00d4ff', letterSpacing: '1px', marginBottom: '5px' }}>📈 LONGEST STREAK (ALL TIME)</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{funStats.longestStreak.player.name}</div>
                  <div style={{ fontSize: '12px', color: '#bbb' }}>{funStats.longestStreak.maxStreak} consecutive match wins</div>
                </div>
              )}
              {funStats.topGainerWeek && (
                <div style={{ padding: '15px', background: '#0a0a0a', border: '1px solid #00ff88' }}>
                  <div style={{ fontSize: '12px', color: '#00ff88', letterSpacing: '1px', marginBottom: '5px' }}>📊 TOP GAINER (WEEK)</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{funStats.topGainerWeek.player.name}</div>
                  <div style={{ fontSize: '12px', color: '#bbb' }}>+{funStats.topGainerWeek.gain.toFixed(0)} PPR</div>
                </div>
              )}
              {funStats.topGainerMonth && (
                <div style={{ padding: '15px', background: '#0a0a0a', border: '1px solid #ff00ff' }}>
                  <div style={{ fontSize: '12px', color: '#ff00ff', letterSpacing: '1px', marginBottom: '5px' }}>📊 TOP GAINER (MONTH)</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{funStats.topGainerMonth.player.name}</div>
                  <div style={{ fontSize: '12px', color: '#bbb' }}>+{funStats.topGainerMonth.gain.toFixed(0)} PPR</div>
                </div>
              )}
              {funStats.biggestUpset && (
                <div style={{ padding: '15px', background: '#0a0a0a', border: '1px solid #ff4444' }}>
                  <div style={{ fontSize: '12px', color: '#ff4444', letterSpacing: '1px', marginBottom: '5px' }}>🚨 BIGGEST UPSET</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{funStats.biggestUpset.winner.name}</div>
                  <div style={{ fontSize: '12px', color: '#bbb' }}>
                    beat {funStats.biggestUpset.loser.name} ({funStats.biggestUpset.score}) • {funStats.biggestUpset.ratingDiff.toFixed(0)} PPR underdog
                  </div>
                </div>
              )}
              {funStats.mostActive && (
                <div style={{ padding: '15px', background: '#0a0a0a', border: '1px solid #888' }}>
                  <div style={{ fontSize: '12px', color: '#9aa', letterSpacing: '1px', marginBottom: '5px' }}>🎯 MOST ACTIVE</div>
                  <div style={{ fontSize: '20px', color: '#fff', fontWeight: '700' }}>{funStats.mostActive.player.name}</div>
                  <div style={{ fontSize: '12px', color: '#bbb' }}>{funStats.mostActive.games} games played</div>
                </div>
              )}
            </div>
          </div>

          {/* All-Time PPR Chart */}
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #444',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#bbb', fontSize: '12px', letterSpacing: '2px' }}>📈 ALL-TIME PPR RANKINGS</h3>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allTimePPRData}>
                  <XAxis dataKey="date" stroke="#444" tick={{ fill: '#aaa', fontSize: 10 }} />
                  <YAxis domain={['dataMin - 50', 'dataMax + 50']} stroke="#444" tick={{ fill: '#aaa', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid #444', fontFamily: 'Courier New' }}
                    labelStyle={{ color: '#bbb' }}
                  />
                  <Legend />
                  <ReferenceLine y={1500} stroke="#444" strokeDasharray="3 3" />
                  {leaderboard.slice(0, 8).map((player, idx) => (
                    <Line 
                      key={player.id}
                      type="monotone" 
                      dataKey={player.name} 
                      stroke={PLAYER_COLORS[idx]} 
                      strokeWidth={2} 
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Head to Head with Expected Win % */}
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #444',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 20px', color: '#bbb', fontSize: '12px', letterSpacing: '2px' }}>HEAD TO HEAD</h3>
            {players.map(p1 => (
              players.filter(p2 => p2.id > p1.id).map(p2 => {
                const h2hMatches = matches.filter(m => 
                  (m.player1_id === p1.id && m.player2_id === p2.id) ||
                  (m.player1_id === p2.id && m.player2_id === p1.id)
                );
                let p1Wins = 0, p2Wins = 0;
                h2hMatches.forEach(m => {
                  if (m.player1_id === p1.id) {
                    p1Wins += m.player1_wins;
                    p2Wins += m.player2_wins;
                  } else {
                    p1Wins += m.player2_wins;
                    p2Wins += m.player1_wins;
                  }
                });
                if (p1Wins === 0 && p2Wins === 0) return null;
                
                // Calculate expected win %
                const p1Rating = ratings[p1.id] || 1500;
                const p2Rating = ratings[p2.id] || 1500;
                const p1Expected = calculateExpectedScore(p1Rating, p2Rating) * 100;
                const favorite = p1Rating >= p2Rating ? p1 : p2;
                const favoriteExpected = p1Rating >= p2Rating ? p1Expected : (100 - p1Expected);
                
                return (
                  <div key={`${p1.id}-${p2.id}`} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid #333'
                  }}>
                    <span style={{ flex: 1, textAlign: 'right', color: p1Wins > p2Wins ? '#00ff88' : '#bbb' }}>
                      {p1.name}
                    </span>
                    <span style={{
                      padding: '5px 20px',
                      margin: '0 15px',
                      background: '#0a0a0a',
                      fontSize: '14px',
                      color: '#fff'
                    }}>
                      {p1Wins} - {p2Wins}
                    </span>
                    <span style={{ flex: 1, color: p2Wins > p1Wins ? '#00ff88' : '#bbb' }}>
                      {p2.name}
                    </span>
                    <span style={{ 
                      marginLeft: '20px', 
                      fontSize: '12px', 
                      color: '#9aa',
                      minWidth: '140px',
                      textAlign: 'right'
                    }}>
                      Next: <span style={{ color: '#00d4ff' }}>{favorite.name}</span> {favoriteExpected.toFixed(0)}% fav
                    </span>
                  </div>
                );
              })
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '60px',
        paddingTop: '20px',
        borderTop: '1px solid #333',
        color: '#777',
        fontSize: '12px',
        letterSpacing: '1px'
      }}>
        <div>GRAISE PPR v2.0 • Built with GenAI • K-Factor: 32</div>
        <div style={{ marginTop: '12px' }}>
          {!isAdmin ? (
            <span
              onClick={() => setShowAdminModal(true)}
              style={{
                color: '#555',
                cursor: 'pointer',
                fontSize: '12px',
                textDecoration: 'none'
              }}
              onMouseOver={(e) => e.target.style.color = '#888'}
              onMouseOut={(e) => e.target.style.color = '#555'}
            >
              admin
            </span>
          ) : (
            <span
              onClick={() => setIsAdmin(false)}
              style={{
                color: '#ff6666',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              admin mode active (click to exit)
            </span>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes pulse {
          from { opacity: 1; }
          to { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
