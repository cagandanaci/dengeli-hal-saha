import { CONDITIONS, ROLE_WEIGHTS } from './constants.js';
import { getPerfectLineups, initFormationMatcher } from './formationMatcher.js'; 

export function getBestRoleForStats(pos, stats) {
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
      const weightedAverage = totalWeight > 0 ? (totalScore / totalWeight) : 0;
      if (weightedAverage > maxAverage) { 
          maxAverage = weightedAverage; 
          bestRole = roleName; 
      }
    }
    return bestRole;
}

export function calculateTeamStatsLineup(lineupArr) {
  let actualStats = { pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0 };
  let maxStats = { pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0 };

  lineupArr.forEach(item => {
    if (item.invalid || !item.player) return; 
    
    const player = item.player;
    const assignedRole = (item.role && item.role !== 'null') ? item.role : getBestRoleForStats(item.basePos, player.stats);
    item.role = assignedRole; 
    
    const capacityMultiplier = item.cap / 100;
    const conditionMultiplier = CONDITIONS[player.condition] || 1.0;
    const weights = ROLE_WEIGHTS[item.basePos]?.[assignedRole] || {};

    ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(statName => {
        let rawStat = player.stats[statName] || 0;
        if(statName === 'sut' && !rawStat) rawStat = player.stats['şut'] || 0;
        if(statName === 'firsat' && !rawStat) rawStat = player.stats['fırsat'] || 0;

        let roleWeight = (weights[statName] || 0) / 100;

        let finalCondition = conditionMultiplier;
        if (item.basePos === 'GK' && !['savunma', 'dribling', 'hava'].includes(statName)) {
            finalCondition = 1.0;
        }

        let actualContribution = rawStat * roleWeight * capacityMultiplier * finalCondition;
        let maxContribution = 100 * roleWeight * 1.0 * 1.0; 

        if (statName === 'savunma' && item.basePos === 'GK') {
            let shotStoppingWeight = (weights['sutKarsilama'] || 0) / 100;
            let shotStoppingStat = player.stats['sutKarsilama'] || 0;
            actualContribution += shotStoppingStat * shotStoppingWeight * capacityMultiplier * 1.0 * 0.5; 
            maxContribution += 100 * shotStoppingWeight * 1.0 * 1.0 * 0.5; 
        }

        actualStats[statName] += actualContribution;
        maxStats[statName] += maxContribution;
    });
  });

  let normalized = {};
  ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(stat => {
      normalized[stat] = maxStats[stat] > 0 ? (actualStats[stat] / maxStats[stat]) * 100 : 0;
  });

  return { actual: actualStats, maximum: maxStats, normalized };
}

export function calculateBalanceMetrics(normA, normB, invalidCountA, invalidCountB, ovrA, ovrB, lineupA, lineupB, havaLowPriority) {
  let details = {
      netDiffFormula: "",
      netDiffPenalty: 0,
      cliffPenalties: { pas: {diff: 0, pen: 0}, savunma: {diff: 0, pen: 0}, sut: {diff: 0, pen: 0}, dribling: {diff: 0, pen: 0}, firsat: {diff: 0, pen: 0}, hava: {diff: 0, pen: 0} },
      totalCliffPenalty: 0,
      invalidPenalty: 0,
      gridPenalty: (lineupA.gridPenalty || 0) + (lineupB.gridPenalty || 0),
      totalPenalty: 0
  };

  // 1. Temel Denge (Net OVR farkı bazlı)
  const netDiff = Math.abs(ovrA - ovrB);
  details.netDiffPenalty = netDiff * 1000.0;
  details.netDiffFormula = `|${ovrA.toFixed(2)} - ${ovrB.toFixed(2)}| = ${netDiff.toFixed(2)} * 1000`;
  let penaltyScore = details.netDiffPenalty;

  // 2. Kritik Özellik Farkı Cezası
  const calculateCliffPenalty = (valA, valB, key) => {
       const roundedA = Math.round(valA);
       const roundedB = Math.round(valB);
       const diff = Math.abs(roundedA - roundedB);
       const penalty = Math.pow(Math.max(0, diff - 5), 3);
       details.cliffPenalties[key] = { diff: diff, pen: penalty };
       return penalty;
  };

  const penaltyWeight = 1.0; 
  penaltyScore += calculateCliffPenalty(normA.savunma, normB.savunma, 'savunma') * penaltyWeight;  
  penaltyScore += calculateCliffPenalty(normA.pas, normB.pas, 'pas') * penaltyWeight;   
  penaltyScore += calculateCliffPenalty(normA.sut, normB.sut, 'sut') * penaltyWeight;
  penaltyScore += calculateCliffPenalty(normA.dribling, normB.dribling, 'dribling') * penaltyWeight;
  penaltyScore += calculateCliffPenalty(normA.firsat, normB.firsat, 'firsat') * penaltyWeight;
  
  if (!havaLowPriority) {
      penaltyScore += calculateCliffPenalty(normA.hava, normB.hava, 'hava') * penaltyWeight;
  }

  details.totalCliffPenalty = Object.values(details.cliffPenalties).reduce((acc, curr) => acc + curr.pen, 0);

  // 3. Ters Mevki Cezası
  details.invalidPenalty = (invalidCountA + invalidCountB) * 1000000;
  penaltyScore += details.invalidPenalty;
  
  // 4. Bölge Açığı (Grid) Cezası
  penaltyScore += details.gridPenalty;
  details.totalPenalty = penaltyScore;

  return { penaltyScore, details };
}

