import { FORMATIONS } from './formations.js';
import { ROLE_WEIGHTS } from './constants.js';

const SLOT_NAMES = ["GK", "CB", "LCB", "RCB", "LB", "RB", "DM", "LDM", "RDM", "LWB", "RWB", "CM", "LCM", "RCM", "LM", "RM", "AM", "LAM", "RAM", "LW", "RW", "FW", "LFW", "RFW"];
const SLOT_IDX = {};
SLOT_NAMES.forEach((s, i) => SLOT_IDX[s] = i);

const POS_COORDS = {
    "GK": [2, 4], "CB": [2, 4], "LCB": [1, 4], "RCB": [3, 4], "LB": [0, 4], "RB": [4, 4],
    "DM": [2, 3], "LDM": [1, 3], "RDM": [3, 3], "LWB": [0, 3], "RWB": [4, 3],
    "CM": [2, 2], "LCM": [1, 2], "RCM": [3, 2], "LM": [0, 2], "RM": [4, 2],
    "AM": [2, 1], "LAM": [1, 1], "RAM": [3, 1], "LW": [0, 1], "RW": [4, 1],
    "FW": [2, 0], "LFW": [1, 0], "RFW": [3, 0]
};

// 🔥 SENİN ÇİZDİĞİN 5x5 İHTİYAÇ MATRİSİ 🔥
const GRID_NEEDS = [
    [0, 15, 30, 15, 0],   // Y=0 (Hücum - FW Hattı)
    [0, 20, 35, 20, 0], // Y=1 (AM Hattı)
    [0, 25, 40, 25, 0], // Y=2 (CM Hattı)
    [5, 30, 50, 30, 5], // Y=3 (DM Hattı)
    [10, 30, 55, 30, 10]  // Y=4 (Savunma - CB Hattı)
];

function getBasePosition(slot) {
  const map = {
      "LCB": "CB", "RCB": "CB", "LCM": "CM", "RCM": "CM", "LDM": "DM", "RDM": "DM", "LAM": "AM", "RAM": "AM", "LFW": "FW", "RFW": "FW"
  };
  return map[slot] || slot;
}

// 🛡️ NULL HATASINI KÖKTEN ÇÖZEN YEREL ROL BULUCU
function getBestRoleForStatsLocal(pos, stats) {
    const roles = ROLE_WEIGHTS[pos];
    if (!roles) return "Bilinmeyen Rol";
    let bestRole = Object.keys(roles)[0];
    let maxAverage = -1;
    for (const [roleName, weights] of Object.entries(roles)) {
        let totalScore = 0, totalWeight = 0;
        for (const [statName, weightVal] of Object.entries(weights)) {
            if (weightVal > 0) {
                totalScore += (stats[statName] || 0) * weightVal;
                totalWeight += weightVal;
            }
        }
        const avg = totalWeight > 0 ? (totalScore / totalWeight) : 0;
        if (avg > maxAverage) { maxAverage = avg; bestRole = roleName; }
    }
    return bestRole;
}

function getPlayerCapacityForSlot(player, slot, forceFill) {
    const baseSlot = getBasePosition(slot);
    
    if (player.bannedPositions && player.bannedPositions.includes(baseSlot)) {
        return { cap: 0, isMain: false, isSec: false, outOfPos: true, invalid: true, banned: true, role: getBestRoleForStatsLocal(baseSlot, player.stats) };
    }

    const mainBase = getBasePosition(player.mainPos);
    if (mainBase === baseSlot) {
        let r = player.role;
        if (!r || r === 'null') r = getBestRoleForStatsLocal(baseSlot, player.stats);
        return { cap: 100, isMain: true, isSec: false, outOfPos: false, invalid: false, banned: false, role: r };
    }
    
    const sec = player.secondaryPositions?.find(sp => getBasePosition(sp.pos) === baseSlot);
    if (sec) {
        let r = sec.role;
        if (!r || r === 'null') r = getBestRoleForStatsLocal(baseSlot, player.stats);
        return { cap: Math.max(25, sec.capacity), isMain: false, isSec: true, outOfPos: false, invalid: false, banned: false, role: r };
    }
    
    if (forceFill) return { cap: 25, isMain: false, isSec: false, outOfPos: true, invalid: false, banned: false, role: getBestRoleForStatsLocal(baseSlot, player.stats) };
    return { cap: 0, isMain: false, isSec: false, outOfPos: true, invalid: true, banned: false, role: getBestRoleForStatsLocal(baseSlot, player.stats) };
}

