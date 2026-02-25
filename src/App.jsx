import { useState, useMemo, useEffect, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { createClient } from '@supabase/supabase-js';

// ─── Supabase ──────────────────────────────────────────────────────────
const supabase = createClient(
  'https://bgnnwzjczawtqgqpusab.supabase.co',
  'sb_publishable_CakcCvb1XeQLHF9LZVs7pw_nr0FhfQe'
);

const K_FACTOR = 32;
const ADMIN_PASSWORD = 'PongPingGRAISE';

// ─── Animal Avatars (B&W Minimalist) ─────────────────────────────────
const ANIMALS = {
  fox: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 5l5 9h10l5-9"/><path d="M11 14c0 5.5 2 10 5 10s5-4.5 5-10"/><circle cx="13" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="17" r="1.2" fill="currentColor" stroke="none"/><path d="M15 21l1 1.2 1-1.2" strokeWidth="1.2"/></svg>,
  bear: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="3.5"/><circle cx="24" cy="8" r="3.5"/><rect x="7" y="10" width="18" height="16" rx="9"/><circle cx="12.5" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="19.5" cy="18" r="1.2" fill="currentColor" stroke="none"/><ellipse cx="16" cy="22" rx="2.5" ry="1.8"/></svg>,
  owl: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 11s-1.5-5 2-7l4 5"/><path d="M26 11s1.5-5-2-7l-4 5"/><rect x="7" y="10" width="18" height="17" rx="9"/><circle cx="12" cy="18" r="3"/><circle cx="20" cy="18" r="3"/><circle cx="12" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="20" cy="18" r="1.2" fill="currentColor" stroke="none"/><path d="M15 23l1 1.3 1-1.3" strokeWidth="1.2"/></svg>,
  rabbit: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="7" rx="2" ry="5.5"/><ellipse cx="20" cy="7" rx="2" ry="5.5"/><rect x="8" y="12" width="16" height="15" rx="8"/><circle cx="12.5" cy="19" r="1.2" fill="currentColor" stroke="none"/><circle cx="19.5" cy="19" r="1.2" fill="currentColor" stroke="none"/><path d="M14.5 23h3"/><line x1="9" y1="20" x2="5" y2="19"/><line x1="23" y1="20" x2="27" y2="19"/></svg>,
  wolf: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4l4 10"/><path d="M25 4l-4 10"/><path d="M8 14c0 0-2 12 8 12s8-12 8-12"/><circle cx="12.5" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="19.5" cy="18" r="1.2" fill="currentColor" stroke="none"/><path d="M13 23l3 2.5 3-2.5"/></svg>,
  cat: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 5l3 9"/><path d="M25 5l-3 9"/><ellipse cx="16" cy="20" rx="9" ry="8"/><circle cx="12" cy="18.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="20" cy="18.5" r="1.2" fill="currentColor" stroke="none"/><path d="M16 21v2"/><line x1="8" y1="19" x2="4" y2="17"/><line x1="8" y1="21" x2="4" y2="22"/><line x1="24" y1="19" x2="28" y2="17"/><line x1="24" y1="21" x2="28" y2="22"/></svg>,
  penguin: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="16" cy="17" rx="8" ry="10"/><ellipse cx="16" cy="19" rx="4.5" ry="6" strokeDasharray="2.5 2.5"/><circle cx="13" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="13.5" r="1.2" fill="currentColor" stroke="none"/><path d="M14.5 16.5l1.5 1.3 1.5-1.3" strokeWidth="1.2"/><path d="M7 16c-1.5 2.5-1.5 6 .5 8.5"/><path d="M25 16c1.5 2.5 1.5 6-.5 8.5"/></svg>,
  deer: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 3v4l-3 3"/><path d="M11 5l-3-1"/><path d="M21 3v4l3 3"/><path d="M21 5l3-1"/><ellipse cx="16" cy="19" rx="8" ry="9"/><circle cx="12.5" cy="17" r="1.2" fill="currentColor" stroke="none"/><circle cx="19.5" cy="17" r="1.2" fill="currentColor" stroke="none"/><ellipse cx="16" cy="22" rx="2" ry="1.3"/></svg>,
  octopus: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="16" cy="13" rx="9" ry="8"/><circle cx="12.5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19.5" cy="12" r="1.8" fill="currentColor" stroke="none"/><path d="M13 17c0 0 1.5 1.5 3 1.5s3-1.5 3-1.5"/><path d="M7 20c-1.5 3.5-.5 6 .5 7"/><path d="M11 21c-1 3.5 0 5.5 1 6"/><path d="M21 21c1 3.5 0 5.5-1 6"/><path d="M25 20c1.5 3.5.5 6-.5 7"/></svg>,
  eagle: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 5c-5 0-9 4-9 9s4 10 9 10 9-6 9-10-4-9-9-9z"/><circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="20" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M13 18l3 3 3-3" strokeWidth="2"/><path d="M4 12l3 2.5"/><path d="M28 12l-3 2.5"/></svg>,
  panda: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="17" r="10"/><circle cx="10" cy="9" r="3.5"/><circle cx="22" cy="9" r="3.5"/><ellipse cx="12" cy="16" rx="3" ry="2.5" fill="currentColor" stroke="none" opacity="0.15"/><ellipse cx="20" cy="16" rx="3" ry="2.5" fill="currentColor" stroke="none" opacity="0.15"/><circle cx="12" cy="16" r="1.2" fill="currentColor" stroke="none"/><circle cx="20" cy="16" r="1.2" fill="currentColor" stroke="none"/><ellipse cx="16" cy="20.5" rx="2" ry="1.3"/></svg>,
  shark: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17c0 0 5-7 13-7s13 7 13 7"/><path d="M3 17c0 0 5 7 13 7s13-7 13-7"/><path d="M16 4v6"/><circle cx="11" cy="16" r="1.2" fill="currentColor" stroke="none"/><path d="M19 18.5l2.5 1.3 2.5-1.3" strokeWidth="1.2"/></svg>,
  turtle: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="16" cy="18" rx="10" ry="7"/><path d="M10 14c0-3 2.7-5.5 6-5.5s6 2.5 6 5.5"/><circle cx="13" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M6 18l-2 3"/><path d="M26 18l2 3"/><path d="M12 25l-1 2"/><path d="M20 25l1 2"/></svg>,
  elephant: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="15" r="10"/><path d="M9 8c-3-1-5 0-5 3"/><path d="M23 8c3-1 5 0 5 3"/><circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="14" r="1.5" fill="currentColor" stroke="none"/><path d="M16 18c0 0 0 5-2 7"/></svg>,
  monkey: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="9"/><circle cx="6" cy="16" r="3"/><circle cx="26" cy="16" r="3"/><circle cx="13" cy="14" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="14" r="1.2" fill="currentColor" stroke="none"/><ellipse cx="16" cy="19.5" rx="3.5" ry="2.5"/><path d="M14.5 20h3"/></svg>,
  lion: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="12" strokeDasharray="3 2"/><circle cx="16" cy="17" r="8"/><circle cx="13" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><ellipse cx="16" cy="20" rx="2" ry="1.3"/><path d="M14 22.5l2 1 2-1"/></svg>,
  frog: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="16" cy="19" rx="10" ry="8"/><circle cx="10" cy="10" r="3.5"/><circle cx="22" cy="10" r="3.5"/><circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none"/><circle cx="22" cy="10" r="1.5" fill="currentColor" stroke="none"/><path d="M12 22c1.5 1.5 6.5 1.5 8 0"/></svg>,
  whale: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 17c0-5 5.4-9 12-9s12 4 12 9-5.4 9-12 9-12-4-12-9z"/><circle cx="10" cy="15" r="1.5" fill="currentColor" stroke="none"/><path d="M21 19c1 .8 2.5.8 3.5 0" strokeWidth="1.2"/><path d="M16 8c-1-3 0-4 2-5"/><path d="M16 8c1-3 2.5-3.5 4-3"/></svg>,
  koala: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="12" r="4"/><circle cx="24.5" cy="12" r="4"/><circle cx="16" cy="17" r="9"/><circle cx="12.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="19.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/><ellipse cx="16" cy="20" rx="3" ry="2.2" fill="currentColor" stroke="none" opacity="0.2"/></svg>,
  dragon: (s=24) => <svg width={s} height={s} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4l2 5"/><path d="M16 3l0 5"/><path d="M22 4l-2 5"/><ellipse cx="16" cy="17" rx="9" ry="9"/><circle cx="12" cy="15" r="1.5" fill="currentColor" stroke="none"/><circle cx="20" cy="15" r="1.5" fill="currentColor" stroke="none"/><path d="M12 22l2-1.5h4l2 1.5"/><path d="M13 20.5v1.5"/><path d="M16 20.5v1.5"/><path d="M19 20.5v1.5"/></svg>,
};
const ANIMAL_KEYS = Object.keys(ANIMALS);
const BG_COLORS = [
  { id: 'slate', bg: '#1e293b', border: '#334155' },
  { id: 'stone', bg: '#292524', border: '#44403c' },
  { id: 'zinc', bg: '#18181b', border: '#3f3f46' },
  { id: 'warm', bg: '#1c1917', border: '#44403c' },
  { id: 'cool', bg: '#111827', border: '#1f2937' },
];
const PLAYER_COLORS = ['#22d3ee','#f472b6','#a78bfa','#34d399','#fbbf24','#f87171','#60a5fa','#c084fc','#fb923c','#4ade80'];

// ─── Titles ──────────────────────────────────────────────────────────
const getTitleForRank = (rank, total) => {
  if (rank===1) return { title:'Grand Smasher', color:'#fbbf24' };
  if (rank===2) return { title:'Paddle Master', color:'#94a3b8' };
  if (rank===3) return { title:'Spin Lord', color:'#d97706' };
  const pct = total<=3 ? 1 : rank/total;
  if (pct<=0.3) return { title:'Top Spinner', color:'#888' };
  if (pct<=0.5) return { title:'Backhand Baron', color:'#777' };
  if (pct<=0.75) return { title:'Pong Contender', color:'#666' };
  return { title:'Rally Rookie', color:'#555' };
};

// ─── Engine ──────────────────────────────────────────────────────────
const calcExp = (rA,rB) => 1/(1+Math.pow(10,(rB-rA)/400));
const processMatches = (matches, players) => {
  const ratings={}, history={};
  players.forEach(p => { ratings[p.id]=1500; history[p.id]=[]; });
  const sorted = [...matches].sort((a,b) => new Date(a.created_at||a.date)-new Date(b.created_at||b.date));
  sorted.forEach(m => {
    const {player1_id:p1,player2_id:p2,player1_wins:w1,player2_wins:w2,date} = m;
    [p1,p2].forEach(id => { if(!ratings[id]){ratings[id]=1500;history[id]=[];} });
    for(let i=0;i<w1;i++){const e=calcExp(ratings[p1],ratings[p2]);const d=Math.round(K_FACTOR*(1-e));ratings[p1]+=d;ratings[p2]-=d;}
    for(let i=0;i<w2;i++){const e=calcExp(ratings[p2],ratings[p1]);const d=Math.round(K_FACTOR*(1-e));ratings[p2]+=d;ratings[p1]-=d;}
    history[p1].push({date,rating:ratings[p1]});
    history[p2].push({date,rating:ratings[p2]});
  });
  return { ratings, history, sortedMatches:sorted };
};

// ─── Helpers ─────────────────────────────────────────────────────────
const fmtDate = d => new Date(d+'T12:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
const fmtDT = d => {const dt=new Date(d);return dt.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' '+dt.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});};
const getMomentum = (pid,sorted) => { const r=[]; for(let i=sorted.length-1;i>=0&&r.length<5;i--){const m=sorted[i];if(m.player1_id===pid)r.unshift(m.player1_wins>m.player2_wins?'W':'L');else if(m.player2_id===pid)r.unshift(m.player2_wins>m.player1_wins?'W':'L');} return r; };
const getStreak = (pid,sorted) => { let s=0; for(let i=sorted.length-1;i>=0;i--){const m=sorted[i];const i1=m.player1_id===pid,i2=m.player2_id===pid;if(!i1&&!i2)continue;if(i1?m.player1_wins>m.player2_wins:m.player2_wins>m.player1_wins)s++;else break;} return s; };

