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

// Formasyon Bölgesel İhtiyaç Matrisi (5x5 Grid)
const GRID_NEEDS = [
    [0, 15, 30, 15, 0], 
    [0, 20, 35, 20, 0], 
    [0, 25, 40, 25, 0], 
    [5, 30, 50, 30, 5], 
    [10, 30, 55, 30, 10]
];

function getBasePosition(slot) {
  const map = {
      "LCB": "CB", "RCB": "CB", "LCM": "CM", "RCM": "CM", "LDM": "DM", "RDM": "DM", "LAM": "AM", "RAM": "AM", "LFW": "FW", "RFW": "FW"
  };
  return map[slot] || slot;
}

// Oyuncu özelliklerine göre uygun rolü hesaplama (Varsayılan Atama)
function getBestRoleForStatsLocal(pos, stats) {
    const roles = ROLE_WEIGHTS[pos];
    if (!roles) return "Bilinmeyen Rol";
    
    let bestRole = Object.keys(roles)[0];
    let maxAverage = -1;
    for (const [roleName, weights] of Object.entries(roles)) {
        let totalScore = 0;
        let totalWeight = 0;
        for (const [statName, weightVal] of Object.entries(weights)) {
            if (weightVal > 0) {
                totalScore += (stats[statName] || 0) * weightVal;
                totalWeight += weightVal;
            }
        }
        const average = totalWeight > 0 ? (totalScore / totalWeight) : 0;
        if (average > maxAverage) { maxAverage = average; bestRole = roleName; }
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
        let assignedRole = player.role;
        if (!assignedRole || assignedRole === 'null') assignedRole = getBestRoleForStatsLocal(baseSlot, player.stats);
        return { cap: 100, isMain: true, isSec: false, outOfPos: false, invalid: false, banned: false, role: assignedRole };
    }
    
    const secondaryPos = player.secondaryPositions?.find(sp => getBasePosition(sp.pos) === baseSlot);
    if (secondaryPos) {
        let assignedRole = secondaryPos.role;
        if (!assignedRole || assignedRole === 'null') assignedRole = getBestRoleForStatsLocal(baseSlot, player.stats);
        return { cap: Math.max(25, secondaryPos.capacity), isMain: false, isSec: true, outOfPos: false, invalid: false, banned: false, role: assignedRole };
    }
    
    if (forceFill) return { cap: 25, isMain: false, isSec: false, outOfPos: true, invalid: false, banned: false, role: getBestRoleForStatsLocal(baseSlot, player.stats) };
    
    return { cap: 0, isMain: false, isSec: false, outOfPos: true, invalid: true, banned: false, role: getBestRoleForStatsLocal(baseSlot, player.stats) };
}

function calculateRoleOVR(player, pos, role) {
    const weights = ROLE_WEIGHTS[pos]?.[role];
    const getStat = stat => player.stats[stat] ?? (stat === 'sut' ? player.stats.şut : stat === 'firsat' ? player.stats.fırsat : 0);
    let baseOvr = 0;
    
    if (weights) {
        let totalScore = 0;
        let totalWeight = 0;
        for (const [statName, weightVal] of Object.entries(weights)) { 
            if (weightVal > 0) { 
                totalScore += getStat(statName) * weightVal; 
                totalWeight += weightVal; 
            } 
        }
        if (totalWeight > 0) baseOvr = Math.round(totalScore / totalWeight);
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
        
        const centerX = coords[0];
        const centerY = coords[1];

        const isAttacker = isAttackerRole(item.basePos, item.role);
        const roleMultiplier = isAttacker ? 0.6 : 1.0;

        for (let y = 0; y < 5; y++) {
            for (let x = 0; x < 5; x++) {
                const deltaX = Math.abs(x - centerX);
                const deltaY = Math.abs(y - centerY);
                let penaltyValue = 0;

                if (deltaX === 0 && deltaY === 0) penaltyValue = 60; 
                else if ((deltaX === 1 && deltaY === 0) || (deltaX === 0 && deltaY === 1)) penaltyValue = 30; 
                else if (deltaX === 1 && deltaY === 1) penaltyValue = 15; 

                coverage[y][x] += penaltyValue * roleMultiplier;
            }
        }
    });

    let penaltyScore = 0;
    for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
            const deficit = GRID_NEEDS[y][x] - coverage[y][x];
            if (deficit > 0) {
                let rowMultiplier = 1.0;
                if (y === 3) rowMultiplier = 2.0; 
                if (y === 4) rowMultiplier = 3.5; 
                
                penaltyScore += Math.pow(Math.max(0, deficit - 5), 2.8) * 8 * rowMultiplier;
            }
        }
    }
    return penaltyScore;
}

