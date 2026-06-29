function isSymmetric(slots) {
    const pairs = [
        ["LB", "RB"], ["LCB", "RCB"], ["LWB", "RWB"],
        ["LDM", "RDM"], ["LCM", "RCM"], ["LM", "RM"],
        ["LAM", "RAM"], ["LW", "RW"], ["LFW", "RFW"]
    ];
    for (const [left, right] of pairs) {
        if (slots.includes(left) !== slots.includes(right)) return false;
    }
    return true;
}

function isRealistic(defCount, dmCount, cmCount, amCount, fwCount, format) {
    // Formasyon geçerliliği ve yapısal kısıtlamalar
    if (defCount === 0) return false; 
    if (defCount === 1 && dmCount === 0 && format >= 6) return false; 
    if (fwCount === 0 && amCount === 0) return false; 
    
    // Yığılma limitleri
    const outfieldPlayers = format - 1;
    if (defCount + dmCount > outfieldPlayers - 1) return false; 
    if (fwCount + amCount > outfieldPlayers - 1) return false; 

    return true;
}

function generateAllFormations() {
    const allFormations = [];

    const positionalLines = {
        DEF: { 0: [[]], 1: [["CB"]], 2: [["LCB", "RCB"], ["LB", "RB"]], 3: [["LCB", "CB", "RCB"], ["LB", "CB", "RB"]], 4: [["LB", "LCB", "RCB", "RB"], ["LWB", "LCB", "RCB", "RWB"]], 5: [["LB", "LCB", "CB", "RCB", "RB"], ["LWB", "LCB", "CB", "RCB", "RWB"]] },
        DM: { 0: [[]], 1: [["DM"]], 2: [["LDM", "RDM"]], 3: [["LDM", "DM", "RDM"]] },
        CM: { 0: [[]], 1: [["CM"]], 2: [["LCM", "RCM"], ["LM", "RM"]], 3: [["LCM", "CM", "RCM"], ["LM", "CM", "RM"]], 4: [["LM", "LCM", "RCM", "RM"]] },
        AM: { 0: [[]], 1: [["AM"]], 2: [["LAM", "RAM"], ["LW", "RW"]], 3: [["LAM", "AM", "RAM"], ["LW", "AM", "RW"]], 4: [["LW", "LAM", "RAM", "RW"]] },
        FW: { 0: [[]], 1: [["FW"]], 2: [["LFW", "RFW"]], 3: [["LFW", "FW", "RFW"]] }
    };

    for (let format = 5; format <= 11; format++) {
        const targetOutfieldCount = format - 1; 
        for (let defCount = 0; defCount <= 5; defCount++) {
            for (let dmCount = 0; dmCount <= 3; dmCount++) {
                for (let cmCount = 0; cmCount <= 4; cmCount++) {
                    for (let amCount = 0; amCount <= 4; amCount++) {
                        for (let fwCount = 0; fwCount <= 3; fwCount++) {
                            if (defCount + dmCount + cmCount + amCount + fwCount === targetOutfieldCount) {
                                
                                if (!isRealistic(defCount, dmCount, cmCount, amCount, fwCount, format)) continue;

                                const counts = [defCount, dmCount, cmCount, amCount, fwCount];
                                const formationNameParts = [];
                                for (let i = 0; i < 5; i++) {
                                    if (i === 0 || i === 4) formationNameParts.push(counts[i]); 
                                    else if (counts[i] !== 0) formationNameParts.push(counts[i]); 
                                }
                                const formationName = formationNameParts.join('-');

                                const variants = [];
                                let variantIdCounter = 1;

                                positionalLines.DEF[defCount].forEach(defArr => {
                                    positionalLines.DM[dmCount].forEach(dmArr => {
                                        positionalLines.CM[cmCount].forEach(cmArr => {
                                            positionalLines.AM[amCount].forEach(amArr => {
                                                positionalLines.FW[fwCount].forEach(fwArr => {
                                                    const slots = ["GK", ...defArr, ...dmArr, ...cmArr, ...amArr, ...fwArr];
                                                    if (isSymmetric(slots)) {
                                                        variants.push({ 
                                                            id: `f${format}_${defCount}${dmCount}${cmCount}${amCount}${fwCount}_${variantIdCounter++}`, 
                                                            desc: slots.slice(1).join(', '), 
                                                            slots: slots 
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });

                                if (variants.length > 0) allFormations.push({ format, name: formationName, variants });
                            }
                        }
                    }
                }
            }
        }
    }
    return allFormations;
}

export const FORMATIONS = generateAllFormations();