import { getAllSquads, getBestRoleForStats, calculateTeamStatsLineup } from './algorithm.js';
import { ROLE_WEIGHTS, CONDITIONS } from './constants.js'; 

function getStatColor(val) {
    val = Number(val) || 0; 
    if (val >= 85) return '#00d2d3'; 
    if (val >= 65) return '#2ecc71'; 
    if (val >= 30) return '#f39c12'; 
    return '#e74c3c';                
}

window.addEventListener('error', (event) => {
    console.error("Sistem Hatası Yakalandı: ", event.message);
});

function getConditionHeart(condition, size = 22) {
    let color, darkColor, percent;
    if (condition === 'Tam') { color = '#00e676'; darkColor = '#0a381f'; percent = 100; } 
    else if (condition === 'İyi') { color = '#a8e63d'; darkColor = '#2a3b10'; percent = 80; } 
    else if (condition === 'Vasat') { color = '#d1b354'; darkColor = '#3b3216'; percent = 40; } 
    else if (condition === 'Kötü') { color = '#d35400'; darkColor = '#3d1a00'; percent = 20; } 
    else return '';

    const uniqueId = Math.random().toString(36).substring(2, 9);

    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="vertical-align: middle; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));" title="${condition} Kondisyon">
              <defs>
                <linearGradient id="grad-${uniqueId}" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stop-color="${color}" />
                  <stop offset="${percent}%" stop-color="${color}" />
                  <stop offset="${percent}%" stop-color="${darkColor}" />
                  <stop offset="100%" stop-color="${darkColor}" />
                </linearGradient>
              </defs>
              <path fill="url(#grad-${uniqueId})" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              <polyline points="5.5,11 8.5,11 10.5,6.5 13.5,16 15.5,11 18.5,11" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
            </svg>`;
}

const defaultRoleWeights = JSON.parse(JSON.stringify(ROLE_WEIGHTS));
try {
    const storedWeights = localStorage.getItem('custom_role_weights');
    if (storedWeights) {
        const parsedWeights = JSON.parse(storedWeights);
        for(let pos in parsedWeights) {
            if(ROLE_WEIGHTS[pos]) {
                for(let role in parsedWeights[pos]) {
                    ROLE_WEIGHTS[pos][role] = parsedWeights[pos][role];
                }
            }
        }
    }
} catch(err) {}

function saveRoleWeights() {
    localStorage.setItem('custom_role_weights', JSON.stringify(ROLE_WEIGHTS));
}

function resetRoleWeights() {
    localStorage.removeItem('custom_role_weights');
    for(let pos in defaultRoleWeights) {
        for(let role in defaultRoleWeights[pos]) {
            ROLE_WEIGHTS[pos][role] = defaultRoleWeights[pos][role];
        }
    }
}

let currentPlayers = [];
let editingPlayerId = null;
let chartInstances = {};
let simResults = []; 
let simCharts = {};  

const ALL_POSITIONS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "DM", "CM", "AM", "LM", "RM", "LW", "RW", "FW"];

function getBasePosition(slot) {
  const positionMap = { "LCB": "CB", "RCB": "CB", "LCM": "CM", "RCM": "CM", "LDM": "DM", "RDM": "DM", "LAM": "AM", "RAM": "AM", "LFW": "FW", "RFW": "FW" };
  return positionMap[slot] || slot;
}

function updateCondPreview() {
    const pCondElement = document.getElementById('pCond');
    const previewElement = document.getElementById('condIconPreview');
    if (pCondElement && previewElement) {
        previewElement.innerHTML = getConditionHeart(pCondElement.value, 22);
    }
}

function updateFormationName(lineupObj) {
    let positionalCounts = { D: 0, DM: 0, M: 0, AM: 0, F: 0 };
    lineupObj.lineup.forEach(item => {
        if (item.slot === 'GK') return;
        const basePosition = item.basePos;
        if (['CB','LB','RB','LWB','RWB'].includes(basePosition)) positionalCounts.D++;
        else if (['DM'].includes(basePosition)) positionalCounts.DM++;
        else if (['CM','LM','RM'].includes(basePosition)) positionalCounts.M++;
        else if (['AM'].includes(basePosition)) positionalCounts.AM++;
        else if (['FW','LW','RW'].includes(basePosition)) positionalCounts.F++;
    });
    const namingParts = [];
    if(positionalCounts.D > 0) namingParts.push(positionalCounts.D);
    if(positionalCounts.DM > 0) namingParts.push(positionalCounts.DM);
    if(positionalCounts.M > 0) namingParts.push(positionalCounts.M);
    if(positionalCounts.AM > 0) namingParts.push(positionalCounts.AM);
    if(positionalCounts.F > 0) namingParts.push(positionalCounts.F);
    lineupObj.formationName = namingParts.join('-');
}

window.renderStatRow = function(label, normA, normB) {
    const roundedA = Math.round(normA);
    const roundedB = Math.round(normB);
    const difference = roundedA - roundedB;
    
    let diffColor = 'var(--text-main)';
    let diffText = '0';
    
    if (difference > 0) { diffColor = '#3498db'; diffText = `+${difference}`; } 
    else if (difference < 0) { diffColor = '#e74c3c'; diffText = `${difference}`; }
    
    return `
        <tr style="border-bottom: 1px dashed var(--border-color);">
            <td style="color: var(--text-muted); text-align: left; padding: 8px;">${label}</td>
            <td style="color: var(--text-main); font-weight: bold; padding: 8px; font-size:1.1em;">${roundedA}</td>
            <td style="color: var(--text-main); font-weight: bold; padding: 8px; font-size:1.1em;">${roundedB}</td>
            <td style="color: ${diffColor}; font-weight: bold; padding: 8px;">${diffText}</td>
        </tr>
    `;
};

window.handlePlayerSwap = function(sourceNode, targetNode) {
    const cardIndex = parseInt(sourceNode.card);
    if (!simResults[cardIndex]) return;
    const simData = simResults[cardIndex].active;

    const getLineupItem = (teamStr, slotStr) => {
        const lineup = teamStr === 'A' ? simData.lineupA.lineup : simData.lineupB.lineup;
        return lineup.find(item => item.slot === slotStr);
    };

    const sourceItem = getLineupItem(sourceNode.team, sourceNode.slot);
    const targetItem = getLineupItem(targetNode.team, targetNode.slot); 

    if (!sourceItem) return;

    const reEvaluateItem = (item) => {
        const playerObj = item.player;
        const basePosition = item.basePos;
        item.isMain = getBasePosition(playerObj.mainPos) === basePosition;
        const secondaryMatch = playerObj.secondaryPositions.find(sp => getBasePosition(sp.pos) === basePosition);
        item.isSec = !!secondaryMatch;

        item.outOfPos = (playerObj.bannedPositions && playerObj.bannedPositions.includes(basePosition)) || (playerObj.bannedPositions && playerObj.bannedPositions.includes(item.slot));
        if (!item.isMain && !item.isSec) item.outOfPos = true;

        if (item.outOfPos) {
            item.cap = 25; 
            item.role = getBestRoleForStats(basePosition, playerObj.stats);
        } else if (item.isMain) {
            item.cap = 100;
            item.role = (!playerObj.role || playerObj.role === 'null') ? getBestRoleForStats(basePosition, playerObj.stats) : playerObj.role;
        } else if (item.isSec) {
            item.cap = secondaryMatch.capacity;
            item.role = (!secondaryMatch.role || secondaryMatch.role === 'null') ? getBestRoleForStats(basePosition, playerObj.stats) : secondaryMatch.role;
        }
        item.pOvr = getOvrForPosition(playerObj, item.slot, item.role, item.cap, false);
    };

    if (targetItem) {
        const temporaryPlayer = sourceItem.player;
        sourceItem.player = targetItem.player;
        targetItem.player = temporaryPlayer;

        reEvaluateItem(sourceItem);
        reEvaluateItem(targetItem);
    } else {
        if (sourceNode.team !== targetNode.team) {
            alert("Sayı eksilmemesi için takım değiştirirken oyuncuyu boş bir mevkiye değil, takas etmek istediğiniz oyuncunun üzerine bırakın.");
            return;
        }
        
        sourceItem.slot = targetNode.slot;
        sourceItem.basePos = getBasePosition(targetNode.slot);
        reEvaluateItem(sourceItem);
        
        updateFormationName(simData.lineupA);
        updateFormationName(simData.lineupB);
    }

    const newStatsA = calculateTeamStatsLineup(simData.lineupA.lineup);
    const newStatsB = calculateTeamStatsLineup(simData.lineupB.lineup);
    
    simData.lineupA.stats = newStatsA;
    simData.lineupB.stats = newStatsB;

    const isHavaLowPriority = document.getElementById('cbLowHava')?.checked;
    const activeStatCount = isHavaLowPriority ? 5 : 6;
    
    let totalSumA = newStatsA.normalized.pas + newStatsA.normalized.savunma + newStatsA.normalized.sut + newStatsA.normalized.dribling + newStatsA.normalized.firsat;
    let totalSumB = newStatsB.normalized.pas + newStatsB.normalized.savunma + newStatsB.normalized.sut + newStatsB.normalized.dribling + newStatsB.normalized.firsat;
    
    if (!isHavaLowPriority) {
        totalSumA += newStatsA.normalized.hava;
        totalSumB += newStatsB.normalized.hava;
    }
    
    simData.sumA = totalSumA / activeStatCount;
    simData.sumB = totalSumB / activeStatCount;
    simData.rawPenalty = Math.abs(simData.sumA - simData.sumB) * 1000.0;

    document.body.classList.remove('is-dragging');
    renderSimCard(cardIndex);
};

document.addEventListener('dragstart', (event) => {
    const targetPlayerElement = event.target.closest('.pitch-player');
    if (targetPlayerElement && targetPlayerElement.dataset.card) {
        event.dataTransfer.setData('text/plain', JSON.stringify({
            card: targetPlayerElement.dataset.card,
            team: targetPlayerElement.dataset.team,
            slot: targetPlayerElement.dataset.slot
        }));
        event.dataTransfer.effectAllowed = 'move';
        targetPlayerElement.style.opacity = '0.4';
        
        document.body.classList.add('is-dragging');
    }
});

document.addEventListener('dragend', (event) => {
    const targetPlayerElement = event.target.closest('.pitch-player');
    if (targetPlayerElement) targetPlayerElement.style.opacity = '1';
    
    document.body.classList.remove('is-dragging');
    document.querySelectorAll('.pitch-empty-slot').forEach(element => {
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';
        element.style.borderColor = 'rgba(255,255,255,0.4)';
        element.style.background = 'rgba(0,0,0,0.2)';
    });
});

document.addEventListener('dragover', (event) => {
    const dropZone = event.target.closest('.pitch-player, .pitch-empty-slot');
    if (dropZone) {
        event.preventDefault(); 
        event.dataTransfer.dropEffect = 'move';
        if (dropZone.classList.contains('pitch-empty-slot')) {
            dropZone.style.borderColor = '#2ecc71';
            dropZone.style.background = 'rgba(46, 204, 113, 0.4)';
        }
    }
});

document.addEventListener('dragleave', (event) => {
    const emptySlotZone = event.target.closest('.pitch-empty-slot');
    if (emptySlotZone) {
        emptySlotZone.style.borderColor = 'rgba(255,255,255,0.4)';
        emptySlotZone.style.background = 'rgba(0,0,0,0.2)';
    }
});

document.addEventListener('drop', (event) => {
    document.body.classList.remove('is-dragging');
    const targetElement = event.target.closest('.pitch-player, .pitch-empty-slot');
    if (targetElement && targetElement.dataset.card) {
        event.preventDefault();
        document.querySelectorAll('.pitch-empty-slot').forEach(element => {
            element.style.opacity = '0';
            element.style.pointerEvents = 'none';
            element.style.borderColor = 'rgba(255,255,255,0.4)';
            element.style.background = 'rgba(0,0,0,0.2)';
        });
        const transferData = event.dataTransfer.getData('text/plain');
        if (!transferData) return;
        try {
            const parsedSourceData = JSON.parse(transferData);
            const compiledTargetData = {
                card: targetElement.dataset.card,
                team: targetElement.dataset.team,
                slot: targetElement.dataset.slot
            };
            if (parsedSourceData.card === compiledTargetData.card && (parsedSourceData.team !== compiledTargetData.team || parsedSourceData.slot !== compiledTargetData.slot)) {
                window.handlePlayerSwap(parsedSourceData, compiledTargetData);
            }
        } catch(error) { console.error("Oyuncu Takası İşlem Hatası:", error); }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const safeInputValueAssigner = (elementId, value) => { const elem = document.getElementById(elementId); if (elem) elem.value = value; };
    ['sPas', 'sSavunma', 'sSut', 'sDribling', 'sFirsat', 'sHava'].forEach(id => safeInputValueAssigner(id, 40));
    safeInputValueAssigner('sSutKar', 0);
    safeInputValueAssigner('pName', "");
    safeInputValueAssigner('pLastName', "");
    safeInputValueAssigner('pShortName', "");
    safeInputValueAssigner('pMainPos', "CB");
    safeInputValueAssigner('pCond', "Tam");

if (!document.getElementById('sim-pitch-fix')) {
        const simPitchFixStyles = document.createElement('style');
        simPitchFixStyles.id = 'sim-pitch-fix';
        simPitchFixStyles.innerHTML = `
            .pitch-inner {
                aspect-ratio: 1 / 1.15 !important; 
                min-height: 550px !important; 
            }
            /* --- SADECE MOBİL: Taktik Sahasını Büyütme --- */
            @media (max-width: 900px) {
                .pitch-inner {
                    aspect-ratio: 1 / 1.5 !important; 
                    min-height: 650px !important; /* Mobilde dikey uzunluk çok daha büyük */
                }
            }
        `;
        document.head.appendChild(simPitchFixStyles);
    }

    if (!document.getElementById('stats-grid-fix-new')) {
        const statsGridStyles = document.createElement('style');
        statsGridStyles.id = 'stats-grid-fix-new';
        statsGridStyles.innerHTML = `
            .stat-box { display: flex; flex-direction: column; width: 100%; }
            /* Ana özellik giriş kutuları büyütüldü (38px -> 44px) */
            .spinner-wrapper { display: flex; width: 100%; height: 44px !important; } 
            .spinner-wrapper input { 
                width: 100%; 
                min-width: 0; 
                box-sizing: border-box; 
                padding: 0 !important; 
                /* Sayılar biraz küçültüldü (1.1em -> 0.95em) */
                font-size: 0.95em !important; 
                height: 100% !important; 
                text-align: center !important;
                line-height: 44px !important; 
            }
            /* + ve - Butonları da dokunma kolaylığı için büyütüldü */
            .spin-btn { height: 100% !important; width: 40px !important; font-size: 1.1em !important; }
        `;
        document.head.appendChild(statsGridStyles);
    }

    if (!document.getElementById('pitch-map-styles')) {
        const pitchMapStyles = document.createElement('style');
        pitchMapStyles.id = 'pitch-map-styles';
        pitchMapStyles.innerHTML = `
            #secPosMap {
                display: block !important;
                position: relative;
                width: 100%;
                background: var(--pitch-bg);
                border: 2px solid rgba(255,255,255,0.4);
                border-radius: 8px;
                padding-bottom: 165%; 
                margin-top: 15px;
                box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
                overflow: hidden;
            }
            #secPosMap::before { content: ''; position: absolute; top: 0; left: 20%; width: 60%; height: 16%; border: 2px solid rgba(255,255,255,0.4); border-top: none; pointer-events: none; }
            #secPosMap::after { content: ''; position: absolute; bottom: 0; left: 20%; width: 60%; height: 16%; border: 2px solid rgba(255,255,255,0.4); border-bottom: none; pointer-events: none; }
            .pitch-center-line { position: absolute; top: 50%; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.4); transform: translateY(-50%); pointer-events: none; }
            .pitch-center-circle { position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; border: 2px solid rgba(255,255,255,0.4); border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; }
            
            .pos-btn-group {
                position: absolute; transform: translate(-50%, -50%); width: 26%; min-width: 75px; max-width: 100px;
                background: var(--bg-panel); border: 2px solid var(--border-color); padding: 2px 4px; border-radius: 6px;
                cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center;
                text-align: center; transition: opacity 0.2s, box-shadow 0.2s; box-shadow: 0 3px 6px rgba(0,0,0,0.4); opacity: 0.65; z-index: 5;
            }
            .pos-btn-group:hover { opacity: 0.95; z-index: 20 !important; }
            .pos-btn-group.active-sec, .pos-btn-group.main-pos { opacity: 1; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.8); }
            .pos-btn-group.main-pos { z-index: 15; border-width: 2px; }
            .node-header { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 2px; }
            .node-name { font-weight: 900; font-size: 0.8em; color: var(--text-main); }
            .node-ovr { font-size: 0.7em; font-weight: bold; padding: 2px 4px; border-radius: 4px; background: rgba(0,0,0,0.1); }
            .sec-controls { display: none; width: 100%; flex-direction: column; gap: 2px; margin-top: 2px; }
            .pos-btn-group.active-sec .sec-controls { display: flex; }
            
            .role-select { font-size: 0.6em; width: 100%; padding: 1px; cursor: pointer; border-radius: 3px; border: 1px solid var(--border-color); background: var(--bg-input); color: var(--text-main); height: 18px; }
            .spinner-wrapper { height: 18px; display: flex; width: 100%; }
            .spin-btn { width: 20px; font-size: 1em; line-height: 1; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.1); border:none; color: var(--text-main); cursor:pointer; padding:0; }
            .cap-input { font-size: 0.75em; padding: 0; text-align: center; flex: 1; border:none; background: var(--bg-input); color:var(--text-main); width: 100%; min-width:0; }

            /* --- SADECE MOBİL: Harita Kutuları ve Kapasite Araçları --- */
            @media (max-width: 600px) {
                #secPosMap { padding-bottom: 200%; } 
                
                /* Haritadaki kutular genel olarak büyütüldü */
                .pos-btn-group { min-width: 64px !important; width: 26%; padding: 3px; border-width: 1px; }
                .pos-btn-group.main-pos { border-width: 2px; }
                .node-name { font-size: 0.65em; }
                .node-ovr { font-size: 0.6em; padding: 1px 2px; }
                .sec-controls { gap: 3px; margin-top: 3px; }
                
                .role-select { font-size: 0.5em !important; height: 18px !important; padding: 0 !important; }
                
                /* Sayaç aracı (Spinner) yüksekliği artırıldı, içindeki fontlar küçültüldü */
                .spinner-wrapper { height: 22px !important; } 
                .spin-btn { width: 18px !important; font-size: 0.75em !important; } /* -, + işaretleri küçültüldü */
                .cap-input { font-size: 0.65em !important; padding: 0 !important; line-height: 22px !important; } /* Sayılar (100) küçültüldü */
            }
        `;
        document.head.appendChild(pitchMapStyles);
    }

    if (!document.getElementById('drag-styles')) {
        const dragStyles = document.createElement('style');
        dragStyles.id = 'drag-styles';
        dragStyles.innerHTML = `
            .pitch-empty-slot { opacity: 0; pointer-events: none; transition: opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease; }
            body.is-dragging .pitch-empty-slot { opacity: 1 !important; pointer-events: auto !important; }
        `;
        document.head.appendChild(dragStyles);
    }
    
    if (!document.getElementById('mobile-responsive-styles')) {
        const mobileStyles = document.createElement('style');
        mobileStyles.id = 'mobile-responsive-styles';
        mobileStyles.innerHTML = `
            *, *::before, *::after { box-sizing: border-box; }
            @media (max-width: 900px) {
                .left-panel .btn-group, .right-panel .btn-group { flex-direction: column !important; }
                .left-panel .btn-group .btn, .right-panel .btn-group .btn { width: 100% !important; margin-left: 0 !important; margin-right: 0 !important; }
                .settings-bar { flex-direction: column !important; align-items: stretch !important; }
                .setting-lbl { width: 100% !important; justify-content: center !important; }
                .settings-bar button { width: 100% !important; }
                .db-container > div { flex-direction: column !important; align-items: stretch !important; }
                #dbSelect { width: 100% !important; }
                .db-container .btn-group { min-width: 0 !important; width: 100% !important; }
            }
        `;
        document.head.appendChild(mobileStyles);
    }

    const livePitchWrapper = document.getElementById('livePitchWrap');
    if (livePitchWrapper) livePitchWrapper.style.display = 'none';

    const savedSettingsInfo = JSON.parse(localStorage.getItem('app_settings')) || { darkMode: false, hideOvr: false, lowHava: true, teamColors: false };
    const checkboxDarkMode = document.getElementById('cbDarkMode');
    const checkboxHideOvr = document.getElementById('cbHideOvr');
    const checkboxLowHava = document.getElementById('cbLowHava');
    const checkboxTeamColors = document.getElementById('cbTeamColors');

    if (checkboxDarkMode) checkboxDarkMode.checked = savedSettingsInfo.darkMode;
    if (checkboxHideOvr) checkboxHideOvr.checked = savedSettingsInfo.hideOvr;
    if (checkboxLowHava) checkboxLowHava.checked = savedSettingsInfo.lowHava;
    if (checkboxTeamColors) checkboxTeamColors.checked = savedSettingsInfo.teamColors;

    if (savedSettingsInfo.darkMode) document.body.classList.add('dark-mode');
    
    if (savedSettingsInfo.hideOvr) {
        const customStyleId = 'hide-ovr-style';
        if (!document.getElementById(customStyleId)) {
            let styleNode = document.createElement('style'); styleNode.id = customStyleId;
            styleNode.innerHTML = '.pitch-container .pitch-ovr-text, .pitch-container .cond-icon { display: none !important; }';
            document.head.appendChild(styleNode);
        }
    }

    const triggerSettingsSave = () => {
        localStorage.setItem('app_settings', JSON.stringify({
            darkMode: checkboxDarkMode?.checked || false,
            hideOvr: checkboxHideOvr?.checked || false,
            lowHava: checkboxLowHava?.checked || false,
            teamColors: checkboxTeamColors?.checked || false
        }));
    };

    checkboxDarkMode?.addEventListener('change', (event) => {
        if (event.target.checked) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        triggerSettingsSave();
    });

    checkboxHideOvr?.addEventListener('change', (event) => {
        const customStyleId = 'hide-ovr-style';
        let styleNode = document.getElementById(customStyleId);
        if (event.target.checked) {
            if (!styleNode) {
                styleNode = document.createElement('style'); styleNode.id = customStyleId;
                styleNode.innerHTML = '.pitch-container .pitch-ovr-text, .pitch-container .cond-icon { display: none !important; }';
                document.head.appendChild(styleNode);
            }
        } else { if (styleNode) styleNode.remove(); }
        triggerSettingsSave();
    });

    checkboxLowHava?.addEventListener('change', triggerSettingsSave);
    
    checkboxTeamColors?.addEventListener('change', () => {
        triggerSettingsSave();
        if (simResults.length > 0 && document.querySelector('.sim-result-card')) {
            for (let i = 0; i < simResults.length; i++) { renderSimCard(i); }
        }
    });

    document.getElementById('btnRoleManager')?.addEventListener('click', (event) => {
        event.preventDefault();
        const posSelectorElement = document.getElementById('rmPos');
        posSelectorElement.innerHTML = Object.keys(ROLE_WEIGHTS).map(positionKey => `<option value="${positionKey}">${positionKey}</option>`).join('');
        posSelectorElement.onchange = () => updateRoleManagerRoles();
        document.getElementById('rmRole').onchange = () => updateRoleManagerInputs();
        updateRoleManagerRoles();
        document.getElementById('roleModal').style.display = 'flex';
    });

    document.getElementById('rmCancel')?.addEventListener('click', () => { document.getElementById('roleModal').style.display = 'none'; });
    
    document.getElementById('rmSave')?.addEventListener('click', () => {
        const targetPos = document.getElementById('rmPos').value;
        const targetRole = document.getElementById('rmRole').value;
        const targetWeights = ROLE_WEIGHTS[targetPos][targetRole];
        const statKeys = ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'];
        if(targetPos === 'GK') statKeys.push('sutKarsilama');
        
        statKeys.forEach(statKey => {
            if(targetWeights[statKey] !== undefined) { targetWeights[statKey] = Number(document.getElementById(`rm_${statKey}`).value) || 0; }
        });
        saveRoleWeights(); updateLiveRoles(); updatePlayerList();
        alert(`"${targetRole}" rolü başarıyla kaydedildi.`);
    });

    document.getElementById('rmReset')?.addEventListener('click', () => {
        if(confirm("Tüm rolleri varsayılan hallerine sıfırlamak istediğinize emin misiniz?")) {
            resetRoleWeights(); updateRoleManagerInputs(); updateLiveRoles(); updatePlayerList();
            alert("Sistemdeki tüm roller sıfırlandı.");
        }
    });

    document.getElementById('btnToggleSelection')?.addEventListener('click', (event) => { 
        event.preventDefault(); 
        const isEveryPlayerSelected = currentPlayers.length > 0 && currentPlayers.every(playerObj => playerObj.selected);
        currentPlayers.forEach(playerObj => playerObj.selected = !isEveryPlayerSelected); 
        updatePlayerList(); 
    });
    
    document.getElementById('btnDeleteSelected')?.addEventListener('click', (event) => { 
        event.preventDefault(); 
        if(confirm('Seçili oyuncuları havuzdan silmek istediğinize emin misiniz?')) {
            currentPlayers = currentPlayers.filter(playerObj => !playerObj.selected); 
            updatePlayerList(); 
            renderPositionMap();
        }
    });
    
    document.getElementById('btnRandomSelect')?.addEventListener('click', selectRandomPlayers);
    document.getElementById('btnLoadDummies')?.addEventListener('click', loadDummyTestPlayers);
    document.getElementById('btnRemoveDummies')?.addEventListener('click', (event) => { event.preventDefault(); currentPlayers = currentPlayers.filter(playerObj => !playerObj.isTest); updatePlayerList(); renderPositionMap(); });
    document.getElementById('btnSaveNew')?.addEventListener('click', saveNewDatabase);
    document.getElementById('btnLoadDB')?.addEventListener('click', loadDatabase);
    document.getElementById('btnUpdateDB')?.addEventListener('click', updateDatabase);
    document.getElementById('btnDeleteDB')?.addEventListener('click', deleteDatabase);
    document.getElementById('btnExportJSON')?.addEventListener('click', exportDatabases);
    document.getElementById('btnImportJSON')?.addEventListener('click', importDatabases);
    document.getElementById('btnAddPlayer')?.addEventListener('click', handlePlayerAdditionProcess);
    document.getElementById('btnCancelEdit')?.addEventListener('click', cancelPlayerEdit);
    document.getElementById('btnRunSim')?.addEventListener('click', triggerSimulationExecution);
    document.getElementById('pMainPos')?.addEventListener('change', () => { renderPositionMap(); updateLiveRoles(); });
    document.getElementById('matchFormat')?.addEventListener('change', updatePlayerList);

    document.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-reset-sim')) {
            event.preventDefault();
            document.body.classList.remove('is-dragging');
            const targetCardIndex = parseInt(event.target.dataset.card);
            if (simResults[targetCardIndex]) {
                simResults[targetCardIndex].active = JSON.parse(JSON.stringify(simResults[targetCardIndex].original));
                renderSimCard(targetCardIndex);
            }
            return;
        }

        const pitchNodeInteraction = event.target.closest('.pitch-node-clickable');
        if (pitchNodeInteraction) {
            event.preventDefault(); event.stopPropagation(); 
            const targetPlayerId = pitchNodeInteraction.dataset.pid; const targetPos = pitchNodeInteraction.dataset.pos;
            if (!targetPlayerId || !targetPos) return;
            const playerReference = currentPlayers.find(p => String(p.id) === String(targetPlayerId));
            if (playerReference) {
                if (!playerReference.bannedPositions) playerReference.bannedPositions = [];
                if (playerReference.bannedPositions.includes(targetPos)) playerReference.bannedPositions = playerReference.bannedPositions.filter(p => p !== targetPos);
                else playerReference.bannedPositions.push(targetPos);
                updatePlayerList(); 
            } return;
        }
        
        const contextualPlayerNode = event.target.closest('.pitch-player');
        if (contextualPlayerNode) { 
            if (contextualPlayerNode.dataset.pinfo) {
                const infoDataObj = JSON.parse(decodeURIComponent(contextualPlayerNode.dataset.pinfo)); 
                openPlayerDetailModal(infoDataObj); 
            }
        }
        if (event.target.id === 'playerModal' || event.target.id === 'closeModal') { document.getElementById('playerModal').style.display = 'none'; }

        if (event.target.classList.contains('spin-btn')) {
            event.preventDefault(); const targetInputElem = event.target.parentElement.querySelector('input'); if(!targetInputElem) return;
            let currentValue = parseInt(targetInputElem.value) || 0; const valueStep = parseInt(targetInputElem.step) || 5; const maxLimit = parseInt(targetInputElem.max) || 100; const minLimit = parseInt(targetInputElem.min) || 0;
            if (event.target.classList.contains('plus')) currentValue = Math.min(maxLimit, currentValue + valueStep);
            if (event.target.classList.contains('minus')) currentValue = Math.max(minLimit, currentValue - valueStep);
            targetInputElem.value = currentValue; updateLiveRoles(); 
        }
        
        if (event.target.classList.contains('btn-delete')) {
            currentPlayers = currentPlayers.filter(p => String(p.id) !== String(event.target.dataset.id)); updatePlayerList();
        }
        if (event.target.classList.contains('btn-edit')) {
            initializePlayerEditSequence(event.target.dataset.id);
        }
    });

    ['sPas', 'sSavunma', 'sSut', 'sDribling', 'sFirsat', 'sHava', 'sSutKar', 'pName', 'pLastName', 'pShortName'].forEach(idString => {
        document.getElementById(idString)?.addEventListener('input', updateLiveRoles);
        document.getElementById(idString)?.addEventListener('change', updateLiveRoles);
    });

    document.getElementById('pCond')?.addEventListener('change', () => {
        updateCondPreview();
        updateLiveRoles();
    });
    
    updateCondPreview();
    refreshDatabaseSelectionMenu(); 
    renderPositionMap();

    const lastUsedDatabaseKey = localStorage.getItem('last_used_db');
    if (lastUsedDatabaseKey && getSavedDatabases()[lastUsedDatabaseKey]) {
        const dbSelectorNode = document.getElementById('dbSelect');
        if (dbSelectorNode) dbSelectorNode.value = lastUsedDatabaseKey;
        currentPlayers = [...getSavedDatabases()[lastUsedDatabaseKey].map((p, index) => { 
            let mappedPlayerObj = {...p, id: Date.now() + index + Math.random()}; 
            if (!mappedPlayerObj.bannedPositions) mappedPlayerObj.bannedPositions = []; 
            return mappedPlayerObj; 
        })];
        updatePlayerList();
    }
});

function updateRoleManagerRoles() {
    const activePositionVal = document.getElementById('rmPos').value;
    const roleDropdownNode = document.getElementById('rmRole');
    roleDropdownNode.innerHTML = Object.keys(ROLE_WEIGHTS[activePositionVal]).map(roleName => `<option value="${roleName}">${roleName}</option>`).join('');
    updateRoleManagerInputs();
}

function updateRoleManagerInputs() {
    const activePositionVal = document.getElementById('rmPos').value;
    const activeRoleVal = document.getElementById('rmRole').value;
    const selectedWeightsConfig = ROLE_WEIGHTS[activePositionVal][activeRoleVal];
    const inputsContainerNode = document.getElementById('rmInputs');
    inputsContainerNode.innerHTML = '';

    const internalStatKeys = ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'];
    if(activePositionVal === 'GK') internalStatKeys.push('sutKarsilama');

    internalStatKeys.forEach(statKey => {
        if(selectedWeightsConfig[statKey] !== undefined) {
            inputsContainerNode.innerHTML += `
                <div style="display:flex; flex-direction:column;">
                    <label style="font-size:0.85em; color:var(--text-muted); margin-bottom:2px; font-weight:bold;">${statKey.toUpperCase()}</label>
                    <input type="number" id="rm_${statKey}" value="${selectedWeightsConfig[statKey]}" style="padding:8px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-input); color:var(--text-main); font-weight:bold;">
                </div>
            `;
        }
    });
    
    internalStatKeys.forEach(statKey => {
        if(selectedWeightsConfig[statKey] !== undefined) {
            document.getElementById(`rm_${statKey}`).addEventListener('input', validateRoleManagerSum);
        }
    });
    validateRoleManagerSum();
}

function validateRoleManagerSum() {
    let accumulatedSum = 0;
    const inputNodesCollection = document.getElementById('rmInputs').querySelectorAll('input');
    inputNodesCollection.forEach(inputNode => accumulatedSum += Number(inputNode.value) || 0);
    const textWarningNode = document.getElementById('rmWarning');
    textWarningNode.innerText = `Toplam Ağırlık Oranı: %${accumulatedSum} ${accumulatedSum !== 100 ? '(Ağırlık toplamı %100 olması tavsiye edilir)' : ''}`;
    textWarningNode.style.color = accumulatedSum === 100 ? '#2ecc71' : '#e74c3c';
}

function loadDummyTestPlayers(event) {
    if (event) event.preventDefault();
    const generatedDummies = createFallbackTestPlayers();
    currentPlayers = [...currentPlayers, ...generatedDummies];
    updatePlayerList();
    renderPositionMap();
}

function createFallbackTestPlayers() {
    const fallbackConditions = ["Tam", "İyi", "Vasat", "Kötü"];
    const dummyConfigurationData = [
        { f: "Ali", l: "Yılmaz", pos: "GK", sec: [{pos:"CB", cap:50, role:"Standart Stoper"}, {pos:"DM", cap:40, role:"Kesici"}], s: { pas: 60, savunma: 50, sut: 40, dribling: 40, firsat: 40, hava: 60, sutKarsilama: 90 } }, 
        { f: "Burak", l: "Kaya", pos: "GK", sec: [{pos:"CM", cap:60, role:"İki Yönlü Orta Saha"}], s: { pas: 50, savunma: 60, sut: 30, dribling: 30, firsat: 30, hava: 80, sutKarsilama: 85 } }, 
        { f: "Can", l: "Demir", pos: "CB", sec: [{pos:"LB", cap:85, role:"Defansif Bek"}, {pos:"RB", cap:85, role:"Defansif Bek"}], s: { pas: 50, savunma: 90, sut: 30, dribling: 40, firsat: 30, hava: 90, sutKarsilama: 0 } },
        { f: "Efe", l: "Şahin", pos: "CM", sec: [{pos:"AM", cap:80, role:"Ofansif Oyun Kurucu"}], s: { pas: 85, savunma: 40, sut: 75, dribling: 80, firsat: 90, hava: 50, sutKarsilama: 0 } },
        { f: "Emre", l: "Çelik", pos: "FW", sec: [{pos:"LW", cap:70, role:"İçe Kat Eden Kanat"}], s: { pas: 65, savunma: 30, sut: 90, dribling: 85, firsat: 70, hava: 80, sutKarsilama: 0 } }
    ];
    return dummyConfigurationData.map((dConfig, i) => ({ 
        id: Date.now() + i, 
        firstName: dConfig.f, 
        lastName: dConfig.l, 
        name: `${dConfig.f} ${dConfig.l}`, 
        shortName: "", 
        mainPos: dConfig.pos, 
        role: dConfig.pos === "GK" ? "Kaleci" : "Standart Stoper", 
        condition: fallbackConditions[Math.floor(Math.random() * fallbackConditions.length)], 
        stats: { pas: dConfig.s.pas, savunma: dConfig.s.savunma, sut: dConfig.s.sut, şut: dConfig.s.sut, dribling: dConfig.s.dribling, firsat: dConfig.s.firsat, fırsat: dConfig.s.firsat, hava: dConfig.s.hava, sutKarsilama: dConfig.s.sutKarsilama||0 }, 
        isTest: true, 
        secondaryPositions: (dConfig.sec||[]).map(sConfig => ({ pos: sConfig.pos, capacity: sConfig.cap, role: sConfig.role })), 
        bannedPositions: [] 
    }));
}

function exportDatabases(event) { 
    if(event) event.preventDefault(); 
    const memoryDatabases = getSavedDatabases(); 
    if(Object.keys(memoryDatabases).length === 0) return alert("Sistemde dışa aktarılacak kayıtlı bir veritabanı bulunmamaktadır."); 
    const anchorLink = document.createElement('a'); 
    anchorLink.href = URL.createObjectURL(new Blob([JSON.stringify(memoryDatabases)], { type: 'application/json' })); 
    anchorLink.download = 'saha_oyuncu_veritabanlari.json'; 
    document.body.appendChild(anchorLink); 
    anchorLink.click(); 
    document.body.removeChild(anchorLink); 
}

function importDatabases(event) { 
    if(event) event.preventDefault(); 
    const fileInputNode = document.createElement('input'); 
    fileInputNode.type = 'file'; 
    fileInputNode.accept = '.json'; 
    fileInputNode.onchange = fileEvent => { 
        const fileReaderInstance = new FileReader(); 
        fileReaderInstance.onload = readEventTarget => { 
            try { 
                JSON.parse(readEventTarget.target.result); 
                localStorage.setItem('football_databases', readEventTarget.target.result); 
                refreshDatabaseSelectionMenu(); 
                alert("Dosya yükleme işlemi başarıyla tamamlandı."); 
            } catch { alert("Dosya içeriği geçerli bir JSON formatına sahip değil."); } 
        }; 
        fileReaderInstance.readAsText(fileEvent.target.files[0]); 
    }; 
    fileInputNode.click(); 
}

function getSavedDatabases() { 
    try { 
        const memoryDataContent = localStorage.getItem('football_databases'); 
        return memoryDataContent ? JSON.parse(memoryDataContent) : {}; 
    } catch(err) { return {}; } 
}

function applyDatabasesToMemory(dbObjectPayload) { 
    localStorage.setItem('football_databases', JSON.stringify(dbObjectPayload)); 
    refreshDatabaseSelectionMenu(); 
}

function refreshDatabaseSelectionMenu() { 
    const memoryDatabases = getSavedDatabases(); 
    const dbSelectorNode = document.getElementById('dbSelect'); 
    if(!dbSelectorNode) return; 
    dbSelectorNode.innerHTML = Object.keys(memoryDatabases).length === 0 ? '<option value="">-- Veri Bulunamadı --</option>' : Object.keys(memoryDatabases).map(keyName => `<option value="${keyName}">${keyName} (${memoryDatabases[keyName].length} Oyuncu)</option>`).join(''); 
}

function saveNewDatabase(event) { 
    if (event) event.preventDefault(); 
    if (!currentPlayers.length) return alert("Havuza kaydedilecek herhangi bir oyuncu bulunmamaktadır."); 
    const generatedDbName = prompt("Oluşturulacak yeni havuzun adını giriniz:"); 
    if (!generatedDbName) return; 
    const memoryDatabases = getSavedDatabases(); 
    memoryDatabases[generatedDbName] = currentPlayers; 
    applyDatabasesToMemory(memoryDatabases); 
    document.getElementById('dbSelect').value = generatedDbName; 
    localStorage.setItem('last_used_db', generatedDbName); 
}

function loadDatabase(event) { 
    if (event) event.preventDefault(); 
    const targetDbName = document.getElementById('dbSelect')?.value; 
    if (!targetDbName) return; 
    const memoryDatabases = getSavedDatabases(); 
    if(memoryDatabases[targetDbName]) { 
        currentPlayers = [...currentPlayers, ...memoryDatabases[targetDbName].map((p, index) => { 
            let mappedPlayer = {...p, id: Date.now() + index + Math.random()}; 
            if (!mappedPlayer.bannedPositions) mappedPlayer.bannedPositions = []; 
            return mappedPlayer; 
        })]; 
        chartInstances = {}; 
        updatePlayerList(); 
        renderPositionMap(); 
        alert(`"${targetDbName}" adlı havuz mevcut listeye başarıyla aktarıldı.`); 
        localStorage.setItem('last_used_db', targetDbName); 
    } 
}

function updateDatabase(event) { 
    if (event) event.preventDefault(); 
    const targetDbName = document.getElementById('dbSelect')?.value; 
    if (!targetDbName) return; 
    const memoryDatabases = getSavedDatabases(); 
    memoryDatabases[targetDbName] = currentPlayers; 
    applyDatabasesToMemory(memoryDatabases); 
    alert(`Veritabanı başarıyla güncellendi.`); 
    localStorage.setItem('last_used_db', targetDbName); 
}

function deleteDatabase(event) { 
    if (event) event.preventDefault(); 
    const targetDbName = document.getElementById('dbSelect')?.value; 
    if (!targetDbName) return; 
    if (confirm(`İlgili veritabanı kaydını kalıcı olarak silmek istediğinize emin misiniz?`)) { 
        const memoryDatabases = getSavedDatabases(); 
        delete memoryDatabases[targetDbName]; 
        applyDatabasesToMemory(memoryDatabases); 
        if (localStorage.getItem('last_used_db') === targetDbName) localStorage.removeItem('last_used_db'); 
    } 
}

function selectRandomPlayers(event) { 
    if (event) event.preventDefault(); 
    const formatConfiguration = Number(document.getElementById('matchFormat')?.value || 7); 
    const requiredPlayerCount = formatConfiguration * 2; 
    if (currentPlayers.length < requiredPlayerCount) return alert(`İşlemin gerçekleşmesi için havuzda en az ${requiredPlayerCount} aktif oyuncu bulunmalıdır.`); 
    
    currentPlayers.forEach(p => p.selected = false); 
    const goalkeeperList = currentPlayers.filter(p => p.mainPos === 'GK').sort(() => Math.random() - 0.5); 
    const fieldPlayerList = currentPlayers.filter(p => p.mainPos !== 'GK').sort(() => Math.random() - 0.5); 
    
    let activeSelectionCount = 0; 
    if (goalkeeperList.length >= 2) { 
        goalkeeperList[0].selected = true; 
        goalkeeperList[1].selected = true; 
        activeSelectionCount += 2; 
    } else { 
        goalkeeperList.forEach(gk => { gk.selected = true; activeSelectionCount++; }); 
    } 
    
    for(let i=0; i<fieldPlayerList.length && activeSelectionCount < requiredPlayerCount; i++) { 
        fieldPlayerList[i].selected = true; 
        activeSelectionCount++; 
    } 
    updatePlayerList(); 
}

function getOvrForPosition(player, pos, role, capacity, applyCondition = false) {
    const basePosName = getBasePosition(pos);
    if (player.bannedPositions && player.bannedPositions.includes(basePosName)) return 0;
    
    const weightsConfig = ROLE_WEIGHTS[basePosName]?.[role];
    const acquireStat = statTarget => player.stats[statTarget] ?? (statTarget === 'sut' ? player.stats.şut : statTarget === 'firsat' ? player.stats.fırsat : 0);
    const conditionalMultiplier = applyCondition ? (CONDITIONS[player.condition] || 1.0) : 1.0;
    
    let baseCalculatedOvr = 0;
    
    if (weightsConfig) {
        let totalScoreCalculation = 0, totalWeightAccumulation = 0;
        for (const [statRef, weightRef] of Object.entries(weightsConfig)) { 
            if (weightRef > 0) { 
                let currentConditionStatus = conditionalMultiplier;
                if (basePosName === 'GK' && !['savunma', 'dribling', 'hava'].includes(statRef)) {
                    currentConditionStatus = 1.0;
                }
                totalScoreCalculation += (acquireStat(statRef) * currentConditionStatus) * weightRef; 
                totalWeightAccumulation += weightRef; 
            } 
        }
        if (totalWeightAccumulation > 0) baseCalculatedOvr = Math.round(totalScoreCalculation / totalWeightAccumulation);
    } else {
        let derivedSutData = basePosName === 'GK' ? player.stats.sutKarsilama || 0 : acquireStat('sut');
        baseCalculatedOvr = Math.round(((player.stats.pas || 0)*conditionalMultiplier + (player.stats.savunma || 0)*conditionalMultiplier + (player.stats.dribling || 0)*conditionalMultiplier + (player.stats.hava || 0)*conditionalMultiplier + acquireStat('firsat')*conditionalMultiplier + derivedSutData*conditionalMultiplier) / 6);
    }
    
    return Math.round(baseCalculatedOvr * (capacity / 100));
}

function getEffectivePlayerInfo(player, applyCondition = false) {
    const activeMainPosition = player.mainPos;
    const activeMainBase = getBasePosition(activeMainPosition);
    const currentBannedList = player.bannedPositions || [];
    const mainPosIsBannedStatus = currentBannedList.includes(activeMainPosition) || currentBannedList.includes(activeMainBase);

    let activeFunctionalRole = player.role;
    if (!activeFunctionalRole || activeFunctionalRole === 'null') activeFunctionalRole = getBestRoleForStats(activeMainBase, player.stats);

    if (!mainPosIsBannedStatus) {
        return { 
            original: activeMainPosition, 
            active: activeMainPosition, 
            activeRole: activeFunctionalRole, 
            ovr: getOvrForPosition(player, activeMainPosition, activeFunctionalRole, 100, applyCondition), 
            isBanned: false 
        };
    }

    let optimalSecondaryPos = null; let optimalSecondaryRole = null; let highestPotentialOvr = -1;
    if (player.secondaryPositions && player.secondaryPositions.length > 0) {
        player.secondaryPositions.forEach(secondary => {
            const secondaryBaseName = getBasePosition(secondary.pos);
            if (!currentBannedList.includes(secondary.pos) && !currentBannedList.includes(secondaryBaseName)) {
                let functionalSecondaryRole = secondary.role;
                if (!functionalSecondaryRole || functionalSecondaryRole === 'null') functionalSecondaryRole = getBestRoleForStats(secondaryBaseName, player.stats);
                
                const derivedOvr = getOvrForPosition(player, secondary.pos, functionalSecondaryRole, secondary.capacity, applyCondition);
                if (derivedOvr > highestPotentialOvr) { highestPotentialOvr = derivedOvr; optimalSecondaryPos = secondary.pos; optimalSecondaryRole = functionalSecondaryRole; }
            }
        });
    }

    if (optimalSecondaryPos) return { original: activeMainPosition, active: optimalSecondaryPos, activeRole: optimalSecondaryRole, ovr: highestPotentialOvr, isBanned: true };
    return { original: activeMainPosition, active: 'Yok', activeRole: '-', ovr: 0, isBanned: true };
}

function getPitchName(player, allAvailablePlayers) {
    let finalName = '';
    
    if (player.shortName && player.shortName.trim() !== '') {
        finalName = player.shortName.trim();
    } else {
        const primaryName = player.firstName || player.name.split(' ')[0];
        const surName = player.lastName || player.name.split(' ').slice(1).join(' ');
        const potentialDuplicates = allAvailablePlayers.filter(p => (p.firstName || p.name.split(' ')[0]).toLowerCase() === primaryName.toLowerCase());
        
        if (potentialDuplicates.length > 1 && surName && surName.trim() !== '') {
            finalName = `${primaryName} ${surName.trim().charAt(0)}.`;
        } else {
            finalName = primaryName;
        }
    }
    
    // Düzenli ifade (Regex) ile parantez içindeki kelimeleri bulur ve aralarındaki boşluğu bölünmez boşluğa çevirir.
    return finalName.replace(/\(([^)]+)\)/g, match => match.replace(/ /g, '\u00A0'));
}

function openPlayerDetailModal(playerDataInfo) {
    const condMultiplierStatus = CONDITIONS[playerDataInfo.cond] || 1.0;
    const readableStatLabels = { 'pas': 'Pas D.', 'savunma': 'Sav', 'sut': 'Şut', 'dribling': 'Dribling', 'firsat': 'Fırsat Y.', 'hava': 'Hava', 'sutKarsilama': 'Şut Karşılama' };
    
    let generatedDetailsHtml = `
        <div style="padding:15px; border-radius:6px; margin-bottom:15px; font-size:1.05em; background: var(--bg-detail); color: var(--text-main); border: 1px solid var(--border-color);">
            <b>Mevki:</b> ${playerDataInfo.basePos} | 
            <b>Rol:</b> <span style="color:#2ecc71;">${playerDataInfo.role}</span> <br>
            <b>Mevki Kapasitesi:</b> <span style="color:${playerDataInfo.cap===100?'#2ecc71':(playerDataInfo.cap>50?'#f39c12':'#e74c3c')};">%${playerDataInfo.cap}</span> | 
            <b>Kondisyon:</b> <span style="margin-right:5px;">${getConditionHeart(playerDataInfo.cond)}</span> ${playerDataInfo.cond} (Çarpan: x${condMultiplierStatus})
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
    
    let absoluteTotalContribution = 0;
    const operationalKeys = playerDataInfo.basePos === 'GK' ? ['pas', 'savunma', 'sutKarsilama', 'dribling', 'firsat', 'hava'] : ['pas', 'savunma', 'sut', 'dribling', 'firsat', 'hava'];
    
    operationalKeys.forEach(statKey => {
        const attributeWeight = playerDataInfo.weights[statKey] || 0;
        let attributeRawValue = playerDataInfo.stats[statKey] !== undefined ? playerDataInfo.stats[statKey] : 0;
        
        if (statKey === 'sut' && attributeRawValue === 0) attributeRawValue = playerDataInfo.stats['şut'] || 0;
        if (statKey === 'firsat' && attributeRawValue === 0) attributeRawValue = playerDataInfo.stats['fırsat'] || 0;

        const bypassConditionFactor = playerDataInfo.basePos === 'GK' && !['savunma', 'dribling', 'hava'].includes(statKey);
        const dynamicConditionMultiplier = bypassConditionFactor ? 1.0 : condMultiplierStatus;
        
        const validatedContribution = attributeRawValue * (attributeWeight/100) * (playerDataInfo.cap/100) * dynamicConditionMultiplier;
        absoluteTotalContribution += validatedContribution;
        
        const displayLabel = readableStatLabels[statKey] || statKey;
        
        const exemptionNotification = (bypassConditionFactor && condMultiplierStatus !== 1.0 && attributeWeight > 0) ? `<br><span style="font-size:0.7em; color:#f39c12;">(Kondisyondan Etkilenmez)</span>` : ``;
        const renderingRowStyle = attributeWeight === 0 ? "opacity: 0.5;" : "";

        generatedDetailsHtml += `<tr style="${renderingRowStyle}">
            <td style="padding:8px; font-weight:bold;">${displayLabel}</td>
            <td style="padding:8px; font-weight:bold; text-align:center;">${attributeRawValue}</td>
            <td style="padding:8px; color:var(--text-muted);">%${attributeWeight}</td>
            <td style="padding:8px; color:#2ecc71; font-weight:bold;">+${validatedContribution.toFixed(1)}${exemptionNotification}</td>
        </tr>`;
    });

    generatedDetailsHtml += `</table>
    <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-size:1.2em; font-weight: bold;">Toplam OVR Katkısı: <b style="color:#27ae60; font-size:1.3em;">${absoluteTotalContribution.toFixed(1)}</b></div>
    </div>`;
    
    document.getElementById('modalTitle').innerText = playerDataInfo.name + " (" + playerDataInfo.pOvr + " OVR)";
    document.getElementById('modalBody').innerHTML = generatedDetailsHtml;
    document.getElementById('playerModal').style.display = 'flex';
}