function calculateRoleOVR(player, pos, role) {
    const weights = ROLE_WEIGHTS[pos]?.[role];
    const getStat = s => player.stats[s] ?? (s === 'sut' ? player.stats.şut : s === 'firsat' ? player.stats.fırsat : 0);
    let baseOvr = 0;
    if (weights) {
        let ts = 0, tw = 0;
        for (const [s, w] of Object.entries(weights)) { if (w > 0) { ts += getStat(s) * w; tw += w; } }
        if (tw > 0) baseOvr = Math.round(ts / tw);
    } else {
        baseOvr = Math.round(((player.stats.pas || 0) + (player.stats.savunma || 0) + (player.stats.dribling || 0) + (player.stats.hava || 0) + getStat('firsat') + (pos === 'GK' ? player.stats.sutKarsilama || 0 : getStat('sut'))) / 6);
    }
    return baseOvr;
}

function isAttackerRole(basePos, role) {
    if (['FW', 'AM', 'LW', 'RW'].includes(basePos)) return true;
    if (['LM', 'RM'].includes(basePos) && ['Ofansif Açık Orta Saha', 'Ters Ofansif Açık Orta Saha'].includes(role)) return true;
    if (basePos === 'CM' && ['Hücumcu Orta Saha', 'Şutör Orta Saha'].includes(role)) return true;
    if (basePos === 'DM' && role === 'Hücumcu Defansif Orta Saha') return true;
    if (['LWB', 'RWB'].includes(basePos) && role === 'Ofansif Kanat Bek') return true;
    return false;
}

function calculateGridPenalty(assignment) {
    const coverage = Array.from({length: 5}, () => new Array(5).fill(0));

    assignment.forEach(item => {
        if (item.invalid || item.basePos === "GK") return; 

        const coords = POS_COORDS[item.slot];
        if (!coords) return;
        
        const cx = coords[0];
        const cy = coords[1];

        const isAtk = isAttackerRole(item.basePos, item.role);
        const multiplier = isAtk ? 0.6 : 1.0;

        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const dx = Math.abs(x - cx);
                const dy = Math.abs(y - cy);
                let val = 0;

                if (dx === 0 && dy === 0) val = 60; 
                else if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) val = 30; 
                else if (dx === 1 && dy === 1) val = 15; 

                coverage[y][x] += val * multiplier;
            }
        }
    });

    let penalty = 0;
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const deficit = GRID_NEEDS[y][x] - coverage[y][x];
            if (deficit > 0) {
                // Bölgeye özel önem çarpanı (Savunma ve Ön Libero hattını boş bırakmayı ağır cezalandırır)
                let rowMultiplier = 1.0;
                if (y === 3) rowMultiplier = 2.0; // DM hattı (x2 Ceza)
                if (y === 4) rowMultiplier = 3.5; // Savunma hattı (x3.5 Ceza)
                
                // Ana formül: (Açık - Tolerans)^2.8 * 8 * Bölge Çarpanı
                penalty += Math.pow(Math.max(0, deficit - 5), 2.8) * 8 * rowMultiplier;
            }
        }
    }
    return penalty;
}

let PRE_COST = [];
let PRE_META = [];
let PRE_OVR = [];
const MAX_N = 14;
const globalCost = Array.from({length: MAX_N}, () => new Int32Array(MAX_N));
const globalDp = new Int32Array(1 << MAX_N);
const globalParent = new Int32Array(1 << MAX_N);
const globalChoice = new Int32Array(1 << MAX_N);
const bits = new Int32Array(1 << MAX_N);
for(let i = 1; i < (1 << MAX_N); i++) bits[i] = bits[i >> 1] + (i & 1);

