// test.js
import { getTop5Squads } from './algorithm.js';

const mockPlayers = [
  { id: 1, name: "Mert (GK)", mainPos: "GK", role: "Kaleci", condition: "Tam", stats: { sutKarsilama: 90, pas: 60, savunma: 50, hava: 60, dribling: 20, sut: 10, firsat: 10 } },
  { id: 2, name: "Volkan (GK)", mainPos: "GK", role: "Libero Kaleci", condition: "Tam", stats: { sutKarsilama: 80, pas: 80, savunma: 60, hava: 50, dribling: 40, sut: 10, firsat: 20 } },
  
  { id: 3, name: "Burak (CB)", mainPos: "CB", role: "Standart Stoper", condition: "Tam", stats: { pas: 50, savunma: 85, hava: 80, dribling: 30, sut: 20, firsat: 10 } },
  { id: 4, name: "Arda (CM)", mainPos: "CM", role: "İki Yönlü Orta Saha", condition: "Tam", stats: { pas: 85, savunma: 70, hava: 50, dribling: 80, sut: 75, firsat: 80 } },
  
  { 
    id: 5, name: "Leyla (FW)", mainPos: "FW", role: "Hareketli Forvet", condition: "Tam", 
    stats: { pas: 70, savunma: 40, hava: 50, dribling: 85, sut: 80, firsat: 80 },
    secondaryPositions: [ { pos: "LM", role: "Standart Açık Orta Saha", capacity: 90 } ]
  },
  
  { id: 6, name: "Ahmet (CB)", mainPos: "CB", role: "Pasör Stoper", condition: "Tam", stats: { pas: 75, savunma: 75, hava: 70, dribling: 60, sut: 40, firsat: 30 } },
  { id: 7, name: "Mehmet (CM)", mainPos: "CM", role: "Oyun Kurucu", condition: "Tam", stats: { pas: 90, savunma: 40, hava: 30, dribling: 85, sut: 70, firsat: 90 } },
  { id: 8, name: "Can (FW)", mainPos: "FW", role: "Fırsatçı Golcü", condition: "Tam", stats: { pas: 75, savunma: 30, hava: 40, dribling: 85, sut: 80, firsat: 80 } },
  { id: 9, name: "Emre (FW)", mainPos: "FW", role: "Pivot Forvet", condition: "Tam", stats: { pas: 60, savunma: 30, hava: 85, dribling: 60, sut: 85, firsat: 50 } },
  { id: 10, name: "Serkan (FW)", mainPos: "FW", role: "Hareketli Forvet", condition: "Tam", stats: { pas: 70, savunma: 25, hava: 50, dribling: 80, sut: 85, firsat: 70 } }
];

try {
  const topSquads = getTop5Squads(mockPlayers);

  console.log("⚽ EN DENGELİ KADROLAR VE DETAYLI ÖZELLİK DAĞILIMLARI ⚽\n");
  
  topSquads.forEach((squad, index) => {
    console.log(`=== VARYASYON ${index + 1} ===`);
    
    const teamAStr = squad.teamA.map(p => 
      p.assignedPos !== p.mainPos ? `${p.name} [⚠️ ${p.mainPos}->${p.assignedPos}]` : p.name
    ).join(', ');
    
    const teamBStr = squad.teamB.map(p => 
      p.assignedPos !== p.mainPos ? `${p.name} [⚠️ ${p.mainPos}->${p.assignedPos}]` : p.name
    ).join(', ');

    console.log(`🟢 Takım A: ${teamAStr}`);
    console.log(`🔵 Takım B: ${teamBStr}\n`);

    console.log(`📊 ÖZELLİK KARŞILAŞTIRMASI:`);
    console.log(`Genel Güç : A: ${squad.statsA.total.toFixed(1)} | B: ${squad.statsB.total.toFixed(1)} -> Fark: ${squad.metrics.diffs.total.toFixed(1)}`);
    console.log(`Pas       : A: ${squad.statsA.pas.toFixed(1)} | B: ${squad.statsB.pas.toFixed(1)} -> Fark: ${squad.metrics.diffs.pas.toFixed(1)}`);
    console.log(`Savunma   : A: ${squad.statsA.savunma.toFixed(1)} | B: ${squad.statsB.savunma.toFixed(1)} -> Fark: ${squad.metrics.diffs.savunma.toFixed(1)}`);
    console.log(`Şut       : A: ${squad.statsA.sut.toFixed(1)} | B: ${squad.statsB.sut.toFixed(1)} -> Fark: ${squad.metrics.diffs.sut.toFixed(1)}`);
    console.log(`Dribling  : A: ${squad.statsA.dribling.toFixed(1)} | B: ${squad.statsB.dribling.toFixed(1)} -> Fark: ${squad.metrics.diffs.dribling.toFixed(1)}`);
    console.log(`Fırsat    : A: ${squad.statsA.firsat.toFixed(1)} | B: ${squad.statsB.firsat.toFixed(1)} -> Fark: ${squad.metrics.diffs.firsat.toFixed(1)}`);
    console.log(`Hava Topu : A: ${squad.statsA.hava.toFixed(1)} | B: ${squad.statsB.hava.toFixed(1)} -> Fark: ${squad.metrics.diffs.hava.toFixed(1)}\n`);
    console.log(`--------------------------------------------------`);
  });

} catch (error) {
  console.error("HATA:", error.message);
}