import { FORMATIONS } from './formations.js';

function getBasePosition(slot) {
  const map = {"LCB":"CB", "RCB":"CB", "LCM":"CM", "RCM":"CM", "LDM":"DM", "RDM":"DM", "LAM":"AM", "RAM":"AM", "LFW":"FW", "RFW":"FW", "LWB":"WB", "RWB":"WB", "LW":"W", "RW":"W"};
  return map[slot] || slot;
}

export function getPerfectLineups(teamPlayers, format, forceFill = false) {
  const availableFormations = FORMATIONS.filter(f => f.format === format);
  const lineups = [];

  availableFormations.forEach(formation => {
    formation.variants.forEach(variant => {
      const lineup = [];
      const assignedPlayers = new Set();
      let matchScore = 0;

      // 1. TUR: Ana mevki eşleşmesi (Akıllı Tahsis: Yan mevkisi en az olan (sabit) oyunculara öncelik verilir)
      variant.slots.forEach(slot => {
        const basePos = getBasePosition(slot);
        let candidates = teamPlayers.filter(p => !assignedPlayers.has(p) && getBasePosition(p.mainPos) === basePos);

        if (candidates.length > 0) {
          candidates.sort((a, b) => {
              let aVersatility = a.secondaryPositions ? a.secondaryPositions.length : 0;
              let bVersatility = b.secondaryPositions ? b.secondaryPositions.length : 0;
              if (aVersatility !== bVersatility) return aVersatility - bVersatility; // Sabit oyuncu önce yerleşir
              
              let avgA = ((a.stats.pas || 0) + (a.stats.savunma || 0) + (a.stats.sut || a.stats.şut || 0)) / 3;
              let avgB = ((b.stats.pas || 0) + (b.stats.savunma || 0) + (b.stats.sut || b.stats.şut || 0)) / 3;
              return avgB - avgA;
          });
          
          let bestPlayer = candidates[0]; 
          lineup.push({ slot: slot, player: bestPlayer, isMain: true, isSec: false, outOfPos: false, basePos: basePos });
          assignedPlayers.add(bestPlayer);
          
          let playerAvg = ((bestPlayer.stats.pas || 0) + (bestPlayer.stats.savunma || 0) + (bestPlayer.stats.sut || bestPlayer.stats.şut || 0)) / 3;
          matchScore += 100 + (playerAvg / 100); 
        } else {
          lineup.push({ slot: slot, player: null, basePos: basePos });
        }
      });

      // 2. TUR: Yan mevki eşleşmesi
      lineup.forEach(item => {
        if (!item.player) {
          let candidates = teamPlayers.filter(p => 
            !assignedPlayers.has(p) && 
            p.secondaryPositions && 
            p.secondaryPositions.some(sp => getBasePosition(sp.pos) === item.basePos)
          );

          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              let capA = a.secondaryPositions.find(sp => getBasePosition(sp.pos) === item.basePos).capacity;
              let capB = b.secondaryPositions.find(sp => getBasePosition(sp.pos) === item.basePos).capacity;
              if (capB !== capA) return capB - capA;
              
              let avgA = ((a.stats.pas || 0) + (a.stats.savunma || 0) + (a.stats.sut || a.stats.şut || 0)) / 3;
              let avgB = ((b.stats.pas || 0) + (b.stats.savunma || 0) + (b.stats.sut || b.stats.şut || 0)) / 3;
              return avgB - avgA;
            });

            let bestPlayer = candidates[0];
            item.player = bestPlayer;
            item.isMain = false;
            item.isSec = true;
            item.outOfPos = false;
            assignedPlayers.add(bestPlayer);
            
            let cap = bestPlayer.secondaryPositions.find(sp => getBasePosition(sp.pos) === item.basePos).capacity;
            let playerAvg = ((bestPlayer.stats.pas || 0) + (bestPlayer.stats.savunma || 0) + (bestPlayer.stats.sut || bestPlayer.stats.şut || 0)) / 3;
            matchScore += cap + (playerAvg / 100); 
          }
        }
      });

      // 3. TUR: ZORUNLU YERLEŞTİRME (SADECE KUTU İŞARETLİYSE)
      if (forceFill) {
        const unassignedPlayers = teamPlayers.filter(p => !assignedPlayers.has(p));
        lineup.forEach(item => {
          if (!item.player && unassignedPlayers.length > 0) {
            let forcedPlayer = unassignedPlayers.shift();
            item.player = forcedPlayer;
            item.isMain = false;
            item.isSec = false;
            item.outOfPos = true;
            assignedPlayers.add(forcedPlayer);
            matchScore += 10; 
          }
        });
      }

      // KATIKIYSIZ (STRICT) MOD: Eğer forceFill kapalıysa ve takımda boşluk varsa, o dizilişi acımasızca yok et.
      const emptySlots = lineup.filter(i => !i.player).length;
      if (emptySlots > 0) {
          matchScore -= 999999;
      }

      lineups.push({
        formationName: formation.name,
        variantId: variant.id,
        desc: variant.desc,
        lineup: lineup,
        matchScore: matchScore,
        assignedCount: assignedPlayers.size
      });
    });
  });

  return lineups.sort((a, b) => b.matchScore - a.matchScore);
}