export function initFormationMatcher(poolPlayers, forceFill) {
    PRE_COST = new Int32Array(MAX_N * 24);
    PRE_META = new Array(MAX_N * 24);
    PRE_OVR = new Int32Array(MAX_N * 24);

    for(let i=0; i<poolPlayers.length; i++) {
        let p = poolPlayers[i];
        let pId = p._internal_id;
        for(let j=0; j<24; j++) {
            let slotName = SLOT_NAMES[j];
            let match = getPlayerCapacityForSlot(p, slotName, forceFill);
            PRE_META[pId * 24 + j] = match;
            
            if (match.banned) {
                PRE_COST[pId * 24 + j] = -1000000000;
                PRE_OVR[pId * 24 + j] = 0;
            } else if (match.invalid) {
                PRE_COST[pId * 24 + j] = -9999999;
                PRE_OVR[pId * 24 + j] = 0;
            } else {
                let pOVR = calculateRoleOVR(p, getBasePosition(slotName), match.role);
                PRE_OVR[pId * 24 + j] = pOVR;
                PRE_COST[pId * 24 + j] = Math.round(pOVR * match.cap);
            }
        }
    }
}

function solveAssignment(teamPlayers, slots, forceFill) {
    const N = teamPlayers.length;
    if (N > MAX_N || N !== slots.length) return null; 

    for (let p = 0; p < N; p++) {
        let pId = teamPlayers[p]._internal_id;
        for (let s = 0; s < N; s++) {
            let sId = SLOT_IDX[slots[s]];
            globalCost[p][s] = PRE_COST[pId * 24 + sId];
        }
    }

    const maxMask = 1 << N;
    globalDp.fill(-1000000000, 0, maxMask);
    globalParent.fill(-1, 0, maxMask);
    globalChoice.fill(-1, 0, maxMask);
    globalDp[0] = 0;

    for (let mask = 0; mask < maxMask; mask++) {
        if (globalDp[mask] <= -500000000) continue; 
        const p = bits[mask];
        if (p === N) continue;

        for (let s = 0; s < N; s++) {
            if ((mask & (1 << s)) === 0) {
                const nextMask = mask | (1 << s);
                const newScore = globalDp[mask] + globalCost[p][s];
                if (newScore > globalDp[nextMask]) {
                    globalDp[nextMask] = newScore;
                    globalParent[nextMask] = mask;
                    globalChoice[nextMask] = s;
                }
            }
        }
    }

    let curr = maxMask - 1;
    if (globalDp[curr] <= -500000000) return null; 

    const assignment = new Array(N);
    let p = N - 1;
    while (curr > 0) {
        const s = globalChoice[curr];
        let pId = teamPlayers[p]._internal_id;
        let sId = SLOT_IDX[slots[s]];
        let m = PRE_META[pId * 24 + sId];
        let calcOvr = PRE_OVR[pId * 24 + sId];
        
        assignment[p] = {
            player: teamPlayers[p],
            slot: slots[s],
            basePos: getBasePosition(slots[s]),
            cap: m.cap,
            isMain: m.isMain,
            isSec: m.isSec,
            outOfPos: m.outOfPos,
            invalid: m.invalid,
            banned: m.banned,
            role: m.role,
            pOvr: Math.round(calcOvr * (m.cap / 100))
        };
        curr = globalParent[curr];
        p--;
    }
    return assignment;
}

export function getPerfectLineups(teamPlayers, format, forceFill = false) {
  const availableFormations = FORMATIONS.filter(f => f.format === format);
  const lineups = [];

  availableFormations.forEach(formation => {
    formation.variants.forEach(variant => {
      const assignment = solveAssignment(teamPlayers, variant.slots, forceFill);
      
      if (assignment) {
          let matchScore = 0;
          let invalidCount = 0;
          let bannedCount = 0;
          
          assignment.forEach(curr => { 
              if (curr.invalid) invalidCount++;
              if (curr.banned) bannedCount++;
              let pId = curr.player._internal_id;
              let sId = SLOT_IDX[curr.slot];
              matchScore += PRE_COST[pId * 24 + sId]; 
          });

          if (bannedCount > 0) return; 
          if (!forceFill && invalidCount > 0) return; 

          // Yeni Taktiksel Açık / Grid Cezası
          const gridPenalty = calculateGridPenalty(assignment);

          lineups.push({
              formationName: formation.name,
              variantId: variant.id,
              desc: variant.desc,
              lineup: assignment,
              matchScore: matchScore - gridPenalty - (invalidCount * 1000000), 
              invalidCount: invalidCount,
              gridPenalty: gridPenalty 
          });
      }
    });
  });

  return lineups.sort((a, b) => b.matchScore - a.matchScore);
}