const genCalendar = (history,players,lb) => {
  const allD=new Set(),firstD={};
  Object.entries(history).forEach(([pid,es])=>{es.forEach(e=>{if(e.date){const d=e.date.split('T')[0];allD.add(d);if(!firstD[pid]||d<firstD[pid])firstD[pid]=d;}});});
  const sd=[...allD].sort(); if(!sd.length)return[];
  const start=new Date(sd[0]),end=new Date(sd[sd.length-1]),cal=[];
  for(let d=new Date(start);d<=end;d.setDate(d.getDate()+1))cal.push(d.toISOString().split('T')[0]);
  const last={};
  return cal.map(ds=>{const pt={date:ds,label:fmtDate(ds)};lb.slice(0,8).forEach(p=>{if(firstD[p.id]&&ds>=firstD[p.id]){const es=(history[p.id]||[]).filter(e=>e.date?.split('T')[0]===ds);if(es.length)last[p.id]=es[es.length-1].rating;pt[p.name]=last[p.id]||1500;}else pt[p.name]=null;});return pt;});
};

// ─── Fun Stats Engine ────────────────────────────────────────────────
const calcFunStats = (matches, players, ratings, leaderboard, sortedMatches) => {
  const sorted = sortedMatches;
  const now = new Date();
  const weekAgo = new Date(now.getTime()-7*24*60*60*1000);
  const monthAgo = new Date(now.getTime()-30*24*60*60*1000);
  const getRatingsAt = (idx) => {
    const r={}; players.forEach(p=>r[p.id]=1500);
    sorted.slice(0,idx).forEach(m=>{
      [m.player1_id,m.player2_id].forEach(id=>{if(!r[id])r[id]=1500;});
      for(let i=0;i<m.player1_wins;i++){const e=calcExp(r[m.player1_id],r[m.player2_id]);const d=Math.round(K_FACTOR*(1-e));r[m.player1_id]+=d;r[m.player2_id]-=d;}
      for(let i=0;i<m.player2_wins;i++){const e=calcExp(r[m.player2_id],r[m.player1_id]);const d=Math.round(K_FACTOR*(1-e));r[m.player2_id]+=d;r[m.player1_id]-=d;}
    });
    return r;
  };
  const calcGainer = (cutoff) => {
    const idx = sorted.findIndex(m=>new Date(m.date)>=cutoff);
    if(idx<0) return null;
    const past = getRatingsAt(idx);
    let best=null, worst=null;
    leaderboard.forEach(p=>{
      const gain=(ratings[p.id]||1500)-(past[p.id]||1500);
      if(!best||gain>best.gain) best={player:p,gain};
      if(!worst||gain<worst.gain) worst={player:p,gain};
    });
    return { best, worst };
  };
  const weekData = calcGainer(weekAgo);
  const monthData = calcGainer(monthAgo);
  let hotStreak=null;
  leaderboard.forEach(p=>{const s=getStreak(p.id,sorted);if(s>=3&&(!hotStreak||s>hotStreak.streak))hotStreak={player:p,streak:s};});
  let biggestUpset=null;
  const tempR={}; players.forEach(p=>tempR[p.id]=1500);
  sorted.forEach(m=>{
    [m.player1_id,m.player2_id].forEach(id=>{if(!tempR[id])tempR[id]=1500;});
    const diff=Math.abs(tempR[m.player1_id]-tempR[m.player2_id]);
    const fav=tempR[m.player1_id]>tempR[m.player2_id]?m.player1_id:m.player2_id;
    const win=m.player1_wins>m.player2_wins?m.player1_id:m.player2_id;
    if(win!==fav&&diff>(biggestUpset?.diff||0)) biggestUpset={match:m,diff,winner:players.find(p=>p.id===win),loser:players.find(p=>p.id===fav)};
    for(let i=0;i<m.player1_wins;i++){const e=calcExp(tempR[m.player1_id],tempR[m.player2_id]);const d=Math.round(K_FACTOR*(1-e));tempR[m.player1_id]+=d;tempR[m.player2_id]-=d;}
    for(let i=0;i<m.player2_wins;i++){const e=calcExp(tempR[m.player2_id],tempR[m.player1_id]);const d=Math.round(K_FACTOR*(1-e));tempR[m.player2_id]+=d;tempR[m.player1_id]-=d;}
  });
  const pairs={};
  sorted.forEach(m=>{const k=[m.player1_id,m.player2_id].sort().join('-');pairs[k]=(pairs[k]||0)+1;});
  let nemesis=null;
  Object.entries(pairs).forEach(([k,ct])=>{if(!nemesis||ct>nemesis.count){const[a,b]=k.split('-');nemesis={p1:players.find(p=>p.id===a),p2:players.find(p=>p.id===b),count:ct};}});
  const shutouts={};
  sorted.forEach(m=>{
    if(m.player2_wins===0&&m.player1_wins>0) shutouts[m.player1_id]=(shutouts[m.player1_id]||0)+1;
    if(m.player1_wins===0&&m.player2_wins>0) shutouts[m.player2_id]=(shutouts[m.player2_id]||0)+1;
  });
  let shutoutKing=null;
  Object.entries(shutouts).forEach(([id,ct])=>{if(!shutoutKing||ct>shutoutKing.count)shutoutKing={player:players.find(p=>p.id===id),count:ct};});
  const clutch={};
  const tempR2={}; players.forEach(p=>tempR2[p.id]=1500);
  sorted.forEach(m=>{
    [m.player1_id,m.player2_id].forEach(id=>{if(!tempR2[id])tempR2[id]=1500;});
    const underdog=tempR2[m.player1_id]<tempR2[m.player2_id]?m.player1_id:m.player2_id;
    const winner=m.player1_wins>m.player2_wins?m.player1_id:m.player2_id;
    if(winner===underdog) clutch[winner]=(clutch[winner]||0)+1;
    for(let i=0;i<m.player1_wins;i++){const e=calcExp(tempR2[m.player1_id],tempR2[m.player2_id]);const d=Math.round(K_FACTOR*(1-e));tempR2[m.player1_id]+=d;tempR2[m.player2_id]-=d;}
    for(let i=0;i<m.player2_wins;i++){const e=calcExp(tempR2[m.player2_id],tempR2[m.player1_id]);const d=Math.round(K_FACTOR*(1-e));tempR2[m.player2_id]+=d;tempR2[m.player1_id]-=d;}
  });
  let clutchPlayer=null;
  Object.entries(clutch).forEach(([id,ct])=>{if(ct>=2&&(!clutchPlayer||ct>clutchPlayer.count))clutchPlayer={player:players.find(p=>p.id===id),count:ct};});
  const conceded={};
  sorted.forEach(m=>{
    const add=(id,gc)=>{if(!conceded[id])conceded[id]={total:0,matches:0};conceded[id].total+=gc;conceded[id].matches++;};
    add(m.player1_id, m.player2_wins);
    add(m.player2_id, m.player1_wins);
  });
  let wall=null;
  Object.entries(conceded).forEach(([id,d])=>{if(d.matches>=3){const avg=d.total/d.matches;if(!wall||avg<wall.avg)wall={player:players.find(p=>p.id===id),avg:Math.round(avg*10)/10};}});
  return {
    hotStreak, biggestUpset, nemesis, shutoutKing, clutchPlayer, wall,
    topGainerWeek: weekData?.best, biggestFallWeek: weekData?.worst,
    topGainerMonth: monthData?.best,
    totalMatches: matches.length,
    totalGames: matches.reduce((s,m)=>s+m.player1_wins+m.player2_wins,0),
  };
};

