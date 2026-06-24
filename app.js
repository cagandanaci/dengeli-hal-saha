import { getTop5Squads, calculateTeamStats, calculateBalanceMetrics, getBestRoleForStats } from './algorithm.js';
import { getPerfectLineups } from './formationMatcher.js';
import { ROLE_WEIGHTS } from './constants.js';

let currentPlayers = [];
let editingPlayerId = null;
let chartInstances = {};

const ALL_POSITIONS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "DM", "CM", "AM", "LM", "RM", "LW", "RW", "FW"];

document.addEventListener('DOMContentLoaded', () => {
    // SADECE ETKİLEŞİMLERİ (EVENT LISTENER) BAĞLIYORUZ (HTML ZATEN TASARLANDI)
    document.getElementById('btnRandomSelect')?.addEventListener('click', selectRandomPlayers);
    document.getElementById('btnLoadDummies')?.addEventListener('click', loadDummies);
    document.getElementById('btnRemoveDummies')?.addEventListener('click', (e) => {
        e.preventDefault();
        currentPlayers = currentPlayers.filter(p => !p.isTest);
        updatePlayerList();
    });
    
    document.getElementById('btnSaveNew')?.addEventListener('click', saveNewDatabase);
    document.getElementById('btnLoadDB')?.addEventListener('click', loadDatabase);
    document.getElementById('btnUpdateDB')?.addEventListener('click', updateDatabase);
    document.getElementById('btnDeleteDB')?.addEventListener('click', deleteDatabase);
    document.getElementById('btnExportJSON')?.addEventListener('click', exportDatabases);
    document.getElementById('btnImportJSON')?.addEventListener('click', importDatabases);
    
    ['sPas', 'sSavunma', 'sSut', 'sDribling', 'sFirsat', 'sHava', 'sSutKar'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', updateLiveRoles);
    });
    
    document.getElementById('btnAddPlayer')?.addEventListener('click', handleAddPlayer);
    document.getElementById('btnRunSim')?.addEventListener('click', runSimulation);
    document.getElementById('pMainPos')?.addEventListener('change', renderPositionMap);
    document.getElementById('matchFormat')?.addEventListener('change', updatePlayerList);

    refreshDatabaseSelect();
    renderPositionMap();
});

function getPitchName(player, allPlayers) {
    if (player.shortName && player.shortName.trim() !== '') return player.shortName.trim();
    
    const fName = player.firstName || player.name.split(' ')[0];
    const lName = player.lastName || player.name.split(' ').slice(1).join(' ');
    
    const duplicates = allPlayers.filter(p => (p.firstName || p.name.split(' ')[0]).toLowerCase() === fName.toLowerCase());
    if (duplicates.length > 1 && lName && lName.trim() !== '') return `${fName} ${lName.trim().charAt(0)}.`;
    return fName;
}

