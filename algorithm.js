import { CONDITIONS, ROLE_WEIGHTS } from './constants.js';
import { getPerfectLineups, initFormationMatcher } from './formationMatcher.js'; 

export function getBestRoleForStats(pos, stats) {
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
      const weightedAverage = totalWeight > 0 ? (totalScore / totalWeight) : 0;
      if (weightedAverage > maxAverage) { maxAverage = weightedAverage; bestRole = roleName; }
    }
    return bestRole;
}

export function calculateTeamStatsLineup(lineupArr) {
  let actual = { pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0 };
  let maximum = { pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0 };

  lineupArr.forEach(item => {
    if (item.invalid || !item.player) return; 
    
    const p = item.player;
    const role = (item.role && item.role !== 'null') ? item.role : getBestRoleForStats(item.basePos, p.stats);
    item.role = role; 
    
    const kapasiteCarpani = item.cap / 100;
    const kondisyonCarpani = CONDITIONS[p.condition] || 1.0;
    const weights = ROLE_WEIGHTS[item.basePos]?.[role] || {};

    ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(statName => {
        let hamStat = p.stats[statName] || 0;
        if(statName === 'sut' && !hamStat) hamStat = p.stats['şut'] || 0;
        if(statName === 'firsat' && !hamStat) hamStat = p.stats['fırsat'] || 0;

        let rolAgirligi = (weights[statName] || 0) / 100;

        let sonKondisyon = kondisyonCarpani;
        if (item.basePos === 'GK' && !['savunma', 'dribling', 'hava'].includes(statName)) {
            sonKondisyon = 1.0;
        }

        let actKatki = hamStat * rolAgirligi * kapasiteCarpani * sonKondisyon;
        let maxKatki = 100 * rolAgirligi * 1.0 * 1.0; 

        if (statName === 'savunma' && item.basePos === 'GK') {
            let wKar = (weights['sutKarsilama'] || 0) / 100;
            let sKar = p.stats['sutKarsilama'] || 0;
            actKatki += sKar * wKar * kapasiteCarpani * 1.0 * 0.5; 
            maxKatki += 100 * wKar * 1.0 * 1.0 * 0.5; 
        }

        actual[statName] += actKatki;
        maximum[statName] += maxKatki;
    });
  });

  let normalized = {};
  ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(s => {
      normalized[s] = maximum[s] > 0 ? (actual[s] / maximum[s]) * 100 : 0;
  });

  return { actual, maximum, normalized };
}

export function calculateBalanceMetrics(normA, normB, invalidCountA, invalidCountB, ovrA, ovrB, lineupA, lineupB, havaLowPriority) {
  let penaltyScore = 0;
  
  // 1. SAF DENGE: Toplam OVR Farkı (Ana Etken)
  const netDiff = Math.abs(ovrA - ovrB);
  penaltyScore += netDiff * 1000.0;

  // 2. UÇURUM CEZASI: max(0, |Fark| - 5)^3
  const calcCliff = (valA, valB) => {
       let diff = Math.abs(valA - valB);
       return Math.pow(Math.max(0, diff - 5), 3);
  };

  const pw = 1.0; 
  penaltyScore += calcCliff(normA.savunma, normB.savunma) * pw;  
  penaltyScore += calcCliff(normA.pas, normB.pas) * pw;   
  penaltyScore += calcCliff(normA.sut, normB.sut) * pw;
  penaltyScore += calcCliff(normA.dribling, normB.dribling) * pw;
  penaltyScore += calcCliff(normA.firsat, normB.firsat) * pw;
  
  if (!havaLowPriority) {
      penaltyScore += calcCliff(normA.hava, normB.hava) * pw;
  }

  // 3. TERS MEVKİ (Invalid) CEZASI
  penaltyScore += (invalidCountA + invalidCountB) * 1000000;

  // 🔥 4. BİREYSEL POTANSİYEL İSRAFI (Wasted Potential) TIE-BREAKER'I 🔥
  const calcWastedPotential = (lineupObj) => {
      let waste = 0;
      lineupObj.lineup.forEach(item => {
          if (!item.player || item.invalid || item.cap === 100) return;
          const p = item.player;
          const rawSum = (p.stats.pas || 0) + (p.stats.savunma || 0) + (p.stats.sut || p.stats.şut || 0) + (p.stats.dribling || 0) + (p.stats.firsat || p.stats.fırsat || 0);
          const drop = (100 - item.cap) / 100; 
          waste += (rawSum * drop);
      });
      return waste;
  };
  penaltyScore += (calcWastedPotential(lineupA) + calcWastedPotential(lineupB)) * 2.0;

  return { penaltyScore };
}

function getBasePosition(slot) {
  const map = { "LCB": "CB", "RCB": "CB", "LCM": "CM", "RCM": "CM", "LDM": "DM", "RDM": "DM", "LAM": "AM", "RAM": "AM", "LFW": "FW", "RFW": "FW" };
  return map[slot] || slot;
}

