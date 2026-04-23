// js/bcae7.js - Analyse BCAE7 Diversité des cultures
// Version conforme à l'annexe 2 (règles d'exemption)
// Notice PAC 2026

import { lookup } from './data.js';

let allRows = [];

export function setBCAE7Data(rows) {
    allRows = rows;
}

// ===================================================
// GROUPES BCAE7 - Cultures différentes (règle officielle)
// ===================================================
const BCAE7_GROUPS = {
    "Légumineuses fourragères": ["LOT", "MLF", "SAI", "TRE", "VES"],
    "Autres céréales printemps": ["CAG", "MCS"],
    "Autres céréales hiver": ["CAH", "MCR"],
    "Autres fourrages": ["AFG", "CPL"],
    "Autres oléagineux": ["OAG", "OHR", "CML"],
    "Autres protéagineux": ["ARA", "PAG", "GES", "FNU", "PHF", "PHS"],
    "Avoine hiver": ["AVH"],
    "Avoine printemps": ["AVP"],
    "Betterave": ["BTN"],
    "Blé dur hiver": ["BDH"],
    "Blé dur printemps": ["BDP"],
    "Blé tendre hiver": ["BTH"],
    "Blé tendre printemps": ["BTP"],
    "Chanvre": ["CHV"],
    "Colza hiver": ["CZH"],
    "Colza printemps": ["CZP"],
    "Inter-rangs": ["CIT", "CID"],
    "Épeautre": ["EPE"],
    "Fève et féverole": ["FEV", "FVP", "FVL"],
    "Herbe prédominante": ["JAC", "MLG", "PTR", "GRA"],
    "Mélanges légumineuses prépondérantes": ["MLC", "MPC"],
    "Lentille": ["LEC"],
    "Lin hiver": ["LIH"],
    "Lin printemps": ["LIP"],
    "Lin fibres": ["LIF"],
    "Lupin hiver": ["LDH"],
    "Lupin printemps": ["LDP"],
    "Luzerne": ["LUZ"],
    "Maïs": ["MIS", "MID"],
    "Millet": ["MLT"],
    "Moha": ["MOH"],
    "Moutarde": ["MOT"],
    "Oeillette": ["OEI"],
    "Orge printemps": ["ORP"],
    "Orge hiver": ["ORH"],
    "Pois chiche": ["PCH"],
    "Pois hiver": ["PHI"],
    "Pois printemps": ["PPR"],
    "Pomme de terre": ["PTC"],
    "Riz": ["RIZ"],
    "Sarrasin": ["SRS"],
    "Seigle printemps": ["SGP"],
    "Seigle hiver": ["SGH"],
    "Soja": ["SOJ"],
    "Sorgho": ["SOG"],
    "Tabac": ["TAB"],
    "Tournesol": ["TRN"],
    "Triticale hiver": ["TTH"],
    "Triticale printemps": ["TTP"]
};

// Fruits, légumes, fleurs (chaque code est une culture différente)
const FRUIT_LEGUME_CODES = new Set([
    "AIL", "ANA", "ART", "CAR", "CCN", "CEL", "CHU", "EPI", "FLA", "FRA",
    "LBF", "MDI", "MLO", "NVT", "OIG", "POR", "POT", "PVP", "RDI", "TBT", "TOM"
]);

// PPAM (chaque code est une culture différente)
const PPAM_CODES = new Set([
    "AAR", "AME", "PSL", "HPC"
]);

// ===================================================
// SURFACES PRISES EN COMPTE POUR L'EXEMPTION A (75% TA en herbe/légumineuses/jachère)
// Annexe 2 - Section A
// ===================================================
// Légumineuses de la liste 1.3 (toutes)
const LEGUMINEUSES_CODES = new Set([
    "ARA", "FEV", "FNU", "FVL", "FVP", "GES", "LEC", "LDH", "LDP", "LOT",
    "LUZ", "PCH", "PHI", "PPR", "PHS", "SAI", "SOJ", "TRE", "VES", "PAG", "MLF"
]);