function getConditionIcon(cond) {
    let topColor, bottomColor, offset;
    switch(cond) {
        case "Tam": case "Peak": topColor = "#0cf25d"; bottomColor = "#0cf25d"; offset = "0%"; break;
        case "İyi": case "Good": topColor = "#42523d"; bottomColor = "#aacc38"; offset = "20%"; break;
        case "Vasat": case "Eksik": case "Fair": topColor = "#3a3521"; bottomColor = "#eebc1f"; offset = "50%"; break;
        case "Kötü": case "Poor": topColor = "#53372c"; bottomColor = "#d26d36"; offset = "80%"; break;
        default: topColor = "#7f8c8d"; bottomColor = "#7f8c8d"; offset = "0%";
    }
    const uniqueId = "grad-" + Math.random().toString(36).substr(2, 9);
    return `
    <svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align: text-bottom; margin-left: 4px; filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.5));">
        <defs><linearGradient id="${uniqueId}" x1="0" y1="0" x2="0" y2="1"><stop offset="${offset}" stop-color="${topColor}" /><stop offset="${offset}" stop-color="${bottomColor}" /></linearGradient></defs>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="url(#${uniqueId})"/>
        <path d="M 6 11.5 L 8.5 11.5 L 10 14 L 11.5 8 L 13.5 15 L 15 9.5 L 16.5 11.5 L 18 11.5" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
}

function generateMiniPitchHTML(mainPos, secPositions, width = "140px") {
    const slotCoords = { "LFW": {x: 25, y: 12}, "FW": {x: 50, y: 12}, "RFW": {x: 75, y: 12}, "LW": {x: 15, y: 26}, "LAM": {x: 35, y: 26}, "AM": {x: 50, y: 26}, "RAM": {x: 65, y: 26}, "RW": {x: 85, y: 26}, "LM": {x: 15, y: 41}, "LCM": {x: 35, y: 41}, "CM": {x: 50, y: 41}, "RCM": {x: 65, y: 41}, "RM": {x: 85, y: 41}, "LWB": {x: 15, y: 56}, "LDM": {x: 35, y: 56}, "DM": {x: 50, y: 56}, "RDM": {x: 65, y: 56}, "RWB": {x: 85, y: 56}, "LB": {x: 15, y: 71}, "LCB": {x: 35, y: 71}, "CB": {x: 50, y: 71}, "RCB": {x: 65, y: 71}, "RB": {x: 85, y: 71}, "GK": {x: 50, y: 87} };
    let nodesHTML = '';
    if (mainPos && slotCoords[mainPos]) {
        nodesHTML += `<div style="position: absolute; left: ${slotCoords[mainPos].x}%; top: ${slotCoords[mainPos].y}%; transform: translate(-50%, -50%); width: 22px; height: 22px; border-radius: 50%; background-color: #00d2d3; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.6); z-index: 5; display: flex; align-items: center; justify-content: center; font-size: 0.55em; font-weight: bold; color: black;">${mainPos}</div>`;
    }
    secPositions.forEach(sp => {
        if (sp.pos !== mainPos && slotCoords[sp.pos]) {
            let circleColor = sp.capacity === 100 ? '#00d2d3' : `hsl(${Math.floor((sp.capacity / 100) * 120)}, 80%, 45%)`;
            nodesHTML += `<div style="position: absolute; left: ${slotCoords[sp.pos].x}%; top: ${slotCoords[sp.pos].y}%; transform: translate(-50%, -50%); width: 20px; height: 20px; border-radius: 50%; background-color: ${circleColor}; border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.6); z-index: 4; display: flex; align-items: center; justify-content: center; font-size: 0.45em; font-weight: bold; color: black;">${sp.pos}</div>`;
        }
    });
    return `
        <div style="position: relative; width: ${width}; aspect-ratio: 1/1.6; background: #1e7e34; border: 2px solid rgba(255,255,255,0.7); border-radius: 4px; overflow: hidden; box-shadow: inset 0 0 10px rgba(0,0,0,0.3);">
            <div style="position: absolute; top: 0; left: 20%; width: 60%; height: 16%; border: 1px solid rgba(255,255,255,0.4); border-top: none;"></div>
            <div style="position: absolute; bottom: 0; left: 20%; width: 60%; height: 16%; border: 1px solid rgba(255,255,255,0.4); border-bottom: none;"></div>
            <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: rgba(255,255,255,0.4); transform: translateY(-50%);"></div>
            <div style="position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; transform: translate(-50%, -50%);"></div>
            ${nodesHTML}
        </div>`;
}

// --- JSON İTHALAT / İHRACAT FONKSİYONLARI ---
function exportDatabases(e) {
    if(e) e.preventDefault();
    const dbs = localStorage.getItem('football_databases');
    if(!dbs || dbs === '{}') return alert("Dışa aktarılacak kayıtlı bir veritabanı bulunamadı!");
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([dbs], { type: 'application/json' }));
    a.download = 'saha_oyuncu_veritabanlari.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function importDatabases(e) {
    if(e) e.preventDefault();
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
    input.onchange = ev => {
        const reader = new FileReader();
        reader.onload = readerEvent => {
            try { JSON.parse(readerEvent.target.result); localStorage.setItem('football_databases', readerEvent.target.result); refreshDatabaseSelect(); alert("Başarılı! Dosyadaki oyuncu havuzları yüklendi."); } 
            catch { alert("Hata: Geçersiz JSON dosyası!"); }
        }; reader.readAsText(ev.target.files[0]);
    }; input.click();
}

function getDatabases() { return JSON.parse(localStorage.getItem('football_databases')) || {}; }
function setDatabases(dbs) { localStorage.setItem('football_databases', JSON.stringify(dbs)); refreshDatabaseSelect(); }

function refreshDatabaseSelect() {
    const dbs = getDatabases(); const select = document.getElementById('dbSelect'); if(!select) return;
    select.innerHTML = Object.keys(dbs).length === 0 ? '<option value="">-- Kayıtlı Veritabanı Yok --</option>' : Object.keys(dbs).map(k => `<option value="${k}">${k} (${dbs[k].length} Oyuncu)</option>`).join('');
}

function saveNewDatabase(e) {
    if (e) e.preventDefault(); if (!currentPlayers.length) return alert("Kaydedilecek oyuncu yok!");
    const dbName = prompt("Bu oyuncu havuzu için bir veritabanı ismi girin:"); if (!dbName) return;
    const dbs = getDatabases(); dbs[dbName] = currentPlayers; setDatabases(dbs); document.getElementById('dbSelect').value = dbName;
}

function loadDatabase(e) {
    if (e) e.preventDefault(); const dbName = document.getElementById('dbSelect')?.value; if (!dbName) return;
    const dbs = getDatabases();
    if(dbs[dbName]) {
        currentPlayers = [...currentPlayers, ...dbs[dbName].map((p, i) => {
            let n = {...p, id: Date.now() + i + Math.random()};
            if (!n.firstName) { const parts = n.name.trim().split(' '); n.firstName = parts[0]; n.lastName = parts.slice(1).join(' '); }
            return n;
        })]; chartInstances = {}; updatePlayerList(); renderPositionMap(); alert(`"${dbName}" eklendi.`);
    }
}

function updateDatabase(e) {
    if (e) e.preventDefault(); const dbName = document.getElementById('dbSelect')?.value; if (!dbName) return;
    const dbs = getDatabases(); dbs[dbName] = currentPlayers; setDatabases(dbs); alert(`Güncellendi.`);
}

function deleteDatabase(e) {
    if (e) e.preventDefault(); const dbName = document.getElementById('dbSelect')?.value; if (!dbName) return;
    if (confirm(`Silmek istediğinize emin misiniz?`)) { const dbs = getDatabases(); delete dbs[dbName]; setDatabases(dbs); }
}

function selectRandomPlayers(e) {
    if (e) e.preventDefault();
    const format = Number(document.getElementById('matchFormat')?.value || 7); const required = format * 2;
    if (currentPlayers.length < required) return alert(`Havuzda yeterli oyuncu yok! En az ${required} gerekli.`);
    currentPlayers.forEach(p => p.selected = false);
    const gks = currentPlayers.filter(p => p.mainPos === 'GK').sort(() => Math.random() - 0.5);
    const fields = currentPlayers.filter(p => p.mainPos !== 'GK').sort(() => Math.random() - 0.5);
    let count = 0;
    if (gks.length >= 2) { gks[0].selected = true; gks[1].selected = true; count += 2; } else { gks.forEach(gk => { gk.selected = true; count++; }); }
    for(let i=0; i<fields.length && count < required; i++) { fields[i].selected = true; count++; }
    updatePlayerList();
}

function calculatePlayerBaseScore(player) {
    if (!player || !player.stats) return 0;
    const weights = ROLE_WEIGHTS[player.mainPos]?.[player.role];
    const getStat = s => player.stats[s] ?? (s==='sut'?player.stats.şut : s==='firsat'?player.stats.fırsat : 0);
    if (weights) {
        let ts = 0, tw = 0;
        for (const [s, w] of Object.entries(weights)) { if (w > 0) { ts += getStat(s)*w; tw += w; } }
        if (tw > 0) return Math.round(ts/tw);
    }
    return Math.round(((player.stats.pas||0)+(player.stats.savunma||0)+(player.stats.dribling||0)+(player.stats.hava||0)+getStat('firsat')+(player.mainPos==='GK'?player.stats.sutKarsilama||0:getStat('sut')))/6);
}

// Tamamen 20 Gerçekçi İsimli Rastgele Test Verisi
function generateFallbackDummies() {
    const c = ["Tam", "İyi", "Vasat", "Kötü"];
    const d = [
        { f: "Ali", l: "Yılmaz", pos: "GK", s: { pas: 60, savunma: 50, sut: 40, dribling: 40, firsat: 40, hava: 60, sutKarsilama: 90 } },
        { f: "Burak", l: "Kaya", pos: "GK", s: { pas: 50, savunma: 60, sut: 30, dribling: 30, firsat: 30, hava: 80, sutKarsilama: 85 } },
        { f: "Can", l: "Demir", pos: "CB", s: { pas: 30, savunma: 90, sut: 20, dribling: 30, firsat: 20, hava: 90, sutKarsilama: 0 } },
        { f: "Deniz", l: "Şahin", pos: "CB", s: { pas: 40, savunma: 85, sut: 30, dribling: 40, firsat: 30, hava: 85, sutKarsilama: 0 } },
        { f: "Emre", l: "Çelik", pos: "CB", s: { pas: 35, savunma: 88, sut: 25, dribling: 35, firsat: 25, hava: 88, sutKarsilama: 0 } },
        { f: "Furkan", l: "Yıldız", pos: "CB", s: { pas: 45, savunma: 82, sut: 35, dribling: 45, firsat: 35, hava: 82, sutKarsilama: 0 } },
        { f: "Gökhan", l: "Özdemir", pos: "LB", sec: [{pos:"LWB", cap:90}], s: { pas: 70, savunma: 75, sut: 50, dribling: 75, firsat: 60, hava: 65 } },
        { f: "Hasan", l: "Öztürk", pos: "LB", s: { pas: 65, savunma: 80, sut: 40, dribling: 65, firsat: 50, hava: 70 } },
        { f: "İbrahim", l: "Aydın", pos: "RB", sec: [{pos:"RWB", cap:90}], s: { pas: 72, savunma: 72, sut: 55, dribling: 78, firsat: 65, hava: 60 } },
        { f: "Kaan", l: "Arslan", pos: "RB", s: { pas: 68, savunma: 78, sut: 45, dribling: 68, firsat: 55, hava: 68 } },
        { f: "Levent", l: "Polat", pos: "DM", sec: [{pos:"CM", cap:85}], s: { pas: 80, savunma: 85, sut: 60, dribling: 70, firsat: 65, hava: 75 } },
        { f: "Murat", l: "Doğan", pos: "DM", sec: [{pos:"CB", cap:80}], s: { pas: 75, savunma: 88, sut: 50, dribling: 65, firsat: 55, hava: 80 } },
        { f: "Ozan", l: "Kılıç", pos: "CM", sec: [{pos:"AM", cap:85}], s: { pas: 88, savunma: 65, sut: 75, dribling: 82, firsat: 80, hava: 60 } },
        { f: "Ali", l: "Çetin", pos: "CM", sec: [{pos:"DM", cap:80}], s: { pas: 85, savunma: 75, sut: 70, dribling: 75, firsat: 70, hava: 65 } }, // Çakışma testi için "Ali"
        { f: "Rıza", l: "Koç", pos: "LW", sec: [{pos:"LM", cap:90}], s: { pas: 75, savunma: 40, sut: 82, dribling: 90, firsat: 85, hava: 55 } },
        { f: "Sinan", l: "Kara", pos: "LW", sec: [{pos:"FW", cap:80}], s: { pas: 70, savunma: 35, sut: 85, dribling: 88, firsat: 88, hava: 60 } },
        { f: "Tarkan", l: "Bulut", pos: "RW", sec: [{pos:"RM", cap:90}], s: { pas: 78, savunma: 42, sut: 80, dribling: 85, firsat: 82, hava: 50 } },
        { f: "Umut", l: "Kurt", pos: "RW", sec: [{pos:"FW", cap:85}], s: { pas: 72, savunma: 38, sut: 88, dribling: 86, firsat: 85, hava: 62 } },
        { f: "Volkan", l: "Özkan", pos: "FW", s: { pas: 65, savunma: 30, sut: 92, dribling: 80, firsat: 88, hava: 85 } },
        { f: "Yasin", l: "Şimşek", pos: "FW", sec: [{pos:"LW", cap:75}, {pos:"RW", cap:75}], s: { pas: 70, savunma: 35, sut: 89, dribling: 88, firsat: 86, hava: 75 } }
    ];
    return d.map((p, i) => ({
        id: Date.now() + i, firstName: p.f, lastName: p.l, name: `${p.f} ${p.l}`, shortName: "", mainPos: p.pos, condition: c[Math.floor(Math.random() * c.length)],
        stats: { pas: p.s.pas, savunma: p.s.savunma, sut: p.s.sut, şut: p.s.sut, dribling: p.s.dribling, firsat: p.s.firsat, fırsat: p.s.firsat, hava: p.s.hava, sutKarsilama: p.s.sutKarsilama||0 },
        isTest: true, secondaryPositions: (p.sec||[]).map(s => ({ pos: s.pos, capacity: s.cap, role: "" }))
    }));
}

function loadDummies(e) {
    if(e) e.preventDefault();
    currentPlayers = [...currentPlayers, ...generateFallbackDummies().map(p => { p.role = getBestRoleForStats(p.mainPos, p.stats); p.secondaryPositions.forEach(sp => sp.role = getBestRoleForStats(sp.pos, p.stats)); return p; })];
    updatePlayerList(); selectRandomPlayers();
}

function updatePlayerList() {
    const listEl = document.getElementById('playerListEl'); if (!listEl) return;
    chartInstances = {};
    const format = Number(document.getElementById('matchFormat')?.value || 7);
    const req = format * 2; const sel = currentPlayers.filter(p => p.selected).length;
    const statusEl = document.getElementById('selectionStatus');
    if (statusEl) { statusEl.innerText = `Seçilen: ${sel} / ${req}`; statusEl.style.color = sel === req ? "#a8e63d" : "#e74c3c"; }

    let html = "";
    [{ t: "🧤 KALECİLER", p: ["GK"] }, { t: "🛡️ SAVUNMALAR", p: ["CB", "LB", "RB", "LWB", "RWB"] }, { t: "⚙️ ORTA SAHALAR", p: ["DM", "CM", "AM", "LM", "RM"] }, { t: "⚔️ HÜCUMCULAR", p: ["LW", "RW", "FW"] }].forEach(cat => {
        const pList = currentPlayers.filter(p => cat.p.includes(p.mainPos));
        if (pList.length > 0) {
            html += `<div style="background: #1a6b2e; color: white; padding: 5px 10px; margin-top: 15px; margin-bottom: 5px; border-radius: 4px; font-weight: bold;">${cat.t} (${pList.length})</div>`;
            html += pList.map(p => {
                const secStr = p.secondaryPositions?.map(sp => `<span style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; display: inline-block; margin-right: 5px; margin-bottom: 5px;">${sp.pos} (%${sp.capacity}) <span style="color:#f39c12; font-size:0.9em; margin-left:3px;">[${sp.role}]</span></span>`).join('') || 'Yok';
                const nameColor = p.isTest ? '#27ae60' : '#333'; // Test oyuncusu ise açık temada yeşil
                const displayNameHtml = p.shortName?.trim() ? ` <span style="color:#7f8c8d; font-size:0.85em;">(${p.shortName.trim()})</span>` : '';
                return `
                <details class="player-item" id="details-${p.id}">
                  <summary class="player-summary">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <input type="checkbox" class="player-select-cb" data-id="${p.id}" ${p.selected ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer;">
                      <span style="${p.selected ? '' : 'text-decoration:line-through; opacity:0.5;'}">
                        <b style="color:${nameColor};">${p.name}</b>${displayNameHtml} <span style="background:#f39c12; color:white; padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:4px;">${calculatePlayerBaseScore(p)} OVR</span> | ${p.mainPos} <span style="color:#1a6b2e;">(${p.role})</span> | ${p.condition} ${getConditionIcon(p.condition)}
                      </span>
                    </div>
                  </summary>
                  <div class="player-details-content" style="background:#2c3e50; padding:15px; border-radius:4px; display:flex; gap:20px; margin-top:5px; flex-wrap:wrap;">
                    <div class="stats-text" style="flex:1; min-width:220px; color:#ecf0f1;">
                      <b>Yan Mevkiler:</b><br>${secStr}<br><br>
                      Pas: ${p.stats.pas||0} | Savunma: ${p.stats.savunma||0} | Dribling: ${p.stats.dribling||0} <br>
                      Fırsat: ${p.stats.firsat ?? (p.stats.fırsat||0)} | Hava: ${p.stats.hava||0} | ${p.mainPos==='GK'?`ŞutK: ${p.stats.sutKarsilama||0}`:`Şut: ${p.stats.sut ?? (p.stats.şut||0)}`}
                      <div class="player-actions" style="margin-top:15px;">
                        <button type="button" class="btn-edit" data-id="${p.id}" style="background:#f39c12; padding:5px 12px; width:auto;">Düzenle</button>
                        <button type="button" class="btn-delete" data-id="${p.id}" style="background:#e74c3c; padding:5px 12px; width:auto;">Sil</button>
                      </div>
                    </div>
                    <div class="visuals-wrapper" style="display:flex; flex-direction:column; align-items:center; gap:15px; background:rgba(0,0,0,0.15); padding:15px; border-radius:8px; flex:1; min-width:250px;">
                        <span style="font-size:0.75em; color:#bdc3c7; font-weight:bold;">📍 Mevki Haritası</span>
                        ${generateMiniPitchHTML(p.mainPos, p.secondaryPositions||[], "140px")}
                        <div style="width:80%; height:1px; background:rgba(255,255,255,0.1);"></div>
                        <span style="font-size:0.75em; color:#bdc3c7; font-weight:bold;">📊 Özellik Radarı</span>
                        <div style="position:relative; width:220px; height:220px;"><canvas id="chart-${p.id}"></canvas></div>
                    </div>
                  </div>
                </details>`;
            }).join('');
        }
    });
    listEl.innerHTML = html;
    
    document.querySelectorAll('.player-select-cb').forEach(cb => { cb.addEventListener('change', e => { const p = currentPlayers.find(x => x.id === Number(e.target.dataset.id)); if (p) p.selected = e.target.checked; updatePlayerList(); }); });
    document.querySelectorAll('.btn-delete').forEach(btn => { btn.addEventListener('click', e => { currentPlayers = currentPlayers.filter(p => p.id !== Number(e.target.dataset.id)); updatePlayerList(); }); });
    document.querySelectorAll('.btn-edit').forEach(btn => { btn.addEventListener('click', e => editPlayer(Number(e.target.dataset.id))); });
    document.querySelectorAll('.player-item').forEach(det => { det.addEventListener('toggle', () => { if (det.open) renderRadarChart(Number(det.id.split('-')[1])); }); });
}

