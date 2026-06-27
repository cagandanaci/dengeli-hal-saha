// Kondisyon Çarpanları
export const CONDITIONS = {
  'Tam': 1.0,
  'İyi': 0.8,
  'Vasat': 0.6,
  'Kötü': 0.4
};

// Mevki ve Rollere Göre CIES Kriter Ağırlıkları (%)
export const ROLE_WEIGHTS = {
  "GK": {
    "Kaleci": {
      "sutKarsilama": 75,
      "pas": 5,
      "savunma": 10,
      "hava": 10,
      "dribling": 0,
      "firsat": 0
    },
    "Libero Kaleci": {
      "sutKarsilama": 55,
      "pas": 15,
      "savunma": 15,
      "hava": 10,
      "dribling": 5,
      "firsat": 0
    },
    "Hem Oyuncu Hem Kaleci": {
      "sutKarsilama": 40,
      "pas": 20,
      "savunma": 15,
      "hava": 10,
      "dribling": 10,
      "firsat": 5
    }
  },
  "CB": {
    "Standart Stoper": {
      "pas": 15,
      "savunma": 70,
      "hava": 10,
      "dribling": 5,
      "sut": 0,
      "firsat": 0
    },
    "Pasör Stoper": {
      "pas": 30,
      "savunma": 55,
      "hava": 5,
      "dribling": 10,
      "sut": 0,
      "firsat": 0
    },
    "Çakılı Stoper": {
      "pas": 5,
      "savunma": 80,
      "hava": 15,
      "dribling": 0,
      "sut": 0,
      "firsat": 0
    }
  },
  "LB": {
    "Standart Bek": {
      "pas": 20,
      "savunma": 55,
      "hava": 5,
      "dribling": 15,
      "sut": 0,
      "firsat": 5
    },
    "Ofansif Bek": {
      "pas": 20,
      "savunma": 25,
      "hava": 5,
      "dribling": 25,
      "sut": 5,
      "firsat": 20
    },
    "Defansif Bek": {
      "pas": 10,
      "savunma": 70,
      "hava": 10,
      "dribling": 10,
      "sut": 0,
      "firsat": 0
    },
    "Oyun Kurucu Bek": {
      "pas": 25,
      "savunma": 20,
      "hava": 5,
      "dribling": 20,
      "sut": 5,
      "firsat": 25
    }
  },
  "LWB": {
    "Standart Kanat Bek": {
      "pas": 20,
      "savunma": 45,
      "hava": 5,
      "dribling": 20,
      "sut": 0,
      "firsat": 10
    },
    "Ofansif Kanat Bek": {
      "pas": 25,
      "savunma": 15,
      "hava": 0,
      "dribling": 35,
      "sut": 5,
      "firsat": 20
    },
    "Oyun Kurucu Bek": {
      "pas": 30,
      "savunma": 10,
      "hava": 0,
      "dribling": 25,
      "sut": 5,
      "firsat": 30
    }
  },
  "DM": {
    "Kesici": {
      "pas": 15,
      "savunma": 70,
      "hava": 10,
      "dribling": 5,
      "sut": 0,
      "firsat": 0
    },
    "Top Kapan Orta Saha": {
      "pas": 10,
      "savunma": 70,
      "hava": 5,
      "dribling": 15,
      "sut": 0,
      "firsat": 0
    },
    "Derin Oyun Kurucu": {
      "pas": 35,
      "savunma": 35,
      "hava": 5,
      "dribling": 10,
      "sut": 0,
      "firsat": 15
    },
    "Ön Libero": {
      "pas": 25,
      "savunma": 60,
      "hava": 10,
      "dribling": 5,
      "sut": 0,
      "firsat": 0
    },
    "Hücumcu Defansif Orta Saha": {
      "pas": 20,
      "savunma": 25,
      "hava": 5,
      "dribling": 20,
      "sut": 20,
      "firsat": 10
    }
  },
  "CM": {
    "İki Yönlü Orta Saha": {
      "pas": 25,
      "savunma": 30,
      "hava": 5,
      "dribling": 20,
      "sut": 10,
      "firsat": 10
    },
    "Oyun Kurucu": {
      "pas": 35,
      "savunma": 10,
      "hava": 0,
      "dribling": 15,
      "sut": 5,
      "firsat": 35
    },
    "Şutör Orta Saha": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 25,
      "sut": 35,
      "firsat": 15
    },
    "Top Kapan Orta Saha": {
      "pas": 15,
      "savunma": 50,
      "hava": 5,
      "dribling": 20,
      "sut": 5,
      "firsat": 5
    },
    "Standart Orta Saha": {
      "pas": 30,
      "savunma": 25,
      "hava": 5,
      "dribling": 15,
      "sut": 10,
      "firsat": 15
    },
    "Hücumcu Orta Saha": {
      "pas": 15,
      "savunma": 5,
      "hava": 0,
      "dribling": 30,
      "sut": 25,
      "firsat": 25
    }
  },
  "AM": {
    "Klasik 10": {
      "pas": 15,
      "savunma": 0,
      "hava": 0,
      "dribling": 30,
      "sut": 30,
      "firsat": 25
    },
    "Modern Ofansif Orta Saha": {
      "pas": 30,
      "savunma": 10,
      "hava": 0,
      "dribling": 20,
      "sut": 15,
      "firsat": 25
    },
    "Ofansif Oyun Kurucu": {
      "pas": 35,
      "savunma": 5,
      "hava": 0,
      "dribling": 20,
      "sut": 5,
      "firsat": 35
    },
    "Gölge Forvet": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 25,
      "sut": 35,
      "firsat": 15
    },
    "Agresif Ofansif Orta Saha": {
      "pas": 15,
      "savunma": 35,
      "hava": 5,
      "dribling": 20,
      "sut": 15,
      "firsat": 10
    }
  },
  "LM": {
    "Standart Açık Orta Saha": {
      "pas": 25,
      "savunma": 25,
      "hava": 0,
      "dribling": 30,
      "sut": 5,
      "firsat": 15
    },
    "Ofansif Açık Orta Saha": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 35,
      "sut": 15,
      "firsat": 25
    },
    "Açık Oyun Kurucu": {
      "pas": 30,
      "savunma": 10,
      "hava": 0,
      "dribling": 20,
      "sut": 5,
      "firsat": 35
    },
    "Agresif Kanat": {
      "pas": 10,
      "savunma": 45,
      "hava": 5,
      "dribling": 20,
      "sut": 10,
      "firsat": 10
    }
  },
  "LW": {
    "Klasik Kanat": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 40,
      "sut": 10,
      "firsat": 25
    },
    "Kanat Forvet": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 30,
      "sut": 25,
      "firsat": 20
    },
    "Kanat Oyun Kurucu": {
      "pas": 30,
      "savunma": 5,
      "hava": 0,
      "dribling": 25,
      "sut": 10,
      "firsat": 30
    },
    "Agresif Kanat": {
      "pas": 10,
      "savunma": 45,
      "hava": 5,
      "dribling": 20,
      "sut": 10,
      "firsat": 10
    }
  },
  "FW": {
    "Fırsatçı Golcü": {
      "pas": 5,
      "savunma": 0,
      "hava": 20,
      "dribling": 5,
      "sut": 65,
      "firsat": 5
    },
    "Hareketli Forvet": {
      "pas": 10,
      "savunma": 10,
      "hava": 0,
      "dribling": 30,
      "sut": 25,
      "firsat": 25
    },
    "Çalışkan Forvet": {
      "pas": 10,
      "savunma": 40,
      "hava": 5,
      "dribling": 20,
      "sut": 15,
      "firsat": 10
    },
    "Pivot Forvet": {
      "pas": 15,
      "savunma": 10,
      "hava": 15,
      "dribling": 10,
      "sut": 30,
      "firsat": 20
    },
    "Sahte 9": {
      "pas": 25,
      "savunma": 5,
      "hava": 0,
      "dribling": 20,
      "sut": 20,
      "firsat": 30
    }
  },
  "RB": {
    "Standart Bek": {
      "pas": 20,
      "savunma": 55,
      "hava": 5,
      "dribling": 15,
      "sut": 0,
      "firsat": 5
    },
    "Ofansif Bek": {
      "pas": 20,
      "savunma": 25,
      "hava": 5,
      "dribling": 25,
      "sut": 5,
      "firsat": 20
    },
    "Defansif Bek": {
      "pas": 10,
      "savunma": 70,
      "hava": 10,
      "dribling": 10,
      "sut": 0,
      "firsat": 0
    },
    "Oyun Kurucu Bek": {
      "pas": 25,
      "savunma": 20,
      "hava": 5,
      "dribling": 20,
      "sut": 5,
      "firsat": 25
    }
  },
  "RWB": {
    "Standart Kanat Bek": {
      "pas": 20,
      "savunma": 45,
      "hava": 5,
      "dribling": 20,
      "sut": 0,
      "firsat": 10
    },
    "Ofansif Kanat Bek": {
      "pas": 25,
      "savunma": 15,
      "hava": 0,
      "dribling": 35,
      "sut": 5,
      "firsat": 20
    },
    "Oyun Kurucu Bek": {
      "pas": 30,
      "savunma": 10,
      "hava": 0,
      "dribling": 25,
      "sut": 5,
      "firsat": 30
    }
  },
  "RM": {
    "Standart Açık Orta Saha": {
      "pas": 25,
      "savunma": 25,
      "hava": 0,
      "dribling": 30,
      "sut": 5,
      "firsat": 15
    },
    "Ofansif Açık Orta Saha": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 35,
      "sut": 15,
      "firsat": 25
    },
    "Açık Oyun Kurucu": {
      "pas": 30,
      "savunma": 10,
      "hava": 0,
      "dribling": 20,
      "sut": 5,
      "firsat": 35
    },
    "Agresif Kanat": {
      "pas": 10,
      "savunma": 45,
      "hava": 5,
      "dribling": 20,
      "sut": 10,
      "firsat": 10
    }
  },
  "RW": {
    "Klasik Kanat": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 40,
      "sut": 10,
      "firsat": 25
    },
    "Kanat Forvet": {
      "pas": 15,
      "savunma": 10,
      "hava": 0,
      "dribling": 30,
      "sut": 25,
      "firsat": 20
    },
    "Kanat Oyun Kurucu": {
      "pas": 30,
      "savunma": 5,
      "hava": 0,
      "dribling": 25,
      "sut": 10,
      "firsat": 30
    },
    "Agresif Kanat": {
      "pas": 10,
      "savunma": 45,
      "hava": 5,
      "dribling": 20,
      "sut": 10,
      "firsat": 10
    }
  }
};

export const INTERNAL_POS_MAP = {
  'LCB': 'CB', 'RCB': 'CB',
  'LDM': 'DM', 'RDM': 'DM',
  'LCM': 'CM', 'RCM': 'CM',
  'LAM': 'AM', 'RAM': 'AM',
  'LFW': 'FW', 'RFW': 'FW'
};