function getCombinations(arr, k) {
    const results = [];
    function helper(start, combo) {
        if (combo.length === k) {
            results.push([...combo]);
            return;
        }
        for (let i = start; i < arr.length; i++) {
            if (arr.length - i < k - combo.length) break; 
            combo.push(arr[i]);
            helper(i + 1, combo);
            combo.pop();
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

const processRolesAndCountAtk = (lineupObj) => {
    let atkCount = 0;
    lineupObj.lineup.forEach(item => {
        if (item.invalid || !item.player) return;
        let role = item.role;
        if (!role || role === 'null' || item.outOfPos) {
            role = getBestRoleForStats(item.basePos, item.player.stats);
            item.role = role; 
        }
        if (isAttackerRole(item.basePos, role)) atkCount++;
    });
    return atkCount;
};

export function getAllSquads(players, format, forceFill, havaLowPriority = true) {
  const havaMulti = havaLowPriority ? 0.0001 : 1.0;
  
  const N = players.length;
  if (N !== format * 2) return []; 

  players.forEach((p, i) => p._internal_id = i);
  initFormationMatcher(players, forceFill);

  let totalPoolRawPotential = 0;
  let capableAttackersInPool = 0;

  players.forEach(p => {
     let canAttack = false;
     const mainBase = getBasePosition(p.mainPos);
     const checkPos = (base, r) => {
         const effRole = (!r || r === 'null') ? getBestRoleForStats(base, p.stats) : r;
         return isAttackerRole(base, effRole);
     };

     if (checkPos(mainBase, p.role)) canAttack = true;
     if (p.secondaryPositions) {
         p.secondaryPositions.forEach(sp => {
             if (checkPos(getBasePosition(sp.pos), sp.role)) canAttack = true;
         });
     }
     if (canAttack) capableAttackersInPool++;

     ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(statName => {
         let hamStat = p.stats[statName] || 0;
         if(statName === 'sut' && !hamStat) hamStat = p.stats['şut'] || 0;
         if(statName === 'firsat' && !hamStat) hamStat = p.stats['fırsat'] || 0;
         totalPoolRawPotential += hamStat;
     });
  });

  const poolAvgStat = totalPoolRawPotential / (N * 6);
  const targetScore = poolAvgStat * 0.70; 

  let targetAtkLimit = 0;
  if (format > 5 && format < 10) targetAtkLimit = 3;
  else if (format >= 10) targetAtkLimit = 4;

  const appliedAtkLimit = Math.min(targetAtkLimit, Math.floor(capableAttackersInPool / 2));

  const cache = new Array(1 << N).fill(null);

  const getMemoLineup = (teamBits, teamArr) => {
      if (cache[teamBits] !== null) return cache[teamBits];
      const res = getPerfectLineups(teamArr, format, forceFill);
      cache[teamBits] = res;
      return res;
  };

  const targetSize = format;
  const p0 = players[0];
  
  const restIndices = [];
  for(let i=1; i<N; i++) restIndices.push(i);

  const combos = getCombinations(restIndices, targetSize - 1);
  let validResults = [];

  for (const combo of combos) {
      const teamA = new Array(targetSize);
      teamA[0] = p0;
      let bitsA = (1 << 0);
      
      const inTeamA = new Uint8Array(N); 
      inTeamA[0] = 1;
      
      for (let i = 0; i < combo.length; i++) {
          teamA[i+1] = players[combo[i]];
          inTeamA[combo[i]] = 1;
          bitsA |= (1 << combo[i]);
      }
      
      const teamB = new Array(targetSize);
      let bitsB = 0;
      let bIdx = 0;
      for (let i = 1; i < N; i++) {
          if (inTeamA[i] === 0) {
              teamB[bIdx++] = players[i];
              bitsB |= (1 << i);
          }
      }

      const lineupsA = getMemoLineup(bitsA, teamA);
      const lineupsB = getMemoLineup(bitsB, teamB);

      if (!lineupsA || !lineupsB || !lineupsA.length || !lineupsB.length) continue;

      let validPair = null;

      for (let la of lineupsA) {
          if (!forceFill && la.invalidCount > 0) continue;
          if (!forceFill && processRolesAndCountAtk(la) < appliedAtkLimit) continue;
          
          for (let lb of lineupsB) {
              if (!forceFill && lb.invalidCount > 0) continue;
              if (!forceFill && processRolesAndCountAtk(lb) < appliedAtkLimit) continue;
              
              validPair = { a: la, b: lb };
              break; 
          }
          if (validPair) break;
      }

      if (!validPair) continue; 

      const bestA = validPair.a;
      const bestB = validPair.b;

      bestA.stats = calculateTeamStatsLineup(bestA.lineup);
      bestB.stats = calculateTeamStatsLineup(bestB.lineup);
      
      const normA = bestA.stats.normalized;
      const normB = bestB.stats.normalized;

      const statCount = havaLowPriority ? 5 : 6;
      let sumNormA = normA.pas + normA.savunma + normA.sut + normA.dribling + normA.firsat;
      let sumNormB = normB.pas + normB.savunma + normB.sut + normB.dribling + normB.firsat;
      
      if (!havaLowPriority) {
          sumNormA += normA.hava;
          sumNormB += normA.hava;
      }
      
      const ovrA = sumNormA / statCount;
      const ovrB = sumNormB / statCount;

      if (!forceFill && (ovrA < targetScore || ovrB < targetScore)) {
          continue;
      }

      const metrics = calculateBalanceMetrics(normA, normB, bestA.invalidCount, bestB.invalidCount, ovrA, ovrB, bestA, bestB, havaLowPriority);

      if (metrics.penaltyScore > 500000 && !forceFill) continue;

      validResults.push({
          squad: { teamA, teamB, metrics },
          lineupA: bestA,
          lineupB: bestB,
          penalty: metrics.penaltyScore, 
          rawPenalty: metrics.penaltyScore,
          targetScore: targetScore, 
          sumA: ovrA, 
          sumB: ovrB
      });
  }

  validResults.sort((a,b) => a.penalty - b.penalty);
  return validResults; 
}