function handleAddPlayer(e) {
    if(e) e.preventDefault();
    const statsObj = { 
        pas: Number(document.getElementById('sPas')?.value) || 0, savunma: Number(document.getElementById('sSavunma')?.value) || 0, 
        sut: Number(document.getElementById('sSut')?.value) || 0, şut: Number(document.getElementById('sSut')?.value) || 0,
        dribling: Number(document.getElementById('sDribling')?.value) || 0, firsat: Number(document.getElementById('sFirsat')?.value) || 0, fırsat: Number(document.getElementById('sFirsat')?.value) || 0, 
        hava: Number(document.getElementById('sHava')?.value) || 0, sutKarsilama: Number(document.getElementById('sSutKar')?.value) || 0 
    };

    const mainPos = document.getElementById('pMainPos')?.value || "CB";
    const fNameVal = document.getElementById('pName')?.value.trim() || "İsimsiz";
    const lNameVal = document.getElementById('pLastName')?.value.trim() || "";
    const shortNameVal = document.getElementById('pShortName')?.value.trim() || "";
    
    const mainGroup = document.querySelector(`.pos-btn-group.main-pos`);
    const mainRole = mainGroup && mainGroup.querySelector('.role-select') ? mainGroup.querySelector('.role-select').value : getBestRoleForStats(mainPos, statsObj);

    const playerData = {
        firstName: fNameVal, lastName: lNameVal, name: lNameVal ? `${fNameVal} ${lNameVal}` : fNameVal,
        shortName: shortNameVal, mainPos: mainPos, role: mainRole, condition: document.getElementById('pCond')?.value || "Tam", stats: statsObj, selected: true, secondaryPositions: []
    };

    document.querySelectorAll('.pos-btn-group.active-sec').forEach(btn => {
        playerData.secondaryPositions.push({
            pos: btn.dataset.pos, role: btn.querySelector('.role-select') ? btn.querySelector('.role-select').value : "Standart",
            capacity: Math.max(25, Number(btn.querySelector('.cap-input')?.value || 80))
        });
    });

    if (editingPlayerId) {
        const index = currentPlayers.findIndex(p => p.id === editingPlayerId);
        if (index !== -1) currentPlayers[index] = { ...currentPlayers[index], ...playerData };
        editingPlayerId = null;
        const btn = document.getElementById('btnAddPlayer'); if(btn) { btn.innerText = "Oyuncuyu Havuza Ekle"; btn.style.backgroundColor = "#1a6b2e"; }
    } else { playerData.id = Date.now(); currentPlayers.push(playerData); }

    ['pName', 'pLastName', 'pShortName'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).value = ""; });
    renderPositionMap(); updatePlayerList();
}