// ─── Shared Components ───────────────────────────────────────────────
const MomentumDots = ({results}) => <div style={{display:'flex',gap:'3px',alignItems:'center'}}>{results.map((r,i)=><div key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:r==='W'?'#34d399':'#f87171',opacity:0.3+(i+1)*(0.7/results.length)}}/>)}</div>;

const PlayerAvatar = ({player,size=32}) => {
  if(!player?.avatar){const ini=(player?.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();return <div style={{width:size,height:size,borderRadius:'50%',background:'#1a1a1a',border:'1px solid #2a2a2a',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:size*.35,fontWeight:600,color:'#555',letterSpacing:'-0.02em'}}>{ini}</div>;}
  const fn=ANIMALS[player.avatar]||ANIMALS.fox;
  const bg=BG_COLORS.find(b=>b.id===player.avatar_bg)||BG_COLORS[0];
  return <div style={{width:size,height:size,borderRadius:'50%',background:bg.bg,border:`1.5px solid ${bg.border}`,display:'flex',alignItems:'center',justifyContent:'center',color:'#d4d4d8',flexShrink:0}}>{fn(size*.55)}</div>;
};

const ScoreStepper = ({label,value,onChange}) => (
  <div style={{textAlign:'center'}}>
    <div style={{color:'#888',fontSize:'12px',marginBottom:'10px',letterSpacing:'0.05em',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{label}</div>
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'16px'}}>
      <button onClick={()=>onChange(Math.max(0,value-1))} style={{width:'44px',height:'44px',borderRadius:'50%',border:'1px solid #333',background:'#0a0a0a',color:'#888',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>−</button>
      <span style={{fontSize:'36px',fontWeight:300,color:'#e5e5e5',minWidth:'36px',fontVariantNumeric:'tabular-nums',textAlign:'center'}}>{value}</span>
      <button onClick={()=>onChange(value+1)} style={{width:'44px',height:'44px',borderRadius:'50%',border:'1px solid #333',background:'#0a0a0a',color:'#888',fontSize:'20px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}}>+</button>
    </div>
  </div>
);

const Wrapper = ({children}) => (
  <div style={{minHeight:'100vh',background:'#0a0a0a',position:'relative'}}>
    <div style={{position:'fixed',inset:0,background:'radial-gradient(ellipse at 50% 0%, #0f172a 0%, #0a0a0a 50%)',opacity:0.6,pointerEvents:'none',zIndex:0}}/>
    <div style={{position:'fixed',inset:0,opacity:0.03,pointerEvents:'none',zIndex:0,backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,backgroundSize:'128px 128px'}}/>
    <div style={{position:'fixed',top:'20%',left:'5%',width:'200px',height:'200px',background:'radial-gradient(circle,#22d3ee08 0%,transparent 70%)',pointerEvents:'none',zIndex:0}}/>
    <div style={{position:'fixed',bottom:'30%',right:'5%',width:'150px',height:'150px',background:'radial-gradient(circle,#a78bfa06 0%,transparent 70%)',pointerEvents:'none',zIndex:0}}/>
    <div style={{position:'relative',zIndex:1,maxWidth:'700px',margin:'0 auto',padding:'0 16px',fontFamily:"'SF Pro Display',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:'#e5e5e5',WebkitFontSmoothing:'antialiased'}}>
      {children}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const [players,setPlayers] = useState([]);
  const [matches,setMatches] = useState([]);
  const [loading,setLoading] = useState(true);
  const [selectedPlayer,setSelectedPlayer] = useState(null);
  const [chartRange,setChartRange] = useState(30);
  const [showAllMatches,setShowAllMatches] = useState(false);
  const [showAddMatch,setShowAddMatch] = useState(false);
  const [showAddPlayer,setShowAddPlayer] = useState(false);
  const [showAdmin,setShowAdmin] = useState(false);
  const [isAdmin,setIsAdmin] = useState(false);
  const [adminPw,setAdminPw] = useState('');
  const [mp1,setMp1]=useState('');const [mp2,setMp2]=useState('');const [mw1,setMw1]=useState(0);const [mw2,setMw2]=useState(0);
  const [npName,setNpName]=useState('');const [npAlias,setNpAlias]=useState('');const [npAvatar,setNpAvatar]=useState(null);const [npAvatarBg,setNpAvatarBg]=useState(null);const [npCity,setNpCity]=useState('Seattle');const [npTeam,setNpTeam]=useState('GRAISE');const [npError,setNpError]=useState('');
  const [cities,setCities]=useState(['Seattle','Boston','Austin','Off the Map']);const [teams,setTeams]=useState(['GRAISE','Other']);const [newCity,setNewCity]=useState('');const [newTeam,setNewTeam]=useState('');
  const [avatarPickerFor,setAvatarPickerFor]=useState(null);const [pickerAnimal,setPickerAnimal]=useState(null);const [pickerBg,setPickerBg]=useState(null);
  const [saving,setSaving]=useState(false);
  const [editingPlayer,setEditingPlayer]=useState(null);const [epName,setEpName]=useState('');const [epAlias,setEpAlias]=useState('');const [epCity,setEpCity]=useState('');const [epTeam,setEpTeam]=useState('');const [epError,setEpError]=useState('');

  // ─── Data Loading ────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    const [pRes,mRes,sRes] = await Promise.all([
      supabase.from('players').select('*').order('created_at'),
      supabase.from('matches').select('*').order('created_at'),
      supabase.from('app_settings').select('*'),
    ]);
    if(pRes.data) setPlayers(pRes.data);
    if(mRes.data) setMatches(mRes.data);
    if(sRes.data){
      const cRow=sRes.data.find(r=>r.id==='cities');
      const tRow=sRes.data.find(r=>r.id==='teams');
      if(cRow?.value) setCities(cRow.value);
      if(tRow?.value) setTeams(tRow.value);
    }
    setLoading(false);
  },[]);

  useEffect(()=>{ loadData(); },[loadData]);

  // Realtime subscriptions
  useEffect(()=>{
    const ch = supabase.channel('db-changes')
      .on('postgres_changes',{event:'*',schema:'public',table:'players'},()=>loadData())
      .on('postgres_changes',{event:'*',schema:'public',table:'matches'},()=>loadData())
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[loadData]);

  // ─── Computed ──────────────────────────────────────────────────
  const {ratings,history,sortedMatches} = useMemo(()=>processMatches(matches,players),[matches,players]);
  const isComboTaken = (a,b,excl) => players.some(p=>p.id!==excl&&p.avatar===a&&p.avatar_bg===b);

  const leaderboard = useMemo(()=>
    players.map(p=>{
      const w=sortedMatches.filter(m=>(m.player1_id===p.id&&m.player1_wins>m.player2_wins)||(m.player2_id===p.id&&m.player2_wins>m.player1_wins)).length;
      const l=sortedMatches.filter(m=>(m.player1_id===p.id&&m.player1_wins<m.player2_wins)||(m.player2_id===p.id&&m.player2_wins<m.player1_wins)).length;
      return {...p,rating:ratings[p.id]||1500,wins:w,losses:l,totalMatches:w+l};
    }).filter(p=>p.totalMatches>0).sort((a,b)=>b.rating-a.rating)
  ,[players,ratings,sortedMatches]);

  const chartData = useMemo(()=>{const all=genCalendar(history,players,leaderboard);return chartRange===0?all:all.slice(-chartRange);},[chartRange,history,players,leaderboard]);
  const funStats = useMemo(()=>calcFunStats(matches,players,ratings,leaderboard,sortedMatches),[matches,players,ratings,leaderboard,sortedMatches]);

  // ─── Slack Notify ──────────────────────────────────────────────
  const notifySlack = async (text) => {
    try { await fetch('/api/slack',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})}); } catch(e){}
  };

  // ─── Actions ───────────────────────────────────────────────────
  const handleAddMatch = async () => {
    if(!mp1||!mp2||mp1===mp2||(!mw1&&!mw2)) return;
    setSaving(true);
    const {error} = await supabase.from('matches').insert({player1_id:mp1,player2_id:mp2,player1_wins:mw1,player2_wins:mw2});
    setSaving(false);
    if(error){alert('Error: '+error.message);return;}
    const p1=players.find(p=>p.id===mp1),p2=players.find(p=>p.id===mp2);
    const winner=mw1>mw2?p1:p2;
    notifySlack(`🏓 ${p1?.name} ${mw1}–${mw2} ${p2?.name} — ${winner?.name} wins!`);
    setMp1('');setMp2('');setMw1(0);setMw2(0);setShowAddMatch(false);
  };

  const handleAddPlayer = async () => {
    if(!npName.trim()){setNpError('Name required');return;}
    if(npAvatar&&npAvatarBg&&isComboTaken(npAvatar,npAvatarBg,null)){setNpError('That animal+color combo is taken!');return;}
    setSaving(true);
    const alias = npAlias.includes('@')?npAlias.split('@')[0]:npAlias;
    const {error} = await supabase.from('players').insert({name:npName.trim(),alias:alias.trim(),avatar:npAvatar,avatar_bg:npAvatarBg,city:npCity,team:npTeam});
    setSaving(false);
    if(error){setNpError(error.message);return;}
    setNpName('');setNpAlias('');setNpAvatar(null);setNpAvatarBg(null);setNpCity('Seattle');setNpTeam('GRAISE');setNpError('');setShowAddPlayer(false);
  };

  const handleSaveAvatar = async () => {
    if(!avatarPickerFor) return;
    setSaving(true);
    await supabase.from('players').update({avatar:pickerAnimal,avatar_bg:pickerBg}).eq('id',avatarPickerFor);
    setSaving(false);
    setAvatarPickerFor(null);
  };

  const handleDeleteMatch = async (matchId) => {
    if(!confirm('Delete this match?')) return;
    await supabase.from('matches').delete().eq('id',matchId);
  };

  const handleDeletePlayer = async (playerId) => {
    if(!confirm('Delete this player and all their matches?')) return;
    await supabase.from('matches').delete().or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);
    await supabase.from('players').delete().eq('id',playerId);
    setSelectedPlayer(null);
  };

  const handleSaveCities = async (newCities) => {
    setCities(newCities);
    await supabase.from('app_settings').upsert({id:'cities',value:newCities});
  };
  const handleSaveTeams = async (newTeams) => {
    setTeams(newTeams);
    await supabase.from('app_settings').upsert({id:'teams',value:newTeams});
  };

  const openEditPlayer = (p) => {
    setEditingPlayer(p);setEpName(p.name);setEpAlias(p.alias||'');setEpCity(p.city||'Seattle');setEpTeam(p.team||'GRAISE');setEpError('');
  };
  const handleEditPlayer = async () => {
    if(!epName.trim()){setEpError('Name required');return;}
    setSaving(true);
    const alias = epAlias.includes('@')?epAlias.split('@')[0]:epAlias;
    const {error} = await supabase.from('players').update({name:epName.trim(),alias:alias.trim(),city:epCity,team:epTeam}).eq('id',editingPlayer.id);
    setSaving(false);
    if(error){setEpError(error.message);return;}
    setEditingPlayer(null);
  };

  // ─── Styles ────────────────────────────────────────────────────
  const card={background:'#111',border:'1px solid #1e1e1e',borderRadius:'14px',padding:'20px',marginBottom:'12px'};
  const cardH={fontSize:'11px',fontWeight:500,letterSpacing:'0.08em',color:'#555',textTransform:'uppercase',marginBottom:'14px'};
  const overlay={position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',backdropFilter:'blur(8px)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:999};
  const mdl={background:'#141414',borderRadius:'20px 20px 0 0',padding:'28px 24px 40px',width:'100%',maxWidth:'520px',maxHeight:'85vh',overflowY:'auto',animation:'slideUp .25s ease-out'};
  const inp={width:'100%',padding:'12px 16px',borderRadius:'10px',border:'1px solid #2a2a2a',background:'#0a0a0a',color:'#e5e5e5',fontSize:'15px',outline:'none',fontFamily:'inherit',boxSizing:'border-box'};
  const sel={...inp,appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:'no-repeat',backgroundPosition:'right 14px center',paddingRight:'36px'};
  const btn1={width:'100%',padding:'14px',borderRadius:'12px',border:'none',background:'#fff',color:'#000',fontSize:'15px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'};
  const lbl={display:'block',fontSize:'11px',color:'#555',letterSpacing:'0.05em',marginBottom:'8px'};

  if(loading) return <Wrapper><div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',color:'#555'}}>Loading...</div></Wrapper>;

  // ─── Player Detail ─────────────────────────────────────────────
  if(selectedPlayer){
    const sp=players.find(p=>p.id===selectedPlayer.id)||selectedPlayer;
    const p={...sp,rating:ratings[sp.id]||1500};
    const ph=history[p.id]||[];const momentum=getMomentum(p.id,sortedMatches);const streak=getStreak(p.id,sortedMatches);
    const pm=sortedMatches.filter(m=>m.player1_id===p.id||m.player2_id===p.id).reverse();
    const w=pm.filter(m=>(m.player1_id===p.id&&m.player1_wins>m.player2_wins)||(m.player2_id===p.id&&m.player2_wins>m.player1_wins)).length;
    const l=pm.length-w;const rank=leaderboard.findIndex(x=>x.id===p.id)+1;const ti=getTitleForRank(rank,leaderboard.length);
    const opps={};pm.forEach(m=>{const oid=m.player1_id===p.id?m.player2_id:m.player1_id;const won=(m.player1_id===p.id&&m.player1_wins>m.player2_wins)||(m.player2_id===p.id&&m.player2_wins>m.player1_wins);if(!opps[oid])opps[oid]={wins:0,losses:0};if(won)opps[oid].wins++;else opps[oid].losses++;});

    return <Wrapper>
      <div style={{padding:'20px 0 16px',position:'sticky',top:0,zIndex:50,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{fontSize:'20px',fontWeight:600,letterSpacing:'-0.03em',color:'#fff'}}>GRAISE <span style={{fontWeight:300,color:'#555'}}>PPR</span></div>
      </div>
      <div style={{paddingTop:'8px',paddingBottom:'40px'}}>
        <button onClick={()=>setSelectedPlayer(null)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',padding:'4px 0',marginBottom:'16px',fontSize:'14px',fontFamily:'inherit'}}>← Back</button>
        <div style={{...card,textAlign:'center',padding:'28px 20px'}}>
          <div style={{display:'flex',justifyContent:'center',marginBottom:'12px',position:'relative'}}>
            <PlayerAvatar player={sp} size={64}/>
            <button onClick={()=>{setAvatarPickerFor(sp.id);setPickerAnimal(sp.avatar);setPickerBg(sp.avatar_bg);}} style={{position:'absolute',bottom:0,right:'calc(50% - 44px)',width:'22px',height:'22px',borderRadius:'50%',background:'#222',border:'1px solid #333',color:'#888',fontSize:'10px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>✎</button>
          </div>
          <div style={{fontSize:'22px',fontWeight:600,letterSpacing:'-0.02em'}}>{p.name}</div>
          {p.alias&&<div style={{fontSize:'12px',color:'#444',marginTop:'2px'}}>@{(p.alias.includes('@')?p.alias.split('@')[0]:p.alias).toLowerCase()}</div>}
          <div style={{fontSize:'12px',color:ti.color,marginTop:'6px',fontWeight:500}}>{ti.title}</div>
          <div style={{fontSize:'42px',fontWeight:200,color:'#22d3ee',marginTop:'8px',fontVariantNumeric:'tabular-nums'}}>{p.rating}</div>
          <div style={{fontSize:'10px',color:'#444',letterSpacing:'0.1em',marginTop:'-4px'}}>PPR</div>
          <div style={{display:'flex',justifyContent:'center',gap:'32px',marginTop:'20px'}}>
            <div><div style={{fontSize:'20px',fontWeight:500,color:'#34d399'}}>{w}</div><div style={{fontSize:'11px',color:'#555'}}>wins</div></div>
            <div><div style={{fontSize:'20px',fontWeight:500,color:'#f87171'}}>{l}</div><div style={{fontSize:'11px',color:'#555'}}>losses</div></div>
            <div><div style={{fontSize:'20px',fontWeight:500}}>{pm.length>0?Math.round(w/pm.length*100):0}%</div><div style={{fontSize:'11px',color:'#555'}}>win rate</div></div>
          </div>
          {momentum.length>0&&<div style={{display:'flex',justifyContent:'center',gap:'4px',marginTop:'16px',alignItems:'center'}}><span style={{fontSize:'11px',color:'#555',marginRight:'6px'}}>Last {momentum.length}</span><MomentumDots results={momentum}/></div>}
          {streak>=3&&<div style={{marginTop:'10px',fontSize:'13px',color:'#f97316'}}>🔥 {streak} straight wins</div>}
          {p.city&&<div style={{fontSize:'11px',color:'#444',marginTop:'12px'}}>{p.city}{p.team?' · '+p.team:''}</div>}
          {isAdmin&&<div style={{display:'flex',gap:'8px',justifyContent:'center',marginTop:'16px'}}><button onClick={()=>openEditPlayer(sp)} style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #33333380',background:'#ffffff08',color:'#888',fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>Edit Player</button><button onClick={()=>handleDeletePlayer(p.id)} style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #f8717140',background:'#f8717110',color:'#f87171',fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>Delete Player</button></div>}
        </div>
        {ph.length>1&&<div style={card}><div style={cardH}>Rating History</div><div style={{width:'100%',height:180}}><ResponsiveContainer><LineChart data={ph.map(h=>({...h,label:fmtDate(h.date)}))}><XAxis dataKey="label" tick={{fill:'#444',fontSize:10}} axisLine={{stroke:'#1a1a1a'}} tickLine={false} interval="preserveStartEnd"/><YAxis tick={{fill:'#444',fontSize:10}} axisLine={false} tickLine={false} domain={['dataMin-20','dataMax+20']}/><Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'10px',fontSize:'12px'}}/><ReferenceLine y={1500} stroke="#222" strokeDasharray="3 3"/><Line type="monotone" dataKey="rating" stroke="#22d3ee" strokeWidth={2} dot={{r:3,fill:'#22d3ee'}}/></LineChart></ResponsiveContainer></div></div>}
        {Object.keys(opps).length>0&&<div style={card}><div style={cardH}>Head to Head</div>{Object.entries(opps).sort((a,b)=>(b[1].wins+b[1].losses)-(a[1].wins+a[1].losses)).map(([oid,rec])=>{const opp=players.find(x=>x.id===oid);if(!opp)return null;const t=rec.wins+rec.losses,pct=t>0?Math.round(rec.wins/t*100):0;return<div key={oid} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid #1a1a1a'}}><PlayerAvatar player={opp} size={28}/><div style={{flex:1}}><div style={{fontSize:'14px',color:'#e5e5e5'}}>{opp.name}</div><div style={{fontSize:'12px',color:'#555'}}>{rec.wins}W – {rec.losses}L</div></div><div style={{width:'60px',height:'4px',borderRadius:'2px',background:'#1a1a1a',overflow:'hidden'}}><div style={{width:`${pct}%`,height:'100%',borderRadius:'2px',background:pct>=50?'#34d399':'#f87171'}}/></div><span style={{fontSize:'12px',color:pct>=50?'#34d399':'#f87171',width:'36px',textAlign:'right',fontVariantNumeric:'tabular-nums'}}>{pct}%</span></div>;})}</div>}
        <div style={card}><div style={cardH}>Match History</div>{pm.map(m=>{const is1=m.player1_id===p.id;const opp=players.find(x=>x.id===(is1?m.player2_id:m.player1_id));const won=is1?m.player1_wins>m.player2_wins:m.player2_wins>m.player1_wins;const sc=is1?`${m.player1_wins}–${m.player2_wins}`:`${m.player2_wins}–${m.player1_wins}`;return<div key={m.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid #1a1a1a'}}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:won?'#34d399':'#f87171',flexShrink:0}}/><div style={{flex:1}}><span style={{fontSize:'14px',color:'#e5e5e5'}}>vs {opp?.name}</span><span style={{fontSize:'13px',color:'#555',marginLeft:'8px'}}>{sc}</span></div><span style={{fontSize:'11px',color:'#444'}}>{fmtDate(m.date)}</span>{isAdmin&&<button onClick={()=>handleDeleteMatch(m.id)} style={{background:'none',border:'none',color:'#333',cursor:'pointer',fontSize:'14px',padding:'2px 6px'}}>×</button>}</div>;})}</div>
      </div>
      {avatarPickerFor&&<div style={overlay} onClick={()=>setAvatarPickerFor(null)}><div style={mdl} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontSize:'18px',fontWeight:600,color:'#fff',margin:'0 0 20px'}}>Choose Avatar</h3>
        <div style={{marginBottom:'14px'}}><label style={lbl}>BACKGROUND</label><div style={{display:'flex',gap:'8px'}}><button onClick={()=>{setPickerBg(null);setPickerAnimal(null);}} style={{width:'36px',height:'36px',borderRadius:'50%',background:'#1a1a1a',border:!pickerBg?'2px solid #888':'1px solid #2a2a2a',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#666'}}>—</button>{BG_COLORS.map(bg=><button key={bg.id} onClick={()=>setPickerBg(bg.id)} style={{width:'36px',height:'36px',borderRadius:'50%',background:bg.bg,border:pickerBg===bg.id?'2px solid #888':`1.5px solid ${bg.border}`,cursor:'pointer'}}/>)}</div></div>
        {pickerBg&&<div style={{marginBottom:'20px'}}><label style={lbl}>ANIMAL</label><div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',maxHeight:'240px',overflowY:'auto'}}>{ANIMAL_KEYS.map(k=>{const taken=isComboTaken(k,pickerBg,avatarPickerFor);return<button key={k} onClick={()=>!taken&&setPickerAnimal(pickerAnimal===k?null:k)} disabled={taken} style={{padding:'8px',borderRadius:'10px',background:pickerAnimal===k?'#222':'#0a0a0a',border:pickerAnimal===k?'2px solid #666':'1px solid #1e1e1e',cursor:taken?'not-allowed':'pointer',opacity:taken?.25:1,color:'#d4d4d8',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>{ANIMALS[k](20)}<span style={{fontSize:'9px',color:'#666'}}>{k}</span></button>;})}</div></div>}
        <button onClick={handleSaveAvatar} disabled={saving} style={{...btn1,opacity:saving?.5:1}}>Save</button>
      </div></div>}
      {editingPlayer&&<div style={overlay} onClick={()=>setEditingPlayer(null)}><div style={mdl} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}><h3 style={{fontSize:'18px',fontWeight:600,color:'#fff',margin:0}}>Edit Player</h3><button onClick={()=>setEditingPlayer(null)} style={{background:'none',border:'none',color:'#555',fontSize:'20px',cursor:'pointer'}}>✕</button></div>
        <div style={{marginBottom:'14px'}}><label style={lbl}>NAME *</label><input value={epName} onChange={e=>{setEpName(e.target.value);setEpError('');}} style={inp}/></div>
        <div style={{marginBottom:'14px'}}><label style={lbl}>ALIAS</label><input value={epAlias} onChange={e=>setEpAlias(e.target.value)} style={inp}/></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
          <div><label style={lbl}>CITY</label><select value={epCity} onChange={e=>setEpCity(e.target.value)} style={sel}>{cities.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label style={lbl}>TEAM</label><select value={epTeam} onChange={e=>setEpTeam(e.target.value)} style={sel}>{teams.map(t=><option key={t}>{t}</option>)}</select></div>
        </div>
        {epError&&<div style={{color:'#f87171',fontSize:'13px',marginBottom:'14px'}}>{epError}</div>}
        <button onClick={handleEditPlayer} disabled={saving} style={{...btn1,opacity:saving?.5:1}}>{saving?'Saving...':'Save Changes'}</button>
      </div></div>}
      <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    </Wrapper>;
  }

  // ─── All Matches ───────────────────────────────────────────────
  if(showAllMatches){
    return <Wrapper>
      <div style={{padding:'20px 0 16px'}}><div style={{fontSize:'20px',fontWeight:600,letterSpacing:'-0.03em',color:'#fff'}}>GRAISE <span style={{fontWeight:300,color:'#555'}}>PPR</span></div></div>
      <div style={{paddingTop:'8px',paddingBottom:'40px'}}>
        <button onClick={()=>setShowAllMatches(false)} style={{background:'none',border:'none',color:'#555',cursor:'pointer',padding:'4px 0',marginBottom:'16px',fontSize:'14px',fontFamily:'inherit'}}>← Back</button>
        <div style={card}><div style={cardH}>All Matches</div>{[...sortedMatches].reverse().map(m=>{const p1=players.find(p=>p.id===m.player1_id),p2=players.find(p=>p.id===m.player2_id);return<div key={m.id} style={{padding:'12px 0',borderBottom:'1px solid #1a1a1a'}}><div style={{display:'flex',alignItems:'center',gap:'10px'}}><PlayerAvatar player={p1} size={24}/><div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}><span style={{fontSize:'14px',color:m.player1_wins>m.player2_wins?'#34d399':'#e5e5e5',fontWeight:m.player1_wins>m.player2_wins?500:400}}>{p1?.name}</span><span style={{fontSize:'14px',color:'#555',fontVariantNumeric:'tabular-nums'}}>{m.player1_wins}–{m.player2_wins}</span><span style={{fontSize:'14px',color:m.player2_wins>m.player1_wins?'#34d399':'#e5e5e5',fontWeight:m.player2_wins>m.player1_wins?500:400}}>{p2?.name}</span></div><PlayerAvatar player={p2} size={24}/>{isAdmin&&<button onClick={()=>handleDeleteMatch(m.id)} style={{background:'none',border:'none',color:'#333',cursor:'pointer',fontSize:'14px',padding:'2px 6px'}}>×</button>}</div><div style={{fontSize:'11px',color:'#333',marginTop:'6px'}}>{fmtDT(m.created_at)}</div></div>;})}</div>
      </div>
    </Wrapper>;
  }

  // ═══ HOME ══════════════════════════════════════════════════════
  return <Wrapper>
    {/* Header */}
    <div style={{padding:'20px 0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
      <div>
        <div style={{fontSize:'20px',fontWeight:600,letterSpacing:'-0.03em',color:'#fff'}}>GRAISE <span style={{fontWeight:300,color:'#555'}}>PPR</span></div>
        <div style={{fontSize:'10px',color:'#333',letterSpacing:'0.08em',marginTop:'2px'}}>PING PONG RATINGS</div>
      </div>
      <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
        <button onClick={()=>setShowAddMatch(true)} style={{padding:'8px 16px',borderRadius:'20px',border:'none',background:'#22d3ee',color:'#000',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>+ Match</button>
        {!isAdmin?<button onClick={()=>setShowAdmin(true)} style={{width:'32px',height:'32px',borderRadius:'50%',border:'1px solid #222',background:'transparent',color:'#333',cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',justifyContent:'center'}}>⚙</button>:<button onClick={()=>setIsAdmin(false)} style={{padding:'6px 12px',borderRadius:'14px',border:'1px solid #f8717130',background:'#f8717110',color:'#f87171',cursor:'pointer',fontSize:'11px',fontFamily:'inherit'}}>Admin ✕</button>}
      </div>
    </div>

    <div style={{paddingTop:'8px',paddingBottom:'40px'}}>

      {/* Rankings */}
      <div style={card}><div style={cardH}>Rankings</div>
        {leaderboard.map((p,idx)=>{const momentum=getMomentum(p.id,sortedMatches);const streak=getStreak(p.id,sortedMatches);const ti=getTitleForRank(idx+1,leaderboard.length);return<div key={p.id} onClick={()=>setSelectedPlayer(p)} style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 0',borderBottom:idx<leaderboard.length-1?'1px solid #1a1a1a':'none',cursor:'pointer'}}>
          <span style={{width:'22px',fontSize:'13px',fontWeight:600,color:idx===0?'#fbbf24':idx===1?'#94a3b8':idx===2?'#d97706':'#444',textAlign:'center',flexShrink:0,fontVariantNumeric:'tabular-nums'}}>{idx+1}</span>
          <PlayerAvatar player={p} size={36}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}><span style={{fontSize:'15px',fontWeight:500,color:'#e5e5e5',letterSpacing:'-0.01em'}}>{p.name}</span>{streak>=3&&<span style={{fontSize:'12px',color:'#f97316'}}>🔥{streak}</span>}</div>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginTop:'3px'}}><span style={{fontSize:'11px',color:ti.color}}>{ti.title}</span><span style={{fontSize:'12px',color:'#444'}}>{p.wins}W–{p.losses}L</span>{momentum.length>0&&<MomentumDots results={momentum}/>}</div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}><div style={{fontSize:'18px',fontWeight:300,color:'#fff',fontVariantNumeric:'tabular-nums'}}>{p.rating}</div><div style={{fontSize:'10px',color:'#444',letterSpacing:'0.05em'}}>PPR</div></div>
        </div>;})}
        {leaderboard.length===0&&<div style={{color:'#444',fontSize:'14px',textAlign:'center',padding:'30px 0'}}>No matches yet. Add players and record a match!</div>}
      </div>

      <button onClick={()=>setShowAddPlayer(true)} style={{width:'100%',padding:'14px',borderRadius:'12px',border:'1px dashed #222',background:'transparent',color:'#444',fontSize:'14px',cursor:'pointer',marginBottom:'12px',fontFamily:'inherit'}}>+ Add Player</button>

      {/* Rating History Chart */}
      {chartData.length>1&&<div style={card}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
          <div style={cardH}>Rating History</div>
          <div style={{display:'flex',gap:'4px'}}>{[{l:'1W',v:7},{l:'2W',v:14},{l:'1M',v:30},{l:'3M',v:90},{l:'All',v:0}].map(r=><button key={r.v} onClick={()=>setChartRange(r.v)} style={{padding:'4px 10px',borderRadius:'6px',border:'none',fontSize:'11px',background:chartRange===r.v?'#222':'transparent',color:chartRange===r.v?'#e5e5e5':'#555',cursor:'pointer',fontFamily:'inherit'}}>{r.l}</button>)}</div>
        </div>
        <div style={{width:'100%',height:220}}><ResponsiveContainer><LineChart data={chartData}>
          <XAxis dataKey="label" tick={{fill:'#444',fontSize:10}} axisLine={{stroke:'#1a1a1a'}} tickLine={false} interval="preserveStartEnd"/>
          <YAxis tick={{fill:'#444',fontSize:10}} axisLine={false} tickLine={false} domain={['dataMin-20','dataMax+20']}/>
          <Tooltip contentStyle={{background:'#1a1a1a',border:'1px solid #333',borderRadius:'10px',fontSize:'12px'}} labelStyle={{color:'#888'}}/>
          <ReferenceLine y={1500} stroke="#222" strokeDasharray="3 3"/>
          {leaderboard.slice(0,8).map((p,i)=><Line key={p.id} type="monotone" dataKey={p.name} stroke={PLAYER_COLORS[i%PLAYER_COLORS.length]} strokeWidth={2} dot={false} connectNulls={false}/>)}
        </LineChart></ResponsiveContainer></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:'8px 16px',marginTop:'12px'}}>{leaderboard.slice(0,8).map((p,i)=><div key={p.id} style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'8px',height:'8px',borderRadius:'50%',background:PLAYER_COLORS[i%PLAYER_COLORS.length]}}/><span style={{fontSize:'11px',color:'#888'}}>{p.name}</span></div>)}</div>
      </div>}

      {/* Recent Matches */}
      <div style={card}><div style={cardH}>Recent Matches</div>
        {[...sortedMatches].reverse().slice(0,5).map(m=>{const p1=players.find(p=>p.id===m.player1_id),p2=players.find(p=>p.id===m.player2_id);return<div key={m.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 0',borderBottom:'1px solid #1a1a1a'}}><PlayerAvatar player={p1} size={24}/><div style={{flex:1,display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}><span style={{fontSize:'14px',color:m.player1_wins>m.player2_wins?'#34d399':'#e5e5e5',fontWeight:m.player1_wins>m.player2_wins?500:400}}>{p1?.name}</span><span style={{fontSize:'14px',color:'#555',fontVariantNumeric:'tabular-nums'}}>{m.player1_wins}–{m.player2_wins}</span><span style={{fontSize:'14px',color:m.player2_wins>m.player1_wins?'#34d399':'#e5e5e5',fontWeight:m.player2_wins>m.player1_wins?500:400}}>{p2?.name}</span></div><PlayerAvatar player={p2} size={24}/></div>;})}
        {sortedMatches.length>5&&<button onClick={()=>setShowAllMatches(true)} style={{width:'100%',padding:'12px',marginTop:'8px',borderRadius:'10px',border:'1px solid #1e1e1e',background:'transparent',color:'#888',fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>See all {matches.length} matches →</button>}
      </div>

      {/* Highlights */}
      {matches.length>0&&<div style={card}><div style={cardH}>Highlights</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          {funStats.hotStreak&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>🔥 HOT STREAK</div><div style={{fontSize:'14px',color:'#f97316',fontWeight:500}}>{funStats.hotStreak.player.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{funStats.hotStreak.streak} straight wins</div></div>}
          {funStats.topGainerWeek&&funStats.topGainerWeek.gain>0&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>📈 RISING STAR</div><div style={{fontSize:'14px',color:'#34d399',fontWeight:500}}>{funStats.topGainerWeek.player.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>+{funStats.topGainerWeek.gain} PPR this week</div></div>}
          {funStats.topGainerMonth&&funStats.topGainerMonth.gain>0&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>🚀 MONTHLY MVP</div><div style={{fontSize:'14px',color:'#34d399',fontWeight:500}}>{funStats.topGainerMonth.player.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>+{funStats.topGainerMonth.gain} PPR this month</div></div>}
          {funStats.biggestFallWeek&&funStats.biggestFallWeek.gain<0&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>🎢 REDEMPTION ARC</div><div style={{fontSize:'14px',color:'#f472b6',fontWeight:500}}>{funStats.biggestFallWeek.player.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{funStats.biggestFallWeek.gain} PPR this week</div></div>}
          {funStats.biggestUpset&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>😱 BIGGEST UPSET</div><div style={{fontSize:'14px',color:'#a78bfa',fontWeight:500}}>{funStats.biggestUpset.winner.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>beat {funStats.biggestUpset.loser.name} ({funStats.biggestUpset.diff} PPR gap)</div></div>}
          {funStats.nemesis&&funStats.nemesis.count>=2&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>🧲 ARCH RIVALS</div><div style={{fontSize:'14px',color:'#fbbf24',fontWeight:500}}>{funStats.nemesis.p1?.name?.split(' ')[0]} vs {funStats.nemesis.p2?.name?.split(' ')[0]}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{funStats.nemesis.count} matches played</div></div>}
          {funStats.shutoutKing&&funStats.shutoutKing.count>=2&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>💀 SHUTOUT KING</div><div style={{fontSize:'14px',color:'#f87171',fontWeight:500}}>{funStats.shutoutKing.player.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{funStats.shutoutKing.count} perfect wins</div></div>}
          {funStats.clutchPlayer&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>🎯 GIANT KILLER</div><div style={{fontSize:'14px',color:'#60a5fa',fontWeight:500}}>{funStats.clutchPlayer.player.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{funStats.clutchPlayer.count} underdog wins</div></div>}
          {funStats.wall&&<div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>🪨 THE WALL</div><div style={{fontSize:'14px',color:'#94a3b8',fontWeight:500}}>{funStats.wall.player.name}</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>Only {funStats.wall.avg} games conceded/match</div></div>}
          <div style={{background:'#0a0a0a',borderRadius:'10px',padding:'14px'}}><div style={{fontSize:'10px',color:'#555',letterSpacing:'0.05em',marginBottom:'6px'}}>🏓 THE TALLY</div><div style={{fontSize:'14px',color:'#e5e5e5',fontWeight:500}}>{funStats.totalMatches} matches</div><div style={{fontSize:'12px',color:'#666',marginTop:'2px'}}>{funStats.totalGames} games played</div></div>
        </div>
      </div>}

      {/* Head to Head */}
      {leaderboard.length>=2&&<div style={card}><div style={cardH}>Head to Head</div>
        <div style={{overflowX:'auto',WebkitOverflowScrolling:'touch'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
            <thead><tr><th style={{padding:'6px',textAlign:'left',color:'#555',fontWeight:400}}></th>{leaderboard.map(p=><th key={p.id} style={{padding:'6px',color:'#888',fontWeight:400,fontSize:'11px',whiteSpace:'nowrap'}}>{p.name.split(' ')[0].slice(0,6)}</th>)}</tr></thead>
            <tbody>{leaderboard.map(p1=><tr key={p1.id}><td style={{padding:'6px',color:'#888',fontSize:'11px',whiteSpace:'nowrap'}}>{p1.name.split(' ')[0].slice(0,6)}</td>
              {leaderboard.map(p2=>{if(p1.id===p2.id)return<td key={p2.id} style={{padding:'6px',textAlign:'center',color:'#222'}}>—</td>;
                const w=sortedMatches.filter(m=>(m.player1_id===p1.id&&m.player2_id===p2.id&&m.player1_wins>m.player2_wins)||(m.player2_id===p1.id&&m.player1_id===p2.id&&m.player2_wins>m.player1_wins)).length;
                const l=sortedMatches.filter(m=>(m.player1_id===p1.id&&m.player2_id===p2.id&&m.player1_wins<m.player2_wins)||(m.player2_id===p1.id&&m.player1_id===p2.id&&m.player2_wins<m.player1_wins)).length;
                return<td key={p2.id} style={{padding:'6px',textAlign:'center'}}>{w+l>0?<span style={{color:w>l?'#34d399':w<l?'#f87171':'#888'}}>{w}–{l}</span>:<span style={{color:'#222'}}>·</span>}</td>;})}
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </div>

    {/* ═══ MODALS ══════════════════════════════════════════════════ */}
    {showAddMatch&&<div style={overlay} onClick={()=>setShowAddMatch(false)}><div style={mdl} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}><h3 style={{fontSize:'18px',fontWeight:600,color:'#fff',letterSpacing:'-0.02em',margin:0}}>Record Match</h3><button onClick={()=>setShowAddMatch(false)} style={{background:'none',border:'none',color:'#555',fontSize:'20px',cursor:'pointer'}}>✕</button></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'24px'}}>
        <div><label style={lbl}>PLAYER 1</label><select value={mp1} onChange={e=>setMp1(e.target.value)} style={sel}><option value="">Select...</option>{players.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div><label style={lbl}>PLAYER 2</label><select value={mp2} onChange={e=>setMp2(e.target.value)} style={sel}><option value="">Select...</option>{players.filter(p=>p.id!==mp1).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      </div>
      {mp1&&mp2&&<><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'28px'}}><ScoreStepper label={players.find(p=>p.id===mp1)?.name?.split(' ')[0]?.toUpperCase()} value={mw1} onChange={setMw1}/><ScoreStepper label={players.find(p=>p.id===mp2)?.name?.split(' ')[0]?.toUpperCase()} value={mw2} onChange={setMw2}/></div><button onClick={handleAddMatch} disabled={saving||(!mw1&&!mw2)} style={{...btn1,opacity:(saving||(!mw1&&!mw2))?.3:1,cursor:(saving||(!mw1&&!mw2))?'default':'pointer'}}>{saving?'Saving...':'Record Match'}</button></>}
    </div></div>}

    {showAddPlayer&&<div style={overlay} onClick={()=>setShowAddPlayer(false)}><div style={mdl} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'24px'}}><h3 style={{fontSize:'18px',fontWeight:600,color:'#fff',letterSpacing:'-0.02em',margin:0}}>New Player</h3><button onClick={()=>setShowAddPlayer(false)} style={{background:'none',border:'none',color:'#555',fontSize:'20px',cursor:'pointer'}}>✕</button></div>
      <div style={{marginBottom:'14px'}}><label style={lbl}>NAME *</label><input value={npName} onChange={e=>{setNpName(e.target.value);setNpError('');}} placeholder="First Last" style={inp}/></div>
      <div style={{marginBottom:'14px'}}><label style={lbl}>ALIAS (FOR SLACK)</label><input value={npAlias} onChange={e=>setNpAlias(e.target.value)} placeholder="@handle or nickname" style={inp}/><div style={{fontSize:'11px',color:'#333',marginTop:'4px'}}>Shown on profile. @domain stripped automatically.</div></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'14px'}}>
        <div><label style={lbl}>CITY</label><select value={npCity} onChange={e=>setNpCity(e.target.value)} style={sel}>{cities.map(c=><option key={c}>{c}</option>)}</select></div>
        <div><label style={lbl}>TEAM</label><select value={npTeam} onChange={e=>setNpTeam(e.target.value)} style={sel}>{teams.map(t=><option key={t}>{t}</option>)}</select></div>
      </div>
      <div style={{marginBottom:'14px'}}><label style={lbl}>AVATAR (OPTIONAL)</label>
        <div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>{BG_COLORS.map(bg=><button key={bg.id} onClick={()=>setNpAvatarBg(npAvatarBg===bg.id?null:bg.id)} style={{width:'32px',height:'32px',borderRadius:'50%',background:bg.bg,border:npAvatarBg===bg.id?'2px solid #888':`1.5px solid ${bg.border}`,cursor:'pointer'}}/>)}</div>
        {npAvatarBg?<div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'8px',maxHeight:'200px',overflowY:'auto'}}>{ANIMAL_KEYS.map(k=>{const taken=isComboTaken(k,npAvatarBg,null);const s2=npAvatar===k;return<button key={k} onClick={()=>!taken&&setNpAvatar(s2?null:k)} disabled={taken} style={{padding:'8px',borderRadius:'10px',background:s2?'#222':'#0a0a0a',border:s2?'2px solid #666':'1px solid #1e1e1e',cursor:taken?'not-allowed':'pointer',opacity:taken?.25:1,color:'#d4d4d8',display:'flex',flexDirection:'column',alignItems:'center',gap:'4px'}}>{ANIMALS[k](20)}<span style={{fontSize:'9px',color:'#666'}}>{k}</span></button>;})}</div>:<div style={{fontSize:'12px',color:'#444'}}>Pick a background color first, or skip for initials</div>}
      </div>
      {npError&&<div style={{color:'#f87171',fontSize:'13px',marginBottom:'14px'}}>{npError}</div>}
      <button onClick={handleAddPlayer} disabled={saving} style={{...btn1,opacity:saving?.5:1}}>{saving?'Saving...':'Add Player'}</button>
    </div></div>}

    {showAdmin&&<div style={overlay} onClick={()=>setShowAdmin(false)}><div style={mdl} onClick={e=>e.stopPropagation()}>
      {!isAdmin?<><h3 style={{fontSize:'18px',fontWeight:600,color:'#fff',margin:'0 0 20px'}}>Admin Access</h3><input type="password" value={adminPw} onChange={e=>setAdminPw(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&adminPw===ADMIN_PASSWORD){setIsAdmin(true);setShowAdmin(false);setAdminPw('');}}} placeholder="Password" style={{...inp,marginBottom:'16px'}} autoFocus/><button onClick={()=>{if(adminPw===ADMIN_PASSWORD){setIsAdmin(true);setShowAdmin(false);setAdminPw('');}else setAdminPw('');}} style={btn1}>Enter</button></>
      :<><h3 style={{fontSize:'18px',fontWeight:600,color:'#fff',margin:'0 0 20px'}}>Admin Settings</h3>
        <div style={{marginBottom:'20px'}}><label style={lbl}>CITIES</label><div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>{cities.map(c=><span key={c} style={{padding:'4px 10px',borderRadius:'6px',background:'#1a1a1a',fontSize:'12px',color:'#888',display:'flex',alignItems:'center',gap:'6px'}}>{c}{c!=='Off the Map'&&<button onClick={()=>{const nc=cities.filter(x=>x!==c);handleSaveCities(nc);}} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:'14px',padding:0}}>×</button>}</span>)}</div><div style={{display:'flex',gap:'8px'}}><input value={newCity} onChange={e=>setNewCity(e.target.value)} placeholder="New city..." style={{...inp,flex:1}}/><button onClick={()=>{if(newCity.trim()&&!cities.includes(newCity.trim())){const nc=[...cities.slice(0,-1),newCity.trim(),cities[cities.length-1]];handleSaveCities(nc);setNewCity('');}}} style={{padding:'10px 16px',borderRadius:'10px',border:'1px solid #333',background:'transparent',color:'#888',cursor:'pointer',fontFamily:'inherit',fontSize:'13px'}}>Add</button></div></div>
        <div style={{marginBottom:'20px'}}><label style={lbl}>TEAMS</label><div style={{display:'flex',flexWrap:'wrap',gap:'6px',marginBottom:'8px'}}>{teams.map(t=><span key={t} style={{padding:'4px 10px',borderRadius:'6px',background:'#1a1a1a',fontSize:'12px',color:'#888',display:'flex',alignItems:'center',gap:'6px'}}>{t}{t!=='Other'&&<button onClick={()=>{const nt=teams.filter(x=>x!==t);handleSaveTeams(nt);}} style={{background:'none',border:'none',color:'#555',cursor:'pointer',fontSize:'14px',padding:0}}>×</button>}</span>)}</div><div style={{display:'flex',gap:'8px'}}><input value={newTeam} onChange={e=>setNewTeam(e.target.value)} placeholder="New team..." style={{...inp,flex:1}}/><button onClick={()=>{if(newTeam.trim()&&!teams.includes(newTeam.trim())){const nt=[...teams.slice(0,-1),newTeam.trim(),teams[teams.length-1]];handleSaveTeams(nt);setNewTeam('');}}} style={{padding:'10px 16px',borderRadius:'10px',border:'1px solid #333',background:'transparent',color:'#888',cursor:'pointer',fontFamily:'inherit',fontSize:'13px'}}>Add</button></div></div>
        <button onClick={()=>setShowAdmin(false)} style={btn1}>Done</button>
      </>}
    </div></div>}

    <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}*{-webkit-tap-highlight-color:transparent}::-webkit-scrollbar{width:0;height:0}input::placeholder{color:#333}select option{background:#141414;color:#e5e5e5}`}</style>
  </Wrapper>;
}
