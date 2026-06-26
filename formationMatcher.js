import { FORMATIONS } from './formations.js';
import { ROLE_WEIGHTS } from './constants.js';

const SLOT_NAMES = ["GK", "CB", "LCB", "RCB", "LB", "RB", "DM", "LDM", "RDM", "LWB", "RWB", "CM", "LCM", "RCM", "LM", "RM", "AM", "LAM", "RAM", "LW", "RW", "FW", "LFW", "RFW"];
const SLOT_IDX = {};
SLOT_NAMES.forEach((s, i) => SLOT_IDX[s] = i);

function getBasePosition(slot) {
  const map = {
      "LCB": "CB", "RCB": "CB", "LCM": "CM", "RCM": "CM", "LDM": "DM", "RDM": "DM", "LAM": "AM", "RAM": "AM", "LFW": "FW", "RFW": "FW"
  };
  return map[slot] || slot;
}

function getPlayerCapacityForSlot(player, slot, forceFill) {
    const baseSlot = getBasePosition(slot);
    
    if (player.bannedPositions && player.bannedPositions.includes(baseSlot)) {
        return { cap: 0, isMain: false, isSec: false, outOfPos: true, invalid: true, banned: true, role: null };
    }

    const mainBase = getBasePosition(player.mainPos);
    if (mainBase === baseSlot) return { cap: 100, isMain: true, isSec: false, outOfPos: false, invalid: false, banned: false, role: player.role };
    
    const sec = player.secondaryPositions?.find(sp => getBasePosition(sp.pos) === baseSlot);
    if (sec) return { cap: Math.max(25, sec.capacity), isMain: false, isSec: true, outOfPos: false, invalid: false, banned: false, role: sec.role };
    
    if (forceFill) return { cap: 25, isMain: false, isSec: false, outOfPos: true, invalid: false, banned: false, role: null };
    return { cap: 0, isMain: false, isSec: false, outOfPos: true, invalid: true, banned: false, role: null };
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

const POS_COORDS = {
    "GK": [2, 4], "CB": [2, 4], "LCB": [1, 4], "RCB": [3, 4], "LB": [0, 4], "RB": [4, 4],
    "DM": [2, 3], "LDM": [1, 3], "RDM": [3, 3], "LWB": [0, 3], "RWB": [4, 3],
    "CM": [2, 2], "LCM": [1, 2], "RCM": [3, 2], "LM": [0, 2], "RM": [4, 2],
    "AM": [2, 1], "LAM": [1, 1], "RAM": [3, 1], "LW": [0, 1], "RW": [4, 1],
    "FW": [2, 0], "LFW": [1, 0], "RFW": [3, 0]
};

// Taktiksel Boşluk (Grid) Motoru
function getGridSpacePenalty(slots) {
    let penalty = 0;
    let leftCount = 0, rightCount = 0, centerCount = 0;
    let defLeft = 0, defRight = 0, defCenter = 0;

    slots.forEach(slot => {
        if (slot === "GK") return;
        const c = POS_COORDS[slot];
        if (!c) return;

        // Genel genişlik analizi
        if (c[0] < 2) leftCount++;
        else if (c[0] > 2) rightCount++;
        else centerCount++;

        // SAVUNMA HATTI (Y ekseni 3 ve 4: CB'ler, Bekler ve DM'ler)
        if (c[1] >= 3) { 
            if (c[0] < 2) defLeft++;
            else if (c[0] > 2) defRight++;
            else defCenter++;
        }
    });

    if (leftCount === 0 || rightCount === 0) penalty += 20000;
    if (centerCount > 3) penalty += Math.pow((centerCount - 3), 3) * 5000;

    if (defCenter >= 2 && defLeft === 0 && defRight === 0) {
        penalty += 40000; 
    } else if (defCenter >= 1 && defLeft === 0 && defRight === 0) {
        penalty += 15000; 
    } else if (defCenter >= 2 && (defLeft < 1 || defRight < 1)) {
        penalty += 10000; 
    }

    return penalty;
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

          const gridPenalty = getGridSpacePenalty(variant.slots);

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