function updateLiveRoles() {
    const statsObj = { 
        pas: Number(document.getElementById('sPas')?.value) || 0, savunma: Number(document.getElementById('sSavunma')?.value) || 0, 
        sut: Number(document.getElementById('sSut')?.value) || 0, dribling: Number(document.getElementById('sDribling')?.value) || 0, 
        firsat: Number(document.getElementById('sFirsat')?.value) || 0, hava: Number(document.getElementById('sHava')?.value) || 0, sutKarsilama: Number(document.getElementById('sSutKar')?.value) || 0 
    };
    const mainPos = document.getElementById('pMainPos')?.value || 'CB';
    const secPositions = [];

    document.querySelectorAll('.pos-btn-group').forEach(group => {
        const pos = group.dataset.pos; const roleSelect = group.querySelector('.role-select');
        if (roleSelect && ROLE_WEIGHTS && ROLE_WEIGHTS[pos]) {
            const bestRole = getBestRoleForStats(pos, statsObj);
            Array.from(roleSelect.options).forEach(opt => { opt.text = opt.value === bestRole ? `⭐ ${opt.value}` : opt.value; });
            if (pos === mainPos) {
                group.classList.add('main-pos'); group.classList.remove('active-sec'); 
                if (group.dataset.manual !== 'true') roleSelect.value = bestRole;
            } else if (group.classList.contains('active-sec')) {
                group.classList.remove('main-pos');
                if (group.dataset.manual !== 'true') roleSelect.value = bestRole;
                secPositions.push({pos, capacity: Number(group.querySelector('.cap-input').value) || 80});
            } else { group.classList.remove('main-pos', 'active-sec'); }
        }
    });

    const livePitchContainer = document.getElementById('livePitchContainer');
    if (livePitchContainer) livePitchContainer.innerHTML = generateMiniPitchHTML(mainPos, secPositions, "160px");
}