function getBasePosition(slot) {
  const positionMap = { "LCB": "CB", "RCB": "CB", "LCM": "CM", "RCM": "CM", "LDM": "DM", "RDM": "DM", "LAM": "AM", "RAM": "AM", "LFW": "FW", "RFW": "FW" };
  return positionMap[slot] || slot;
}

function getCombinations(arr, k) {
    const results = [];
    function helper(start, combination) {
        if (combination.length === k) {
            results.push([...combination]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            if (arr.length - i < k - combination.length) break; 
            combination.push(arr[i]);
            helper(i + 1, combination);
            combination.pop();
        }
    }
    helper(0, []);
    return results;
}

function isAttackerRole(basePos, role) {
    if (['FW', 'AM', 'LW', 'RW'].includes(basePos)) return true;
    if (['LM', 'RM'].includes(basePos) && ['Ofansif Açık Orta Saha', 'Ters Ofansif Açık Orta Saha'].includes(role)) return true;
    if (basePos === 'CM' && ['Hücumcu Orta Saha', 'Şutör Orta Saha'].includes(role)) return true;
    if (basePos === 'DM' && role === 'Hücumcu Defansif Orta Saha') return true;
    if (['LWB', 'RWB'].includes(basePos) && role === 'Ofansif Kanat Bek') return true;
    return false;
}

const processRolesAndCountAttackers = (lineupObj) => {
    let attackerCount = 0;
    lineupObj.lineup.forEach(item => {
        if (item.invalid || !item.player) return;
        let assignedRole = item.role;
        if (!assignedRole || assignedRole === 'null' || item.outOfPos) {
            assignedRole = getBestRoleForStats(item.basePos, item.player.stats);
            item.role = assignedRole; 
        }
        if (isAttackerRole(item.basePos, assignedRole)) attackerCount++;
    });
    return attackerCount;
};

export function getAllSquads(players, format, forceFill, havaLowPriority = true) {
  const playerCount = players.length;
  if (playerCount !== format * 2) return []; 

  players.forEach((player, index) => player._internal_id = index);
  initFormationMatcher(players, forceFill);

  let totalPoolRawPotential = 0;
  let capableAttackersInPool = 0;

  players.forEach(player => {
     let canAttack = false;
     const mainBase = getBasePosition(player.mainPos);
     const checkPosition = (base, r) => {
         const effectiveRole = (!r || r === 'null') ? getBestRoleForStats(base, player.stats) : r;
         return isAttackerRole(base, effectiveRole);
     };

     if (checkPosition(mainBase, player.role)) canAttack = true;
     if (player.secondaryPositions) {
         player.secondaryPositions.forEach(secondary => {
             if (checkPosition(getBasePosition(secondary.pos), secondary.role)) canAttack = true;
         });
     }
     if (canAttack) capableAttackersInPool++;

     ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(statName => {
         let rawStat = player.stats[statName] || 0;
         if(statName === 'sut' && !rawStat) rawStat = player.stats['şut'] || 0;
         if(statName === 'firsat' && !rawStat) rawStat = player.stats['fırsat'] || 0;
         totalPoolRawPotential += rawStat;
     });
  });

  const poolAverageStat = totalPoolRawPotential / (playerCount * 6);
  const targetScore = poolAverageStat * 0.70; 

  let targetAttackerLimit = 0;
  if (format > 5 && format < 10) targetAttackerLimit = 3;
  else if (format >= 10) targetAttackerLimit = 4;

  const appliedAttackerLimit = Math.min(targetAttackerLimit, Math.floor(capableAttackersInPool / 2));
  const cache = new Array(1 << playerCount).fill(null);

  const getMemoizedLineup = (teamMask, teamArray) => {
      if (cache[teamMask] !== null) return cache[teamMask];
      const result = getPerfectLineups(teamArray, format, forceFill);
      cache[teamMask] = result;
      return result;
  };

  const targetSize = format;
  const firstPlayer = players[0];
  const remainingIndices = [];
  for(let i = 1; i < playerCount; i++) remainingIndices.push(i);

  const combinations = getCombinations(remainingIndices, targetSize - 1);
  let validResults = [];

  for (const combo of combinations) {
      const teamA = new Array(targetSize);
      teamA[0] = firstPlayer;
      let teamAMask = (1 << 0);
      
      const inTeamA = new Uint8Array(playerCount); 
      inTeamA[0] = 1;
      
      for (let i = 0; i < combo.length; i++) {
          teamA[i+1] = players[combo[i]];
          inTeamA[combo[i]] = 1;
          teamAMask |= (1 << combo[i]);
      }
      
      const teamB = new Array(targetSize);
      let teamBMask = 0;
      let indexB = 0;
      for (let i = 1; i < playerCount; i++) {
          if (inTeamA[i] === 0) {
              teamB[indexB++] = players[i];
              teamBMask |= (1 << i);
          }
      }

      const lineupsA = getMemoizedLineup(teamAMask, teamA);
      const lineupsB = getMemoizedLineup(teamBMask, teamB);

      if (!lineupsA || !lineupsB || !lineupsA.length || !lineupsB.length) continue;

      let validPair = null;

      for (let lineupA of lineupsA) {
          if (!forceFill && lineupA.invalidCount > 0) continue;
          if (!forceFill && processRolesAndCountAttackers(lineupA) < appliedAttackerLimit) continue;
          
          for (let lineupB of lineupsB) {
              if (!forceFill && lineupB.invalidCount > 0) continue;
              if (!forceFill && processRolesAndCountAttackers(lineupB) < appliedAttackerLimit) continue;
              
              validPair = { a: lineupA, b: lineupB };
              break; 
          }
          if (validPair) break;
      }

      if (!validPair) continue; 

      const bestLineupA = validPair.a;
      const bestLineupB = validPair.b;

      bestLineupA.stats = calculateTeamStatsLineup(bestLineupA.lineup);
      bestLineupB.stats = calculateTeamStatsLineup(bestLineupB.lineup);
      
      const normalizedA = bestLineupA.stats.normalized;
      const normalizedB = bestLineupB.stats.normalized;

      const activeStatCount = havaLowPriority ? 5 : 6;
      let sumNormA = normalizedA.pas + normalizedA.savunma + normalizedA.sut + normalizedA.dribling + normalizedA.firsat;
      let sumNormB = normalizedB.pas + normalizedB.savunma + normalizedB.sut + normalizedB.dribling + normalizedB.firsat;
      
      if (!havaLowPriority) {
          sumNormA += normalizedA.hava;
          sumNormB += normalizedA.hava;
      }
      
      const overallA = sumNormA / activeStatCount;
      const overallB = sumNormB / activeStatCount;

      if (!forceFill && (overallA < targetScore || overallB < targetScore)) continue;

      const metrics = calculateBalanceMetrics(normalizedA, normalizedB, bestLineupA.invalidCount, bestLineupB.invalidCount, overallA, overallB, bestLineupA, bestLineupB, havaLowPriority);

      if (metrics.penaltyScore > 500000 && !forceFill) continue;

      validResults.push({
          squad: { teamA, teamB, metrics },
          lineupA: bestLineupA,
          lineupB: bestLineupB,
          penalty: metrics.penaltyScore, 
          rawPenalty: metrics.penaltyScore,
          targetScore: targetScore, 
          sumA: overallA, 
          sumB: overallB,
          metricsDetails: metrics.details
      });
  }

  validResults.sort((a,b) => a.penalty - b.penalty);
  return validResults; 
}