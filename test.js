import { getTop5Squads } from './algorithm.js';

const mockPlayers = [
  { id: 1, name: "Mert (GK)", mainPos: "GK", role: "Kaleci", condition: "Tam", stats: { sutKarsilama: 90, pas: 60, savunma: 50, hava: 60, dribling: 20, sut: 10, firsat: 10 }, bannedPositions: [] },
  // DİKKAT: Volkan kaleci oynamayı VETO EDİYOR!
  { id: 2, name: "Volkan (GK)", mainPos: "GK", role: "Libero Kaleci", condition: "Tam", stats: { sutKarsilama: 80, pas: 80, savunma: 60, hava: 50, dribling: 40, sut: 10, firsat: 20 }, bannedPositions: ["GK"] },
  
  { id: 3, name: "Burak (CB)", mainPos: "CB", role: "Standart Stoper", condition: "Tam", stats: { pas: 50, savunma: 85, hava: 80, dribling: 30, sut: 20, firsat: 10 }, bannedPositions: [] },
  { id: 4, name: "Arda (CM)", mainPos: "CM", role: "İki Yönlü Orta Saha", condition: "Tam", stats: { pas: 85, savunma: 70, hava: 50, dribling: 80, sut: 75, firsat: 80 }, bannedPositions: [] },
  { id: 5, name: "Leyla (FW)", mainPos: "FW", role: "Hareketli Forvet", condition: "Tam", stats: { pas: 70, savunma: 40, hava: 50, dribling: 85, sut: 80, firsat: 80 }, bannedPositions: [] },
  
  { id: 6, name: "Ahmet (CB)", mainPos: "CB", role: "Pasör Stoper", condition: "Tam", stats: { pas: 75, savunma: 75, hava: 70, dribling: 60, sut: 40, firsat: 30 }, bannedPositions: [] },
  { id: 7, name: "Mehmet (CM)", mainPos: "CM", role: "Oyun Kurucu", condition: "Tam", stats: { pas: 90, savunma: 40, hava: 30, dribling: 85, sut: 70, firsat: 90 }, bannedPositions: [] },
  
  // DİKKAT: Can da kaleye geçmeyi VETO EDİYOR! (Force Fill açıkken bile kaleye geçemez)
  { id: 8, name: "Can (FW)", mainPos: "FW", role: "Fırsatçı Golcü", condition: "Tam", stats: { pas: 75, savunma: 30, hava: 40, dribling: 85, sut: 80, firsat: 80 }, bannedPositions: ["GK"] },
  { id: 9, name: "Emre (FW)", mainPos: "FW", role: "Pivot Forvet", condition: "Tam", stats: { pas: 60, savunma: 30, hava: 85, dribling: 60, sut: 85, firsat: 50 }, bannedPositions: [] },
  { id: 10, name: "Serkan (FW)", mainPos: "FW", role: "Hareketli Forvet", condition: "Tam", stats: { pas: 70, savunma: 25, hava: 50, dribling: 80, sut: 85, firsat: 70 }, bannedPositions: [] }
];

try {
  // Test: Her Zaman Kadro Bul Açık (Force Fill = true)
  // Volkan ve Can kalede oynamayı reddediyor. Takımda sadece Mert kaleci. 
  // Bakalım algoritma Mert'i kaleye, 2. kaleye de veto etmeyen başka birini koyabilecek mi?
  const topSquads = getTop5Squads(mockPlayers, 5, true); 

  console.log("⚽ EN DENGELİ KADROLAR (VETO SİSTEMİ TESTİ) ⚽\n");
  
  if (topSquads.length === 0) {
      console.log("❌ Veto edilen mevkiler yüzünden takım kurulamadı!");
  } else {
      topSquads.forEach((squad, index) => {
        console.log(`=== VARYASYON ${index + 1} ===`);
        
        const teamAStr = squad.teamA.map(p => 
          p.assignedPos !== p.mainPos ? `${p.name} [⚡ ${p.assignedPos}]` : p.name
        ).join(', ');
        
        const teamBStr = squad.teamB.map(p => 
          p.assignedPos !== p.mainPos ? `${p.name} [⚡ ${p.assignedPos}]` : p.name
        ).join(', ');

        console.log(`🟢 Takım A: ${teamAStr}`);
        console.log(`🔵 Takım B: ${teamBStr}\n`);
      });
  }

} catch (error) {
  console.error("HATA:", error.message);
}