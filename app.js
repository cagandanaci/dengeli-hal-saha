import { getAllSquads, getBestRoleForStats } from './algorithm.js';
import { ROLE_WEIGHTS, CONDITIONS } from './constants.js'; 

window.getStatColor = function(val) {
    val = Number(val) || 0; 
    if (val >= 85) return '#00d2d3'; 
    if (val >= 65) return '#2ecc71'; 
    if (val >= 30) return '#f39c12'; 
    return '#e74c3c';                
};

window.addEventListener('error', (e) => {
    console.error("Sistem Hatası Yakalandı: ", e.message);
});

// FM Tarzı Dinamik Kalp Çizimi
window.getConditionHeart = (cond, size = 22) => {
    let color, darkColor, percent;
    if (cond === 'Tam') { color = '#00e676'; darkColor = '#0a381f'; percent = 100; } 
    else if (cond === 'İyi') { color = '#a8e63d'; darkColor = '#2a3b10'; percent = 80; } 
    else if (cond === 'Vasat') { color = '#d1b354'; darkColor = '#3b3216'; percent = 40; } 
    else if (cond === 'Kötü') { color = '#d35400'; darkColor = '#3d1a00'; percent = 20; } 
    else return '';

    const uid = Math.random().toString(36).substring(2, 9);

    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="vertical-align: middle; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));" title="${cond} Kondisyon">
              <defs>
                <linearGradient id="grad-${uid}" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="${color}" />
                  <stop offset="${percent}%" stop-color="${color}" />
                  <stop offset="${percent}%" stop-color="${darkColor}" />
                  <stop offset="100%" stop-color="${darkColor}" />
                </linearGradient>
              </defs>
              <path fill="url(#grad-${uid})" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              <polyline points="5.5,11 8.5,11 10.5,6.5 13.5,16 15.5,11 18.5,11" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
            </svg>`;
};

const DEFAULT_ROLE_WEIGHTS = JSON.parse(JSON.stringify(ROLE_WEIGHTS));
try {
    const stored = localStorage.getItem('custom_role_weights');
    if (stored) {
        const parsed = JSON.parse(stored);
        for(let pos in parsed) {
            if(ROLE_WEIGHTS[pos]) {
                for(let role in parsed[pos]) {
                    ROLE_WEIGHTS[pos][role] = parsed[pos][role];
                }
            }
        }
    }
} catch(e) {}

function saveRoleWeights() {
    localStorage.setItem('custom_role_weights', JSON.stringify(ROLE_WEIGHTS));
}

function resetRoleWeights() {
    localStorage.removeItem('custom_role_weights');
    for(let pos in DEFAULT_ROLE_WEIGHTS) {
        for(let role in DEFAULT_ROLE_WEIGHTS[pos]) {
            ROLE_WEIGHTS[pos][role] = DEFAULT_ROLE_WEIGHTS[pos][role];
        }
    }
}

let currentPlayers = [];
let editingPlayerId = null;
let chartInstances = {};

const ALL_POSITIONS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "DM", "CM", "AM", "LM", "RM", "LW", "RW", "FW"];

function getBasePosition(slot) {
  const map = { "LCB": "CB", "RCB": "CB", "LCM": "CM", "RCM": "CM", "LDM": "DM", "RDM": "DM", "LAM": "AM", "RAM": "AM", "LFW": "FW", "RFW": "FW" };
  return map[slot] || slot;
}

function updateCondPreview() {
    const pCondEl = document.getElementById('pCond');
    const previewEl = document.getElementById('condIconPreview');
    if (pCondEl && previewEl) {
        previewEl.innerHTML = window.getConditionHeart(pCondEl.value, 22);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const livePitchWrap = document.getElementById('livePitchWrap');
    if (livePitchWrap) livePitchWrap.style.display = 'none'; 

    const savedSettings = JSON.parse(localStorage.getItem('app_settings')) || { darkMode: false, hideOvr: false, lowHava: true, teamColors: false };
    
    const cbDarkMode = document.getElementById('cbDarkMode');
    const cbHideOvr = document.getElementById('cbHideOvr');
    const cbLowHava = document.getElementById('cbLowHava');
    const cbTeamColors = document.getElementById('cbTeamColors');

    if (cbDarkMode) cbDarkMode.checked = savedSettings.darkMode;
    if (cbHideOvr) cbHideOvr.checked = savedSettings.hideOvr;
    if (cbLowHava) cbLowHava.checked = savedSettings.lowHava;
    if (cbTeamColors) cbTeamColors.checked = savedSettings.teamColors;

    if (savedSettings.darkMode) document.body.classList.add('dark-mode');
    
    if (savedSettings.hideOvr) {
        const styleId = 'hide-ovr-style';
        if (!document.getElementById(styleId)) {
            let s = document.createElement('style'); s.id = styleId;
            s.innerHTML = '.pitch-ovr-text, .cond-icon { display: none !important; }';
            document.head.appendChild(s);
        }
    }

    const saveSettings = () => {
        localStorage.setItem('app_settings', JSON.stringify({
            darkMode: cbDarkMode?.checked || false,
            hideOvr: cbHideOvr?.checked || false,
            lowHava: cbLowHava?.checked || false,
            teamColors: cbTeamColors?.checked || false
        }));
    };

    cbDarkMode?.addEventListener('change', (e) => {
        if (e.target.checked) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        saveSettings();
    });

    cbHideOvr?.addEventListener('change', (e) => {
        const styleId = 'hide-ovr-style';
        let s = document.getElementById(styleId);
        if (e.target.checked) {
            if (!s) {
                s = document.createElement('style'); s.id = styleId;
                s.innerHTML = '.pitch-ovr-text, .cond-icon { display: none !important; }';
                document.head.appendChild(s);
            }
        } else { if (s) s.remove(); }
        saveSettings();
    });

    cbLowHava?.addEventListener('change', saveSettings);
    
    cbTeamColors?.addEventListener('change', () => {
        saveSettings();
        const currentSimBtn = document.getElementById('btnRunSim');
        if (currentSimBtn && document.querySelector('.sim-result-card')) {
            currentSimBtn.click(); 
        }
    });

    document.getElementById('btnRoleManager')?.addEventListener('click', (e) => {
        e.preventDefault();
        const posSelect = document.getElementById('rmPos');
        posSelect.innerHTML = Object.keys(ROLE_WEIGHTS).map(p => `<option value="${p}">${p}</option>`).join('');
        posSelect.onchange = () => updateRmRoles();
        document.getElementById('rmRole').onchange = () => updateRmInputs();
        updateRmRoles();
        document.getElementById('roleModal').style.display = 'flex';
    });

    document.getElementById('rmCancel')?.addEventListener('click', () => { document.getElementById('roleModal').style.display = 'none'; });
    
    document.getElementById('rmSave')?.addEventListener('click', () => {
        const pos = document.getElementById('rmPos').value;
        const role = document.getElementById('rmRole').value;
        const weights = ROLE_WEIGHTS[pos][role];
        const keys = ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'];
        if(pos === 'GK') keys.push('sutKarsilama');
        
        keys.forEach(k => {
            if(weights[k] !== undefined) {
                weights[k] = Number(document.getElementById(`rm_${k}`).value) || 0;
            }
        });
        saveRoleWeights(); updateLiveRoles(); updatePlayerList();
        alert(`"${role}" rolü başarıyla kaydedildi!`);
    });

    document.getElementById('rmReset')?.addEventListener('click', () => {
        if(confirm("Tüm rolleri varsayılan hallerine sıfırlamak istediğinize emin misiniz?")) {
            resetRoleWeights(); updateRmInputs(); updateLiveRoles(); updatePlayerList();
            alert("Tüm roller sıfırlandı.");
        }
    });

    // Ana buton olayları
    document.getElementById('btnToggleSelection')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        const allSelected = currentPlayers.length > 0 && currentPlayers.every(p => p.selected);
        currentPlayers.forEach(p => p.selected = !allSelected); 
        updatePlayerList(); 
    });
    
    document.getElementById('btnDeleteSelected')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        if(confirm('Seçili oyuncuları havuzdan silmek istediğinize emin misiniz?')) {
            currentPlayers = currentPlayers.filter(p => !p.selected); 
            updatePlayerList(); 
            renderPositionMap();
        }
    });
    
    document.getElementById('btnRandomSelect')?.addEventListener('click', selectRandomPlayers);
    document.getElementById('btnLoadDummies')?.addEventListener('click', loadDummies);
    document.getElementById('btnRemoveDummies')?.addEventListener('click', (e) => { e.preventDefault(); currentPlayers = currentPlayers.filter(p => !p.isTest); updatePlayerList(); renderPositionMap(); });
    document.getElementById('btnSaveNew')?.addEventListener('click', saveNewDatabase);
    document.getElementById('btnLoadDB')?.addEventListener('click', loadDatabase);
    document.getElementById('btnUpdateDB')?.addEventListener('click', updateDatabase);
    document.getElementById('btnDeleteDB')?.addEventListener('click', deleteDatabase);
    document.getElementById('btnExportJSON')?.addEventListener('click', exportDatabases);
    document.getElementById('btnImportJSON')?.addEventListener('click', importDatabases);
    document.getElementById('btnAddPlayer')?.addEventListener('click', handleAddPlayer);
    document.getElementById('btnRunSim')?.addEventListener('click', runSimulation);
    document.getElementById('pMainPos')?.addEventListener('change', () => { renderPositionMap(); updateLiveRoles(); });
    document.getElementById('matchFormat')?.addEventListener('change', updatePlayerList);

    // Global tıklama olayları
    document.addEventListener('click', (e) => {
        const pitchNode = e.target.closest('.pitch-node-clickable');
        if (pitchNode) {
            e.preventDefault(); e.stopPropagation(); 
            const pidStr = pitchNode.dataset.pid; const pos = pitchNode.dataset.pos;
            if (!pidStr || !pos) return;
            const player = currentPlayers.find(p => String(p.id) === String(pidStr));
            if (player) {
                if (!player.bannedPositions) player.bannedPositions = [];
                if (player.bannedPositions.includes(pos)) player.bannedPositions = player.bannedPositions.filter(p => p !== pos);
                else player.bannedPositions.push(pos);
                updatePlayerList(); 
            } return;
        }
        
        const playerEl = e.target.closest('.pitch-player');
        if (playerEl) { 
            if (playerEl.dataset.pinfo) {
                const info = JSON.parse(decodeURIComponent(playerEl.dataset.pinfo)); 
                openPlayerModal(info); 
            }
        }
        if (e.target.id === 'playerModal' || e.target.id === 'closeModal') { document.getElementById('playerModal').style.display = 'none'; }

        if (e.target.classList.contains('spin-btn')) {
            e.preventDefault(); const input = e.target.parentElement.querySelector('input'); if(!input) return;
            let val = parseInt(input.value) || 0; const step = parseInt(input.step) || 5; const max = parseInt(input.max) || 100; const min = parseInt(input.min) || 0;
            if (e.target.classList.contains('plus')) val = Math.min(max, val + step);
            if (e.target.classList.contains('minus')) val = Math.max(min, val - step);
            input.value = val; updateLiveRoles(); 
        }
        
        if (e.target.classList.contains('btn-delete')) {
            currentPlayers = currentPlayers.filter(p => String(p.id) !== String(e.target.dataset.id)); updatePlayerList();
        }
        if (e.target.classList.contains('btn-edit')) {
            editPlayer(Number(e.target.dataset.id));
        }
    });

    ['sPas', 'sSavunma', 'sSut', 'sDribling', 'sFirsat', 'sHava', 'sSutKar', 'pName', 'pLastName', 'pShortName'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateLiveRoles);
        document.getElementById(id)?.addEventListener('change', updateLiveRoles);
    });

    document.getElementById('pCond')?.addEventListener('change', () => {
        updateCondPreview();
        updateLiveRoles();
    });
    
    updateCondPreview();

    refreshDatabaseSelect(); renderPositionMap();

    const lastDb = localStorage.getItem('last_used_db');
    if (lastDb && getDatabases()[lastDb]) {
        const selectEl = document.getElementById('dbSelect');
        if (selectEl) selectEl.value = lastDb;
        currentPlayers = [...getDatabases()[lastDb].map((p, i) => { 
            let n = {...p, id: Date.now() + i + Math.random()}; 
            if (!n.bannedPositions) n.bannedPositions = []; 
            return n; 
        })];
        updatePlayerList();
    }
});

function updateRmRoles() {
    const pos = document.getElementById('rmPos').value;
    const roleSelect = document.getElementById('rmRole');
    roleSelect.innerHTML = Object.keys(ROLE_WEIGHTS[pos]).map(r => `<option value="${r}">${r}</option>`).join('');
    updateRmInputs();
}

function updateRmInputs() {
    const pos = document.getElementById('rmPos').value;
    const role = document.getElementById('rmRole').value;
    const weights = ROLE_WEIGHTS[pos][role];
    const inputsDiv = document.getElementById('rmInputs');
    inputsDiv.innerHTML = '';

    const keys = ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'];
    if(pos === 'GK') keys.push('sutKarsilama');

    keys.forEach(k => {
        if(weights[k] !== undefined) {
            inputsDiv.innerHTML += `
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.85em; color:var(--text-muted); margin-bottom:2px; font-weight:bold;">${k.toUpperCase()}</label>
                    <input type="number" id="rm_${k}" value="${weights[k]}" style="padding:8px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-main); font-weight:bold;">
                </div>
            `;
        }
    });
    
    keys.forEach(k => {
        if(weights[k] !== undefined) {
            document.getElementById(`rm_${k}`).addEventListener('input', checkRmSum);
        }
    });
    checkRmSum();
}

function checkRmSum() {
    let sum = 0;
    const inputs = document.getElementById('rmInputs').querySelectorAll('input');
    inputs.forEach(inp => sum += Number(inp.value) || 0);
    const warning = document.getElementById('rmWarning');
    warning.innerText = `Toplam Ağırlık: %${sum} ${sum !== 100 ? '(Genelde 100 olması önerilir)' : ''}`;
    warning.style.color = sum === 100 ? '#2ecc71' : '#e74c3c';
}

// ----------------------------------------------------
// 🔥 VERİTABANI VE TEST FONKSİYONLARI 🔥
// ----------------------------------------------------

function loadDummies(e) {
    if (e) e.preventDefault();
    const dummies = generateFallbackDummies();
    currentPlayers = [...currentPlayers, ...dummies];
    updatePlayerList();
    renderPositionMap();
}

function generateFallbackDummies() {
    const c = ["Tam", "İyi", "Vasat", "Kötü"];
    const d = [
        { f: "Ali", l: "Yılmaz", pos: "GK", sec: [{pos:"CB", cap:50, role:"Standart Stoper"}, {pos:"DM", cap:40, role:"Kesici"}], s: { pas: 60, savunma: 50, sut: 40, dribling: 40, firsat: 40, hava: 60, sutKarsilama: 90 } }, 
        { f: "Burak", l: "Kaya", pos: "GK", sec: [{pos:"CM", cap:60, role:"İki Yönlü Orta Saha"}], s: { pas: 50, savunma: 60, sut: 30, dribling: 30, firsat: 30, hava: 80, sutKarsilama: 85 } }, 
        { f: "Can", l: "Demir", pos: "CB", sec: [{pos:"LB", cap:85, role:"Defansif Bek"}, {pos:"RB", cap:85, role:"Defansif Bek"}], s: { pas: 50, savunma: 90, sut: 30, dribling: 40, firsat: 30, hava: 90, sutKarsilama: 0 } },
        { f: "Efe", l: "Şahin", pos: "CM", sec: [{pos:"AM", cap:80, role:"Ofansif Oyun Kurucu"}], s: { pas: 85, savunma: 40, sut: 75, dribling: 80, firsat: 90, hava: 50, sutKarsilama: 0 } },
        { f: "Emre", l: "Çelik", pos: "FW", sec: [{pos:"LW", cap:70, role:"İçe Kat Eden Kanat"}], s: { pas: 65, savunma: 30, sut: 90, dribling: 85, firsat: 70, hava: 80, sutKarsilama: 0 } }
    ];
    return d.map((p, i) => ({ 
        id: Date.now() + i, 
        firstName: p.f, 
        lastName: p.l, 
        name: `${p.f} ${p.l}`, 
        shortName: "", 
        mainPos: p.pos, 
        role: p.pos === "GK" ? "Kaleci" : "Standart Stoper", 
        condition: c[Math.floor(Math.random() * c.length)], 
        stats: { pas: p.s.pas, savunma: p.s.savunma, sut: p.s.sut, şut: p.s.sut, dribling: p.s.dribling, firsat: p.s.firsat, fırsat: p.s.firsat, hava: p.s.hava, sutKarsilama: p.s.sutKarsilama||0 }, 
        isTest: true, 
        secondaryPositions: (p.sec||[]).map(s => ({ pos: s.pos, capacity: s.cap, role: s.role })), 
        bannedPositions: [] 
    }));
}

function exportDatabases(e) { 
    if(e) e.preventDefault(); 
    const dbs = getDatabases(); 
    if(Object.keys(dbs).length === 0) return alert("Kayıtlı veritabanı yok!"); 
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dbs)], { type: 'application/json' })); 
    a.download = 'saha_oyuncu_veritabanlari.json'; 
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a); 
}

function importDatabases(e) { 
    if(e) e.preventDefault(); 
    const input = document.createElement('input'); 
    input.type = 'file'; 
    input.accept = '.json'; 
    input.onchange = ev => { 
        const reader = new FileReader(); 
        reader.onload = readerEvent => { 
            try { 
                JSON.parse(readerEvent.target.result); 
                localStorage.setItem('football_databases', readerEvent.target.result); 
                refreshDatabaseSelect(); 
                alert("Yüklendi."); 
            } catch { alert("Hata!"); } 
        }; 
        reader.readAsText(ev.target.files[0]); 
    }; 
    input.click(); 
}

function getDatabases() { 
    try { 
        const data = localStorage.getItem('football_databases'); 
        return data ? JSON.parse(data) : {}; 
    } catch(e) { return {}; } 
}

function setDatabases(dbs) { 
    localStorage.setItem('football_databases', JSON.stringify(dbs)); 
    refreshDatabaseSelect(); 
}

function refreshDatabaseSelect() { 
    const dbs = getDatabases(); 
    const select = document.getElementById('dbSelect'); 
    if(!select) return; 
    select.innerHTML = Object.keys(dbs).length === 0 ? '<option value="">-- Yok --</option>' : Object.keys(dbs).map(k => `<option value="${k}">${k} (${dbs[k].length} Oyuncu)</option>`).join(''); 
}

function saveNewDatabase(e) { 
    if (e) e.preventDefault(); 
    if (!currentPlayers.length) return alert("Oyuncu yok!"); 
    const dbName = prompt("İsim:"); 
    if (!dbName) return; 
    const dbs = getDatabases(); 
    dbs[dbName] = currentPlayers; 
    setDatabases(dbs); 
    document.getElementById('dbSelect').value = dbName; 
    localStorage.setItem('last_used_db', dbName); 
}

function loadDatabase(e) { 
    if (e) e.preventDefault(); 
    const dbName = document.getElementById('dbSelect')?.value; 
    if (!dbName) return; 
    const dbs = getDatabases(); 
    if(dbs[dbName]) { 
        currentPlayers = [...currentPlayers, ...dbs[dbName].map((p, i) => { 
            let n = {...p, id: Date.now() + i + Math.random()}; 
            if (!n.bannedPositions) n.bannedPositions = []; 
            return n; 
        })]; 
        chartInstances = {}; 
        updatePlayerList(); 
        renderPositionMap(); 
        alert(`"${dbName}" eklendi.`); 
        localStorage.setItem('last_used_db', dbName); 
    } 
}

function updateDatabase(e) { 
    if (e) e.preventDefault(); 
    const dbName = document.getElementById('dbSelect')?.value; 
    if (!dbName) return; 
    const dbs = getDatabases(); 
    dbs[dbName] = currentPlayers; 
    setDatabases(dbs); 
    alert(`Güncellendi.`); 
    localStorage.setItem('last_used_db', dbName); 
}

function deleteDatabase(e) { 
    if (e) e.preventDefault(); 
    const dbName = document.getElementById('dbSelect')?.value; 
    if (!dbName) return; 
    if (confirm(`Silinsin mi?`)) { 
        const dbs = getDatabases(); 
        delete dbs[dbName]; 
        setDatabases(dbs); 
        if (localStorage.getItem('last_used_db') === dbName) localStorage.removeItem('last_used_db'); 
    } 
}

function selectRandomPlayers(e) { 
    if (e) e.preventDefault(); 
    const format = Number(document.getElementById('matchFormat')?.value || 7); 
    const req = format * 2; 
    if (currentPlayers.length < req) return alert(`En az ${req} gerekli.`); 
    
    currentPlayers.forEach(p => p.selected = false); 
    const gks = currentPlayers.filter(p => p.mainPos === 'GK').sort(() => Math.random() - 0.5); 
    const fields = currentPlayers.filter(p => p.mainPos !== 'GK').sort(() => Math.random() - 0.5); 
    
    let count = 0; 
    if (gks.length >= 2) { 
        gks[0].selected = true; 
        gks[1].selected = true; 
        count += 2; 
    } else { 
        gks.forEach(gk => { gk.selected = true; count++; }); 
    } 
    
    for(let i=0; i<fields.length && count < req; i++) { 
        fields[i].selected = true; 
        count++; 
    } 
    updatePlayerList(); 
}

// ----------------------------------------------------
// UI VE HESAPLAMA FONKSİYONLARI
// ----------------------------------------------------

function getOvrForPosition(player, pos, role, capacity) {
    const basePos = getBasePosition(pos);
    if (player.bannedPositions && player.bannedPositions.includes(basePos)) return 0;
    const weights = ROLE_WEIGHTS[basePos]?.[role];
    const getStat = s => player.stats[s] ?? (s === 'sut' ? player.stats.şut : s === 'firsat' ? player.stats.fırsat : 0);
    let baseOvr = 0;
    if (weights) {
        let ts = 0, tw = 0;
        for (const [s, w] of Object.entries(weights)) { if (w > 0) { ts += getStat(s) * w; tw += w; } }
        if (tw > 0) baseOvr = Math.round(ts / tw);
    } else {
        baseOvr = Math.round(((player.stats.pas || 0) + (player.stats.savunma || 0) + (player.stats.dribling || 0) + (player.stats.hava || 0) + getStat('firsat') + (basePos === 'GK' ? player.stats.sutKarsilama || 0 : getStat('sut'))) / 6);
    }
    return Math.round(baseOvr * (capacity / 100));
}

function getEffectivePlayerInfo(player) {
    const mainPos = player.mainPos;
    const mainBase = getBasePosition(mainPos);
    const banned = player.bannedPositions || [];
    const isMainBanned = banned.includes(mainPos) || banned.includes(mainBase);

    if (!isMainBanned) return { original: mainPos, active: mainPos, activeRole: player.role, ovr: getOvrForPosition(player, mainPos, player.role, 100), isBanned: false };

    let bestSec = null; let bestRole = null; let bestOvr = -1;
    if (player.secondaryPositions && player.secondaryPositions.length > 0) {
        player.secondaryPositions.forEach(sp => {
            const spBase = getBasePosition(sp.pos);
            if (!banned.includes(sp.pos) && !banned.includes(spBase)) {
                const ovr = getOvrForPosition(player, sp.pos, sp.role, sp.capacity);
                if (ovr > bestOvr) { bestOvr = ovr; bestSec = sp.pos; bestRole = sp.role; }
            }
        });
    }

    if (bestSec) return { original: mainPos, active: bestSec, activeRole: bestRole, ovr: bestOvr, isBanned: true };
    return { original: mainPos, active: 'Yok', activeRole: '-', ovr: 0, isBanned: true };
}

function getPitchName(player, allPlayers) {
    if (player.shortName && player.shortName.trim() !== '') return player.shortName.trim();
    const fName = player.firstName || player.name.split(' ')[0];
    const lName = player.lastName || player.name.split(' ').slice(1).join(' ');
    const duplicates = allPlayers.filter(p => (p.firstName || p.name.split(' ')[0]).toLowerCase() === fName.toLowerCase());
    if (duplicates.length > 1 && lName && lName.trim() !== '') return `${fName} ${lName.trim().charAt(0)}.`;
    return fName;
}

function openPlayerModal(info) {
    const condMulti = CONDITIONS[info.cond] || 1.0;
    const statLabels = { 'pas': 'Pas D.', 'savunma': 'Sav', 'sut': 'Şut', 'dribling': 'Dribling', 'firsat': 'Fırsat Y.', 'hava': 'Hava', 'sutKarsilama': 'Şut Karşılama' };
    
    let detailsHtml = `
        <div style="padding:15px; border-radius:6px; margin-bottom:15px; font-size:1.05em; background: var(--bg-detail); color: var(--text-main); border: 1px solid var(--border-color);">
            <b>Mevki:</b> ${info.basePos} | 
            <b>Rol:</b> <span style="color:#2ecc71;">${info.role}</span> <br>
            <b>Mevki Kapasitesi:</b> <span style="color:${info.cap===100?'#2ecc71':(info.cap>50?'#f39c12':'#e74c3c')};">%${info.cap}</span> | 
            <b>Kondisyon:</b> <span class="cond-icon" style="margin-right:5px;">${window.getConditionHeart(info.cond)}</span> ${info.cond} (Çarpan: x${condMulti})
        </div>
        <div style="font-weight:bold; color:#f39c12; margin-bottom:10px;">Takım Dengesine Bireysel Katkı Analizi:</div>
        <table class="sim-stat-table" style="width:100%; text-align:left; border-collapse:collapse; font-size:0.95em;">
            <tr>
                <th style="padding:10px;">Özellik</th>
                <th style="padding:10px;">Ham Puan</th>
                <th style="padding:10px;">Rol Ağırlığı</th>
                <th style="padding:10px;">Net Katkı</th>
            </tr>
    `;
    
    let totalContrib = 0;
    for (const [stat, weight] of Object.entries(info.weights)) {
        if (weight > 0) {
            const raw = info.stats[stat] || 0;
            const currentCondMulti = stat === 'sutKarsilama' ? 1.0 : condMulti;
            const effective = raw * (weight/100) * (info.cap/100) * currentCondMulti;
            totalContrib += effective;
            
            const statName = statLabels[stat] || stat;
            const shieldNote = (stat === 'sutKarsilama' && condMulti !== 1.0) ? `<br><span style="font-size:0.7em; color:#f39c12;">(Kondisyondan Etkilenmez)</span>` : ``;

            detailsHtml += `<tr>
                <td style="padding:8px; font-weight:bold;">${statName}</td>
                <td style="padding:8px; font-weight:bold; text-align:center;">${raw}</td>
                <td style="padding:8px; color:var(--text-muted);">%${weight}</td>
                <td style="padding:8px; color:#2ecc71; font-weight:bold;">+${effective.toFixed(1)}${shieldNote}</td>
            </tr>`;
        }
    }
    detailsHtml += `</table>
    <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:1.2em; font-weight: bold;">Toplam OVR Katkısı: <b style="color:#27ae60; font-size:1.3em;">${totalContrib.toFixed(1)}</b></div>
    </div>`;
    
    document.getElementById('modalTitle').innerText = info.name + " (" + info.pOvr + " OVR)";
    document.getElementById('modalBody').innerHTML = detailsHtml;
    document.getElementById('playerModal').style.display = 'flex';
}

function generateMiniPitchHTML(player, width = "140px") {
    const baseSlotCoords = { 
        "FW": {x: 50, y: 10}, "LW": {x: 15, y: 25}, "AM": {x: 50, y: 25}, "RW": {x: 85, y: 25}, 
        "LM": {x: 15, y: 40}, "CM": {x: 50, y: 40}, "RM": {x: 85, y: 40}, 
        "LWB": {x: 15, y: 55}, "DM": {x: 50, y: 55}, "RWB": {x: 85, y: 55}, 
        "LB": {x: 15, y: 70}, "CB": {x: 50, y: 70}, "RB": {x: 85, y: 70}, 
        "GK": {x: 50, y: 85} 
    };
    
    let nodesHTML = '';
    const mainPos = getBasePosition(player.mainPos);
    const mainRole = player.role || 'Standart';
    const secPositions = player.secondaryPositions || [];
    const bannedPositions = player.bannedPositions || [];
    const pid = player.id || ''; 
    const clickClass = pid ? 'pitch-node-clickable' : ''; 

    Object.keys(baseSlotCoords).forEach(pos => {
        const isMain = mainPos === pos;
        const secObj = secPositions.find(sp => getBasePosition(sp.pos) === pos);
        const isSec = !!secObj;
        const isBanned = bannedPositions.includes(pos);

        let bgColor, border, content, size, zIndex, opacity, tooltipText;

        if (isBanned) {
            bgColor = '#c0392b'; border = '1px solid white'; content = 'X'; size = 20; zIndex = 10; opacity = 1;
            tooltipText = `<b>${pos}</b> <span style="color:#e74c3c;">(Yasaklı)</span>`;
        } else if (isMain) {
            const ovr = getOvrForPosition(player, pos, mainRole, 100);
            bgColor = '#00d2d3'; border = '2px solid white'; content = pos; size = 24; zIndex = 8; opacity = 1;
            tooltipText = `<b>${pos} (Ana)</b><br><span style="color:#f39c12;">${mainRole || 'Rol Seçilmedi'}</span><br><span style="color:${window.getStatColor(ovr)};">${ovr} OVR</span>`;
        } else if (isSec) {
            const ovr = getOvrForPosition(player, pos, secObj.role, secObj.capacity);
            bgColor = secObj.capacity === 100 ? '#00d2d3' : `hsl(${Math.floor((secObj.capacity / 100) * 120)}, 80%, 45%)`;
            border = '1px solid white'; content = pos; size = 20; zIndex = 7; opacity = 1;
            tooltipText = `<b>${pos} (Yan) - %${secObj.capacity}</b><br><span style="color:#f39c12;">${secObj.role || 'Rol Seçilmedi'}</span><br><span style="color:${window.getStatColor(ovr)};">${ovr} OVR</span>`;
        } else {
            bgColor = 'rgba(255,255,255,0.1)'; border = '1px dashed rgba(255,255,255,0.4)'; content = ''; size = 16; zIndex = 5; opacity = 0.6;
            tooltipText = `<b>${pos}</b><br><span style="color:var(--text-muted);">(Kapat)</span>`;
        }

        nodesHTML += `
        <div class="custom-tooltip ${clickClass}" data-pid="${pid}" data-pos="${pos}" style="position: absolute; left: ${baseSlotCoords[pos].x}%; top: ${baseSlotCoords[pos].y}%; transform: translate(-50%, -50%); width: ${size}px; height: ${size}px; border-radius: 50%; background-color: ${bgColor}; border: ${border}; box-shadow: 0 2px 4px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 0.5em; font-weight: bold; color: ${isBanned ? 'white' : 'black'}; z-index: ${zIndex}; opacity: ${opacity}; transition: all 0.15s ease;">
            ${content}
            <span class="tooltip-text">${tooltipText}</span>
        </div>`;
    });

    return `
        <div style="position: relative; width: ${width}; max-width: 100%; aspect-ratio: 1/1.7; background: transparent; border: 2px solid rgba(255,255,255,0.7); border-radius: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.3);">
            <div style="position: absolute; top: 0; left: 20%; width: 60%; height: 16%; border: 1px solid rgba(255,255,255,0.4); border-top: none;"></div>
            <div style="position: absolute; bottom: 0; left: 20%; width: 60%; height: 16%; border: 1px solid rgba(255,255,255,0.4); border-bottom: none;"></div>
            <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: rgba(255,255,255,0.4); transform: translateY(-50%);"></div>
            <div style="position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; transform: translate(-50%, -50%);"></div>
            ${nodesHTML}
        </div>`;
}

// ----------------------------------------------------
// 🔥 SİMÜLASYON, PITCH VE LİSTE GÜNCELLEMELERİ 🔥
// ----------------------------------------------------

function generateTacticalPitchHTML(lineup, title, teamColor = '#00d2d3', teamType = 'A') {
    if (!lineup) return '';
    
    const useTeamColors = document.getElementById('cbTeamColors')?.checked;

    const slotCoords = { 
        "LFW": {x: 25, y: 10}, "FW": {x: 50, y: 10}, "RFW": {x: 75, y: 10}, 
        "LW": {x: 15, y: 25}, "LAM": {x: 35, y: 25}, "AM": {x: 50, y: 25}, "RAM": {x: 65, y: 25}, "RW": {x: 85, y: 25}, 
        "LM": {x: 15, y: 40}, "LCM": {x: 35, y: 40}, "CM": {x: 50, y: 40}, "RCM": {x: 65, y: 40}, "RM": {x: 85, y: 40}, 
        "LWB": {x: 15, y: 55}, "LDM": {x: 35, y: 55}, "DM": {x: 50, y: 55}, "RDM": {x: 65, y: 55}, "RWB": {x: 85, y: 55}, 
        "LB": {x: 15, y: 70}, "LCB": {x: 35, y: 70}, "CB": {x: 50, y: 70}, "RCB": {x: 65, y: 70}, "RB": {x: 85, y: 70}, 
        "GK": {x: 50, y: 85} 
    };
    
    let playersHTML = '';
    lineup.lineup.forEach(item => {
        if (!item.player) return;
        
        const weights = ROLE_WEIGHTS[item.basePos]?.[item.role] || {};
        const condMulti = CONDITIONS[item.player.condition] || 1.0;
        const activeOvr = Math.round(item.pOvr * condMulti);
        
        const pinfo = { cond: item.player.condition, basePos: item.basePos, role: item.role, cap: item.cap, weights: weights, stats: item.player.stats, name: item.player.name, pOvr: item.pOvr };
        const encodedInfo = encodeURIComponent(JSON.stringify(pinfo));

        const posData = slotCoords[item.slot] || {x: 50, y: 50};
        
        let circleColor = teamColor; 
        let warningIcon = '';

        if (item.outOfPos) { 
            warningIcon = `<div class="pitch-player-alert" style="position:absolute; top:-8px; right:-8px; font-size:16px; text-shadow: 1px 1px 2px #000; z-index: 10;">⚠️</div>`; 
            circleColor = '#e74c3c'; 
        } else if (useTeamColors) {
            // A Takımı yuvarlakları her zaman Koyu Mavi, B takımı Kırmızı. (85+ kuralı sadece yazıda)
            circleColor = teamType === 'A' ? '#3498db' : '#e74c3c'; 
        } else {
            if (item.isMain || (item.isSec && item.cap === 100)) { circleColor = '#00d2d3'; } 
            else if (item.isSec) { circleColor = `hsl(${Math.floor(((item.cap || 50) / 100) * 120)}, 80%, 45%)`; }
        }

        const nameColor = item.player.isTest ? '#2ecc71' : 'white';
        
        // Aktif OVR hesabı ve Kalp dahil edildi (FM Tarzı)
        playersHTML += `
            <div class="pitch-player" data-pinfo="${encodedInfo}" style="position: absolute; left: ${posData.x}%; top: ${posData.y}%; z-index: 5;">
                <div class="pitch-player-icon" style="background-color: ${circleColor};">${warningIcon}</div>
                <div class="pitch-player-label">
                    <div style="display: flex; justify-content: center; align-items: baseline; gap: 4px; margin-bottom: 2px;">
                        <span style="color:#ecf0f1; font-weight:bold; font-size: 0.85em;">${item.slot}</span>
                        <span class="pitch-ovr-text" style="color:${window.getStatColor(activeOvr)}; font-weight:bold; font-size: 1.1em; line-height: 1;">${activeOvr}</span>
                        <span class="cond-icon" style="display: flex; align-items: center;">${window.getConditionHeart(item.player.condition, 14)}</span>
                    </div>
                    <div style="white-space: normal; line-height: 1.1; font-size: 0.95em; color:${nameColor}; font-weight: 800;">${getPitchName(item.player, currentPlayers)}</div>
                </div>
            </div>`;
    });

    const headerColor = teamType === 'A' ? '#3498db' : '#e74c3c';

    return `
        <div class="pitch-container">
            <h4 class="pitch-title" style="color: ${headerColor}; border-bottom-color: ${headerColor}; margin-top: 0; padding-bottom: 5px;">${title} (${lineup.formationName})</h4>
            <div class="pitch-inner">
                <div style="position: absolute; top: 0; left: 20%; width: 60%; height: 16%; border: 2px solid rgba(255,255,255,0.5); border-top: none;"></div>
                <div style="position: absolute; top: 0; left: 35%; width: 30%; height: 6%; border: 2px solid rgba(255,255,255,0.5); border-top: none;"></div>
                <div style="position: absolute; bottom: 0; left: 20%; width: 60%; height: 16%; border: 2px solid rgba(255,255,255,0.5); border-bottom: none;"></div>
                <div style="position: absolute; bottom: 0; left: 35%; width: 30%; height: 6%; border: 2px solid rgba(255,255,255,0.5); border-bottom: none;"></div>
                <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.5); transform: translateY(-50%);"></div>
                <div style="position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%);"></div>
                <div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%);"></div>
                ${playersHTML}
            </div>
        </div>`;
}

function updatePlayerList() {
    const listEl = document.getElementById('playerListEl'); if (!listEl) return;
    chartInstances = {};
    
    const openStates = {};
    document.querySelectorAll('details.player-item').forEach(det => { if (det.open) openStates[det.id] = true; });

    const format = Number(document.getElementById('matchFormat')?.value || 7);
    const req = format * 2; const sel = currentPlayers.filter(p => p.selected).length;
    const statusEl = document.getElementById('selectionStatus');
    if (statusEl) { statusEl.innerText = `Seçilen: ${sel} / ${req}`; statusEl.style.color = sel === req ? "#a8e63d" : "#e74c3c"; }

    let html = "";
    const categories = [ { t: "🧤 KALECİLER", p: ["GK"] }, { t: "🛡️ SAVUNMALAR", p: ["CB", "LB", "RB", "LWB", "RWB"] }, { t: "⚙️ ORTA SAHALAR", p: ["DM", "CM", "AM", "LM", "RM"] }, { t: "⚔️ HÜCUMCULAR", p: ["LW", "RW", "FW"] } ];

    categories.forEach(cat => {
        const pList = currentPlayers.filter(p => cat.p.includes(getBasePosition(p.mainPos)));
        if (pList.length > 0) {
            html += `<div style="background: #1a6b2e; color: white; padding: 5px 10px; margin-top: 15px; margin-bottom: 5px; border-radius: 4px; font-weight: bold;">${cat.t} (${pList.length})</div>`;
            html += pList.map(p => {
                const nameColor = p.isTest ? '#2ecc71' : 'inherit'; 
                const displayNameHtml = p.shortName?.trim() ? ` <span style="color:var(--text-muted); font-size:0.85em;">(${p.shortName.trim()})</span>` : '';
                
                const eff = getEffectivePlayerInfo(p);
                const posDisplay = eff.isBanned ? `<s style="color:#e74c3c;">${eff.original}</s> <span style="color:#e67e22; font-size:0.9em; font-weight:bold;">(En iyi mevki: ${eff.active})</span>` : `${eff.original}`;
                const roleDisplay = eff.isBanned && eff.active !== 'Yok' ? `<span style="color:#1a6b2e;">(${eff.activeRole})</span>` : `<span style="color:#1a6b2e;">(${p.role})</span>`;

                const havaVal = p.stats.hava||0; const pasVal = p.stats.pas||0; const savVal = p.stats.savunma||0;
                const sutVal = getBasePosition(p.mainPos)==='GK'?(p.stats.sutKarsilama||0):(p.stats.sut ?? (p.stats.şut||0));
                const dribVal = p.stats.dribling||0; const firsatVal = p.stats.firsat ?? (p.stats.fırsat||0);

                const statsHtml = `
                  <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.95em; width: 100%;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Hava Topu:</b> <span style="font-weight:bold; color:${window.getStatColor(havaVal)};">${havaVal}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Pas D.:</b> <span style="font-weight:bold; color:${window.getStatColor(pasVal)};">${pasVal}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Savunma:</b> <span style="font-weight:bold; color:${window.getStatColor(savVal)};">${savVal}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>${getBasePosition(p.mainPos)==='GK'?'Şut Karşılama':'Şut'}:</b> <span style="font-weight:bold; color:${window.getStatColor(sutVal)};">${sutVal}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Dribling:</b> <span style="font-weight:bold; color:${window.getStatColor(dribVal)};">${dribVal}</span></div>
                    <div style="display: flex; justify-content: space-between; padding-bottom: 0;"><b>Fırsat Y.:</b> <span style="font-weight:bold; color:${window.getStatColor(firsatVal)};">${firsatVal}</span></div>
                  </div>
                `;

                const yanMevkilerHtml = p.secondaryPositions.length > 0 
                    ? p.secondaryPositions.map(sp => `<span class="badge" style="background:${window.getStatColor(sp.capacity === 100 ? 85 : (sp.capacity>50?65:30))};">${sp.pos} (%${sp.capacity})</span>`).join('') 
                    : '<span style="font-size:0.85em; color:var(--text-muted);">Yok</span>';

                const condMulti = CONDITIONS[p.condition] || 1.0;
                const activeOvr = Math.round(eff.ovr * condMulti);
                const condHeart = `<span class="cond-icon">${window.getConditionHeart(p.condition, 18)}</span>`;
                
                let ovrBadgeText = `${eff.ovr} OVR`;
                if (condMulti < 1.0) {
                    ovrBadgeText = `${eff.ovr} OVR (Aktif: ${activeOvr})`;
                }

                return `
                <details class="player-item" id="details-${p.id}">
                  <summary class="player-summary">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <input type="checkbox" class="player-select-cb" data-id="${p.id}" ${p.selected ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
                      <span style="${p.selected ? '' : 'text-decoration:line-through; opacity:0.5;'}">
                        <b style="color:${nameColor};">${p.name}</b>${displayNameHtml} ${condHeart} <span class="pitch-ovr-text" style="background:${window.getStatColor(activeOvr)}; color:white; text-shadow: 1px 1px 2px rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:4px;">${ovrBadgeText}</span> | ${posDisplay} ${roleDisplay}
                      </span>
                    </div>
                  </summary>
                  
                  <div class="player-details-row">
                    <div class="pd-col-stats">
                        ${statsHtml}
                        <div style="position:relative; width:100%; max-width: 220px; aspect-ratio: 1/1; margin: 10px auto 0 auto; display: flex; justify-content: center;">
                            <canvas id="chart-${p.id}"></canvas>
                        </div>
                    </div>
                    <div class="pd-col-pitch">
                        <span style="font-size:0.85em; font-weight:bold; color:var(--text-muted); text-align:center;">📍 Mevki Haritası<br><span style="font-size:0.8em; color:#e74c3c;">(Tıklayarak yasakla)</span></span>
                        <div style="background: var(--pitch-bg); border-radius: 4px; padding: 2px;">
                            ${generateMiniPitchHTML(p, "160px")}
                        </div>
                    </div>
                    <div class="pd-col-sec">
                        <div>
                            <span style="font-size:0.9em; font-weight:bold; display:block; margin-bottom:8px;">Yan Mevkiler:</span>
                            <div class="sec-pos-badges">
                                ${yanMevkilerHtml}
                            </div>
                        </div>
                    </div>
                    <div style="flex-basis: 100%; display: flex; gap: 15px; margin-top: 15px; border-top: 1px dashed var(--border-color); padding-top: 15px; justify-content: flex-start;">
                        <button type="button" class="btn btn-yellow btn-edit" data-id="${p.id}" style="min-width: 120px;">Düzenle</button>
                        <button type="button" class="btn btn-red btn-delete" data-id="${p.id}" style="min-width: 120px;">Sil</button>
                    </div>
                  </div>
                </details>`;
            }).join('');
        }
    });
    listEl.innerHTML = html;

    document.querySelectorAll('details.player-item').forEach(det => { if (openStates[det.id]) det.open = true; });
    document.querySelectorAll('.player-select-cb').forEach(cb => { cb.addEventListener('change', e => { const p = currentPlayers.find(x => String(x.id) === String(e.target.dataset.id)); if (p) p.selected = e.target.checked; updatePlayerList(); }); });
    document.querySelectorAll('.player-item').forEach(det => { det.addEventListener('toggle', () => { if (det.open) renderRadarChart(Number(det.id.split('-')[1])); }); });
}

function handleAddPlayer(e) {
    if(e) e.preventDefault();
    
    const rawMainPos = document.getElementById('pMainPos')?.value || "CB";
    const mainPos = getBasePosition(rawMainPos); 
    const mainGroup = document.querySelector(`.pos-btn-group.main-pos`);
    
    let mainRole = mainGroup && mainGroup.querySelector('.role-select') ? mainGroup.querySelector('.role-select').value : "";
    
    if (mainRole === "") {
        alert("Lütfen ana mevki için bir rol seçin!");
        return;
    }

    let missingSecRole = false;
    document.querySelectorAll('.pos-btn-group.active-sec').forEach(btn => {
        let secRole = btn.querySelector('.role-select') ? btn.querySelector('.role-select').value : "";
        if (secRole === "") missingSecRole = true;
    });

    if (missingSecRole) {
        alert("Lütfen aktif ettiğiniz yan mevkiler için bir rol seçin!");
        return;
    }
    
    const statsObj = { 
        pas: Number(document.getElementById('sPas')?.value) || 0, savunma: Number(document.getElementById('sSavunma')?.value) || 0, 
        sut: Number(document.getElementById('sSut')?.value) || 0, şut: Number(document.getElementById('sSut')?.value) || 0,
        dribling: Number(document.getElementById('sDribling')?.value) || 0, firsat: Number(document.getElementById('sFirsat')?.value) || 0, fırsat: Number(document.getElementById('sFirsat')?.value) || 0, 
        hava: Number(document.getElementById('sHava')?.value) || 0, sutKarsilama: Number(document.getElementById('sSutKar')?.value) || 0 
    };

    const fNameVal = document.getElementById('pName')?.value.trim() || "İsimsiz";
    const lNameVal = document.getElementById('pLastName')?.value.trim() || "";
    const shortNameVal = document.getElementById('pShortName')?.value.trim() || "";

    let existingBans = [];
    if (editingPlayerId) {
        const ep = currentPlayers.find(p => p.id === editingPlayerId);
        if (ep && ep.bannedPositions) existingBans = JSON.parse(JSON.stringify(ep.bannedPositions)); 
    }

    const playerData = {
        id: editingPlayerId ? editingPlayerId : Date.now(),
        firstName: fNameVal, lastName: lNameVal, name: lNameVal ? `${fNameVal} ${lNameVal}` : fNameVal,
        shortName: shortNameVal, mainPos: mainPos, role: mainRole, condition: document.getElementById('pCond')?.value || "Tam", stats: statsObj, selected: true, secondaryPositions: [],
        bannedPositions: existingBans 
    };

    document.querySelectorAll('.pos-btn-group.active-sec').forEach(btn => {
        let secRole = btn.querySelector('.role-select').value;
        playerData.secondaryPositions.push({
            pos: getBasePosition(btn.dataset.pos), role: secRole,
            capacity: Math.max(25, Number(btn.querySelector('.cap-input')?.value || 80))
        });
    });

    if (editingPlayerId) {
        const index = currentPlayers.findIndex(p => p.id === editingPlayerId);
        if (index !== -1) currentPlayers[index] = playerData;
        editingPlayerId = null;
        const btn = document.getElementById('btnAddPlayer'); 
        if(btn) { btn.innerText = "Oyuncuyu Havuza Ekle"; btn.className = "btn btn-green"; }
    } else { 
        currentPlayers.push(playerData); 
    }

    ['pName', 'pLastName', 'pShortName'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ""; });
    
    document.querySelectorAll('.pos-btn-group.active-sec').forEach(btn => btn.classList.remove('active-sec'));
    
    renderPositionMap(); updatePlayerList();
}

function updateLiveRoles() {
    const statsObj = { 
        pas: Number(document.getElementById('sPas')?.value) || 0, savunma: Number(document.getElementById('sSavunma')?.value) || 0, 
        sut: Number(document.getElementById('sSut')?.value) || 0, dribling: Number(document.getElementById('sDribling')?.value) || 0, 
        firsat: Number(document.getElementById('sFirsat')?.value) || 0, hava: Number(document.getElementById('sHava')?.value) || 0, sutKarsilama: Number(document.getElementById('sSutKar')?.value) || 0 
    };
    const rawPos = document.getElementById('pMainPos')?.value || 'CB';
    const mainPos = getBasePosition(rawPos);
    const secPositions = [];
    let mainRole = ''; 

    document.querySelectorAll('.pos-btn-group').forEach(group => {
        const pos = group.dataset.pos; 
        const roleSelect = group.querySelector('.role-select');
        
        if (roleSelect && ROLE_WEIGHTS && ROLE_WEIGHTS[pos]) {
            const bestRole = getBestRoleForStats(pos, statsObj);
            
            Array.from(roleSelect.options).forEach(opt => { 
                if(opt.value === bestRole) opt.text = `⭐ ${opt.value}`; 
                else if(opt.value !== "") opt.text = opt.value; 
            });
            
            const isMain = (pos === mainPos);
            const isSec = group.classList.contains('active-sec') && !isMain;

            group.style.backgroundColor = ''; group.style.borderColor = ''; group.style.color = '';

            if (isMain) {
                group.classList.add('main-pos'); group.classList.remove('active-sec');
                if (group.dataset.manual !== 'true') roleSelect.value = ""; 
                mainRole = roleSelect.value; roleSelect.style.display = 'block';
                group.style.backgroundColor = '#00d2d3'; 
                group.style.borderColor = '#00d2d3'; 
                const span = group.querySelector('span'); if(span) { span.style.color = '#1a252f'; span.style.fontWeight = '900'; }
            } else if (isSec) {
                group.classList.remove('main-pos');
                if (group.dataset.manual !== 'true') roleSelect.value = ""; 
                const capVal = Number(group.querySelector('.cap-input').value) || 80;
                secPositions.push({pos, capacity: capVal, role: roleSelect.value});
                const secControls = group.querySelector('.sec-controls'); if (secControls) secControls.style.display = 'flex';
                
                let hue = Math.floor(((capVal - 25) / 75) * 120);
                if(hue < 0) hue = 0; if(hue > 120) hue = 120;
                const dynamicColor = capVal === 100 ? '#00d2d3' : `hsl(${hue}, 80%, 45%)`;
                
                group.style.backgroundColor = dynamicColor; 
                group.style.borderColor = dynamicColor; 
                const span = group.querySelector('span'); if(span) { span.style.color = '#1a252f'; span.style.fontWeight = '900'; }
            } else { 
                group.classList.remove('main-pos', 'active-sec');
                const secControls = group.querySelector('.sec-controls'); if (secControls) secControls.style.display = 'none';
                const span = group.querySelector('span'); if(span) { span.style.color = ''; span.style.fontWeight = ''; }
            }
        }
    });

    if (editingPlayerId) {
        const index = currentPlayers.findIndex(p => p.id === editingPlayerId);
        if (index !== -1) {
            currentPlayers[index].stats = statsObj;
            currentPlayers[index].mainPos = mainPos;
            currentPlayers[index].role = mainRole || currentPlayers[index].role;
            currentPlayers[index].secondaryPositions = secPositions.map(s => {
                if(s.role === "") s.role = getBestRoleForStats(s.pos, statsObj);
                return s;
            });
            currentPlayers[index].condition = document.getElementById('pCond')?.value || "Tam";
            currentPlayers[index].firstName = document.getElementById('pName')?.value.trim() || "İsimsiz";
            const lName = document.getElementById('pLastName')?.value.trim() || "";
            currentPlayers[index].lastName = lName;
            currentPlayers[index].name = lName ? `${currentPlayers[index].firstName} ${lName}` : currentPlayers[index].firstName;
            currentPlayers[index].shortName = document.getElementById('pShortName')?.value.trim() || "";
        }
    }
}

function renderPositionMap() {
    const mapEl = document.getElementById('secPosMap');
    const rawPos = document.getElementById('pMainPos')?.value || 'CB';
    const mainPos = getBasePosition(rawPos);
    if(!mapEl) return;
    
    const oldSecs = {};
    document.querySelectorAll('.pos-btn-group').forEach(g => {
        const p = g.dataset.pos;
        if (g.classList.contains('active-sec')) {
            oldSecs[p] = { cap: g.querySelector('.cap-input')?.value || 80, role: g.querySelector('.role-select')?.value };
        }
    });

    mapEl.innerHTML = '';
    ALL_POSITIONS.forEach(pos => {
      const groupDiv = document.createElement('div');
      groupDiv.className = `pos-btn-group ${pos === mainPos ? 'main-pos' : ''}`;
      groupDiv.dataset.pos = pos;
      
      let innerHTML = `<span>${pos}</span>`;
      
      if (pos === mainPos) {
          innerHTML += `<select class="role-select"></select>`;
      } else {
          innerHTML += `
          <div class="sec-controls">
              <div class="spinner-wrapper">
                  <button type="button" class="spin-btn minus">-</button>
                  <input type="number" class="cap-input" min="25" max="100" step="5" value="80">
                  <button type="button" class="spin-btn plus">+</button>
              </div>
              <select class="role-select"></select>
          </div>`;
      }
      groupDiv.innerHTML = innerHTML;
      
      const roleSelect = groupDiv.querySelector('.role-select');
      if (ROLE_WEIGHTS && ROLE_WEIGHTS[pos]) {
          const emptyOpt = document.createElement('option'); emptyOpt.value = ""; emptyOpt.text = "Rol Seçiniz"; emptyOpt.disabled = true; emptyOpt.selected = true; roleSelect.appendChild(emptyOpt);
          Object.keys(ROLE_WEIGHTS[pos]).forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; roleSelect.appendChild(opt); });
      }
      
      roleSelect.addEventListener('change', () => { groupDiv.dataset.manual = 'true'; updateLiveRoles(); });
      
      if (pos !== mainPos) {
          const capInput = groupDiv.querySelector('.cap-input');
          capInput.addEventListener('input', () => updateLiveRoles());
          groupDiv.querySelector('.minus').addEventListener('click', e => { e.stopPropagation(); capInput.value = Math.max(25, Number(capInput.value) - 5); updateLiveRoles(); });
          groupDiv.querySelector('.plus').addEventListener('click', e => { e.stopPropagation(); capInput.value = Math.min(100, Number(capInput.value) + 5); updateLiveRoles(); });
      }

      if (oldSecs[pos] && pos !== mainPos) {
          groupDiv.classList.add('active-sec');
          const ci = groupDiv.querySelector('.cap-input'); if(ci) ci.value = oldSecs[pos].cap;
          const rs = groupDiv.querySelector('.role-select'); if(rs) rs.value = oldSecs[pos].role;
          groupDiv.dataset.manual = 'true';
      }

      groupDiv.addEventListener('click', (e) => {
          if(e.target.closest('.sec-controls')) return;
          const isMain = groupDiv.dataset.pos === getBasePosition(document.getElementById('pMainPos')?.value || 'CB');
          if (!isMain) { groupDiv.classList.toggle('active-sec'); updateLiveRoles(); }
      });
      
      mapEl.appendChild(groupDiv);
    });
    updateLiveRoles(); 
}

function generateOptimizationLog(lineupObj, teamName) {
    let logs = [];
    lineupObj.lineup.forEach(item => {
        if (item.isSec) {
            logs.push(`<li style="margin-bottom:4px;">${teamName}: <b>${item.player.name}</b> ana mevkisi dışında (<span style="color:#f39c12;">${item.slot}</span>) oynatıldı. (Kapasite: %${item.cap})</li>`);
        } else if (item.outOfPos) {
            logs.push(`<li style="margin-bottom:4px;">${teamName}: <b style="color:#e74c3c;">${item.player.name}</b> mecburen alakasız bir mevkide (<span style="color:#e74c3c;">${item.slot}</span>) oynatıldı!</li>`);
        }
    });
    if (logs.length === 0) logs.push(`<li><span style="color:#2ecc71;">${teamName} takımındaki tüm oyuncular Ana Mevkilerinde oynuyor.</span></li>`);
    return logs.join('');
}

function runSimulation(e) {
    if(e) e.preventDefault();
    const output = document.getElementById('resultOutput'); if(!output) return;
    const format = Number(document.getElementById('matchFormat')?.value || 7);
    const forceFill = document.getElementById('cbForceFill')?.checked || false; 
    const havaLowPriority = document.getElementById('cbLowHava')?.checked ?? true; 
    const requiredPlayers = format * 2;
    const selectedPlayers = currentPlayers.filter(p => p.selected);
  
    if (selectedPlayers.length !== requiredPlayers) {
      output.innerHTML = `<span style="background:#c0392b; color:white; padding:10px; border-radius:4px; display:block;">❌ HATA: Maç için tam olarak ${requiredPlayers} oyuncu seçmelisiniz. (Şu an ${selectedPlayers.length} seçili)</span>`;
      return;
    }
  
    output.innerHTML = '<div style="padding: 15px; font-weight:bold;">Tüm varyasyonlar hesaplanıyor, lütfen bekleyin... ⏳</div>';

    const renderStatRow = (label, valA, valB, diff) => {
        let diffColor = 'var(--text-main)';
        let diffText = '0.0';
        
        if (diff > 0.05) {
            diffColor = '#3498db'; 
            diffText = `+${diff.toFixed(1)}`;
        } else if (diff < -0.05) {
            diffColor = '#e74c3c'; 
            diffText = `${Math.abs(diff).toFixed(1)}`; 
        }
        
        return `
            <tr style="border-bottom: 1px dashed var(--border-color);">
                <td style="color: var(--text-muted); text-align: left; padding: 8px;">${label}</td>
                <td style="color: var(--text-main); font-weight: bold; padding: 8px;">${(valA || 0).toFixed(1)}</td>
                <td style="color: var(--text-main); font-weight: bold; padding: 8px;">${(valB || 0).toFixed(1)}</td>
                <td style="color: ${diffColor}; font-weight: bold; padding: 8px;">${diffText}</td>
            </tr>
        `;
    };

    setTimeout(() => {
        try {
          const validSquads = getAllSquads(selectedPlayers, format, forceFill, havaLowPriority);

          if (!validSquads || validSquads.length === 0) {
              let gkCount = 0;
              selectedPlayers.forEach(p => {
                  if (p.bannedPositions && p.bannedPositions.includes('GK')) return;
                  if (p.mainPos === 'GK' || (p.secondaryPositions && p.secondaryPositions.some(sp => sp.pos === 'GK'))) gkCount++;
              });
              
              if (gkCount < 2 && !forceFill) {
                  output.innerHTML = `<span style="background:#c0392b; color:white; padding:15px; border-radius:4px; line-height:1.6; display:block;">❌ <b>TAKIM BULUNAMADI! (KALECİ EKSİĞİ)</b><br>Kadro kurmak için en az 2 kaleciye (veya yan mevkisi kaleci olan oyuncuya) ihtiyaç var. Şu an seçili oyunculardan sadece <b>${gkCount} kişi</b> kaleye geçebiliyor.<br><br>Lütfen havuza kaleci ekleyin, kaleci oynamayı veto edenlerin yasağını kaldırın veya <i>'Her Zaman Kadro Bul'</i> seçeneğini işaretleyin.</span>`;
              } else {
                  output.innerHTML = `<span style="background:#c0392b; color:white; padding:15px; border-radius:4px; line-height:1.6; display:block;">❌ <b>TAKIM BULUNAMADI!</b><br>Seçilen oyuncuların 'Kapalı (Kırmızı X)' mevkileri veya yetersiz yan mevkileri yüzünden geçerli bir diziliş üretilemiyor. Lütfen veto edilen mevkileri azaltın veya <i>'Her Zaman Kadro Bul'</i> ayarını işaretleyin.</span>`;
              }
              return;
          }
          
          let html = `<h3>📊 EN DENGELİ KADROLAR (Toplam ${validSquads.length} İhtimal Bulundu)</h3>`;

          for(let index = 0; index < Math.min(5, validSquads.length); index++) {
            const data = validSquads[index];
            const diffs = data.squad.metrics.diffs;
            const trueStatsA = data.lineupA.stats;
            const trueStatsB = data.lineupB.stats;

            html += `
            <div class="sim-result-card">
                <div style="color: #f39c12; font-weight: bold; font-size: 1.1em; margin-bottom: 15px;">✨ SEÇENEK #${index + 1} <span style="font-size: 0.8em; color: var(--text-muted);"> (Denge Skoru: ${(data.rawPenalty || data.penalty || 0).toFixed(0)})</span></div>
                
                <div class="pitch-wrapper">
                    ${generateTacticalPitchHTML(data.lineupA, `A Takımı`, '#3498db', 'A')}
                    ${generateTacticalPitchHTML(data.lineupB, `B Takımı`, '#e74c3c', 'B')}
                </div>
                
                <div class="sim-table-chart-wrap">
                    <div class="sim-table-wrap">
                        <table class="sim-stat-table" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.95em;">
                            <thead>
                                <tr style="border-bottom: 2px solid var(--border-color);">
                                    <th style="color:#f39c12; text-align: left; padding: 8px;">Özellik</th>
                                    <th style="color:#3498db; padding: 8px;">A Takımı</th>
                                    <th style="color:#e74c3c; padding: 8px;">B Takımı</th>
                                    <th style="color:#f39c12; padding: 8px;">Fark (A-B)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${renderStatRow('Hava Topu', trueStatsA.hava, trueStatsB.hava, diffs.hava)}
                                ${renderStatRow('Pas D.', trueStatsA.pas, trueStatsB.pas, diffs.pas)}
                                ${renderStatRow('Savunma', trueStatsA.savunma, trueStatsB.savunma, diffs.savunma)}
                                ${renderStatRow('Şut', trueStatsA.sut, trueStatsB.sut, diffs.sut)}
                                ${renderStatRow('Dribling', trueStatsA.dribling, trueStatsB.dribling, diffs.dribling)}
                                ${renderStatRow('Fırsat Y.', trueStatsA.firsat, trueStatsB.firsat, diffs.firsat)}
                            </tbody>
                        </table>
                    </div>
                    <div class="sim-chart-wrap">
                        <canvas id="teamChart-${index}" style="width:100%; height:100%;"></canvas>
                    </div>
                </div>

                <details class="sim-log-details">
                    <summary style="font-weight: bold; color: #3498db; outline: none; list-style: none;">
                        <span style="display: flex; align-items: center; gap: 5px;">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>
                            Algoritma Karar Dökümünü Göster
                        </span>
                    </summary>
                    <div class="sim-log-content">
                        <div style="margin-bottom: 5px;"><b>[!] Taktiksel Boşluk (Grid) Cezası:</b> A Takımı (<span style="color:#e74c3c;">${(data.lineupA.gridPenalty || 0).toFixed(0)}</span>) | B Takımı (<span style="color:#e74c3c;">${(data.lineupB.gridPenalty || 0).toFixed(0)}</span>)</div>
                        <div style="margin-bottom: 10px;"><b>[!] Stat Dengesizliği Cezası:</b> <span style="color:#e74c3c;">${((data.rawPenalty || data.penalty || 0) - (data.lineupA.gridPenalty || 0) - (data.lineupB.gridPenalty || 0)).toFixed(0)}</span> Puan</div>
                        <div><b>[ℹ] Mevki Optimizasyonları (Fedakarlıklar):</b></div>
                        <ul style="margin: 5px 0 0 0; padding-left: 20px; list-style-type: square;">
                            ${generateOptimizationLog(data.lineupA, 'A Takımı')}
                            ${generateOptimizationLog(data.lineupB, 'B Takımı')}
                        </ul>
                    </div>
                </details>
            </div>`;
          }

          if (validSquads.length > 5) {
              html += `<div style="margin-top: 30px;"><h4 style="border-bottom: 2px solid var(--border-color); padding-bottom: 10px;">📋 DİĞER ALTERNATİF KADROLAR (${validSquads.length - 5} Adet)</h4><div style="display: flex; flex-direction: column; gap: 10px;">`;
              for (let i = 5; i < validSquads.length; i++) {
                  const data = validSquads[i];
                  
                  const formatPlayer = p => `<span style="white-space:nowrap;">${p.player.shortName || p.player.firstName} <b style="color:${window.getStatColor(p.pOvr)}">(${p.slot})</b></span>`;
                  const aNames = data.lineupA.lineup.map(formatPlayer).join(', ');
                  const bNames = data.lineupB.lineup.map(formatPlayer).join(', ');
                  
                  html += `
                  <div class="sim-result-card" style="padding: 12px; margin-bottom:0;">
                      <div class="sim-alt-card">
                          <div style="min-width: 40px; font-weight: bold; color: #f1c40f; font-size: 1.1em;">#${i + 1}</div>
                          <div style="flex: 1; line-height: 1.6;">
                              <div style="margin-bottom: 6px;"><b style="color: #3498db;">A Takımı (${data.lineupA.formationName}):</b> <span style="font-size:0.95em;">${aNames}</span></div>
                              <div><b style="color: #e74c3c;">B Takımı (${data.lineupB.formationName}):</b> <span style="font-size:0.95em;">${bNames}</span></div>
                              <div style="font-size:0.85em; color:var(--text-muted); margin-top: 4px;">Denge Skoru: ${(data.rawPenalty || data.penalty || 0).toFixed(0)}</div>
                          </div>
                      </div>
                  </div>`;
              }
              html += `</div></div>`;
          }

          output.innerHTML = html;

          for(let index = 0; index < Math.min(5, validSquads.length); index++) {
              const data = validSquads[index];
              const trueStatsA = data.lineupA.stats;
              const trueStatsB = data.lineupB.stats;
              
              new Chart(document.getElementById(`teamChart-${index}`).getContext('2d'), { 
                  type: 'radar', 
                  data: { 
                      labels: ['Hava', 'Pas D.', 'Sav', 'Şut', 'Dribling', 'Fırsat Y.'], 
                      datasets: [
                          { label: 'A Takımı', data: [trueStatsA.hava, trueStatsA.pas, trueStatsA.savunma, trueStatsA.sut, trueStatsA.dribling, trueStatsA.firsat], backgroundColor: 'rgba(52, 152, 219, 0.25)', borderColor: '#3498db', borderWidth: 2, pointBackgroundColor: '#3498db', pointRadius: 2 }, 
                          { label: 'B Takımı', data: [trueStatsB.hava, trueStatsB.pas, trueStatsB.savunma, trueStatsB.sut, trueStatsB.dribling, trueStatsB.firsat], backgroundColor: 'rgba(231, 76, 60, 0.25)', borderColor: '#e74c3c', borderWidth: 2, pointBackgroundColor: '#e74c3c', pointRadius: 2 }
                      ] 
                  }, 
                  options: { 
                      layout: { padding: 25 }, 
                      maintainAspectRatio: false, 
                      scales: { 
                          r: { 
                              min: 0, 
                              ticks: { display: false }, 
                              grid: { color: 'rgba(127, 140, 141, 0.2)' }, 
                              angleLines: { color: 'rgba(127, 140, 141, 0.2)' }, 
                              pointLabels: { color: '#7f8c8d', font: { size: 12, weight: 'bold' } } 
                          } 
                      }, 
                      plugins: { legend: { display: false } } 
                  } 
              });
          }
          
        } catch (err) { output.innerHTML = `<span style="background:#c0392b; color:white; padding:10px; border-radius:4px; display:block;">❌ HATA: ${err.message}</span>`; }
    }, 50);
}

function renderRadarChart(playerId) {
    if (chartInstances[playerId]) return; 
    const player = currentPlayers.find(p => p.id === playerId); if(!player) return;
    const canvas = document.getElementById(`chart-${playerId}`); if(!canvas) return;
    const sutValue = player.stats.sut !== undefined ? player.stats.sut : (player.stats.şut || 0);
    const firsatValue = player.stats.firsat !== undefined ? player.stats.firsat : (player.stats.fırsat || 0);
    const labels = player.mainPos === 'GK' ? ['Pas D.', 'Savunma', 'Şut K.', 'Dribling', 'Fırsat Y.', 'Hava'] : ['Pas D.', 'Savunma', 'Şut', 'Dribling', 'Fırsat Y.', 'Hava'];
    const data = player.mainPos === 'GK' ? [player.stats.pas, player.stats.savunma, player.stats.sutKarsilama, player.stats.dribling, firsatValue, player.stats.hava] : [player.stats.pas, player.stats.savunma, sutValue, player.stats.dribling, firsatValue, player.stats.hava];
    
    chartInstances[playerId] = new Chart(canvas.getContext('2d'), { 
        type: 'radar', 
        data: { labels: labels, datasets: [{ label: 'Profil', data: data, backgroundColor: 'rgba(0, 210, 211, 0.25)', borderColor: '#00d2d3', pointBackgroundColor: '#1dd1a1', borderWidth: 2 }] }, 
        options: { 
            layout: { padding: 25 }, 
            maintainAspectRatio: false, 
            scales: { 
                r: { 
                    min: 0, max: 100, 
                    ticks: { display: false, stepSize: 20 }, 
                    grid: { color: 'rgba(127, 140, 141, 0.2)' }, 
                    angleLines: { color: 'rgba(127, 140, 141, 0.2)' }, 
                    pointLabels: { color: '#7f8c8d', font: { size: 12, weight: 'bold' }, padding: 10 } 
                } 
            }, 
            plugins: { legend: { display: false } } 
        } 
    });
}

function editPlayer(id) {
    const player = currentPlayers.find(p => p.id === id); if (!player) return;
    
    const clonedSecPositions = JSON.parse(JSON.stringify(player.secondaryPositions || []));
    
    editingPlayerId = id;
    const safeSet = (elemId, val) => { const el = document.getElementById(elemId); if (el) el.value = val; };
    safeSet('pName', player.firstName || player.name.split(' ')[0]);
    safeSet('pLastName', player.lastName || player.name.split(' ').slice(1).join(' ').replace(' 🧪', ''));
    const pShortNameEl = document.getElementById('pShortName'); if (pShortNameEl) { pShortNameEl.value = player.shortName || ""; }
    safeSet('pMainPos', getBasePosition(player.mainPos)); 
    safeSet('pCond', player.condition); safeSet('sPas', player.stats.pas || 0); safeSet('sSavunma', player.stats.savunma || 0); safeSet('sSut', player.stats.sut !== undefined ? player.stats.sut : (player.stats.şut || 0)); safeSet('sDribling', player.stats.dribling || 0); safeSet('sFirsat', player.stats.firsat !== undefined ? player.stats.firsat : (player.stats.fırsat || 0)); safeSet('sHava', player.stats.hava || 0); safeSet('sSutKar', player.stats.sutKarsilama || 0);
    renderPositionMap(); 
    
    const mainRoleSelect = document.querySelector('.pos-btn-group.main-pos .role-select');
    if (mainRoleSelect && player.role) {
        mainRoleSelect.value = player.role;
        mainRoleSelect.parentElement.dataset.manual = 'true';
    }

    if (clonedSecPositions) {
      clonedSecPositions.forEach(sec => {
        const btnGroup = document.querySelector(`.pos-btn-group[data-pos="${getBasePosition(sec.pos)}"]`);
        if (btnGroup) { 
            btnGroup.classList.add('active-sec');
            const capInput = btnGroup.querySelector('.cap-input'); if (capInput) capInput.value = sec.capacity; 
            const sel = btnGroup.querySelector('.role-select'); if (sel) { sel.style.display = 'block'; sel.value = sec.role; btnGroup.dataset.manual = 'true'; }
            const secControls = btnGroup.querySelector('.sec-controls'); if (secControls) secControls.style.display = 'flex';
        }
      });
    }

    updateLiveRoles(); 
    updateCondPreview(); 
    const btn = document.getElementById('btnAddPlayer'); 
    if (btn) { btn.innerText = "Düzenlemeyi Kaydet ✓"; btn.className = "btn btn-green"; }
    const details = document.getElementById(`details-${id}`); if(details) details.open = false; window.scrollTo({ top: 0, behavior: 'smooth' });
}