// Surfaces herbacées temporaires et mélanges (liste 1.5)
const HERBACEOUS_TEMPORARY_CODES = new Set([
    "MLG",  // Mélange légumineuses prépond. + graminées fourragères ≤5 ans
    "PTR",  // Prairie temporaire ≤5 ans et autre mélange avec graminées
    "GRA",  // Graminée pure pour gazon/semences certifiées
    "JAC"   // Jachère (terre arable)
]);

// ===================================================
// SURFACES PRISES EN COMPTE POUR L'EXEMPTION B (75% SAU en prairies)
// Annexe 2 - Section B
// ===================================================
// Prairies et pâturages permanents (liste 1.6)
const PERMANENT_GRASSLAND_CODES = new Set([
    "PPH", "SPH", "SPL", "CAE", "CEE"
]);

// Surfaces herbacées temporaires (liste 1.5) - mêmes que ci-dessus
// Riz (cultures sous eau)
const RIZ_CODE = "RIZ";

// ===================================================
// FONCTIONS UTILITAIRES
// ===================================================
function getBCAE7GroupCode(code) {
    if (FRUIT_LEGUME_CODES.has(code)) return `FRUIT_LEGUME_${code}`;
    if (PPAM_CODES.has(code)) return `PPAM_${code}`;
    
    for (const [groupName, codes] of Object.entries(BCAE7_GROUPS)) {
        if (codes.includes(code)) {
            return groupName;
        }
    }
    return `AUTRE_${code}`;
}

function getBCAE7GroupLabel(code) {
    if (FRUIT_LEGUME_CODES.has(code)) return `🍅 Fruits/légumes (${code})`;
    if (PPAM_CODES.has(code)) return `🌿 PPAM (${code})`;
    
    for (const [groupName, codes] of Object.entries(BCAE7_GROUPS)) {
        if (codes.includes(code)) {
            return groupName;
        }
    }
    return `Autre (${code})`;
}

// Vérifie si une parcelle est sur Prairie permanente (exclue de l'analyse diversification)
function isPermanentGrassland(row) {
    return row.surface_cat === 'PP' || PERMANENT_GRASSLAND_CODES.has(row.code);
}

// Vérifie si une parcelle est sur Terre arable (incluse dans l'analyse diversification)
function isArableLand(row) {
    const isTA = row.surface_cat === 'TA';
    const isCPasTA = row.eco === 'CP gérée comme une TA - Autres cultures';
    return isTA || isCPasTA;
}

// ===================================================
// CRITÈRE A : Plus de 75% des TA en herbe/légumineuses/jachère
// Annexe 2 - Section A
// ===================================================
function isExemptionACover(row) {
    const code = row.code;
    // Légumineuses liste 1.3
    if (LEGUMINEUSES_CODES.has(code)) return true;
    // Surfaces herbacées temporaires liste 1.5
    if (HERBACEOUS_TEMPORARY_CODES.has(code)) return true;
    return false;
}

// ===================================================
// CRITÈRE B : Plus de 75% de la SAU en prairies (permanentes + temporaires) + riz
// Annexe 2 - Section B
// ===================================================
function isExemptionBCover(row) {
    const code = row.code;
    // Prairies permanentes liste 1.6
    if (PERMANENT_GRASSLAND_CODES.has(code)) return true;
    // Surfaces herbacées temporaires liste 1.5
    if (HERBACEOUS_TEMPORARY_CODES.has(code)) return true;
    // Riz
    if (code === RIZ_CODE) return true;
    return false;
}