function generateMiniPitchHTML(playerContext, containerWidth = "140px") {
    const positionLayoutData = { 
        "FW": {x: 50, y: 12}, "LW": {x: 10, y: 27}, "AM": {x: 50, y: 27}, "RW": {x: 90, y: 27}, 
        "LM": {x: 10, y: 42}, "CM": {x: 50, y: 42}, "RM": {x: 90, y: 42}, 
        "LWB": {x: 10, y: 57}, "DM": {x: 50, y: 57}, "RWB": {x: 90, y: 57}, 
        "LB": {x: 10, y: 72}, "CB": {x: 50, y: 72}, "RB": {x: 90, y: 72}, 
        "GK": {x: 50, y: 87} 
    };
    
    let renderedNodesHTML = '';
    const originPositionBase = getBasePosition(playerContext.mainPos);
    let functionalMainRole = playerContext.role;
    if (!functionalMainRole || functionalMainRole === 'null') functionalMainRole = getBestRoleForStats(originPositionBase, playerContext.stats);
    
    const contextSecondaryPositions = playerContext.secondaryPositions || [];
    const contextBannedPositions = playerContext.bannedPositions || [];
    const internalPlayerId = playerContext.id || ''; 
    const interactionClassFlag = internalPlayerId ? 'pitch-node-clickable' : ''; 

    Object.keys(positionLayoutData).forEach(iteratingPos => {
        const isCurrentlyMain = originPositionBase === iteratingPos;
        const matchingSecondaryInfo = contextSecondaryPositions.find(sp => getBasePosition(sp.pos) === iteratingPos);
        const isCurrentlySecondary = !!matchingSecondaryInfo;
        const isCurrentlyBanned = contextBannedPositions.includes(iteratingPos);

        let activeBackground, activeBorder, displayContent, structuralSize, depthIndex, structuralOpacity, tooltipStringData;

        if (isCurrentlyBanned) {
            activeBackground = '#c0392b'; activeBorder = '1px solid white'; displayContent = 'X'; structuralSize = 20; depthIndex = 10; structuralOpacity = 1;
            tooltipStringData = `<b>${iteratingPos}</b> <span style="color:#e74c3c;">(Yasaklı)</span>`;
        } else if (isCurrentlyMain) {
            const runtimeOvr = getOvrForPosition(playerContext, iteratingPos, functionalMainRole, 100, false);
            activeBackground = '#00d2d3'; activeBorder = '2px solid white'; displayContent = iteratingPos; structuralSize = 24; depthIndex = 8; structuralOpacity = 1;
            tooltipStringData = `<b>${iteratingPos} (Ana)</b><br><span style="color:#f39c12;">${functionalMainRole}</span><br><span style="color:${getStatColor(runtimeOvr)};">${runtimeOvr} OVR</span>`;
        } else if (isCurrentlySecondary) {
            let contextualSecRole = matchingSecondaryInfo.role;
            if (!contextualSecRole || contextualSecRole === 'null') contextualSecRole = getBestRoleForStats(iteratingPos, playerContext.stats);
            const runtimeOvr = getOvrForPosition(playerContext, iteratingPos, contextualSecRole, matchingSecondaryInfo.capacity, false);
            activeBackground = matchingSecondaryInfo.capacity === 100 ? '#00d2d3' : `hsl(${Math.floor((matchingSecondaryInfo.capacity / 100) * 120)}, 80%, 45%)`;
            activeBorder = '1px solid white'; displayContent = iteratingPos; structuralSize = 20; depthIndex = 7; structuralOpacity = 1;
            tooltipStringData = `<b>${iteratingPos} (Yan) - %${matchingSecondaryInfo.capacity}</b><br><span style="color:#f39c12;">${contextualSecRole}</span><br><span style="color:${getStatColor(runtimeOvr)};">${runtimeOvr} OVR</span>`;
        } else {
            activeBackground = 'rgba(255,255,255,0.1)'; activeBorder = '1px dashed rgba(255,255,255,0.4)'; displayContent = ''; structuralSize = 16; depthIndex = 5; structuralOpacity = 0.6;
            tooltipStringData = `<b>${iteratingPos}</b><br><span style="color:var(--text-muted);">(Kapat)</span>`;
        }

        renderedNodesHTML += `
        <div class="custom-tooltip ${interactionClassFlag}" data-pid="${internalPlayerId}" data-pos="${iteratingPos}" style="position: absolute; left: ${positionLayoutData[iteratingPos].x}%; top: ${positionLayoutData[iteratingPos].y}%; transform: translate(-50%, -50%); width: ${structuralSize}px; height: ${structuralSize}px; border-radius: 50%; background-color: ${activeBackground}; border: ${activeBorder}; box-shadow: 0 2px 4px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 0.5em; font-weight: bold; color: ${isCurrentlyBanned ? 'white' : 'black'}; z-index: ${depthIndex}; opacity: ${structuralOpacity}; transition: all 0.15s ease;">
            ${displayContent}
            <span class="tooltip-text">${tooltipStringData}</span>
        </div>`;
    });

    return `
        <div style="position: relative; width: ${containerWidth}; max-width: 100%; aspect-ratio: 1/1.7; background: transparent; border: 2px solid rgba(255,255,255,0.7); border-radius: 4px; box-shadow: inset 0 0 10px rgba(0,0,0,0.3);">
            <div style="position: absolute; top: 0; left: 20%; width: 60%; height: 16%; border: 1px solid rgba(255,255,255,0.4); border-top: none;"></div>
            <div style="position: absolute; bottom: 0; left: 20%; width: 60%; height: 16%; border: 1px solid rgba(255,255,255,0.4); border-bottom: none;"></div>
            <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 1px; background: rgba(255,255,255,0.4); transform: translateY(-50%);"></div>
            <div style="position: absolute; top: 50%; left: 50%; width: 40px; height: 40px; border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; transform: translate(-50%, -50%);"></div>
            ${renderedNodesHTML}
        </div>`;
}

