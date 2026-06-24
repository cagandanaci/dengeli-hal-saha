import { CONDITIONS, ROLE_WEIGHTS } from './constants.js';
import { getPerfectLineups } from './formationMatcher.js'; 

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

export function calculatePlayerScore(player, position, role, capacityPercent = 100) {
  const weights = ROLE_WEIGHTS[position]?.[role];
  if (!weights) return 0; 
  const conditionMultiplier = CONDITIONS[player.condition] || 1.0;
  let totalScore = 0;
  for (const [stat, weight] of Object.entries(weights)) {
    totalScore += (player.stats[stat] || 0) * (weight / 100);
  }
  return totalScore * (capacityPercent / 100) * conditionMultiplier;
}

export function calculateTeamStats(team) {
  let stats = { total: 0, pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0 };
  let weightSums = { pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0 };
  let validPlayerCount = 0;

  team.forEach(player => {
    if (!player) return; 
    validPlayerCount++;
    
    const pos = player.assignedPos || player.mainPos;
    const role = player.assignedRole || player.role;
    const cap = player.currentCapacity || 100;
    const condMulti = CONDITIONS[player.condition] || 1.0;

    const score = calculatePlayerScore(player, pos, role, cap);
    stats.total += score;
    
    const weights = ROLE_WEIGHTS[pos]?.[role] || {};

    for (const [stat, weight] of Object.entries(weights)) {
      const targetStat = stat === 'sutKarsilama' ? 'savunma' : stat;
      const statValue = player.stats[stat] || 0;
      const effectiveWeight = (weight / 100) * (cap / 100) * condMulti;
      stats[targetStat] += statValue * effectiveWeight;
      weightSums[targetStat] += effectiveWeight; 
    }
  });

  const criteria = ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'];
  criteria.forEach(c => {
    if (weightSums[c] > 0) stats[c] = stats[c] / weightSums[c]; 
    else stats[c] = 0;
  });

  if (validPlayerCount > 0) stats.total = stats.total / validPlayerCount;

  return stats;
}

export function calculateBalanceMetrics(statsA, statsB) {
  const diffs = { total: statsA.total - statsB.total };
  let penaltyScore = 0;

  penaltyScore += Math.pow(Math.abs(diffs.total), 2) * 15.0;

  const criteria = ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'];
  let netAdvantage = 0;

  criteria.forEach(c => {
    const diff = statsA[c] - statsB[c];
    diffs[c] = diff;
    penaltyScore += Math.pow(Math.abs(diff), 2);
    netAdvantage += diff;
  });
  
  penaltyScore += Math.pow(Math.abs(netAdvantage), 2) * 3.0;

  return { diffs, penaltyScore };
}

function evaluateSquadBalance(teamA, teamB, format, forceFill) {
  const lineupsA = getPerfectLineups(teamA, format, forceFill);
  const lineupsB = getPerfectLineups(teamB, format, forceFill);
  const bestA = lineupsA[0];
  const bestB = lineupsB[0];

  const getBaseSlot = (slot) => {
    const map = {"LCB":"CB", "RCB":"CB", "LCM":"CM", "RCM":"CM", "LDM":"DM", "RDM":"DM", "LAM":"AM", "RAM":"AM", "LFW":"FW", "RFW":"FW", "LWB":"WB", "RWB":"WB", "LW":"W", "RW":"W"};
    return map[slot] || slot;
  };

  const applyCapacities = (lineup) => {
    return lineup.lineup.map(item => {
      if (!item.player) return null;
      let p = { ...item.player };
      p.assignedPos = getBaseSlot(item.slot);
      p.assignedRole = getBestRoleForStats(p.assignedPos, p.stats); 
      
      if (item.isMain) {
        p.currentCapacity = 100;
      } else if (item.isSec) {
        const sec = p.secondaryPositions?.find(sp => sp.pos === p.assignedPos);
        p.currentCapacity = sec ? Math.max(25, sec.capacity) : 50;
      } else {
        p.currentCapacity = 25; 
      }
      return p;
    }).filter(Boolean);
  };

  const activeA = applyCapacities(bestA);
  const activeB = applyCapacities(bestB);

  let statsA = calculateTeamStats(activeA);
  let statsB = calculateTeamStats(activeB);

  let metrics = calculateBalanceMetrics(statsA, statsB);

  return { diffs: metrics.diffs, penaltyScore: metrics.penaltyScore, statsA, statsB };
}

export function getTop5Squads(players, format, forceFill) {
  const generatedSquads = [];
  const gks = players.filter(p => p.mainPos === 'GK').sort((a,b) => calculatePlayerScore(b, b.mainPos, b.role) - calculatePlayerScore(a, a.mainPos, a.role));
  const fieldPlayers = players.filter(p => p.mainPos !== 'GK');
  const maxPerTeam = players.length / 2;

  let attempts = 0;
  // Algoritma 5 takımı garantilemek için 300'e kadar deneme yapar
  while (generatedSquads.length < 5 && attempts < 300) {
    attempts++;
    let teamA = [];
    let teamB = [];

    if (gks.length > 0) teamA.push(gks[0]);
    if (gks.length > 1) teamB.push(gks[1]);

    const shuffled = [...fieldPlayers].sort(() => Math.random() - 0.5);
    shuffled.forEach(p => {
      if (teamA.length < maxPerTeam) teamA.push(p);
      else teamB.push(p);
    });

    let currentResult = evaluateSquadBalance(teamA, teamB, format, forceFill);
    let optimized = true;

    while (optimized) {
      optimized = false;
      let bestSwap = null;
      let bestPenalty = currentResult.penaltyScore;

      for (let a = 0; a < teamA.length; a++) {
        if (teamA[a].mainPos === 'GK') continue;
        
        for (let b = 0; b < teamB.length; b++) {
          if (teamB[b].mainPos === 'GK') continue;

          let pA = teamA[a];
          let pB = teamB[b];
          teamA[a] = pB;
          teamB[b] = pA;

          let tempResult = evaluateSquadBalance(teamA, teamB, format, forceFill);

          if (tempResult.penaltyScore < bestPenalty) {
            bestPenalty = tempResult.penaltyScore;
            bestSwap = { a, b, tempResult };
          }

          teamA[a] = pA;
          teamB[b] = pB;
        }
      }

      if (bestSwap) {
        let pA = teamA[bestSwap.a];
        teamA[bestSwap.a] = teamB[bestSwap.b];
        teamB[bestSwap.b] = pA;
        currentResult = bestSwap.tempResult;
        optimized = true; 
      }
    }

    teamA.forEach(p => { p.assignedPos = null; p.assignedRole = null; p.currentCapacity = 100; });
    teamB.forEach(p => { p.assignedPos = null; p.assignedRole = null; p.currentCapacity = 100; });

    const teamAIds = teamA.map(p => p.id).sort((a, b) => a - b).join(',');
    const isDuplicate = generatedSquads.some(s => {
      const existingAIds = s.teamA.map(p => p.id).sort((a, b) => a - b).join(',');
      const existingBIds = s.teamB.map(p => p.id).sort((a, b) => a - b).join(',');
      return teamAIds === existingAIds || teamAIds === existingBIds;
    });

    if (!isDuplicate) {
      generatedSquads.push({
        teamA: [...teamA],
        teamB: [...teamB],
        statsA: currentResult.statsA,
        statsB: currentResult.statsB,
        metrics: { diffs: currentResult.diffs, penaltyScore: currentResult.penaltyScore }
      });
    }
  }

  return generatedSquads.sort((a, b) => a.metrics.penaltyScore - b.metrics.penaltyScore);
}