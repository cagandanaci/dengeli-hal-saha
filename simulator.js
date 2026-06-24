// simulator.js
import { PLAYER_POOL } from './playersData.js';
import { getTop5Squads } from './algorithm.js';
import { findBestFormations, assignPlayersToSlots } from './formationMatcher.js';

// ---- AYARLAR ----
const MATCH_FORMAT = 7; // 7v7 Maç (1 Kaleci + 6 Saha Oyuncusu)
const TOTAL_PLAYERS = MATCH_FORMAT * 2; // Toplam 14 kişi lazım

console.log("==================================================");
console.log(`🏆 HALI SAHA DENGE SİMÜLASYONU (${MATCH_FORMAT}v${MATCH_FORMAT}) 🏆`);
console.log("==================================================\n");

// --- ADIM 1: OYUNCU SEÇİMİ ---
console.log(`[ADIM 1] ${TOTAL_PLAYERS} Oyuncu Seçiliyor...`);
// Havuzdan 2 Kaleci ve 12 Saha oyuncusu seçiyoruz (Gerçekçi bir maç senaryosu)
const selectedGKs = PLAYER_POOL.filter(p => p.mainPos === 'GK').slice(0, 2);
const selectedField = PLAYER_POOL.filter(p => p.mainPos !== 'GK').slice(0, TOTAL_PLAYERS - 2);
const matchPlayers = [...selectedGKs, ...selectedField];

console.log(`✅ Seçilen Kaleciler: ${selectedGKs.map(p => p.name).join(', ')}`);
console.log(`✅ Seçilen Oyuncular: ${selectedField.map(p => p.name).join(', ')}\n`);

// --- ADIM 2 & 3: ALGORİTMA ÇALIŞIYOR ---
console.log(`[ADIM 2] Gruplar ve Kondisyonlar Kontrol Ediliyor...`);
console.log(`[ADIM 3] Algoritma 150 İterasyonla Mevki Optimizasyonlarını Deniyor...\n`);

try {
  const topSquads = getTop5Squads(matchPlayers);
  const bestSquad = topSquads[0]; // En iyi 1. kadroyu inceleyelim

  console.log(`==================================================`);
  console.log(`⭐ EN DENGELİ KADRO DETAYLARI (VARYASYON 1) ⭐`);
  console.log(`==================================================\n`);

  console.log(`[ADIM 4] ÖZELLİK KARŞILAŞTIRMASI (HATA PAYLARI):`);
  console.log(`Denge Ceza Puanı: ${bestSquad.metrics.penaltyScore.toFixed(0)} (Sıfıra ne kadar yakınsa o kadar iyi)`);
  console.log(`--------------------------------------------------`);
  console.log(`Genel Güç : A: ${bestSquad.statsA.total.toFixed(1)} | B: ${bestSquad.statsB.total.toFixed(1)} -> Fark: ${bestSquad.metrics.diffs.total.toFixed(1)}`);
  console.log(`Pas       : A: ${bestSquad.statsA.pas.toFixed(1)} | B: ${bestSquad.statsB.pas.toFixed(1)} -> Fark: ${bestSquad.metrics.diffs.pas.toFixed(1)}`);
  console.log(`Savunma   : A: ${bestSquad.statsA.savunma.toFixed(1)} | B: ${bestSquad.statsB.savunma.toFixed(1)} -> Fark: ${bestSquad.metrics.diffs.savunma.toFixed(1)}`);
  console.log(`Şut       : A: ${bestSquad.statsA.sut.toFixed(1)} | B: ${bestSquad.statsB.sut.toFixed(1)} -> Fark: ${bestSquad.metrics.diffs.sut.toFixed(1)}`);
  console.log(`Dribling  : A: ${bestSquad.statsA.dribling.toFixed(1)} | B: ${bestSquad.statsB.dribling.toFixed(1)} -> Fark: ${bestSquad.metrics.diffs.dribling.toFixed(1)}`);
  console.log(`Fırsat    : A: ${bestSquad.statsA.firsat.toFixed(1)} | B: ${bestSquad.statsB.firsat.toFixed(1)} -> Fark: ${bestSquad.metrics.diffs.firsat.toFixed(1)}`);
  console.log(`--------------------------------------------------\n`);

  // --- ADIM 5: DİZİLİŞ EŞLEŞTİRMESİ VE SAHA YERLEŞİMİ ---
  console.log(`[ADIM 5] TAKIMLAR SAHAYA YERLEŞİYOR (DİZİLİŞ MODÜLÜ)...\n`);

  // A ve B Takımları için en uygun dizilişleri bul
  const formationsA = findBestFormations(bestSquad.teamA, MATCH_FORMAT);
  const formationsB = findBestFormations(bestSquad.teamB, MATCH_FORMAT);

  // Takım A Çıktısı
  if (formationsA.length > 0) {
    const bestFormationA = formationsA[0]; // En uyumlu olanı al
    const lineupA = assignPlayersToSlots(bestSquad.teamA, bestFormationA);
    
    console.log(`🟢 TAKIM A (Seçilen Diziliş: ${bestFormationA.formationName} - Uyum: %${bestFormationA.matchScore.toFixed(0)})`);
    console.log(`   Taktik: ${bestFormationA.desc}`);
    lineupA.forEach(item => {
      if (item.player) {
        const warning = item.warning ? `[⚠️ ${item.warning}]` : "";
        const opt = item.player.mainPos !== item.player.assignedPos ? `(⚡ Optimizasyon: ${item.player.assignedPos})` : "";
        console.log(`   -> [${item.slot}] : ${item.player.name} ${warning} ${opt}`);
      } else {
        console.log(`   -> [${item.slot}] : [BOŞ]`);
      }
    });
  } else {
    console.log(`🟢 TAKIM A: Bu formata (${MATCH_FORMAT}v${MATCH_FORMAT}) uygun diziliş bulunamadı.`);
  }

  console.log("\n--------------------------------------------------");

  // Takım B Çıktısı
  if (formationsB.length > 0) {
    const bestFormationB = formationsB[0]; // En uyumlu olanı al
    const lineupB = assignPlayersToSlots(bestSquad.teamB, bestFormationB);
    
    console.log(`🔵 TAKIM B (Seçilen Diziliş: ${bestFormationB.formationName} - Uyum: %${bestFormationB.matchScore.toFixed(0)})`);
    console.log(`   Taktik: ${bestFormationB.desc}`);
    lineupB.forEach(item => {
      if (item.player) {
        const warning = item.warning ? `[⚠️ ${item.warning}]` : "";
        const opt = item.player.mainPos !== item.player.assignedPos ? `(⚡ Optimizasyon: ${item.player.assignedPos})` : "";
        console.log(`   -> [${item.slot}] : ${item.player.name} ${warning} ${opt}`);
      } else {
        console.log(`   -> [${item.slot}] : [BOŞ]`);
      }
    });
  } else {
    console.log(`🔵 TAKIM B: Bu formata (${MATCH_FORMAT}v${MATCH_FORMAT}) uygun diziliş bulunamadı.`);
  }

  console.log("\n==================================================");
  console.log(`Simülasyon Tamamlandı. Uygulama UI'a hazır!`);
  console.log("==================================================");

} catch (error) {
  console.error("\n❌ HATA:", error.message);
}