function generateTacticalPitchHTML(lineupData, interfaceTitle, specifiedTeamColor = '#00d2d3', teamIdentifier = 'A', cardSequenceIndex = 0) {
    if (!lineupData) return '';
    
    const configurationUsesTeamColors = document.getElementById('cbTeamColors')?.checked;

    const targetSlotCoordinates = { 
        "LFW": {x: 20, y: 10}, "FW": {x: 50, y: 10}, "RFW": {x: 80, y: 10}, 
        "LW": {x: 10, y: 26}, "LAM": {x: 30, y: 26}, "AM": {x: 50, y: 26}, "RAM": {x: 70, y: 26}, "RW": {x: 90, y: 26}, 
        "LM": {x: 10, y: 42}, "LCM": {x: 30, y: 42}, "CM": {x: 50, y: 42}, "RCM": {x: 70, y: 42}, "RM": {x: 90, y: 42}, 
        "LWB": {x: 10, y: 58}, "LDM": {x: 30, y: 58}, "DM": {x: 50, y: 58}, "RDM": {x: 70, y: 58}, "RWB": {x: 90, y: 58}, 
        "LB": {x: 10, y: 74}, "LCB": {x: 30, y: 74}, "CB": {x: 50, y: 74}, "RCB": {x: 70, y: 74}, "RB": {x: 90, y: 74}, 
        "GK": {x: 50, y: 90} 
    };
    
    let constructedPlayersHTML = '';
    
    Object.keys(targetSlotCoordinates).forEach(slotReferenceKey => {
        const correspondingPositionData = targetSlotCoordinates[slotReferenceKey];
        const assignedItemContext = lineupData.lineup.find(itemObj => itemObj.slot === slotReferenceKey);

        if (assignedItemContext && assignedItemContext.player) {
            let activePlayingRole = assignedItemContext.role;
            if (!activePlayingRole || activePlayingRole === 'null') activePlayingRole = getBestRoleForStats(assignedItemContext.basePos, assignedItemContext.player.stats);
            
            const realTimeOvr = getOvrForPosition(assignedItemContext.player, assignedItemContext.slot, activePlayingRole, assignedItemContext.cap, true);
            const definedWeightsProfile = ROLE_WEIGHTS[assignedItemContext.basePos]?.[activePlayingRole] || {};
            const playerInterfaceInfo = { cond: assignedItemContext.player.condition, basePos: assignedItemContext.basePos, role: activePlayingRole, cap: assignedItemContext.cap, weights: definedWeightsProfile, stats: assignedItemContext.player.stats, name: assignedItemContext.player.name, pOvr: assignedItemContext.pOvr };
            const encodedPlayerInterfaceInfo = encodeURIComponent(JSON.stringify(playerInterfaceInfo));
            
            let primaryCircleColor = specifiedTeamColor; 
            let warningSystemIcon = '';

            if (assignedItemContext.outOfPos) { 
                warningSystemIcon = `<div class="pitch-player-alert" style="position:absolute; top:-8px; right:-8px; font-size:16px; text-shadow: 1px 1px 2px #000; z-index: 10;">⚠️</div>`; 
                primaryCircleColor = '#e74c3c'; 
            } else if (configurationUsesTeamColors) {
                primaryCircleColor = teamIdentifier === 'A' ? '#3498db' : '#e74c3c'; 
            } else {
                if (assignedItemContext.isMain || (assignedItemContext.isSec && assignedItemContext.cap === 100)) { primaryCircleColor = '#00d2d3'; } 
                else if (assignedItemContext.isSec) { primaryCircleColor = `hsl(${Math.floor(((assignedItemContext.cap || 50) / 100) * 120)}, 80%, 45%)`; }
            }

            const identifierNameColor = assignedItemContext.player.isTest ? '#2ecc71' : 'white';
            
            // max-content kaldırıldı, width 85px olarak sabitlendi. Alt satıra inmesi sağlandı.
            constructedPlayersHTML += `
                <div class="pitch-player" draggable="true" data-card="${cardSequenceIndex}" data-team="${teamIdentifier}" data-slot="${assignedItemContext.slot}" data-pinfo="${encodedPlayerInterfaceInfo}" style="position: absolute; left: ${correspondingPositionData.x}%; top: ${correspondingPositionData.y}%; z-index: 5; cursor: grab; transition: transform 0.15s ease;">
                    <div class="pitch-player-icon" style="background-color: ${primaryCircleColor};">${warningSystemIcon}</div>
                    <div class="pitch-player-label" style="width: 85px; text-align: center; margin: 0 auto;">
                        <div style="display: flex; justify-content: center; align-items: baseline; gap: 4px; margin-bottom: 2px;">
                            <span style="color:#ecf0f1; font-weight:bold; font-size: 0.85em;">${assignedItemContext.slot}</span>
                            <span class="pitch-ovr-text" style="color:${getStatColor(realTimeOvr)}; font-weight:bold; font-size: 1.1em; line-height: 1;">${realTimeOvr}</span>
                            <span class="cond-icon" style="display: flex; align-items: center;">${getConditionHeart(assignedItemContext.player.condition, 14)}</span>
                        </div>
                        <div style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; white-space: normal; overflow-wrap: break-word; line-height: 1.15; font-size: 0.9em; color:${identifierNameColor}; font-weight: 800;">${getPitchName(assignedItemContext.player, currentPlayers)}</div>
                    </div>
                </div>`;
        } else {
            constructedPlayersHTML += `
                <div class="pitch-empty-slot custom-tooltip" data-card="${cardSequenceIndex}" data-team="${teamIdentifier}" data-slot="${slotReferenceKey}" style="position: absolute; left: ${correspondingPositionData.x}%; top: ${correspondingPositionData.y}%; z-index: 4; width: 36px; height: 36px; transform: translate(-50%, -50%); border: 2px dashed rgba(255,255,255,0.4); border-radius: 50%; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; font-size: 0.9em; font-weight: bold; color: rgba(255,255,255,0.5); transition: opacity 0.2s ease, background 0.2s ease, border-color 0.2s ease;">
                    <span class="tooltip-text">${slotReferenceKey} (Boş)</span>
                </div>`;
        }
    });

    const definedHeaderColor = teamIdentifier === 'A' ? '#3498db' : '#e74c3c';

    return `
        <div class="pitch-container">
            <h4 class="pitch-title" style="color: ${definedHeaderColor}; border-bottom-color: ${definedHeaderColor}; margin-top: 0; padding-bottom: 5px;">${interfaceTitle} (${lineupData.formationName})</h4>
            <div class="pitch-inner">
                <div style="position: absolute; top: 0; left: 20%; width: 60%; height: 16%; border: 2px solid rgba(255,255,255,0.5); border-top: none;"></div>
                <div style="position: absolute; top: 0; left: 35%; width: 30%; height: 6%; border: 2px solid rgba(255,255,255,0.5); border-top: none;"></div>
                <div style="position: absolute; bottom: 0; left: 20%; width: 60%; height: 16%; border: 2px solid rgba(255,255,255,0.5); border-bottom: none;"></div>
                <div style="position: absolute; bottom: 0; left: 35%; width: 30%; height: 6%; border: 2px solid rgba(255,255,255,0.5); border-bottom: none;"></div>
                <div style="position: absolute; top: 50%; left: 0; width: 100%; height: 2px; background: rgba(255,255,255,0.5); transform: translateY(-50%);"></div>
                <div style="position: absolute; top: 50%; left: 50%; width: 60px; height: 60px; border: 2px solid rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%);"></div>
                <div style="position: absolute; top: 50%; left: 50%; width: 6px; height: 6px; background: rgba(255,255,255,0.5); border-radius: 50%; transform: translate(-50%, -50%);"></div>
                ${constructedPlayersHTML}
            </div>
        </div>`;
}