let precomputedCosts = [];
let precomputedMeta = [];
let precomputedOvr = [];
const MAX_PLAYER_COUNT = 14;
const dynamicCostMatrix = Array.from({length: MAX_PLAYER_COUNT}, () => new Int32Array(MAX_PLAYER_COUNT));
const dpState = new Int32Array(1 << MAX_PLAYER_COUNT);
const dpParent = new Int32Array(1 << MAX_PLAYER_COUNT);
const dpChoice = new Int32Array(1 << MAX_PLAYER_COUNT);
const bitCounts = new Int32Array(1 << MAX_PLAYER_COUNT);
for(let i = 1; i < (1 << MAX_PLAYER_COUNT); i++) bitCounts[i] = bitCounts[i >> 1] + (i & 1);

export function initFormationMatcher(poolPlayers, forceFill) {
    precomputedCosts = new Int32Array(MAX_PLAYER_COUNT * 24);
    precomputedMeta = new Array(MAX_PLAYER_COUNT * 24);
    precomputedOvr = new Int32Array(MAX_PLAYER_COUNT * 24);

    for(let i = 0; i < poolPlayers.length; i++) {
        let player = poolPlayers[i];
        let playerId = player._internal_id;
        for(let j = 0; j < 24; j++) {
            let slotName = SLOT_NAMES[j];
            let matchData = getPlayerCapacityForSlot(player, slotName, forceFill);
            precomputedMeta[playerId * 24 + j] = matchData;
            
            if (matchData.banned) {
                precomputedCosts[playerId * 24 + j] = -1000000000;
                precomputedOvr[playerId * 24 + j] = 0;
            } else if (matchData.invalid) {
                precomputedCosts[playerId * 24 + j] = -9999999;
                precomputedOvr[playerId * 24 + j] = 0;
            } else {
                let calculatedOvr = calculateRoleOVR(player, getBasePosition(slotName), matchData.role);
                precomputedOvr[playerId * 24 + j] = calculatedOvr;
                precomputedCosts[playerId * 24 + j] = Math.round(calculatedOvr * matchData.cap);
            }
        }
    }
}

function solveAssignment(teamPlayers, slots, forceFill) {
    const playerCount = teamPlayers.length;
    if (playerCount > MAX_PLAYER_COUNT || playerCount !== slots.length) return null; 

    for (let p = 0; p < playerCount; p++) {
        let playerId = teamPlayers[p]._internal_id;
        for (let s = 0; s < playerCount; s++) {
            let slotId = SLOT_IDX[slots[s]];
            dynamicCostMatrix[p][s] = precomputedCosts[playerId * 24 + slotId];
        }
    }

    const maxMask = 1 << playerCount;
    dpState.fill(-1000000000, 0, maxMask);
    dpParent.fill(-1, 0, maxMask);
    dpChoice.fill(-1, 0, maxMask);
    dpState[0] = 0;

    for (let mask = 0; mask < maxMask; mask++) {
        if (dpState[mask] <= -500000000) continue; 
        const p = bitCounts[mask];
        if (p === playerCount) continue;

        for (let s = 0; s < playerCount; s++) {
            if ((mask & (1 << s)) === 0) {
                const nextMask = mask | (1 << s);
                const newScore = dpState[mask] + dynamicCostMatrix[p][s];
                if (newScore > dpState[nextMask]) {
                    dpState[nextMask] = newScore;
                    dpParent[nextMask] = mask;
                    dpChoice[nextMask] = s;
                }
            }
        }
    }

    let currentMask = maxMask - 1;
    if (dpState[currentMask] <= -500000000) return null; 

    const assignment = new Array(playerCount);
    let p = playerCount - 1;
    
    while (currentMask > 0) {
        const s = dpChoice[currentMask];
        let playerId = teamPlayers[p]._internal_id;
        let slotId = SLOT_IDX[slots[s]];
        let metaData = precomputedMeta[playerId * 24 + slotId];
        let calculatedOvr = precomputedOvr[playerId * 24 + slotId];
        
        assignment[p] = {
            player: teamPlayers[p],
            slot: slots[s],
            basePos: getBasePosition(slots[s]),
            cap: metaData.cap,
            isMain: metaData.isMain,
            isSec: metaData.isSec,
            outOfPos: metaData.outOfPos,
            invalid: metaData.invalid,
            banned: metaData.banned,
            role: metaData.role,
            pOvr: Math.round(calculatedOvr * (metaData.cap / 100))
        };
        currentMask = dpParent[currentMask];
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
          
          assignment.forEach(currentItem => { 
              if (currentItem.invalid) invalidCount++;
              if (currentItem.banned) bannedCount++;
              let playerId = currentItem.player._internal_id;
              let slotId = SLOT_IDX[currentItem.slot];
              matchScore += precomputedCosts[playerId * 24 + slotId]; 
          });

          if (bannedCount > 0) return; 
          if (!forceFill && invalidCount > 0) return; 

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