// ===================================================
// ANALYSE DE DIVERSIFICATION BCAE7
// ===================================================
function analyzeDiversification(taCultures) {
    if (taCultures.length === 0) {
        return { conform: false, reason: "Aucune Terre arable", cultures: [] };
    }
    
    const sorted = [...taCultures].sort((a, b) => b.surfaceHa - a.surfaceHa);
    const totalHa = sorted.reduce((sum, c) => sum + c.surfaceHa, 0);
    
    if (totalHa === 0) {
        return { conform: false, reason: "Surface totale nulle", cultures: [] };
    }
    
    const nbCultures = sorted.length;
    const mainPct = (sorted[0]?.surfaceHa / totalHa * 100) || 0;
    const secondPct = nbCultures >= 2 ? (sorted[1]?.surfaceHa / totalHa * 100) : 0;
    const top2Pct = mainPct + secondPct;
    
    // Règle BCAE7 : au moins 3 cultures différentes
    const hasEnoughCultures = nbCultures >= 3;
    const mainOk = mainPct <= 75;
    const top2Ok = top2Pct <= 95;
    
    const conform = hasEnoughCultures && mainOk && top2Ok;
    
    let reason = "";
    if (!hasEnoughCultures) reason = `⚠️ Seulement ${nbCultures} culture(s) différente(s) - 3 requises`;
    else if (!mainOk) reason = `⚠️ Culture principale trop importante (${mainPct.toFixed(1)}% > 75%)`;
    else if (!top2Ok) reason = `⚠️ Deux cultures principales trop importantes (${top2Pct.toFixed(1)}% > 95%)`;
    else reason = `✅ Conforme - ${nbCultures} cultures différentes, ${mainPct.toFixed(1)}% / ${top2Pct.toFixed(1)}%`;
    
    return {
        conform,
        reason,
        nbCultures,
        mainPct,
        secondPct,
        top2Pct,
        totalHa,
        cultures: sorted
    };
}