function updateLiveRoles() {
    const collectedStatsObj = { 
        pas: Number(document.getElementById('sPas')?.value) || 0, savunma: Number(document.getElementById('sSavunma')?.value) || 0, 
        sut: Number(document.getElementById('sSut')?.value) || 0, dribling: Number(document.getElementById('sDribling')?.value) || 0, 
        firsat: Number(document.getElementById('sFirsat')?.value) || 0, hava: Number(document.getElementById('sHava')?.value) || 0, sutKarsilama: Number(document.getElementById('sSutKar')?.value) || 0 
    };
    const rawPosSelection = document.getElementById('pMainPos')?.value || 'CB';
    const parsedMainPos = getBasePosition(rawPosSelection);
    const assignedSecPositionsArray = [];
    let establishedMainRole = ''; 

    const transientDummyPlayer = { stats: collectedStatsObj, condition: document.getElementById('pCond')?.value || "Tam", bannedPositions: [] };

    document.querySelectorAll('.pos-btn-group').forEach(btnGroupContainer => {
        const iterationalPos = btnGroupContainer.dataset.pos; 
        const innerRoleSelectNode = btnGroupContainer.querySelector('.role-select');
        const internalOvrLabelNode = btnGroupContainer.querySelector('.node-ovr');
        
        if (innerRoleSelectNode && ROLE_WEIGHTS && ROLE_WEIGHTS[iterationalPos]) {
            const calculatedBestRole = getBestRoleForStats(iterationalPos, collectedStatsObj);
            
            Array.from(innerRoleSelectNode.options).forEach(optNode => { 
                if(optNode.value === calculatedBestRole) optNode.text = `⭐ ${optNode.value}`; 
                else if(optNode.value !== "") optNode.text = optNode.value; 
            });
            
            const isTargetPosMain = (iterationalPos === parsedMainPos);
            const isTargetPosSec = btnGroupContainer.classList.contains('active-sec') && !isTargetPosMain;

            let validatedActiveRole = innerRoleSelectNode.value || calculatedBestRole;
            let resultingCapacityVal = 0;

            btnGroupContainer.style.backgroundColor = 'var(--bg-panel)'; 
            btnGroupContainer.style.borderColor = 'var(--border-color)'; 
            const iterationalNameLabel = btnGroupContainer.querySelector('.node-name');
            if (iterationalNameLabel) iterationalNameLabel.style.color = 'var(--text-main)';

            if (isTargetPosMain) {
                btnGroupContainer.classList.add('main-pos'); btnGroupContainer.classList.remove('active-sec');
                if (btnGroupContainer.dataset.manual !== 'true') innerRoleSelectNode.value = ""; 
                establishedMainRole = innerRoleSelectNode.value; innerRoleSelectNode.style.display = 'block';
                btnGroupContainer.style.backgroundColor = '#00d2d3'; 
                btnGroupContainer.style.borderColor = '#00d2d3'; 
                resultingCapacityVal = 100;
                if(iterationalNameLabel) iterationalNameLabel.style.color = '#1a252f';
            } else if (isTargetPosSec) {
                btnGroupContainer.classList.remove('main-pos');
                if (btnGroupContainer.dataset.manual !== 'true') innerRoleSelectNode.value = ""; 
                resultingCapacityVal = Number(btnGroupContainer.querySelector('.cap-input').value) || 80;
                assignedSecPositionsArray.push({pos: iterationalPos, capacity: resultingCapacityVal, role: innerRoleSelectNode.value});
                const contextualSecControlsPanel = btnGroupContainer.querySelector('.sec-controls'); if (contextualSecControlsPanel) contextualSecControlsPanel.style.display = 'flex';
                
                let dynamicHueCalc = Math.floor(((resultingCapacityVal - 25) / 75) * 120);
                if(dynamicHueCalc < 0) dynamicHueCalc = 0; if(dynamicHueCalc > 120) dynamicHueCalc = 120;
                const evaluatedDynamicColor = resultingCapacityVal === 100 ? '#00d2d3' : `hsl(${dynamicHueCalc}, 80%, 45%)`;
                
                btnGroupContainer.style.backgroundColor = evaluatedDynamicColor; 
                btnGroupContainer.style.borderColor = evaluatedDynamicColor; 
                if(iterationalNameLabel) iterationalNameLabel.style.color = '#1a252f';
            } else { 
                btnGroupContainer.classList.remove('main-pos', 'active-sec');
                const contextualSecControlsPanel = btnGroupContainer.querySelector('.sec-controls'); if (contextualSecControlsPanel) contextualSecControlsPanel.style.display = 'none';
            }

            if (isTargetPosMain || isTargetPosSec) {
                let generatedOvrVal = getOvrForPosition(transientDummyPlayer, iterationalPos, validatedActiveRole, resultingCapacityVal, false);
                internalOvrLabelNode.innerText = generatedOvrVal;
                internalOvrLabelNode.style.backgroundColor = getStatColor(generatedOvrVal);
                internalOvrLabelNode.style.color = '#fff';
            } else {
                internalOvrLabelNode.innerText = '--';
                internalOvrLabelNode.style.backgroundColor = 'rgba(0,0,0,0.1)';
                internalOvrLabelNode.style.color = 'inherit';
            }
        }
    });

    if (editingPlayerId) {
        const foundPlayerIndex = currentPlayers.findIndex(pObj => String(pObj.id) === String(editingPlayerId));
        if (foundPlayerIndex !== -1) {
            currentPlayers[foundPlayerIndex].stats = collectedStatsObj;
            currentPlayers[foundPlayerIndex].mainPos = parsedMainPos;
            currentPlayers[foundPlayerIndex].role = establishedMainRole || currentPlayers[foundPlayerIndex].role;
            currentPlayers[foundPlayerIndex].secondaryPositions = assignedSecPositionsArray.map(secMap => {
                if(secMap.role === "") secMap.role = getBestRoleForStats(secMap.pos, collectedStatsObj);
                return secMap;
            });
            currentPlayers[foundPlayerIndex].condition = document.getElementById('pCond')?.value || "Tam";
            currentPlayers[foundPlayerIndex].firstName = document.getElementById('pName')?.value.trim() || "İsimsiz";
            const collectedLastNameData = document.getElementById('pLastName')?.value.trim() || "";
            currentPlayers[foundPlayerIndex].lastName = collectedLastNameData;
            currentPlayers[foundPlayerIndex].name = collectedLastNameData ? `${currentPlayers[foundPlayerIndex].firstName} ${collectedLastNameData}` : currentPlayers[foundPlayerIndex].firstName;
            currentPlayers[foundPlayerIndex].shortName = document.getElementById('pShortName')?.value.trim() || "";
        }
    }
}

