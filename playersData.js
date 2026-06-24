// playersData.js
export const PLAYER_POOL = [
  // --- KALECİLER ---
  // Halı sahada kaleciler bazen defansa veya ileri çıkabilir, kapasitelerini düşük tuttuk.
  { id: 1, name: "Mert", mainPos: "GK", role: "Kaleci", condition: "Tam", stats: { sutKarsilama: 90, pas: 55, savunma: 50, hava: 65, dribling: 10, sut: 10, firsat: 10 }, secondaryPositions: [{ pos: "CB", role: "Standart Stoper", capacity: 50 }] },
  { id: 2, name: "Volkan", mainPos: "GK", role: "Libero Kaleci", condition: "İyi", stats: { sutKarsilama: 80, pas: 85, savunma: 65, hava: 55, dribling: 30, sut: 15, firsat: 20 }, secondaryPositions: [{ pos: "CM", role: "İki Yönlü Orta Saha", capacity: 60 }] },
  { id: 3, name: "Altay", mainPos: "GK", role: "Kaleci", condition: "Vasat", stats: { sutKarsilama: 75, pas: 40, savunma: 40, hava: 70, dribling: 5, sut: 5, firsat: 5 }, secondaryPositions: [{ pos: "CB", role: "Çakılı Stoper", capacity: 40 }] },
  { id: 4, name: "Uğurcan", mainPos: "GK", role: "Libero Kaleci", condition: "Tam", stats: { sutKarsilama: 85, pas: 75, savunma: 60, hava: 80, dribling: 20, sut: 10, firsat: 15 }, secondaryPositions: [{ pos: "FW", role: "Pivot Forvet", capacity: 45 }] },

  // --- STOPERLER ---
  { id: 5, name: "Burak", mainPos: "CB", role: "Standart Stoper", group: "GrupA", condition: "Tam", stats: { pas: 50, savunma: 85, hava: 85, dribling: 30, sut: 20, firsat: 10 }, secondaryPositions: [{ pos: "DM", role: "Kesici", capacity: 85 }] },
  { id: 6, name: "Ahmet", mainPos: "CB", role: "Pasör Stoper", condition: "Tam", stats: { pas: 80, savunma: 75, hava: 70, dribling: 60, sut: 40, firsat: 30 }, secondaryPositions: [{ pos: "RB", role: "Standart Bek", capacity: 80 }, { pos: "DM", role: "Derin Oyun Kurucu", capacity: 75 }] },
  { id: 7, name: "Çağlar", mainPos: "CB", role: "Çakılı Stoper", condition: "İyi", stats: { pas: 40, savunma: 90, hava: 90, dribling: 20, sut: 10, firsat: 5 }, secondaryPositions: [{ pos: "DM", role: "Top Kapan Orta Saha", capacity: 70 }] },
  { id: 8, name: "Ozan", mainPos: "CB", role: "Standart Stoper", condition: "Vasat", stats: { pas: 60, savunma: 70, hava: 75, dribling: 40, sut: 30, firsat: 20 }, secondaryPositions: [{ pos: "CM", role: "İki Yönlü Orta Saha", capacity: 80 }] },

  // --- BEKLER ---
  { id: 9, name: "Caner", mainPos: "LB", role: "Ofansif Bek", condition: "Tam", stats: { pas: 80, savunma: 60, hava: 50, dribling: 75, sut: 65, firsat: 85 }, secondaryPositions: [{ pos: "LM", role: "Açık Oyun Kurucu", capacity: 90 }, { pos: "LWB", role: "Ofansif Kanat Bek", capacity: 95 }] },
  { id: 10, name: "Gökhan", mainPos: "RB", role: "Standart Bek", condition: "Kötü", stats: { pas: 70, savunma: 75, hava: 65, dribling: 60, sut: 50, firsat: 60 }, secondaryPositions: [{ pos: "CB", role: "Pasör Stoper", capacity: 85 }] },
  { id: 11, name: "Rıdvan", mainPos: "LB", role: "Defansif Bek", condition: "Tam", stats: { pas: 65, savunma: 80, hava: 55, dribling: 65, sut: 30, firsat: 40 }, secondaryPositions: [{ pos: "LWB", role: "Standart Kanat Bek", capacity: 90 }, { pos: "CB", role: "Standart Stoper", capacity: 75 }] },
  { id: 12, name: "Zeki", mainPos: "RB", role: "Ofansif Bek", group: "GrupA", condition: "Tam", stats: { pas: 75, savunma: 70, hava: 60, dribling: 80, sut: 40, firsat: 70 }, secondaryPositions: [{ pos: "RM", role: "Standart Açık Orta Saha", capacity: 85 }, { pos: "RWB", role: "Ofansif Kanat Bek", capacity: 90 }] },

  // --- ORTA SAHALAR ---
  { id: 13, name: "Arda", mainPos: "CM", role: "İki Yönlü Orta Saha", group: "GrupB", condition: "Tam", stats: { pas: 85, savunma: 70, hava: 50, dribling: 80, sut: 75, firsat: 80 }, secondaryPositions: [{ pos: "AM", role: "Ofansif Oyun Kurucu", capacity: 85 }, { pos: "DM", role: "Derin Oyun Kurucu", capacity: 80 }] },
  { id: 14, name: "Mehmet", mainPos: "CM", role: "Oyun Kurucu", condition: "Tam", stats: { pas: 90, savunma: 40, hava: 30, dribling: 85, sut: 70, firsat: 90 }, secondaryPositions: [{ pos: "AM", role: "Klasik 10", capacity: 90 }] },
  { id: 15, name: "Hakan", mainPos: "AM", role: "Klasik 10", condition: "İyi", stats: { pas: 95, savunma: 30, hava: 40, dribling: 85, sut: 85, firsat: 95 }, secondaryPositions: [{ pos: "CM", role: "Oyun Kurucu", capacity: 85 }, { pos: "FW", role: "Sahte 9", capacity: 80 }] },
  { id: 16, name: "Taylan", mainPos: "DM", role: "Kesici", condition: "Tam", stats: { pas: 70, savunma: 85, hava: 75, dribling: 50, sut: 40, firsat: 30 }, secondaryPositions: [{ pos: "CM", role: "Top Kapan Orta Saha", capacity: 85 }] },
  { id: 17, name: "Josef", mainPos: "DM", role: "Top Kapan Orta Saha", condition: "Vasat", stats: { pas: 65, savunma: 80, hava: 70, dribling: 55, sut: 50, firsat: 40 }, secondaryPositions: [{ pos: "CB", role: "Standart Stoper", capacity: 80 }] },
  { id: 18, name: "İrfan", mainPos: "CM", role: "Şutör Orta Saha", condition: "Tam", stats: { pas: 85, savunma: 50, hava: 45, dribling: 85, sut: 90, firsat: 85 }, secondaryPositions: [{ pos: "RW", role: "Kanat Oyun Kurucu", capacity: 90 }, { pos: "AM", role: "Gölge Forvet", capacity: 85 }] },

  // --- KANATLAR ---
  { id: 19, name: "Kerem", mainPos: "LW", role: "Klasik Kanat", group: "GrupB", condition: "Tam", stats: { pas: 75, savunma: 35, hava: 40, dribling: 90, sut: 80, firsat: 80 }, secondaryPositions: [{ pos: "FW", role: "Hareketli Forvet", capacity: 85 }, { pos: "LM", role: "Ofansif Açık Orta Saha", capacity: 90 }] },
  { id: 20, name: "Cengiz", mainPos: "RW", role: "Kanat Forvet", condition: "Tam", stats: { pas: 70, savunma: 30, hava: 35, dribling: 85, sut: 85, firsat: 75 }, secondaryPositions: [{ pos: "RM", role: "Ofansif Açık Orta Saha", capacity: 85 }] },
  { id: 21, name: "Ferdi", mainPos: "LM", role: "Açık Oyun Kurucu", condition: "İyi", stats: { pas: 85, savunma: 65, hava: 50, dribling: 85, sut: 70, firsat: 80 }, secondaryPositions: [{ pos: "LB", role: "Ofansif Bek", capacity: 95 }, { pos: "LW", role: "Klasik Kanat", capacity: 85 }] },
  { id: 22, name: "Ghezzal", mainPos: "RM", role: "Açık Oyun Kurucu", condition: "Tam", stats: { pas: 90, savunma: 40, hava: 50, dribling: 85, sut: 80, firsat: 90 }, secondaryPositions: [{ pos: "AM", role: "Ofansif Oyun Kurucu", capacity: 85 }, { pos: "RW", role: "Kanat Oyun Kurucu", capacity: 90 }] },

  // --- FORVETLER ---
  { id: 23, name: "Cenk", mainPos: "FW", role: "Fırsatçı Golcü", condition: "İyi", stats: { pas: 60, savunma: 20, hava: 75, dribling: 70, sut: 90, firsat: 60 }, secondaryPositions: [{ pos: "LW", role: "Kanat Forvet", capacity: 75 }] },
  { id: 24, name: "Can", mainPos: "FW", role: "Hareketli Forvet", condition: "Tam", stats: { pas: 75, savunma: 30, hava: 40, dribling: 85, sut: 80, firsat: 80 }, secondaryPositions: [{ pos: "AM", role: "Gölge Forvet", capacity: 85 }, { pos: "RW", role: "Kanat Forvet", capacity: 80 }] },
  { id: 25, name: "Enes", mainPos: "FW", role: "Pivot Forvet", condition: "Vasat", stats: { pas: 65, savunma: 35, hava: 90, dribling: 60, sut: 85, firsat: 55 }, secondaryPositions: [{ pos: "RW", role: "Kanat Forvet", capacity: 70 }] },
  { id: 26, name: "Leyla", mainPos: "FW", role: "Hareketli Forvet", condition: "Tam", stats: { pas: 70, savunma: 40, hava: 50, dribling: 85, sut: 80, firsat: 80 }, secondaryPositions: [{ pos: "LM", role: "Standart Açık Orta Saha", capacity: 90 }, { pos: "AM", role: "Gölge Forvet", capacity: 85 }] },
  
  // --- YEDEK HAVUZU ---
  { id: 27, name: "Serkan", mainPos: "FW", role: "Fırsatçı Golcü", condition: "Tam", stats: { pas: 60, savunma: 25, hava: 70, dribling: 75, sut: 85, firsat: 60 }, secondaryPositions: [{ pos: "RW", role: "Klasik Kanat", capacity: 75 }] },
  { id: 28, name: "Emre", mainPos: "CM", role: "İki Yönlü Orta Saha", condition: "Tam", stats: { pas: 75, savunma: 65, hava: 55, dribling: 70, sut: 70, firsat: 70 }, secondaryPositions: [{ pos: "DM", role: "Derin Oyun Kurucu", capacity: 85 }, { pos: "AM", role: "Agresif Ofansif Orta Saha", capacity: 80 }] },
  { id: 29, name: "Tolga", mainPos: "CB", role: "Pasör Stoper", condition: "Tam", stats: { pas: 75, savunma: 80, hava: 80, dribling: 50, sut: 30, firsat: 40 }, secondaryPositions: [{ pos: "RB", role: "Defansif Bek", capacity: 80 }, { pos: "DM", role: "Kesici", capacity: 75 }] },
  { id: 30, name: "Musa", mainPos: "DM", role: "Kesici", condition: "Tam", stats: { pas: 60, savunma: 85, hava: 80, dribling: 40, sut: 20, firsat: 20 }, secondaryPositions: [{ pos: "CB", role: "Çakılı Stoper", capacity: 90 }] }
];