// ===================================================
// RENDU PRINCIPAL
// ===================================================
export function renderBCAE7() {
    const noFileDiv = document.getElementById('bcae7-no-file');
    const resultsDiv = document.getElementById('bcae7-results');

    if (!allRows.length) {
        if (noFileDiv) noFileDiv.style.display = 'block';
        if (resultsDiv) resultsDiv.style.display = 'none';
        return;
    }

    if (noFileDiv) noFileDiv.style.display = 'none';
    if (resultsDiv) resultsDiv.style.display = 'block';

    // ========== 1. CALCUL DES SURFACES ==========
    let sauHa = 0;
    let taHa = 0;
    let ppHa = 0;
    let ptHa = 0;
    let bioTaHa = 0;
    
    // Surfaces pour exemption A (75% TA en herbe/légumineuses/jachère)
    let exemptionACoverHa = 0;
    
    // Surfaces pour exemption B (75% SAU en prairies + riz)
    let exemptionBCoverHa = 0;
    
    // Stockage des cultures TA par GROUPE BCAE7
    const taCulturesMap = new Map();
    
    for (const row of allRows) {
        const surfaceAdm = row.surface_admissible_ha || 0;
        if (surfaceAdm <= 0) continue;
        
        sauHa += surfaceAdm;
        
        // Prairies permanentes
        if (isPermanentGrassland(row)) {
            ppHa += surfaceAdm;
        }
        
        // Terres arables
        if (isArableLand(row)) {
            taHa += surfaceAdm;
            
            // BIO
            if (row.agri_bio_conduite === 'true') {
                bioTaHa += surfaceAdm;
            }
            
            // Exemption A : herbe/légumineuses/jachère
            if (isExemptionACover(row)) {
                exemptionACoverHa += surfaceAdm;
            }
            
            // Pour le comptage des prairies temporaires (affichage)
            const nomCulture = row.nom_culture || '';
            if (HERBACEOUS_TEMPORARY_CODES.has(row.code)) {
                ptHa += surfaceAdm;
            }
            
            // Agrégation par groupe BCAE7
            const groupCode = getBCAE7GroupCode(row.code);
            if (!taCulturesMap.has(groupCode)) {
                taCulturesMap.set(groupCode, {
                    groupCode: groupCode,
                    label: getBCAE7GroupLabel(row.code),
                    surfaceHa: 0,
                    codes: new Set(),
                    examples: []
                });
            }
            const entry = taCulturesMap.get(groupCode);
            entry.surfaceHa += surfaceAdm;
            entry.codes.add(row.code);
            if (entry.examples.length < 3 && !entry.examples.includes(row.nom_culture)) {
                entry.examples.push(row.nom_culture);
            }
        }
        
        // Exemption B : prairies (permanentes + temporaires) + riz (toute SAU)
        if (isExemptionBCover(row)) {
            exemptionBCoverHa += surfaceAdm;
        }
    }
    
    // Ajout du riz si déjà compté (il est déjà dans exemptionBCoverHa via la fonction)
    // Mais attention : le riz peut être en TA ou en PP ? Normalement TA. On l'a déjà compté.
    
    // Conversion Map -> tableau pour analyse
    const taCulturesArray = Array.from(taCulturesMap.values()).map(entry => ({
        groupCode: entry.groupCode,
        label: entry.label,
        surfaceHa: entry.surfaceHa,
        codes: Array.from(entry.codes),
        examples: entry.examples
    }));
    
    // ========== 2. CRITÈRES D'EXEMPTION ==========
    const bioPercent = taHa > 0 ? (bioTaHa / taHa * 100) : 0;
    const exemptionAPercent = taHa > 0 ? (exemptionACoverHa / taHa * 100) : 0;
    const exemptionBPercent = sauHa > 0 ? (exemptionBCoverHa / sauHa * 100) : 0;
    
    let exemptionReason = null;
    let exemptionIcon = "✅";
    let exemptionType = null;
    
    // Critère 1 : 100% TA certifiée BIO ou conversion (exemption de droit)
    if (bioPercent >= 99.9 && taHa > 0) {
        exemptionReason = "100 % des Terres arables certifiées BIO ou en conversion";
        exemptionIcon = "✅🌿";
        exemptionType = "BIO";
    }
    // Critère 2 : TA < 10 ha (exemption de droit)
    else if (taHa < 10) {
        exemptionReason = `Surface en Terres arables inférieure à 10 ha (${taHa.toFixed(2)} ha)`;
        exemptionIcon = "✅📐";
        exemptionType = "TA < 10 ha";
    }
    // Critère 3 : >75% des TA en herbe/légumineuses/jachère (Annexe 2 - Section A)
    else if (exemptionAPercent > 75) {
        exemptionReason = `${exemptionAPercent.toFixed(1)} % des Terres arables en herbe, légumineuses fourragères ou jachère (>75%)`;
        exemptionIcon = "✅🍃";
        exemptionType = "Annexe 2 - Section A";
    }
    // Critère 4 : >75% SAU en prairies (permanentes + temporaires) + riz (Annexe 2 - Section B)
    else if (exemptionBPercent > 75) {
        exemptionReason = `${exemptionBPercent.toFixed(1)} % de la SAU en prairies (permanentes + temporaires) ou riz (>75%)`;
        exemptionIcon = "✅🐄";
        exemptionType = "Annexe 2 - Section B";
    }
    // Critère 5 : SAU < 30 ha (exemption de droit)
    else if (sauHa < 30) {
        exemptionReason = `SAU inférieure à 30 ha (${sauHa.toFixed(2)} ha)`;
        exemptionIcon = "✅📊";
        exemptionType = "SAU < 30 ha";
    }
    
    // ========== 3. ANALYSE DIVERSIFICATION (si non exempté) ==========
    let diversification = null;
    let isExempted = exemptionReason !== null;
    
    if (!isExempted) {
        diversification = analyzeDiversification(taCulturesArray);
    }
    
    // ========== 4. MISE À JOUR DE L'AFFICHAGE ==========
    _setText('bcae7-stat-SAU', sauHa.toFixed(2).replace('.', ',') + ' ha');
    _setText('bcae7-stat-TA', taHa.toFixed(2).replace('.', ',') + ' ha');
    _setText('bcae7-stat-PP', ppHa.toFixed(2).replace('.', ',') + ' ha');
    _setText('bcae7-stat-PT', ptHa.toFixed(2).replace('.', ',') + ' ha');
    
    // Carte exemption
    const exemptionTitle = document.getElementById('bcae7-exemption-title');
    const exemptionDetail = document.getElementById('bcae7-exemption-detail');
    const exemptionBadge = document.getElementById('bcae7-exemption-badge');
    const exemptionIconSpan = document.getElementById('bcae7-exemption-icon');
    
    if (exemptionTitle) {
        exemptionTitle.textContent = isExempted ? "✅ EXPLOITATION EXEMPTÉE" : "⚠️ EXPLOITATION NON EXEMPTÉE";
    }
    if (exemptionDetail) {
        exemptionDetail.textContent = isExempted 
            ? `Critère rempli : ${exemptionReason}`
            : "Aucun critère d'exemption rempli. Vérification de la diversification obligatoire.";
    }
    if (exemptionBadge) {
        exemptionBadge.textContent = isExempted ? "EXEMPTÉ(E)" : "NON EXEMPTÉ(E)";
        exemptionBadge.style.background = isExempted ? "#d4f0d4" : "#fff3e0";
        exemptionBadge.style.color = isExempted ? "#15803d" : "#e6a017";
    }
    if (exemptionIconSpan) exemptionIconSpan.textContent = exemptionIcon;
    
    // Mise à jour des cartes critères
    _updateBioCard(bioPercent, taHa, bioTaHa);
    _updateSauCard(sauHa);
    _updateTaCard(taHa);
    _updateExemptionACard(exemptionAPercent, taHa, exemptionACoverHa);
    _updateExemptionBCard(exemptionBPercent, sauHa, exemptionBCoverHa);
    
    // Affichage résultat diversification
    const diversifStatus = document.getElementById('bcae7-diversif-status');
    const diversifDetail = document.getElementById('bcae7-diversif-detail');
    const nbGroupesSpan = document.getElementById('bcae7-nb-groupes');
    
    if (diversifStatus && diversifDetail) {
        if (isExempted) {
            diversifStatus.innerHTML = "⏸️ Non requis (exploitation exemptée)";
            diversifStatus.style.background = "#eef5ea";
            diversifStatus.style.color = "#557055";
            diversifDetail.innerHTML = `Exemption obtenue via : ${exemptionType}`;
            if (nbGroupesSpan) nbGroupesSpan.textContent = "—";
        } else if (diversification) {
            if (diversification.conform) {
                diversifStatus.innerHTML = "✅ CONFORME";
                diversifStatus.style.background = "#d4f0d4";
                diversifStatus.style.color = "#15803d";
            } else {
                diversifStatus.innerHTML = "❌ NON CONFORME";
                diversifStatus.style.background = "#fee2e2";
                diversifStatus.style.color = "#b91c1c";
            }
            diversifDetail.innerHTML = diversification.reason;
            if (nbGroupesSpan) nbGroupesSpan.textContent = diversification.nbCultures;
        }
    }
    
    // Tableau des cultures TA par groupe BCAE7
    _renderCulturesTable(taCulturesArray, taHa);
}