function renderPositionMap() {
    const parentMapContainer = document.getElementById('secPosMap');
    const extractRawPosData = document.getElementById('pMainPos')?.value || 'CB';
    const computedMainPos = getBasePosition(extractRawPosData);
    if(!parentMapContainer) return;
    
    const preservedSecondaryState = {};
    document.querySelectorAll('.pos-btn-group').forEach(btnGroupContainer => {
        const targetPosData = btnGroupContainer.dataset.pos;
        if (btnGroupContainer.classList.contains('active-sec')) {
            preservedSecondaryState[targetPosData] = { cap: btnGroupContainer.querySelector('.cap-input')?.value || 80, role: btnGroupContainer.querySelector('.role-select')?.value };
        }
    });

    parentMapContainer.innerHTML = `
        <div class="pitch-center-line"></div>
        <div class="pitch-center-circle"></div>
    `;

const generatedPitchCoords = {
        "FW": { top: '10%', left: '50%' },
        "LW": { top: '26%', left: '15%' },
        "RW": { top: '26%', left: '85%' },
        "AM": { top: '26%', left: '50%' },
        "LM": { top: '42%', left: '15%' },
        "CM": { top: '42%', left: '50%' },
        "RM": { top: '42%', left: '85%' },
        "LWB": { top: '58%', left: '15%' },
        "DM": { top: '58%', left: '50%' },
        "RWB": { top: '58%', left: '85%' },
        "LB": { top: '74%', left: '15%' },
        "CB": { top: '74%', left: '50%' },
        "RB": { top: '74%', left: '85%' },
        "GK": { top: '90%', left: '50%' }
    };

    ALL_POSITIONS.forEach(generatedPosItem => {
      const parentGroupElementNode = document.createElement('div');
      parentGroupElementNode.className = `pos-btn-group ${generatedPosItem === computedMainPos ? 'main-pos' : ''}`;
      parentGroupElementNode.dataset.pos = generatedPosItem;
      parentGroupElementNode.style.top = generatedPitchCoords[generatedPosItem].top;
      parentGroupElementNode.style.left = generatedPitchCoords[generatedPosItem].left;
      
      let contextualHTMLPayload = `
        <div class="node-header">
            <span class="node-name">${generatedPosItem}</span>
            <span class="node-ovr">--</span>
        </div>`;
      
      if (generatedPosItem === computedMainPos) {
          contextualHTMLPayload += `<select class="role-select" style="display:none;"></select>`;
      } else {
          contextualHTMLPayload += `
          <div class="sec-controls">
              <div class="spinner-wrapper" style="height:24px; width:100%; display:flex;">
                  <button type="button" class="spin-btn minus">-</button>
                  <input type="number" class="cap-input" min="25" max="100" step="5" value="80" style="flex:1;">
                  <button type="button" class="spin-btn plus">+</button>
              </div>
              <select class="role-select"></select>
          </div>`;
      }
      parentGroupElementNode.innerHTML = contextualHTMLPayload;
      
      const referenceRoleSelectNode = parentGroupElementNode.querySelector('.role-select');
      if (ROLE_WEIGHTS && ROLE_WEIGHTS[generatedPosItem]) {
          const defaultEmptyOption = document.createElement('option'); defaultEmptyOption.value = ""; defaultEmptyOption.text = "Rol Seçiniz"; defaultEmptyOption.disabled = true; defaultEmptyOption.selected = true; referenceRoleSelectNode.appendChild(defaultEmptyOption);
          Object.keys(ROLE_WEIGHTS[generatedPosItem]).forEach(rConfig => { const generatedOptionNode = document.createElement('option'); generatedOptionNode.value = rConfig; generatedOptionNode.text = rConfig; referenceRoleSelectNode.appendChild(generatedOptionNode); });
      }
      
      referenceRoleSelectNode.addEventListener('change', () => { parentGroupElementNode.dataset.manual = 'true'; updateLiveRoles(); });
      
      if (generatedPosItem !== computedMainPos) {
          const capInputNodeReference = parentGroupElementNode.querySelector('.cap-input');
          capInputNodeReference.addEventListener('input', () => updateLiveRoles());
          parentGroupElementNode.querySelector('.minus').addEventListener('click', eventParam => { eventParam.stopPropagation(); capInputNodeReference.value = Math.max(25, Number(capInputNodeReference.value) - 5); updateLiveRoles(); });
          parentGroupElementNode.querySelector('.plus').addEventListener('click', eventParam => { eventParam.stopPropagation(); capInputNodeReference.value = Math.min(100, Number(capInputNodeReference.value) + 5); updateLiveRoles(); });
      }

      if (preservedSecondaryState[generatedPosItem] && generatedPosItem !== computedMainPos) {
          parentGroupElementNode.classList.add('active-sec');
          const capacityInputValueCheck = parentGroupElementNode.querySelector('.cap-input'); if(capacityInputValueCheck) capacityInputValueCheck.value = preservedSecondaryState[generatedPosItem].cap;
          const roleSelectorValueCheck = parentGroupElementNode.querySelector('.role-select'); if(roleSelectorValueCheck) roleSelectorValueCheck.value = preservedSecondaryState[generatedPosItem].role;
          parentGroupElementNode.dataset.manual = 'true';
      }

      parentGroupElementNode.addEventListener('click', (eventParam) => {
          if(eventParam.target.closest('.sec-controls') || eventParam.target.closest('.role-select')) return;
          const isIdentifiedAsMainCheck = parentGroupElementNode.dataset.pos === getBasePosition(document.getElementById('pMainPos')?.value || 'CB');
          if (!isIdentifiedAsMainCheck) { parentGroupElementNode.classList.toggle('active-sec'); updateLiveRoles(); }
      });
      
      parentMapContainer.appendChild(parentGroupElementNode);
    });
    updateLiveRoles(); 
}

