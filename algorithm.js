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
  let stats = { pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0, totalOvr: 0 };
  let maxStats = { pas: 0, savunma: 0, sut: 0, dribling: 0, firsat: 0, hava: 0 }; // 🔥 Sabit tavanlar yerine Dinamik Potansiyel

  lineupArr.forEach(item => {
    if (item.invalid || !item.player) return; 
    
    const p = item.player;
    const role = item.role || getBestRoleForStats(item.basePos, p.stats);
    
    const kapasiteCarpani = item.cap / 100;
    const kondisyonCarpani = CONDITIONS[p.condition] || 1.0;
    
    // Takımın toplam OVR havuzuna katkısı
    stats.totalOvr += item.pOvr * kondisyonCarpani;

    const weights = ROLE_WEIGHTS[item.basePos]?.[role] || {};

    ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(statName => {
        let hamStat = p.stats[statName] || 0;
        let rolAgirligi = weights[statName] || 0;

        // Kalecilerde Kondisyon Sadece Savunma, Dribling ve Hava Topunu Etkiler
        let sonKondisyon = kondisyonCarpani;
        if (item.basePos === 'GK' && !['savunma', 'dribling', 'hava'].includes(statName)) {
            sonKondisyon = 1.0;
        }

        // Oyuncunun mevcut yeteneğiyle takıma kattığı
        let oyuncuKatkisi = hamStat * (rolAgirligi / 100) * kapasiteCarpani * sonKondisyon;
        
        // Eğer oyuncunun o özelliği 100 olsaydı takıma katacağı (Tavanı belirliyoruz)
        let maxKatki = 100 * (rolAgirligi / 100) * kapasiteCarpani * sonKondisyon;

        // 🔥 KALECİ ÖZEL: Şut kurtarmanın takıma %50 savunma katkısı vermesi
        if (statName === 'savunma' && item.basePos === 'GK') {
            const sutKarAgirlik = weights['sutKarsilama'] || 0;
            const sutKarStat = p.stats['sutKarsilama'] || 0;
            
            const sutKarKatkisi = sutKarStat * (sutKarAgirlik / 100) * kapasiteCarpani * 1.0 * 0.5; // %50 Etki
            const sutKarMax = 100 * (sutKarAgirlik / 100) * kapasiteCarpani * 1.0 * 0.5;

            oyuncuKatkisi += sutKarKatkisi;
            maxKatki += sutKarMax;
        }

        stats[statName] += oyuncuKatkisi;
        maxStats[statName] += maxKatki;
    });
  });

  // Takımın ulaştığı gücü, o dizilişte ulaşabileceği MİLYARLIK tavana bölüp % olarak 100 üzerinden hesaplıyoruz.
  ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'].forEach(c => {
    if (maxStats[c] > 0) {
        stats[c] = (stats[c] / maxStats[c]) * 100;
    } else {
        stats[c] = 0;
    }
  });

  return stats;
}

export function calculateBalanceMetrics(statsA, statsB, invalidCountA, invalidCountB) {
  // Artık değerler 0.8 veya 1.2 değil, 85.5 veya 92.3 gibi 100'lük sistemde.
  const dSav = statsA.savunma - statsB.savunma;
  const dPas = statsA.pas - statsB.pas;
  const dSut = statsA.sut - statsB.sut;
  const dDrib = statsA.dribling - statsB.dribling;
  const dFir = statsA.firsat - statsB.firsat;
  const dHav = statsA.hava - statsB.hava;
  const dOvr = statsA.totalOvr - statsB.totalOvr; 
  
  const diffs = { pas: dPas, savunma: dSav, sut: dSut, dribling: dDrib, firsat: dFir, hava: dHav, ovr: dOvr };

  let penaltyScore = 0;
  
  // 100'lük sisteme geçtiğimiz için çarpan ağırlıklarını optimize ettik
  const pw = 5.0; 
  
  penaltyScore += (dSav * dSav) * pw;  
  penaltyScore += (dPas * dPas) * pw;   
  penaltyScore += (dSut * dSut) * pw;
  penaltyScore += (dDrib * dDrib) * pw;
  penaltyScore += (dFir * dFir) * pw;
  penaltyScore += (dHav * dHav) * (window.HAVA_LOW_PRIORITY ? (pw / 5) : pw); 

  // Radarda herhangi bir stat %10'dan fazla fark atıyorsa cezayı katla
  const maxDiff = Math.max( Math.abs(dSav), Math.abs(dPas), Math.abs(dSut), Math.abs(dDrib), Math.abs(dFir), Math.abs(dHav) );
  if (maxDiff > 10) {
      penaltyScore += (maxDiff * maxDiff) * 10.0; 
  }

  // 🔥 Toplam OVR Farkı Cezası (Takım güçlerinin denkliği için devasa öneme sahip)
  penaltyScore += (dOvr * dOvr) * 50.0;

  penaltyScore += (invalidCountA + invalidCountB) * 1000000;

  return { diffs, penaltyScore };
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

export function getAllSquads(players, format, forceFill, havaLowPriority = true) {
  window.HAVA_LOW_PRIORITY = havaLowPriority; 
  
  const N = players.length;
  if (N !== format * 2) return []; 

  players.forEach((p, i) => p._internal_id = i);
  initFormationMatcher(players, forceFill);

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

      const bestA = lineupsA[0];
      const bestB = lineupsB[0];
      
      if (!forceFill && (bestA.invalidCount > 0 || bestB.invalidCount > 0)) continue;

      const statsA = calculateTeamStatsLineup(bestA.lineup);
      const statsB = calculateTeamStatsLineup(bestB.lineup);
      bestA.stats = statsA;
      bestB.stats = statsB;

      // 1. Taktiksel Stat Farkı (Yüzdelik) + Toplam OVR Farkı Cezası
      const metrics = calculateBalanceMetrics(statsA, statsB, bestA.invalidCount, bestB.invalidCount);

      if (metrics.penaltyScore > 500000 && !forceFill) continue;

      // 🔥 2. BİREBİR OYUNCU EŞLEŞTİRME (DAĞILIM) CEZASI 🔥
      // Takımlardaki oyuncuları en iyiden en kötüye sıralayıp karşılıklı denk olup olmadıklarına bakıyoruz.
      const getActiveOvr = (item) => {
          if (!item || !item.player) return 0;
          const condMulti = CONDITIONS[item.player.condition] || 1.0;
          return Math.round(item.pOvr * condMulti);
      };

      const ovrsA = bestA.lineup.map(getActiveOvr).sort((a, b) => b - a);
      const ovrsB = bestB.lineup.map(getActiveOvr).sort((a, b) => b - a);

      let distributionPenalty = 0;
      for(let i = 0; i < ovrsA.length; i++) {
          const diff = Math.abs(ovrsA[i] - ovrsB[i]);
          distributionPenalty += (diff * diff) * 10; 
      }

      const finalPenalty = metrics.penaltyScore + distributionPenalty;

      validResults.push({
          squad: { teamA, teamB, metrics },
          lineupA: bestA,
          lineupB: bestB,
          penalty: finalPenalty, 
          rawPenalty: finalPenalty, 
          quality: statsA.totalOvr + statsB.totalOvr
      });
  }

  validResults.sort((a,b) => a.penalty - b.penalty);
  return validResults; 
}