// ===================================================
// FONCTIONS DE MISE À JOUR DES CARTES
// ===================================================
function _updateBioCard(percent, taHa, bioTaHa) {
    const percentEl = document.getElementById('bcae7-bio-percent');
    const barEl = document.getElementById('bcae7-bio-bar');
    const detailEl = document.getElementById('bcae7-bio-detail');
    const statusEl = document.getElementById('bcae7-bio-status');
    
    if (percentEl) percentEl.textContent = `${percent.toFixed(1).replace('.', ',')} %`;
    if (barEl) barEl.style.width = `${Math.min(percent, 100)}%`;
    if (detailEl) detailEl.textContent = `${bioTaHa.toFixed(2).replace('.', ',')} / ${taHa.toFixed(2).replace('.', ',')} ha TA`;
    
    if (statusEl) {
        const isExempting = percent >= 99.9 && taHa > 0;
        if (!taHa) {
            statusEl.innerHTML = "❌ Aucune TA";
            statusEl.style.background = "#fee2e2";
            statusEl.style.color = "#b91c1c";
        } else if (isExempting) {
            statusEl.innerHTML = "✅ Exemption applicable (100% BIO)";
            statusEl.style.background = "#d4f0d4";
            statusEl.style.color = "#15803d";
        } else {
            statusEl.innerHTML = percent > 0 ? `⚠️ ${percent.toFixed(1)}% - 100% requis` : "❌ Aucune surface BIO";
            statusEl.style.background = percent > 0 ? "#fff3e0" : "#fee2e2";
            statusEl.style.color = percent > 0 ? "#e6a017" : "#b91c1c";
        }
    }
}