function handlePlayerAdditionProcess(eventParam) {
    if(eventParam) eventParam.preventDefault();
    
    const acquiredRawMainPos = document.getElementById('pMainPos')?.value || "CB";
    const establishedMainPosLogic = getBasePosition(acquiredRawMainPos); 
    const mainGroupInterfaceNode = document.querySelector(`.pos-btn-group.main-pos`);
    
    let verifiedMainRoleData = mainGroupInterfaceNode && mainGroupInterfaceNode.querySelector('.role-select') ? mainGroupInterfaceNode.querySelector('.role-select').value : "";
    
    if (verifiedMainRoleData === "") {
        alert("Geçerli bir ana mevki rolü seçmeniz gerekmektedir.");
        return;
    }

    let isMissingSecondaryRoleStatus = false;
    document.querySelectorAll('.pos-btn-group.active-sec').forEach(activeBtnNode => {
        let contextualSecRoleExtract = activeBtnNode.querySelector('.role-select') ? activeBtnNode.querySelector('.role-select').value : "";
        if (contextualSecRoleExtract === "") isMissingSecondaryRoleStatus = true;
    });

    if (isMissingSecondaryRoleStatus) {
        alert("Lütfen aktif ettiğiniz tüm yan mevkiler için geçerli bir rol tanımlayın.");
        return;
    }
    
    const configuredStatsObjectPayload = { 
        pas: Number(document.getElementById('sPas')?.value) || 0, savunma: Number(document.getElementById('sSavunma')?.value) || 0, 
        sut: Number(document.getElementById('sSut')?.value) || 0, şut: Number(document.getElementById('sSut')?.value) || 0,
        dribling: Number(document.getElementById('sDribling')?.value) || 0, firsat: Number(document.getElementById('sFirsat')?.value) || 0, fırsat: Number(document.getElementById('sFirsat')?.value) || 0, 
        hava: Number(document.getElementById('sHava')?.value) || 0, sutKarsilama: Number(document.getElementById('sSutKar')?.value) || 0 
    };

    const firstRegistrationNameParam = document.getElementById('pName')?.value.trim() || "İsimsiz";
    const lastRegistrationNameParam = document.getElementById('pLastName')?.value.trim() || "";
    const shortRegistrationNameParam = document.getElementById('pShortName')?.value.trim() || "";

    let currentExistingBansConfig = [];
    if (editingPlayerId) {
        const evaluatedEditingPlayer = currentPlayers.find(p => String(p.id) === String(editingPlayerId));
        if (evaluatedEditingPlayer && evaluatedEditingPlayer.bannedPositions) currentExistingBansConfig = JSON.parse(JSON.stringify(evaluatedEditingPlayer.bannedPositions)); 
    }

    const constructedPlayerDataObject = {
        id: editingPlayerId ? editingPlayerId : Date.now(),
        firstName: firstRegistrationNameParam, lastName: lastRegistrationNameParam, name: lastRegistrationNameParam ? `${firstRegistrationNameParam} ${lastRegistrationNameParam}` : firstRegistrationNameParam,
        shortName: shortRegistrationNameParam, mainPos: establishedMainPosLogic, role: verifiedMainRoleData, condition: document.getElementById('pCond')?.value || "Tam", stats: configuredStatsObjectPayload, selected: true, secondaryPositions: [],
        bannedPositions: currentExistingBansConfig 
    };

    document.querySelectorAll('.pos-btn-group.active-sec').forEach(activeBtnNode => {
        let extractingSecRoleFromNode = activeBtnNode.querySelector('.role-select').value;
        constructedPlayerDataObject.secondaryPositions.push({
            pos: getBasePosition(activeBtnNode.dataset.pos), role: extractingSecRoleFromNode,
            capacity: Math.max(25, Number(activeBtnNode.querySelector('.cap-input')?.value || 80))
        });
    });

    if (editingPlayerId) {
        const foundEditedPlayerIndex = currentPlayers.findIndex(p => String(p.id) === String(editingPlayerId));
        if (foundEditedPlayerIndex !== -1) currentPlayers[foundEditedPlayerIndex] = constructedPlayerDataObject;
        editingPlayerId = null;
        const mainAdditionBtnNode = document.getElementById('btnAddPlayer'); 
        if(mainAdditionBtnNode) { mainAdditionBtnNode.innerText = "Oyuncuyu Havuza Ekle"; mainAdditionBtnNode.className = "btn btn-green"; }
    } else { 
        currentPlayers.push(constructedPlayerDataObject); 
    }

    ['pName', 'pLastName', 'pShortName'].forEach(fieldIdRef => { if(document.getElementById(fieldIdRef)) document.getElementById(fieldIdRef).value = ""; });
    
    ['sPas', 'sSavunma', 'sSut', 'sDribling', 'sFirsat', 'sHava'].forEach(fieldIdRef => { if(document.getElementById(fieldIdRef)) document.getElementById(fieldIdRef).value = 40; });
    if(document.getElementById('sSutKar')) document.getElementById('sSutKar').value = 0;
    
    document.querySelectorAll('.pos-btn-group.active-sec').forEach(activeBtnNode => activeBtnNode.classList.remove('active-sec'));
    
    const uiCancelButtonNode = document.getElementById('btnCancelEdit');
    if (uiCancelButtonNode) uiCancelButtonNode.style.display = 'none';
    
    renderPositionMap(); updatePlayerList();
    updateLiveRoles();
}

function updatePlayerList() {
    const listElementNodeContainer = document.getElementById('playerListEl'); 
    if (!listElementNodeContainer) return;
    chartInstances = {};
    
    if (!document.getElementById('custom-layout-fixes')) {
        const styleFix = document.createElement('style');
        styleFix.id = 'custom-layout-fixes';
        styleFix.innerHTML = `
            .unselected-player-text {
                text-decoration: line-through;
                opacity: 0.5;
                filter: grayscale(100%);
            }
            .unselected-player-text * {
                text-decoration: line-through !important;
            }
            
            /* --- MASAÜSTÜ (DEFAULT) GÖRÜNÜM --- */
            .player-details-row {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                align-items: flex-start;
            }
            .pd-col-stats { flex: 1.5; min-width: 250px; }
            .pd-col-pitch { flex: 1; min-width: 140px; }
            .pd-col-sec { flex: 1; min-width: 140px; }
            
            /* MASAÜSTÜNDE GRAFİK BOYUTU BÜYÜTÜLDÜ (220px -> 280px) */
            .mobile-chart-wrap { position: relative; width: 100%; max-width: 280px; aspect-ratio: 1/1; margin: 10px auto 0 auto; display: flex; justify-content: center; }
            .mini-pitch-wrapper { width: 100%; max-width: 160px; margin: 0 auto; }
            .pitch-bg { background: var(--pitch-bg); border-radius: 4px; padding: 2px; }
            
            .mobile-actions-wrap { flex-basis: 100%; display: flex; gap: 15px; margin-top: 10px; border-top: 1px dashed var(--border-color); padding-top: 15px; }
            .btn-edit, .btn-delete { min-width: 120px; }

            /* --- SADECE MOBİL GÖRÜNÜM --- */
            @media (max-width: 600px) {
                .player-details-row {
                    display: grid !important;
                    grid-template-columns: 1fr 1fr;
                    grid-template-areas: 
                        "table table"
                        "chart pitch"
                        "sec sec"
                        "actions actions";
                    gap: 10px;
                    align-items: center;
                }
                .pd-col-stats { display: contents; }
                
                .mobile-table-wrap { grid-area: table; width: 100%; }
                
                .mobile-chart-wrap {
                    grid-area: chart;
                    width: 100%;
                    max-width: 100%; 
                    min-width: 0;
                    margin: 0;
                }
                .pd-col-pitch {
                    grid-area: pitch;
                    width: 100%;
                    max-width: 100%;
                    min-width: 0;
                    margin: 0;
                    display: flex;
                    justify-content: center;
                }
                .mini-pitch-wrapper { width: 100%; max-width: 100%; }
                
                .pd-col-sec { grid-area: sec; margin-top: 5px; }
                .mobile-actions-wrap { grid-area: actions; margin-top: 0; display: flex; }
                .btn-edit, .btn-delete { min-width: 0; flex: 1; }
                
                .pitch-label { font-size: 0.75em !important; }
                .pitch-sublabel { font-size: 0.7em !important; }
            }
        `;
        document.head.appendChild(styleFix);
    }

    const trackedOpenStatesDict = {};
    document.querySelectorAll('details.player-item, details.category-item').forEach(detNodeReference => { if (detNodeReference.open) trackedOpenStatesDict[detNodeReference.id] = true; });

    const formatConfigurationScale = Number(document.getElementById('matchFormat')?.value || 7);
    const calculatedRequirementThreshold = formatConfigurationScale * 2; 
    const activeSelectedPlayerCount = currentPlayers.filter(p => p.selected).length;
    const trackerStatusIndicatorNode = document.getElementById('selectionStatus');
    if (trackerStatusIndicatorNode) { 
        trackerStatusIndicatorNode.innerText = `Seçili: ${activeSelectedPlayerCount} / ${calculatedRequirementThreshold}`; 
        trackerStatusIndicatorNode.style.color = activeSelectedPlayerCount === calculatedRequirementThreshold ? "#a8e63d" : "#e74c3c"; 
    }

    let outputHtmlConstructionBuffer = "";
    const positionalCategoriesStructure = [ 
        { id: "cat-gk", t: "KALECİLER", p: ["GK"] }, 
        { id: "cat-def", t: "SAVUNMALAR", p: ["CB", "LB", "RB", "LWB", "RWB"] }, 
        { id: "cat-mid", t: "ORTA SAHALAR", p: ["DM", "CM", "AM", "LM", "RM"] }, 
        { id: "cat-atk", t: "HÜCUMCULAR", p: ["LW", "RW", "FW"] } 
    ];

    positionalCategoriesStructure.forEach(internalCategoryDef => {
        const matchingPlayerCollection = currentPlayers.filter(pObj => internalCategoryDef.p.includes(getBasePosition(pObj.mainPos)));
        if (matchingPlayerCollection.length > 0) {
            const isCategoryVisuallyOpen = trackedOpenStatesDict[internalCategoryDef.id] !== false; 
            
            outputHtmlConstructionBuffer += `<details class="category-item" id="${internalCategoryDef.id}" ${isCategoryVisuallyOpen ? 'open' : ''} style="margin: 10px 5px 5px 5px; border-radius: 4px; overflow: hidden; border: 1px solid #1a6b2e; box-sizing: border-box;">
                        <summary style="background: #1a6b2e; color: white; padding: 8px 12px; cursor: pointer; font-weight: bold; list-style: none; display: flex; justify-content: space-between; align-items: center; user-select: none;">
                            <span>${internalCategoryDef.t} (${matchingPlayerCollection.length})</span>
                            <span style="font-size: 0.8em; opacity: 0.8;">▼</span>
                        </summary>
                        <div style="padding: 5px;">`;
            
            outputHtmlConstructionBuffer += matchingPlayerCollection.map(renderingPlayerInstance => {
                const calculatedNameRenderingColor = renderingPlayerInstance.isTest ? '#2ecc71' : 'inherit'; 
                const shortNameDisplayHtmlFragment = renderingPlayerInstance.shortName?.trim() ? ` <span style="color:var(--text-muted); font-size:0.85em;">(${renderingPlayerInstance.shortName.trim()})</span>` : '';
                const conditionSvgCodeComponent = getConditionHeart(renderingPlayerInstance.condition);
                
                const calculatedEffectiveBaseInfo = getEffectivePlayerInfo(renderingPlayerInstance, false);
                const calculatedEffectiveActiveInfo = getEffectivePlayerInfo(renderingPlayerInstance, true);
                
                const visualPositionDisplayConfig = calculatedEffectiveBaseInfo.isBanned ? `<s style="color:#e74c3c;">${calculatedEffectiveBaseInfo.original}</s> <span style="color:#e67e22; font-size:0.9em; font-weight:bold;">(En İyi Mevki: ${calculatedEffectiveBaseInfo.active})</span>` : `${calculatedEffectiveBaseInfo.original}`;
                const visualRoleDisplayConfig = calculatedEffectiveBaseInfo.isBanned && calculatedEffectiveBaseInfo.active !== 'Yok' ? `<span style="color:#1a6b2e;">(${calculatedEffectiveBaseInfo.activeRole})</span>` : `<span style="color:#1a6b2e;">(${renderingPlayerInstance.role})</span>`;

                const havaValueParam = renderingPlayerInstance.stats.hava||0; const pasValueParam = renderingPlayerInstance.stats.pas||0; const savValueParam = renderingPlayerInstance.stats.savunma||0;
                const sutValueParam = getBasePosition(renderingPlayerInstance.mainPos)==='GK'?(renderingPlayerInstance.stats.sutKarsilama||0):(renderingPlayerInstance.stats.sut ?? (renderingPlayerInstance.stats.şut||0));
                const dribValueParam = renderingPlayerInstance.stats.dribling||0; const firsatValueParam = renderingPlayerInstance.stats.firsat ?? (renderingPlayerInstance.stats.fırsat||0);

                const tabularStatsHtmlOutput = `
                  <div class="mobile-table-wrap" style="display: flex; flex-direction: column; gap: 8px; font-size: 0.95em; width: 100%;">
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Hava Topu:</b> <span style="font-weight:bold; color:${getStatColor(havaValueParam)};">${havaValueParam}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Pas D.:</b> <span style="font-weight:bold; color:${getStatColor(pasValueParam)};">${pasValueParam}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Savunma:</b> <span style="font-weight:bold; color:${getStatColor(savValueParam)};">${savValueParam}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>${getBasePosition(renderingPlayerInstance.mainPos)==='GK'?'Şut Karşılama':'Şut'}:</b> <span style="font-weight:bold; color:${getStatColor(sutValueParam)};">${sutValueParam}</span></div>
                    <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;"><b>Dribling:</b> <span style="font-weight:bold; color:${getStatColor(dribValueParam)};">${dribValueParam}</span></div>
                    <div style="display: flex; justify-content: space-between; padding-bottom: 0;"><b>Fırsat Y.:</b> <span style="font-weight:bold; color:${getStatColor(firsatValueParam)};">${firsatValueParam}</span></div>
                  </div>
                `;

                const activeBannedList = renderingPlayerInstance.bannedPositions || [];
                const optionalSecondaryPosBadgesHtml = renderingPlayerInstance.secondaryPositions.length > 0 
                    ? renderingPlayerInstance.secondaryPositions.map(spMapping => {
                        const isBanned = activeBannedList.includes(spMapping.pos) || activeBannedList.includes(getBasePosition(spMapping.pos));
                        const bgColor = isBanned ? '#7f8c8d' : getStatColor(spMapping.capacity === 100 ? 85 : (spMapping.capacity > 50 ? 65 : 30));
                        const textDeco = isBanned ? 'text-decoration: line-through; opacity: 0.6;' : '';
                        return `<span style="background:${bgColor}; color:white; padding:3px 6px; border-radius:4px; font-size:0.85em; font-weight:bold; margin-right:4px; display:inline-block; margin-bottom:4px; ${textDeco}">${spMapping.pos} (%${spMapping.capacity})</span>`;
                    }).join('') 
                    : '<span style="font-size:0.85em; color:var(--text-muted);">Yok</span>';

                let dynamicOvrBadgeConstruction = `${calculatedEffectiveBaseInfo.ovr} OVR`;
                if (calculatedEffectiveBaseInfo.ovr !== calculatedEffectiveActiveInfo.ovr) {
                    dynamicOvrBadgeConstruction = `${calculatedEffectiveBaseInfo.ovr} OVR (Aktif: ${calculatedEffectiveActiveInfo.ovr})`;
                }

                return `
                <details class="player-item" id="details-${renderingPlayerInstance.id}" style="margin-bottom: 8px;">
                  <summary class="player-summary">
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <input type="checkbox" class="player-select-cb" data-id="${renderingPlayerInstance.id}" ${renderingPlayerInstance.selected ? 'checked' : ''} style="width:18px; height:18px; cursor:pointer; flex-shrink: 0;">
                      <span class="${renderingPlayerInstance.selected ? '' : 'unselected-player-text'}" style="flex: 1;">
                        <b style="color:${calculatedNameRenderingColor};">${renderingPlayerInstance.name}</b>${shortNameDisplayHtmlFragment} <span class="cond-icon">${conditionSvgCodeComponent}</span> <span class="pitch-ovr-text" style="background:${getStatColor(calculatedEffectiveBaseInfo.ovr)}; color:white; text-shadow: 1px 1px 2px rgba(0,0,0,0.6); padding:2px 6px; border-radius:4px; font-size:0.8em; margin-left:4px; white-space:nowrap; display:inline-block;">${dynamicOvrBadgeConstruction}</span> | ${visualPositionDisplayConfig} ${visualRoleDisplayConfig}
                      </span>
                    </div>
                  </summary>
                  
                  <div class="player-details-row">
                    <div class="pd-col-stats">
                        ${tabularStatsHtmlOutput}
                        <div class="mobile-chart-wrap">
                            <canvas id="chart-${renderingPlayerInstance.id}"></canvas>
                        </div>
                    </div>
                    
                    <div class="pd-col-pitch">
                        <div class="mini-pitch-wrapper">
                            <span class="pitch-label" style="font-size:0.85em; font-weight:bold; color:var(--text-muted); text-align:center; display:block; margin-bottom:5px;">📍 Mevki Haritası<br><span class="pitch-sublabel" style="font-size:0.8em; color:#e74c3c;">(Tıklayarak yasakla)</span></span>
                            <div class="pitch-bg">
                                ${generateMiniPitchHTML(renderingPlayerInstance, "100%")}
                            </div>
                        </div>
                    </div>
                    
                    <div class="pd-col-sec">
                        <div>
                            <span style="font-size:0.9em; font-weight:bold; display:block; margin-bottom:8px;">Yan Mevkiler:</span>
                            <div class="sec-pos-badges">
                                ${optionalSecondaryPosBadgesHtml}
                            </div>
                        </div>
                    </div>
                    
                    <div class="mobile-actions-wrap">
                        <button type="button" class="btn btn-yellow btn-edit" data-id="${renderingPlayerInstance.id}">Düzenle</button>
                        <button type="button" class="btn btn-red btn-delete" data-id="${renderingPlayerInstance.id}">Sil</button>
                    </div>
                    
                  </div>
                </details>`;
            }).join('');
            
            outputHtmlConstructionBuffer += `</div></details>`;
        }
    });
    listElementNodeContainer.innerHTML = outputHtmlConstructionBuffer;

    document.querySelectorAll('details.player-item').forEach(detNode => { if (trackedOpenStatesDict[detNode.id]) detNode.open = true; });
    document.querySelectorAll('.player-select-cb').forEach(cbNode => { 
        cbNode.addEventListener('change', eventContext => { 
            const contextualPlayerObj = currentPlayers.find(x => String(x.id) === String(eventContext.target.dataset.id)); 
            if (contextualPlayerObj) contextualPlayerObj.selected = eventContext.target.checked; 
            updatePlayerList(); 
        }); 
    });
    document.querySelectorAll('.player-item').forEach(detNode => { 
        detNode.addEventListener('toggle', () => { 
            if (detNode.open) renderRadarChart(Number(detNode.id.split('-')[1])); 
        }); 
    });
}

