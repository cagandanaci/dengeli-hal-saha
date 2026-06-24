function isSymmetric(slots) {
    // Sol ve sağ mevkilerin eşleşme matrisi
    const pairs = [
        ["LB", "RB"], 
        ["LCB", "RCB"], 
        ["LWB", "RWB"],
        ["LDM", "RDM"], 
        ["LCM", "RCM"], 
        ["LM", "RM"],
        ["LAM", "RAM"], 
        ["LW", "RW"], 
        ["LFW", "RFW"]
    ];
    
    // Eğer sol varsa sağ da olmalı, sağ varsa sol da olmalı. Biri eksikse asimetriktir.
    for (const [left, right] of pairs) {
        if (slots.includes(left) !== slots.includes(right)) {
            return false;
        }
    }
    return true;
}

function generateAllFormations() {
    const ALL_FORMATIONS = [];

    const lines = {
        DEF: {
            0: [[]],
            1: [["CB"]],
            2: [["LCB", "RCB"], ["LB", "RB"]],
            3: [["LCB", "CB", "RCB"], ["LB", "CB", "RB"]],
            4: [["LB", "LCB", "RCB", "RB"], ["LWB", "LCB", "RCB", "RWB"]],
            5: [["LB", "LCB", "CB", "RCB", "RB"], ["LWB", "LCB", "CB", "RCB", "RWB"]]
        },
        DM: {
            0: [[]],
            1: [["DM"]],
            2: [["LDM", "RDM"]],
            3: [["LDM", "DM", "RDM"]]
        },
        CM: {
            0: [[]],
            1: [["CM"]],
            2: [["LCM", "RCM"], ["LM", "RM"]],
            3: [["LCM", "CM", "RCM"], ["LM", "CM", "RM"]],
            4: [["LM", "LCM", "RCM", "RM"]]
        },
        AM: {
            0: [[]],
            1: [["AM"]],
            2: [["LAM", "RAM"], ["LW", "RW"]],
            3: [["LAM", "AM", "RAM"], ["LW", "AM", "RW"]],
            4: [["LW", "LAM", "RAM", "RW"]]
        },
        FW: {
            0: [[]],
            1: [["FW"]],
            2: [["LFW", "RFW"]],
            3: [["LFW", "FW", "RFW"]]
        }
    };

    for (let format = 5; format <= 11; format++) {
        const targetN = format - 1; 
        for (let d = 0; d <= 5; d++) {
            for (let dm = 0; dm <= 3; dm++) {
                for (let cm = 0; cm <= 4; cm++) {
                    for (let am = 0; am <= 4; am++) {
                        for (let fw = 0; fw <= 3; fw++) {
                            
                            if (d + dm + cm + am + fw === targetN) {
                                const formationName = `${d}-${dm}-${cm}-${am}-${fw}`;
                                const variants = [];
                                let vId = 1;

                                lines.DEF[d].forEach(defArr => {
                                    lines.DM[dm].forEach(dmArr => {
                                        lines.CM[cm].forEach(cmArr => {
                                            lines.AM[am].forEach(amArr => {
                                                lines.FW[fw].forEach(fwArr => {
                                                    const slots = ["GK", ...defArr, ...dmArr, ...cmArr, ...amArr, ...fwArr];
                                                    
                                                    // Sadece kusursuz simetriye sahip varyantlar listeye eklenir
                                                    if (isSymmetric(slots)) {
                                                        variants.push({
                                                            id: `f${format}_${d}${dm}${cm}${am}${fw}_${vId++}`,
                                                            desc: slots.slice(1).join(', '),
                                                            slots: slots
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });

                                if (variants.length > 0) {
                                    ALL_FORMATIONS.push({ format, name: formationName, variants });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    return ALL_FORMATIONS;
}

export const FORMATIONS = generateAllFormations();