function _updateSauCard(sauHa) {
    const valueEl = document.getElementById('bcae7-sau-value');
    const statusEl = document.getElementById('bcae7-sau-status');
    
    if (valueEl) valueEl.textContent = sauHa.toFixed(2).replace('.', ',');
    if (statusEl) {
        if (sauHa < 30) {
            statusEl.innerHTML = "✅ SAU < 30 ha → Exemption";
            statusEl.style.background = "#d4f0d4";
            statusEl.style.color = "#15803d";
        } else {
            statusEl.innerHTML = `❌ SAU = ${sauHa.toFixed(2)} ha ≥ 30 ha`;
            statusEl.style.background = "#fee2e2";
            statusEl.style.color = "#b91c1c";
        }
    }
}

function _updateTaCard(taHa) {
    const valueEl = document.getElementById('bcae7-ta-value');
    const statusEl = document.getElementById('bcae7-ta-status');
    
    if (valueEl) valueEl.textContent = taHa.toFixed(2).replace('.', ',');
    if (statusEl) {
        if (taHa < 10) {
            statusEl.innerHTML = "✅ TA < 10 ha → Exemption";
            statusEl.style.background = "#d4f0d4";
            statusEl.style.color = "#15803d";
        } else {
            statusEl.innerHTML = `❌ TA = ${taHa.toFixed(2)} ha ≥ 10 ha`;
            statusEl.style.background = "#fee2e2";
            statusEl.style.color = "#b91c1c";
        }
    }
}

function _updateExemptionACard(percent, taHa, coverHa) {
    const percentEl = document.getElementById('bcae7-cover-percent');
    const barEl = document.getElementById('bcae7-cover-bar');
    const detailEl = document.getElementById('bcae7-cover-detail');
    const statusEl = document.getElementById('bcae7-cover-status');
    
    if (percentEl) percentEl.textContent = `${percent.toFixed(1).replace('.', ',')} %`;
    if (barEl) barEl.style.width = `${Math.min(percent, 100)}%`;
    if (detailEl) detailEl.textContent = `${coverHa.toFixed(2).replace('.', ',')} / ${taHa.toFixed(2).replace('.', ',')} ha TA`;
    
    if (statusEl) {
        if (!taHa) {
            statusEl.innerHTML = "❌ Aucune TA";
            statusEl.style.background = "#fee2e2";
            statusEl.style.color = "#b91c1c";
        } else if (percent > 75) {
            statusEl.innerHTML = "✅ >75% → Exemption applicable (Annexe 2 - Section A)";
            statusEl.style.background = "#d4f0d4";
            statusEl.style.color = "#15803d";
        } else {
            statusEl.innerHTML = `❌ ${percent.toFixed(1)}% ≤ 75%`;
            statusEl.style.background = "#fee2e2";
            statusEl.style.color = "#b91c1c";
        }
    }
}