function renderSimCard(processingCardIndex) {
    const mainContainerNodeDef = document.getElementById(`sim-card-container-${processingCardIndex}`);
    if (!mainContainerNodeDef) return;

    document.body.classList.remove('is-dragging');

    const referencedDataConfig = simResults[processingCardIndex];
    const retrievedActiveLineupsData = referencedDataConfig.active;
    
    const configurationHasModificationsFlag = JSON.stringify(referencedDataConfig.active.lineupA.lineup) !== JSON.stringify(referencedDataConfig.original.lineupA.lineup) || 
                       JSON.stringify(referencedDataConfig.active.lineupB.lineup) !== JSON.stringify(referencedDataConfig.original.lineupB.lineup);

    const evaluationNormalizedStatsA = retrievedActiveLineupsData.lineupA.stats.normalized;
    const evaluationNormalizedStatsB = retrievedActiveLineupsData.lineupB.stats.normalized;

    const dynamicResetControlHTML = configurationHasModificationsFlag ? `<button class="btn-reset-sim" data-card="${processingCardIndex}" style="margin-left:auto; background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.85em; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.3); transition: all 0.2s;">Sıfırla</button>` : '';

    let constructedLogDetailsHTML = `<div style="color:var(--text-muted); font-size:0.9em; padding:10px;">Değiştirilmiş kadrolar için ayrıntılı performans analizi hesaplanamaz. Analizi görmek için sıfırlayınız.</div>`;
    if (!configurationHasModificationsFlag && referencedDataConfig.original.metricsDetails) {
        const metricDetailsObjContext = referencedDataConfig.original.metricsDetails;
        const formattingUtilityFn = (propName, innerPropObj) => {
            if(innerPropObj.diff === 0 && innerPropObj.pen === 0) return `<span style="color:#7f8c8d;">${propName}: 0</span>`;
            let mathematicalVisualString = innerPropObj.diff > 5 ? `(${innerPropObj.diff}-5)³` : `(${innerPropObj.diff} ≤ 5)`;
            let activeRenderColorStatus = innerPropObj.diff > 5 ? '#e74c3c' : '#2ecc71';
            return `<span>${propName}: |Fark ${innerPropObj.diff}| ➔ ${mathematicalVisualString} = <b style="color:${activeRenderColorStatus};">${innerPropObj.pen}</b></span>`;
        };
        const validationCheckHavaLowCondition = document.getElementById('cbLowHava')?.checked;

        constructedLogDetailsHTML = `
            <div class="sim-log-content" style="font-family: monospace; font-size: 0.9em; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 4px; line-height: 1.6;">
                <div style="color: #bdc3c7; margin-bottom: 8px;"><b>[1] Hedef Kalite (Baseline):</b> ${referencedDataConfig.original.targetScore.toFixed(1)} OVR <span style="font-size:0.85em;">(A: ${referencedDataConfig.original.sumA.toFixed(2)} | B: ${referencedDataConfig.original.sumB.toFixed(2)})</span></div>
                <div style="color: #3498db; margin-bottom: 4px;"><b>[2] Saf Denge (Net OVR Farkı):</b> <span style="color:#ecf0f1;">${metricDetailsObjContext.netDiffFormula}</span> = <b>${metricDetailsObjContext.netDiffPenalty.toFixed(1)} Ceza</b></div>
                <div style="color: #e74c3c; margin-bottom: 4px;"><b>[3] Kritik Özellik Farkı Cezası:</b> <b>${metricDetailsObjContext.totalCliffPenalty} Ceza</b></div>
                <div style="padding-left: 15px; color: #95a5a6; font-size: 0.85em; margin-bottom: 8px; line-height: 1.5;">
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                        <div>${formattingUtilityFn('Pas D.', metricDetailsObjContext.cliffPenalties.pas)}</div>
                        <div>${formattingUtilityFn('Savunma', metricDetailsObjContext.cliffPenalties.savunma)}</div>
                        <div>${formattingUtilityFn('Şut', metricDetailsObjContext.cliffPenalties.sut)}</div>
                        <div>${formattingUtilityFn('Dribling', metricDetailsObjContext.cliffPenalties.dribling)}</div>
                        <div>${formattingUtilityFn('Fırsat Y.', metricDetailsObjContext.cliffPenalties.firsat)}</div>
                        ${!validationCheckHavaLowCondition ? `<div>${formattingUtilityFn('Hava T.', metricDetailsObjContext.cliffPenalties.hava)}</div>` : ''}
                    </div>
                </div>
                <div style="color: #f1c40f; margin-bottom: 4px;"><b>[4] Formasyon Açık (Grid) Cezası:</b> <b>${metricDetailsObjContext.gridPenalty.toFixed(1)} Ceza</b></div>
                <hr style="border: 0; border-top: 1px dashed rgba(255,255,255,0.2); margin: 8px 0;">
                <div style="color: #ecf0f1; font-weight: bold; font-size: 1.1em;">NET SKOR (Düşük Daha İyi): ${metricDetailsObjContext.totalPenalty.toFixed(0)}</div>
            </div>
        `;
    }

    let constructionOutputString = `
    <div class="sim-result-card" style="border: ${configurationHasModificationsFlag ? '2px solid #f39c12' : '1px solid var(--border-color)'}; transition: all 0.3s ease;">
        <div style="color: #f39c12; font-weight: bold; font-size: 1.1em; margin-bottom: 15px; display:flex; align-items:center;">
            SEÇENEK #${processingCardIndex + 1} 
            <span style="font-size: 0.8em; color: var(--text-muted); margin-left:8px;">(Denge Skoru: ${(retrievedActiveLineupsData.rawPenalty || retrievedActiveLineupsData.penalty || 0).toFixed(0)})</span>
            ${configurationHasModificationsFlag ? '<span style="margin-left:8px; font-size:0.8em; color:#e74c3c;">(Değiştirildi)</span>' : ''}
            ${dynamicResetControlHTML}
        </div>
        
        <div class="pitch-wrapper">
            ${generateTacticalPitchHTML(retrievedActiveLineupsData.lineupA, 'A Takımı', '#3498db', 'A', processingCardIndex)}
            ${generateTacticalPitchHTML(retrievedActiveLineupsData.lineupB, 'B Takımı', '#e74c3c', 'B', processingCardIndex)}
        </div>
        
        <div class="sim-table-chart-wrap">
            <div class="sim-table-wrap">
                <table class="sim-stat-table" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 0.95em;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color);">
                            <th style="color:#f39c12; text-align: left; padding: 8px;">Özellik</th>
                            <th style="color:#3498db; padding: 8px;">A Takımı (0-100)</th>
                            <th style="color:#e74c3c; padding: 8px;">B Takımı (0-100)</th>
                            <th style="color:#f39c12; padding: 8px;">Fark (A-B)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderStatRow('Hava Topu', evaluationNormalizedStatsA.hava, evaluationNormalizedStatsB.hava)}
                        ${renderStatRow('Pas D.', evaluationNormalizedStatsA.pas, evaluationNormalizedStatsB.pas)}
                        ${renderStatRow('Savunma', evaluationNormalizedStatsA.savunma, evaluationNormalizedStatsB.savunma)}
                        ${renderStatRow('Şut', evaluationNormalizedStatsA.sut, evaluationNormalizedStatsB.sut)}
                        ${renderStatRow('Dribling', evaluationNormalizedStatsA.dribling, evaluationNormalizedStatsB.dribling)}
                        ${renderStatRow('Fırsat Y.', evaluationNormalizedStatsA.firsat, evaluationNormalizedStatsB.firsat)}
                    </tbody>
                </table>
            </div>
            <div class="sim-chart-wrap">
                <canvas id="teamChart-${processingCardIndex}" style="width:100%; height:100%;"></canvas>
            </div>
        </div>
        <details class="sim-log-details" style="margin-top: 15px; border: 1px solid var(--border-color); border-radius: 4px;">
            <summary style="font-weight: bold; color: #3498db; outline: none; list-style: none; cursor:pointer; padding: 10px; background: rgba(52, 152, 219, 0.1);">
                <span style="display: flex; align-items: center; gap: 5px;">
                    Algoritma Karar Dökümü & Ceza Raporu
                </span>
            </summary>
            ${constructedLogDetailsHTML}
        </details>
    </div>`;

    mainContainerNodeDef.innerHTML = constructionOutputString;

    if (simCharts && simCharts[processingCardIndex]) { simCharts[processingCardIndex].destroy(); }
    
    const contextCanvasReference = document.getElementById(`teamChart-${processingCardIndex}`);
    if(contextCanvasReference) {
        // Simülasyon Kartı için de Kısaltma ve Sıralama
        const isMobileView = window.innerWidth <= 600;
        const lblHava = 'Hava';
        const lblSav = isMobileView ? 'Sav' : 'Savunma';
        const lblPas = 'Pas D.';
        const lblFirsat = 'Fırsat Y.';
        const lblDrib = isMobileView ? 'Drib' : 'Dribling';
        const lblSut = 'Şut';

        simCharts[processingCardIndex] = new Chart(contextCanvasReference.getContext('2d'), { 
            type: 'radar', 
            data: { 
                labels: [lblHava, lblSav, lblPas, lblFirsat, lblDrib, lblSut], 
                datasets: [
                    { label: 'A Takımı', data: [Math.round(evaluationNormalizedStatsA.hava), Math.round(evaluationNormalizedStatsA.savunma), Math.round(evaluationNormalizedStatsA.pas), Math.round(evaluationNormalizedStatsA.firsat), Math.round(evaluationNormalizedStatsA.dribling), Math.round(evaluationNormalizedStatsA.sut)], backgroundColor: 'rgba(52, 152, 219, 0.25)', borderColor: '#3498db', borderWidth: 2, pointBackgroundColor: '#3498db', pointRadius: 2 }, 
                    { label: 'B Takımı', data: [Math.round(evaluationNormalizedStatsB.hava), Math.round(evaluationNormalizedStatsB.savunma), Math.round(evaluationNormalizedStatsB.pas), Math.round(evaluationNormalizedStatsB.firsat), Math.round(evaluationNormalizedStatsB.dribling), Math.round(evaluationNormalizedStatsB.sut)], backgroundColor: 'rgba(231, 76, 60, 0.25)', borderColor: '#e74c3c', borderWidth: 2, pointBackgroundColor: '#e74c3c', pointRadius: 2 }
                ] 
            }, 
            options: { 
                layout: { padding: isMobileView ? 5 : 25 }, 
                maintainAspectRatio: false, 
                scales: { 
                    r: { 
                        min: 0, max: 100, 
                        ticks: { display: false }, 
                        grid: { color: 'rgba(127, 140, 141, 0.2)' }, 
                        angleLines: { color: 'rgba(127, 140, 141, 0.2)' }, 
                        pointLabels: { 
                            color: '#7f8c8d', 
                            font: { size: isMobileView ? 10 : 12, weight: 'bold' },
                            padding: isMobileView ? 4 : 8 
                        } 
                    } 
                }, 
                plugins: { legend: { display: false } } 
            } 
        });
    }
}