function renderPositionMap() {
    const mapEl = document.getElementById('secPosMap');
    const mainPos = document.getElementById('pMainPos')?.value || 'CB';
    if(!mapEl) return;
    
    mapEl.innerHTML = '';
    ALL_POSITIONS.forEach(pos => {
      const groupDiv = document.createElement('div');
      groupDiv.className = `pos-btn-group ${pos === mainPos ? 'main-pos' : ''}`;
      groupDiv.dataset.pos = pos;
      
      groupDiv.innerHTML = `
        <span>${pos}</span>
        <input type="number" class="cap-input" min="25" max="100" step="5" value="80">
        <select class="role-select"></select>
      `;
      
      const roleSelect = groupDiv.querySelector('.role-select');
      if (ROLE_WEIGHTS && ROLE_WEIGHTS[pos]) { Object.keys(ROLE_WEIGHTS[pos]).forEach(r => { const opt = document.createElement('option'); opt.value = r; opt.text = r; roleSelect.appendChild(opt); }); }
      
      groupDiv.querySelector('.cap-input').addEventListener('click', e => e.stopPropagation()); 
      groupDiv.querySelector('.cap-input').addEventListener('input', () => updateLiveRoles()); 
      roleSelect.addEventListener('click', e => e.stopPropagation());
      roleSelect.addEventListener('change', () => { groupDiv.dataset.manual = 'true'; });
  
      if (pos !== mainPos) {
        groupDiv.addEventListener('click', () => { groupDiv.classList.toggle('active-sec'); updateLiveRoles(); });
      }
      mapEl.appendChild(groupDiv);
    });
    updateLiveRoles(); 
}