function _updateExemptionBCard(percent, sauHa, coverHa) {
    const percentEl = document.getElementById('bcae7-prairie-percent');
    const barEl = document.getElementById('bcae7-prairie-bar');
    const detailEl = document.getElementById('bcae7-prairie-detail');
    const statusEl = document.getElementById('bcae7-prairie-status');
    
    if (percentEl) percentEl.textContent = `${percent.toFixed(1).replace('.', ',')} %`;
    if (barEl) barEl.style.width = `${Math.min(percent, 100)}%`;
    if (detailEl) detailEl.textContent = `${coverHa.toFixed(2).replace('.', ',')} / ${sauHa.toFixed(2).replace('.', ',')} ha SAU`;
    
    if (statusEl) {
        if (!sauHa) {
            statusEl.innerHTML = "❌ Aucune SAU";
            statusEl.style.background = "#fee2e2";
            statusEl.style.color = "#b91c1c";
        } else if (percent > 75) {
            statusEl.innerHTML = "✅ >75% → Exemption applicable (Annexe 2 - Section B)";
            statusEl.style.background = "#d4f0d4";
            statusEl.style.color = "#15803d";
        } else {
            statusEl.innerHTML = `❌ ${percent.toFixed(1)}% ≤ 75%`;
            statusEl.style.background = "#fee2e2";
            statusEl.style.color = "#b91c1c";
        }
    }
}

function _renderCulturesTable(taCulturesArray, taHa) {
    const tbody = document.getElementById('bcae7-cultures-tbody');
    const tfoot = document.getElementById('bcae7-cultures-tfoot');
    
    if (!tbody) return;
    
    const sorted = [...taCulturesArray].sort((a, b) => b.surfaceHa - a.surfaceHa);
    
    tbody.innerHTML = sorted.map(c => {
        const percent = taHa > 0 ? (c.surfaceHa / taHa * 100) : 0;
        const codesStr = c.codes.join(', ');
        const examplesStr = c.examples.length ? c.examples[0] : codesStr;
        
        // Mise en évidence si c'est un groupe d'exemption A
        let isExemptionAGroup = false;
        for (const code of c.codes) {
            if (LEGUMINEUSES_CODES.has(code) || HERBACEOUS_TEMPORARY_CODES.has(code)) {
                isExemptionAGroup = true;
                break;
            }
        }
        
        return `
            <tr>
                <td><span class="code-badge">${codesStr}</span></td>
                <td><strong>${c.label}</strong><br><span style="font-size:0.7rem;color:#888">${examplesStr}</span></td>
                <td style="text-align:right;font-weight:600">${c.surfaceHa.toFixed(2).replace('.', ',')} ha</td>
                <td style="text-align:right">${percent.toFixed(1).replace('.', ',')} %</td>
                <td>
                    <div class="surface-progress" style="height:8px;width:120px">
                        <div class="surface-progress-bar" style="width:${Math.min(percent, 100)}%;background:${isExemptionAGroup ? '#2e7d32' : '#8b5cf6'}"></div>
                    </div>
                    ${isExemptionAGroup ? '<span style="font-size:0.65rem;color:#2e7d32">(compte pour exemption A)</span>' : ''}
                </td>
            </tr>
        `;
    }).join('');
    
    if (tfoot) {
        const nbCultures = sorted.length;
        tfoot.innerHTML = `
            <tr style="background:#eef5ea;font-weight:700">
                <td colspan="2" style="padding:10px;text-align:right">TOTAL Terres arables (TA)</td>
                <td style="padding:10px;text-align:right">${taHa.toFixed(2).replace('.', ',')} ha</td>
                <td style="padding:10px;text-align:right">100 %</td>
                <td style="padding:10px"></td>
            </tr>
            <tr style="background:#f4faf2">
                <td colspan="5" style="padding:10px;font-size:0.85rem">
                    📊 <strong>${nbCultures}</strong> groupe(s) de cultures différents sur TA
                    ${nbCultures < 3 ? ' ⚠️ Moins de 3 groupes différents (non conforme si non exempté)' : ''}
                 </td>
            </tr>
        `;
    }
}

function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}