function triggerSimulationExecution(eventParam) {
    if(eventParam) eventParam.preventDefault();
    const targetOutputElementNode = document.getElementById('resultOutput'); if(!targetOutputElementNode) return;
    const specifiedFormatConstraint = Number(document.getElementById('matchFormat')?.value || 7);
    const forceFillConditionValue = document.getElementById('cbForceFill')?.checked || false; 
    const havaLowPriorityConditionValue = document.getElementById('cbLowHava')?.checked ?? true; 
    
    const requiredTotalPlayerLimit = specifiedFormatConstraint * 2;
    const validatedSelectedPlayerCollection = currentPlayers.filter(p => p.selected);
  
    if (validatedSelectedPlayerCollection.length !== requiredTotalPlayerLimit) {
      targetOutputElementNode.innerHTML = `<span style="background:#c0392b; color:white; padding:10px; border-radius:4px; display:block;">HATA: Maç simülasyonu için tam olarak ${requiredTotalPlayerLimit} oyuncu seçilmelidir. Lütfen geçerli bir seçim yapın (Şu anki seçiminiz: ${validatedSelectedPlayerCollection.length}).</span>`;
      return;
    }
  
    targetOutputElementNode.innerHTML = '<div style="padding: 15px; font-weight:bold;">Algoritma çalıştırılıyor, tüm kombinasyonlar optimize ediliyor. Lütfen bekleyiniz...</div>';

    setTimeout(() => {
        try {
          const finalValidSquadResults = getAllSquads(validatedSelectedPlayerCollection, specifiedFormatConstraint, forceFillConditionValue, havaLowPriorityConditionValue);

          if (!finalValidSquadResults || finalValidSquadResults.length === 0) {
              let detectedGKAvailabilityCount = 0;
              validatedSelectedPlayerCollection.forEach(pObj => {
                  if (pObj.bannedPositions && pObj.bannedPositions.includes('GK')) return;
                  if (pObj.mainPos === 'GK' || (pObj.secondaryPositions && pObj.secondaryPositions.some(spInfo => spInfo.pos === 'GK'))) detectedGKAvailabilityCount++;
              });
              
              if (detectedGKAvailabilityCount < 2 && !forceFillConditionValue) {
                  targetOutputElementNode.innerHTML = `<span style="background:#c0392b; color:white; padding:15px; border-radius:4px; line-height:1.6; display:block;"><b>OPTİMİZASYON HATASI: Yetersiz Kaleci</b><br>Kadro kurmak için en az 2 kaleciye veya kalecilik oynayabilecek yan mevkiye sahip oyuncuya ihtiyaç vardır. Şu an havuzda kalecilik yetkisi bulunan yalnızca <b>${detectedGKAvailabilityCount} kişi</b> mevcut.<br><br>Lütfen havuza yeni bir kaleci ekleyin, mevcut oyunculardan kalede oynamayı reddedenlerin yetkisini açın veya <i>'Her Zaman Kadro Bul'</i> özelliğini aktif edin.</span>`;
              } else {
                  targetOutputElementNode.innerHTML = `<span style="background:#c0392b; color:white; padding:15px; border-radius:4px; line-height:1.6; display:block;"><b>OPTİMİZASYON HATASI: Geçerli Kombinasyon Bulunamadı</b><br>Oyuncuların belirlediği formasyon yasakları (Kırmızı X ile işaretlenenler), yetersiz yan mevkiler veya sistemin asgari 'Dinamik Hedef Kalite' eşiği gereksinimi sebebiyle hiçbir uygun formasyon eşleştirilemedi. İşlemi tamamlamak için lütfen mevki kısıtlamalarını esnetin veya <i>'Her Zaman Kadro Bul'</i> parametresini işaretleyiniz.</span>`;
              }
              return;
          }

          simResults = finalValidSquadResults.slice(0, 5).map(squadItemData => ({
              original: JSON.parse(JSON.stringify(squadItemData)),
              active: JSON.parse(JSON.stringify(squadItemData))
          }));
          simCharts = {};
          
          let compiledOutputHTMLStream = `<h3>EN DENGELİ KADROLAR (Toplam ${finalValidSquadResults.length} İhtimal Bulundu)</h3><div id="sim-cards-main-container">`;

          for(let index = 0; index < simResults.length; index++) {
              compiledOutputHTMLStream += `<div id="sim-card-container-${index}"></div>`;
          }
          
          compiledOutputHTMLStream += `</div>`; 

          if (finalValidSquadResults.length > 5) {
              compiledOutputHTMLStream += `<div style="margin-top: 30px;"><h4 style="border-bottom: 2px solid var(--border-color); padding-bottom: 10px;">DİĞER ALTERNATİF KADROLAR (${finalValidSquadResults.length - 5} Adet)</h4><div style="display: flex; flex-direction: column; gap: 10px;">`;
              for (let i = 5; i < finalValidSquadResults.length; i++) {
                  const dataContextDef = finalValidSquadResults[i];
                  const formattingStructureHelper = formattingP => `<span style="white-space:nowrap;">${formattingP.player.shortName || formattingP.player.firstName} <b style="color:${getStatColor(formattingP.pOvr)}">(${formattingP.slot})</b></span>`;
                  const listedTeamANames = dataContextDef.lineupA.lineup.map(formattingStructureHelper).join(', ');
                  const listedTeamBNames = dataContextDef.lineupB.lineup.map(formattingStructureHelper).join(', ');
                  
                  compiledOutputHTMLStream += `
                  <div class="sim-result-card" style="padding: 12px; margin-bottom:0;">
                      <div class="sim-alt-card">
                          <div style="min-width: 40px; font-weight: bold; color: #f1c40f; font-size: 1.1em;">#${i + 1}</div>
                          <div style="flex: 1; line-height: 1.6;">
                              <div style="margin-bottom: 6px;"><b style="color: #3498db;">A Takımı (${dataContextDef.lineupA.formationName}):</b> <span style="font-size:0.95em;">${listedTeamANames}</span></div>
                              <div><b style="color: #e74c3c;">B Takımı (${dataContextDef.lineupB.formationName}):</b> <span style="font-size:0.95em;">${listedTeamBNames}</span></div>
                              <div style="font-size:0.85em; color:var(--text-muted); margin-top: 4px;">Denge Skoru: ${(dataContextDef.rawPenalty || dataContextDef.penalty || 0).toFixed(0)}</div>
                          </div>
                      </div>
                  </div>`;
              }
              compiledOutputHTMLStream += `</div></div>`;
          }

          targetOutputElementNode.innerHTML = compiledOutputHTMLStream;

          for(let index = 0; index < simResults.length; index++) {
              renderSimCard(index);
          }
          
        } catch (simErrorObj) { targetOutputElementNode.innerHTML = `<span style="background:#c0392b; color:white; padding:10px; border-radius:4px; display:block;">HATA: Simülasyon sırasında kritik bir işlem başarısız oldu. Açıklama: ${simErrorObj.message}</span>`; }
    }, 50);
}

function renderRadarChart(assignedPlayerId) {
    if (chartInstances[assignedPlayerId]) return; 
    const playerContextDef = currentPlayers.find(p => String(p.id) === String(assignedPlayerId)); if(!playerContextDef) return;
    const requiredCanvasReferenceNode = document.getElementById(`chart-${assignedPlayerId}`); if(!requiredCanvasReferenceNode) return;
    
    const acquiredEffectiveDataObj = getEffectivePlayerInfo(playerContextDef, false);
    const booleanIsActiveGoalKeeper = getBasePosition(acquiredEffectiveDataObj.active) === 'GK';

    const normalizedSutEval = playerContextDef.stats.sut !== undefined ? playerContextDef.stats.sut : (playerContextDef.stats.şut || 0);
    const normalizedSutKarsilamaEval = playerContextDef.stats.sutKarsilama || 0;
    const normalizedFirsatEval = playerContextDef.stats.firsat !== undefined ? playerContextDef.stats.firsat : (playerContextDef.stats.fırsat || 0);
    
    // Mobilde kısaltmaları etkinleştir, grafiğe daha fazla alan aç
    const isMobileView = window.innerWidth <= 600;
    const lblHava = 'Hava';
    const lblSav = isMobileView ? 'Sav' : 'Savunma';
    const lblPas = 'Pas D.';
    const lblFirsat = 'Fırsat Y.';
    const lblDrib = isMobileView ? 'Drib' : 'Dribling';
    const lblSut = booleanIsActiveGoalKeeper ? 'Şut K.' : 'Şut';

    // Sıralama (Saat yönünde): Hava(0), Sav(1), Pas(2), Fırsat(3), Dribling(4), Şut(5)
    const graphChartLabelsInfo = [lblHava, lblSav, lblPas, lblFirsat, lblDrib, lblSut];
    const graphChartDatapointsInfo = [
        playerContextDef.stats.hava || 0,
        playerContextDef.stats.savunma || 0,
        playerContextDef.stats.pas || 0,
        normalizedFirsatEval,
        playerContextDef.stats.dribling || 0,
        booleanIsActiveGoalKeeper ? normalizedSutKarsilamaEval : normalizedSutEval
    ];
    
    chartInstances[assignedPlayerId] = new Chart(requiredCanvasReferenceNode.getContext('2d'), { 
        type: 'radar', 
        data: { labels: graphChartLabelsInfo, datasets: [{ label: 'Profil Performansı', data: graphChartDatapointsInfo, backgroundColor: 'rgba(0, 210, 211, 0.25)', borderColor: '#00d2d3', pointBackgroundColor: '#1dd1a1', borderWidth: 2 }] }, 
        options: { 
            layout: { padding: isMobileView ? 5 : 15 }, // Mobilde padding düşürüldü, grafik büyüdü
            maintainAspectRatio: false, 
            scales: { 
                r: { 
                    min: 0, max: 100, 
                    ticks: { display: false, stepSize: 20 }, 
                    grid: { color: 'rgba(127, 140, 141, 0.2)' }, 
                    angleLines: { color: 'rgba(127, 140, 141, 0.2)' }, 
                    pointLabels: { 
                        color: '#7f8c8d', 
                        font: { size: isMobileView ? 10 : 12, weight: 'bold' }, // Mobilde ufaltılıp sığdırıldı
                        padding: isMobileView ? 4 : 8 
                    } 
                } 
            }, 
            plugins: { legend: { display: false } } 
        } 
    });
}

function initializePlayerEditSequence(selectedPlayerId) {
    const playerContext = currentPlayers.find(p => String(p.id) === String(selectedPlayerId)); 
    if (!playerContext) return;
    
    // Düzenlemeye başlamadan önce formdaki ve haritadaki sızıntıları tamamen temizler
    resetPlayerFormUI();
    
    editingPlayerId = playerContext.id; 
    const inputAssigner = (elemId, desiredVal) => { const el = document.getElementById(elemId); if (el) el.value = desiredVal; };
    
    inputAssigner('pName', playerContext.firstName || playerContext.name.split(' ')[0]);
    inputAssigner('pLastName', playerContext.lastName || playerContext.name.split(' ').slice(1).join(' ').replace('  ', ''));
    inputAssigner('pShortName', playerContext.shortName || "");
    inputAssigner('pMainPos', getBasePosition(playerContext.mainPos)); 
    inputAssigner('pCond', playerContext.condition); 
    inputAssigner('sPas', playerContext.stats.pas || 0); 
    inputAssigner('sSavunma', playerContext.stats.savunma || 0); 
    inputAssigner('sSut', playerContext.stats.sut !== undefined ? playerContext.stats.sut : (playerContext.stats.şut || 0)); 
    inputAssigner('sDribling', playerContext.stats.dribling || 0); 
    inputAssigner('sFirsat', playerContext.stats.firsat !== undefined ? playerContext.stats.firsat : (playerContext.stats.fırsat || 0)); 
    inputAssigner('sHava', playerContext.stats.hava || 0); 
    inputAssigner('sSutKar', playerContext.stats.sutKarsilama || 0);
    
    renderPositionMap(); 
    
    const mainRoleSelector = document.querySelector('.pos-btn-group.main-pos .role-select');
    if (mainRoleSelector && playerContext.role && playerContext.role !== 'null') {
        mainRoleSelector.value = playerContext.role;
        mainRoleSelector.parentElement.dataset.manual = 'true';
    }

    const clonedSecondaryArray = JSON.parse(JSON.stringify(playerContext.secondaryPositions || []));
    if (clonedSecondaryArray) {
        clonedSecondaryArray.forEach(secItem => {
            const secGroupNode = document.querySelector(`.pos-btn-group[data-pos="${getBasePosition(secItem.pos)}"]`);
            if (secGroupNode) { 
                secGroupNode.classList.add('active-sec');
                const capInput = secGroupNode.querySelector('.cap-input'); 
                if (capInput) capInput.value = secItem.capacity; 
                
                const roleDropdown = secGroupNode.querySelector('.role-select'); 
                if (roleDropdown) { 
                    roleDropdown.style.display = 'block'; 
                    roleDropdown.value = (secItem.role === 'null') ? '' : secItem.role; 
                    secGroupNode.dataset.manual = 'true'; 
                }
                const controlsPanel = secGroupNode.querySelector('.sec-controls'); 
                if (controlsPanel) controlsPanel.style.display = 'flex';
            }
        });
    }

    updateLiveRoles(); 
    updateCondPreview(); 
    
    const submitBtn = document.getElementById('btnAddPlayer'); 
    if (submitBtn) { submitBtn.innerText = "Düzenlemeyi Kaydet"; submitBtn.className = "btn btn-green"; }
    
    const cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'block';
    
    const detailPanel = document.getElementById(`details-${selectedPlayerId}`); 
    if(detailPanel) detailPanel.open = false; 
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetPlayerFormUI() {
    const inputAssigner = (elementId, value) => { 
        const element = document.getElementById(elementId); 
        if (element) element.value = value; 
    };
    
    inputAssigner('pName', "");
    inputAssigner('pLastName', "");
    inputAssigner('pShortName', "");
    inputAssigner('pMainPos', "CB");
    inputAssigner('pCond', "Tam");
    
    ['sPas', 'sSavunma', 'sSut', 'sDribling', 'sFirsat', 'sHava'].forEach(id => inputAssigner(id, 40));
    inputAssigner('sSutKar', 0);

    // Haritadaki tüm yan mevki seçimlerini ve aktif durumları temizle
    document.querySelectorAll('.pos-btn-group.active-sec').forEach(node => {
        node.classList.remove('active-sec');
        const controlsPanel = node.querySelector('.sec-controls');
        if (controlsPanel) controlsPanel.style.display = 'none';
        delete node.dataset.manual;
    });

    const mainGroupNode = document.querySelector(`.pos-btn-group.main-pos`);
    if (mainGroupNode) delete mainGroupNode.dataset.manual;
}

function cancelPlayerEdit(eventPayloadInfo) {
    if (eventPayloadInfo) eventPayloadInfo.preventDefault();
    editingPlayerId = null;
    
    resetPlayerFormUI(); // Modüler temizleme fonksiyonu çağrıldı

    const finalizeBtn = document.getElementById('btnAddPlayer'); 
    if (finalizeBtn) { finalizeBtn.innerText = "Oyuncuyu Havuza Ekle"; finalizeBtn.className = "btn btn-green"; }
    
    const cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) cancelBtn.style.display = 'none';

    renderPositionMap(); 
    updateLiveRoles();
    updateCondPreview();
}