function generateTacticalPitchHTML(lineup, title, bgColor) {
    if (!lineup) return '';
    const slotCoords = { "LFW": {x: 25, y: 12}, "FW": {x: 50, y: 12}, "RFW": {x: 75, y: 12}, "LW": {x: 15, y: 26}, "LAM": {x: 35, y: 26}, "AM": {x: 50, y: 26}, "RAM": {x: 65, y: 26}, "RW": {x: 85, y: 26}, "LM": {x: 15, y: 41}, "LCM": {x: 35, y: 41}, "CM": {x: 50, y: 41}, "RCM": {x: 65, y: 41}, "RM": {x: 85, y: 41}, "LWB": {x: 15, y: 56}, "LDM": {x: 35, y: 56}, "DM": {x: 50, y: 56}, "RDM": {x: 65, y: 56}, "RWB": {x: 85, y: 56}, "LB": {x: 15, y: 71}, "LCB": {x: 35, y: 71}, "CB": {x: 50, y: 71}, "RCB": {x: 65, y: 71}, "RB": {x: 85, y: 71}, "GK": {x: 50, y: 87} };
    let playersHTML = '';
    lineup.lineup.forEach(item => {
        if (!item.player) return;
        const posData = slotCoords[item.slot] || {x: 50, y: 50};
        let circleColor = '#7f8c8d'; let warningIcon = '';
        if (item.outOfPos) { circleColor = '#e74c3c'; warningIcon = `<div style="position:absolute; top:-8px; right:-8px; font-size:16px; text-shadow: 1px 1px 2px #000; z-index: 10;">⚠️</div>`; } 
        else if (item.isMain || (item.isSec && item.player.currentCapacity === 100)) { circleColor = '#00d2d3'; } 
        else if (item.isSec) { circleColor = `hsl(${Math.floor(((item.player.currentCapacity || 50) / 100) * 120)}, 80%, 45%)`; }

        const nameColor = item.player.isTest ? '#2ecc71' : 'white';
        playersHTML += `
            <div style="position: absolute; left: ${posData.x}%; top: ${posData.y}%; z-index: 5;">
                <div style="position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); width: 26px; height: 26px; border-radius: 50%; background-color: ${circleColor}; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.6); z-index: 2;">${warningIcon}</div>
                <div style="position: absolute; left: 0; top: 16px; transform: translateX(-50%); background: rgba(0,0,0,0.8); color: ${nameColor}; font-size: 0.7em; padding: 3px 6px; border-radius: 4px; white-space: nowrap; text-align: center; line-height: 1.2; box-shadow: 0 2px 4px rgba(0,0,0,0.5); z-index: 3;">
                    <span style="color:#bdc3c7; font-size:0.8em; font-weight:bold;">${item.slot}</span><br>
                    ${getPitchName(item.player, currentPlayers)} <span style="color:#f1c40f; font-weight:bold;">${calculatePlayerBaseScore(item.player)}</span> ${getConditionIcon(item.player.condition)}
                </div>
            </div>`;
    });

    return `
        <div style="background: ${bgColor}; border: 2px solid #34495e; border-radius: 8px; padding: 15px; flex: 1 1 300px; box-sizing: border-box;">
            <h4 style="margin: 0 0 15px 0; color: white; text-align: center; font-size: 0.95em;">${title} (${lineup.formationName})</h4>
            <div style="position: relative; width: 100%; aspect-ratio: 1/1.6; background: #1e7e34; border: 2px solid rgba(255,255,255,0.7); border-radius: 4px; overflow: hidden; box-shadow: inset 0 0 20px rgba(0,0,0,0.3);">
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

function runSimulation(e) {
    if(e) e.preventDefault();
    const output = document.getElementById('resultOutput'); if(!output) return;
    const format = Number(document.getElementById('matchFormat')?.value || 7);
    const forceFill = document.getElementById('cbForceFill')?.checked || false; 
    const requiredPlayers = format * 2;
    const selectedPlayers = currentPlayers.filter(p => p.selected);
  
    if (selectedPlayers.length !== requiredPlayers) {
      output.innerHTML = `<span style="background:#c0392b; color:white; padding:10px; border-radius:4px; display:block;">❌ HATA: Maç için tam olarak ${requiredPlayers} oyuncu seçmelisiniz. (Şu an ${selectedPlayers.length} seçili)</span>`;
      return;
    }
  
    output.innerHTML = '<div style="color: #2c3e50; padding: 15px; font-weight:bold;">Simülasyon çalışıyor, lütfen bekleyin... ⏳</div>';

    setTimeout(() => {
        try {
          let validSquads = [];
          const topSquads = getTop5Squads(selectedPlayers, format, forceFill);
          for (const squad of topSquads) {
              if (validSquads.length >= 5) break;
              const lineupsA = getPerfectLineups(squad.teamA, format, forceFill);
              const lineupsB = getPerfectLineups(squad.teamB, format, forceFill);
              if (!lineupsA[0] || !lineupsB[0]) continue;
              const teamAIds = squad.teamA.map(p=>p.id).sort((a,b)=>a-b).join(',');
              if (validSquads.some(v => teamAIds === v.squad.teamA.map(p=>p.id).sort((a,b)=>a-b).join(',') || teamAIds === v.squad.teamB.map(p=>p.id).sort((a,b)=>a-b).join(','))) continue;
              if (!forceFill && (lineupsA[0].lineup.some(i => !i.player) || lineupsB[0].lineup.some(i => !i.player))) continue;
              validSquads.push({ squad, lineupA: lineupsA[0], lineupB: lineupsB[0] });
          }

          if (validSquads.length === 0) return output.innerHTML = `<div style="background:#c0392b; color:white; padding:15px; border-radius:4px;">❌ TAKIM BULUNAMADI! Lütfen "Her Zaman Kadro Bul" ayarını açın.</div>`;
          
          output.innerHTML = `<h3 style="color: #2c3e50;">📊 EN DENGELİ ${validSquads.length} FARKLI TAKIM KOMBİNASYONU (${format}v${format})</h3>`;

          validSquads.forEach((data, index) => {
            const squad = data.squad; const diffs = calculateBalanceMetrics(calculateTeamStats(data.lineupA.lineup.map(i => i.player).filter(Boolean)), calculateTeamStats(data.lineupB.lineup.map(i => i.player).filter(Boolean))).diffs;
            const card = document.createElement('div'); card.style.cssText = 'background: #2c3e50; border-radius: 6px; padding: 20px; margin-bottom: 25px; border-left: 6px solid #a8e63d; overflow-x: auto; color: white;';
            card.innerHTML = `
                <div style="color: #f39c12; font-weight: bold; font-size: 1.1em; margin-bottom: 15px;">✨ SEÇENEK #${index + 1} <span style="font-size: 0.8em; color: #bdc3c7;">(Denge Ceza Skoru: ${squad.metrics.penaltyScore.toFixed(0)})</span></div>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; justify-content: center;">
                    ${generateTacticalPitchHTML(data.lineupA, `A Takımı`, '#1c2833')}
                    ${generateTacticalPitchHTML(data.lineupB, `B Takımı`, '#212f3d')}
                </div>
                <div style="display: flex; flex-wrap: wrap; background: #1a252f; border-radius: 6px; padding: 15px; align-items: center; gap: 20px;">
                    <div style="flex: 1; min-width: 250px; font-family: monospace; font-size: 0.95em; line-height: 1.6;">
                        <div style="margin-bottom: 10px; color: #bdc3c7; font-weight: bold;">[0-100 Ortalama Puan Fark Analizi]</div>
                        <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);"><span style="color: #f39c12;">Genel Güç:</span> ${diffs.total > 0 ? `<span style="color:#2ecc71;">+${diffs.total.toFixed(1)} (A)</span>` : `<span style="color:#3498db;">+${Math.abs(diffs.total).toFixed(1)} (B)</span>`}</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; font-size: 0.9em;">
                            <div style="background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 4px;"><span style="color:#95a5a6;">Pas:</span> ${diffs.pas > 0 ? `<span style="color:#2ecc71;">+${diffs.pas.toFixed(1)} (A)</span>` : `<span style="color:#3498db;">+${Math.abs(diffs.pas).toFixed(1)} (B)</span>`}</div>
                            <div style="background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 4px;"><span style="color:#95a5a6;">Savunma:</span> ${diffs.savunma > 0 ? `<span style="color:#2ecc71;">+${diffs.savunma.toFixed(1)} (A)</span>` : `<span style="color:#3498db;">+${Math.abs(diffs.savunma).toFixed(1)} (B)</span>`}</div>
                            <div style="background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 4px;"><span style="color:#95a5a6;">Şut:</span> ${diffs.sut > 0 ? `<span style="color:#2ecc71;">+${diffs.sut.toFixed(1)} (A)</span>` : `<span style="color:#3498db;">+${Math.abs(diffs.sut).toFixed(1)} (B)</span>`}</div>
                            <div style="background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 4px;"><span style="color:#95a5a6;">Dribling:</span> ${diffs.dribling > 0 ? `<span style="color:#2ecc71;">+${diffs.dribling.toFixed(1)} (A)</span>` : `<span style="color:#3498db;">+${Math.abs(diffs.dribling).toFixed(1)} (B)</span>`}</div>
                            <div style="background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 4px;"><span style="color:#95a5a6;">Fırsat:</span> ${diffs.firsat > 0 ? `<span style="color:#2ecc71;">+${diffs.firsat.toFixed(1)} (A)</span>` : `<span style="color:#3498db;">+${Math.abs(diffs.firsat).toFixed(1)} (B)</span>`}</div>
                            <div style="background: rgba(0,0,0,0.2); padding: 5px 8px; border-radius: 4px;"><span style="color:#95a5a6;">Hava:</span> ${diffs.hava > 0 ? `<span style="color:#2ecc71;">+${diffs.hava.toFixed(1)} (A)</span>` : `<span style="color:#3498db;">+${Math.abs(diffs.hava).toFixed(1)} (B)</span>`}</div>
                        </div>
                    </div>
                    <div style="position: relative; width: 200px; height: 200px; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 15px; display: flex; justify-content: center;"><canvas id="teamChart-${index}" style="width:100%; height:100%;"></canvas></div>
                </div>
            `;
            output.appendChild(card);

            setTimeout(() => {
                new Chart(document.getElementById(`teamChart-${index}`).getContext('2d'), { type: 'radar', data: { labels: ['Pas', 'Savunma', 'Şut', 'Dribling', 'Fırsat', 'Hava'], datasets: [{ label: 'A Takımı', data: [trueStatsA.pas, trueStatsA.savunma, trueStatsA.sut, trueStatsA.dribling, trueStatsA.firsat, trueStatsA.hava], backgroundColor: 'rgba(46, 204, 113, 0.25)', borderColor: '#2ecc71', borderWidth: 2, pointBackgroundColor: '#2ecc71', pointRadius: 2 }, { label: 'B Takımı', data: [trueStatsB.pas, trueStatsB.savunma, trueStatsB.sut, trueStatsB.dribling, trueStatsB.firsat, trueStatsB.hava], backgroundColor: 'rgba(52, 152, 219, 0.25)', borderColor: '#3498db', borderWidth: 2, pointBackgroundColor: '#3498db', pointRadius: 2 }] }, options: { layout: { padding: 15 }, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255,255,255,0.15)' }, angleLines: { color: 'rgba(255,255,255,0.15)' }, pointLabels: { color: '#ffffff', font: { size: 10, weight: 'bold' } } } }, plugins: { legend: { display: false } } } });
            }, 50);
          });
        } catch (err) { output.innerHTML = `<span style="background:#c0392b; color:white; padding:10px; border-radius:4px; display:block;">❌ HATA: ${err.message}</span>`; }
    }, 50);
}

function renderRadarChart(playerId) {
    if (chartInstances[playerId]) return; 
    const player = currentPlayers.find(p => p.id === playerId); if(!player) return;
    const canvas = document.getElementById(`chart-${playerId}`); if(!canvas) return;
    const sutValue = player.stats.sut !== undefined ? player.stats.sut : (player.stats.şut || 0);
    const firsatValue = player.stats.firsat !== undefined ? player.stats.firsat : (player.stats.fırsat || 0);
    const labels = player.mainPos === 'GK' ? ['Pas', 'Savunma', 'Şut K.', 'Dribling', 'Fırsat', 'Hava'] : ['Pas', 'Savunma', 'Şut', 'Dribling', 'Fırsat', 'Hava'];
    const data = player.mainPos === 'GK' ? [player.stats.pas, player.stats.savunma, player.stats.sutKarsilama, player.stats.dribling, firsatValue, player.stats.hava] : [player.stats.pas, player.stats.savunma, sutValue, player.stats.dribling, firsatValue, player.stats.hava];
    chartInstances[playerId] = new Chart(canvas.getContext('2d'), { type: 'radar', data: { labels: labels, datasets: [{ label: 'Profil', data: data, backgroundColor: 'rgba(0, 210, 211, 0.25)', borderColor: '#00d2d3', pointBackgroundColor: '#1dd1a1', borderWidth: 2 }] }, options: { layout: { padding: 15 }, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: 'rgba(255, 255, 255, 0.25)' }, angleLines: { color: 'rgba(255, 255, 255, 0.25)' }, pointLabels: { color: '#ffffff', font: { size: 10, weight: 'bold' } } } }, plugins: { legend: { display: false } } } });
}

function editPlayer(id) {
    const player = currentPlayers.find(p => p.id === id); if (!player) return;
    editingPlayerId = id;
    const safeSet = (elemId, val) => { const el = document.getElementById(elemId); if (el) el.value = val; };
    safeSet('pName', player.firstName || player.name.split(' ')[0]);
    safeSet('pLastName', player.lastName || player.name.split(' ').slice(1).join(' '));
    safeSet('pShortName', player.shortName || "");
    safeSet('pMainPos', player.mainPos); safeSet('pCond', player.condition); safeSet('sPas', player.stats.pas || 0); safeSet('sSavunma', player.stats.savunma || 0); safeSet('sSut', player.stats.sut !== undefined ? player.stats.sut : (player.stats.şut || 0)); safeSet('sDribling', player.stats.dribling || 0); safeSet('sFirsat', player.stats.firsat !== undefined ? player.stats.firsat : (player.stats.fırsat || 0)); safeSet('sHava', player.stats.hava || 0); safeSet('sSutKar', player.stats.sutKarsilama || 0);
    renderPositionMap(); 
    const mainGroup = document.querySelector(`.pos-btn-group[data-pos="${player.mainPos}"]`);
    if (mainGroup) { const sel = mainGroup.querySelector('.role-select'); if (sel) { sel.value = player.role; mainGroup.dataset.manual = 'true'; } }
    if (player.secondaryPositions) {
      player.secondaryPositions.forEach(sec => {
        const btnGroup = document.querySelector(`.pos-btn-group[data-pos="${sec.pos}"]`);
        if (btnGroup) { 
            btnGroup.classList.add('active-sec'); btnGroup.style.borderColor = '#f39c12'; btnGroup.style.background = '#2c3e50';
            const capInput = btnGroup.querySelector('.cap-input'); if (capInput) capInput.value = sec.capacity; 
            const sel = btnGroup.querySelector('.role-select'); if (sel) { sel.style.display = 'block'; sel.value = sec.role; btnGroup.dataset.manual = 'true'; }
        }
      });
    }
    updateLiveRoles(); 
    const btn = document.getElementById('btnAddPlayer'); if (btn) { btn.innerText = "Değişiklikleri Kaydet"; btn.style.background = "#f39c12"; }
    const details = document.getElementById(`details-${id}`); if(details) details.open = false; window.scrollTo({ top: 0, behavior: 'smooth' });
}