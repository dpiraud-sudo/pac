// js/bcae7.js - Analyse BCAE7 Diversité des cultures
import { lookup } from './data.js';

let allRows = [];

export function setBCAE7Data(rows) {
    allRows = rows;
}

// Groupes BCAE7 pour identification
const BCAE7_GROUPS = {
    // Cultures dérogatoires (comptent pour l'exemption >75%)
    DEROGATORY: [
        "Prairie temporaire ≤5 ans / mélange avec graminées",
        "Mélange légumineuses prépond. + graminées fourragères ≤5 ans",
        "Luzerne", "Trèfle", "Sainfoin", "Vesce, mélilot, jarosse, serradelle",
        "Lotier, minette", "Autre légumineuse à graines ou fourragère",
        "Mélange de légumineuses à graines ou fourragères pures",
        "Jachère (terre arable)", "Mélange multi-espèces légumineuses fourragères prépond.",
        "Mélange multi-espèces légumineuses à graines prépond.",
        "Autre plante fourragère annuelle", "Graminée pure pour gazon/semences certifiées"
    ],
    // Prairies temporaires (spécifiquement)
    TEMPORARY_GRASSLAND: [
        "Prairie temporaire ≤5 ans / mélange avec graminées",
        "Mélange légumineuses prépond. + graminées fourragères ≤5 ans"
    ],
    // Cultures dérogatoires supplémentaires pour exemption 75% TA
    COVER_CROPS: [
        "Prairie temporaire ≤5 ans / mélange avec graminées",
        "Mélange légumineuses prépond. + graminées fourragères ≤5 ans",
        "Luzerne", "Trèfle", "Sainfoin", "Vesce, mélilot, jarosse, serradelle",
        "Lotier, minette", "Autre légumineuse à graines ou fourragère",
        "Mélange de légumineuses à graines ou fourragères pures",
        "Jachère (terre arable)", "Autre plante fourragère annuelle",
        "Graminée pure pour gazon/semences certifiées",
        "Mélange multi-espèces légumineuses fourragères prépond.",
        "Mélange multi-espèces légumineuses à graines prépond."
    ]
};

function getBCAE7Group(nomCulture) {
    if (BCAE7_GROUPS.COVER_CROPS.some(g => nomCulture?.includes(g))) {
        return "🌿 Couvert dérogatoire (prairie temp./luzerne/jachère)";
    }
    return "🌾 Autre culture";
}

function isTemporaryGrassland(nomCulture) {
    return BCAE7_GROUPS.TEMPORARY_GRASSLAND.some(g => nomCulture?.includes(g));
}

function isDerogatoryCover(nomCulture) {
    return BCAE7_GROUPS.DEROGATORY.some(g => nomCulture?.includes(g));
}

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

    // Statistiques globales
    let sauHa = 0;
    let taHa = 0;
    let ppHa = 0;
    let ptHa = 0;
    let bioTaHa = 0;
    let coverTaHa = 0;  // prairies temporaires + luzernes + jachères + fourragères
    let totalTaHaCheck = 0;

    const culturesTA = []; // pour tableau détaillé

    for (const row of allRows) {
        const surfaceAdm = row.surface_admissible_ha || 0;
        if (surfaceAdm <= 0) continue;

        sauHa += surfaceAdm;

        const isPP = row.surface_cat === 'PP';
        const isTA = row.surface_cat === 'TA';
        const isCPasTA = row.eco === 'CP gérée comme une TA - Autres cultures';
        const isTAEffective = isTA || isCPasTA;

        if (isPP) {
            ppHa += surfaceAdm;
        }

        if (isTAEffective) {
            taHa += surfaceAdm;
            totalTaHaCheck += surfaceAdm;

            // BIO détection
            const isBio = row.agri_bio_conduite === 'true';
            if (isBio) bioTaHa += surfaceAdm;

            // Couverts dérogatoires
            const nomCulture = row.nom_culture || '';
            if (isDerogatoryCover(nomCulture) || isTemporaryGrassland(nomCulture)) {
                coverTaHa += surfaceAdm;
            }

            // Pour le tableau détaillé
            if (!culturesTA.some(c => c.code === row.code && c.precision === row.precision)) {
                culturesTA.push({
                    code: row.code,
                    precision: row.precision,
                    nom_culture: row.nom_culture,
                    surface: 0,
                    eco: row.eco,
                    season: getSeason(row.nom_culture, row.code)
                });
            }
            const found = culturesTA.find(c => c.code === row.code && c.precision === row.precision);
            if (found) found.surface += surfaceAdm;
        }
    }

    // Prairies temporaires : on utilise les cultures TA qui sont des prairies temporaires
    for (const row of allRows) {
        const surfaceAdm = row.surface_admissible_ha || 0;
        if (surfaceAdm <= 0) continue;
        const isTA = row.surface_cat === 'TA';
        const isCPasTA = row.eco === 'CP gérée comme une TA - Autres cultures';
        const isTAEffective = isTA || isCPasTA;
        if (isTAEffective && isTemporaryGrassland(row.nom_culture || '')) {
            ptHa += surfaceAdm;
        }
    }

    // Tri des cultures TA par surface décroissante
    culturesTA.sort((a, b) => b.surface - a.surface);

    // Calcul des pourcentages
    const bioPercent = taHa > 0 ? (bioTaHa / taHa * 100) : 0;
    const coverPercent = taHa > 0 ? (coverTaHa / taHa * 100) : 0;
    const prairiePercent = sauHa > 0 ? ((ppHa + ptHa) / sauHa * 100) : 0;

    // Détermination exemption
    let exemptionReason = null;
    let exemptionIcon = "✅";
    let exemptionColor = "#d4f0d4";
    let exemptionTextColor = "#15803d";

    // Critère 1 : 100% TA certifiée BIO ou conversion
    if (bioPercent >= 99.9 && taHa > 0) {
        exemptionReason = "Exemption BCAE7 : 100 % des Terres arables sont certifiées BIO ou en conversion.";
    }
    // Critère 2 : TA < 10 ha
    else if (taHa < 10) {
        exemptionReason = `Exemption BCAE7 : Surface en Terres arables inférieure à 10 ha (${taHa.toFixed(2)} ha).`;
    }
    // Critère 3 : >75% des TA en prairies temporaires, luzernes, jachères, plantes fourragères
    else if (coverPercent > 75) {
        exemptionReason = `Exemption BCAE7 : Plus de 75 % des Terres arables (${coverPercent.toFixed(1)} %) sont en prairies temporaires, luzernes, jachères ou plantes fourragères.`;
    }
    // Critère 4 : >75% SAU en prairies (PP + PT)
    else if (prairiePercent > 75) {
        exemptionReason = `Exemption BCAE7 : Plus de 75 % de la SAU (${prairiePercent.toFixed(1)} %) est en prairies (permanentes + temporaires).`;
    }
    // Critère 5 : SAU < 30 ha
    else if (sauHa < 30) {
        exemptionReason = `Exemption BCAE7 : Surface Agricole Utile inférieure à 30 ha (${sauHa.toFixed(2)} ha).`;
    }
    else {
        exemptionReason = "⚠️ Non exempté(e) — La diversification des cultures doit être respectée.";
        exemptionIcon = "⚠️";
        exemptionColor = "#fff3e0";
        exemptionTextColor = "#e6a017";
    }

    // Mise à jour des KPI
    _setText('bcae7-stat-SAU', sauHa.toFixed(2).replace('.', ',') + ' ha');
    _setText('bcae7-stat-TA', taHa.toFixed(2).replace('.', ',') + ' ha');
    _setText('bcae7-stat-PP', ppHa.toFixed(2).replace('.', ',') + ' ha');
    _setText('bcae7-stat-PT', ptHa.toFixed(2).replace('.', ',') + ' ha');

    // Carte exemption
    const exemptionTitle = document.getElementById('bcae7-exemption-title');
    const exemptionDetail = document.getElementById('bcae7-exemption-detail');
    const exemptionBadge = document.getElementById('bcae7-exemption-badge');
    const exemptionIconSpan = document.getElementById('bcae7-exemption-icon');

    if (exemptionTitle) exemptionTitle.textContent = exemptionReason?.split(' : ')[0] || "Statut BCAE7";
    if (exemptionDetail) exemptionDetail.textContent = exemptionReason?.split(' : ')[1] || exemptionReason || "Analyse terminée";
    if (exemptionBadge) {
        exemptionBadge.textContent = exemptionReason?.startsWith('Exemption') ? "✅ EXEMPTÉ(E)" : "⚠️ NON EXEMPTÉ(E)";
        exemptionBadge.style.background = exemptionReason?.startsWith('Exemption') ? "#d4f0d4" : "#fff3e0";
        exemptionBadge.style.color = exemptionReason?.startsWith('Exemption') ? "#15803d" : "#e6a017";
    }
    if (exemptionIconSpan) exemptionIconSpan.textContent = exemptionIcon;

    // Critère 1 - BIO
    _setText('bcae7-bio-percent', bioPercent.toFixed(1).replace('.', ',') + ' %');
    _setText('bcae7-bio-detail', `${bioTaHa.toFixed(2).replace('.', ',')} ha / ${taHa.toFixed(2).replace('.', ',')} ha TA`);
    const bioStatus = document.getElementById('bcae7-bio-status');
    if (bioStatus) {
        if (bioPercent >= 99.9 && taHa > 0) {
            bioStatus.innerHTML = '✅ Exemption applicable';
            bioStatus.style.background = '#d4f0d4';
            bioStatus.style.color = '#15803d';
        } else {
            bioStatus.innerHTML = bioPercent > 0 ? `⚠️ ${bioPercent.toFixed(1)}% BIO - 100% requis` : '❌ Aucune surface BIO';
            bioStatus.style.background = bioPercent > 0 ? '#fff3e0' : '#fee2e2';
            bioStatus.style.color = bioPercent > 0 ? '#e6a017' : '#b91c1c';
        }
    }

    // Critère 2 - SAU < 30 ha
    _setText('bcae7-sau-value', sauHa.toFixed(2).replace('.', ','));
    const sauStatus = document.getElementById('bcae7-sau-status');
    if (sauStatus) {
        if (sauHa < 30) {
            sauStatus.innerHTML = '✅ SAU < 30 ha → Exemption';
            sauStatus.style.background = '#d4f0d4';
            sauStatus.style.color = '#15803d';
        } else {
            sauStatus.innerHTML = `❌ SAU = ${sauHa.toFixed(2)} ha ≥ 30 ha`;
            sauStatus.style.background = '#fee2e2';
            sauStatus.style.color = '#b91c1c';
        }
    }

    // Critère 3 - TA < 10 ha
    _setText('bcae7-ta-value', taHa.toFixed(2).replace('.', ','));
    const taStatus = document.getElementById('bcae7-ta-status');
    if (taStatus) {
        if (taHa < 10) {
            taStatus.innerHTML = '✅ TA < 10 ha → Exemption';
            taStatus.style.background = '#d4f0d4';
            taStatus.style.color = '#15803d';
        } else {
            taStatus.innerHTML = `❌ TA = ${taHa.toFixed(2)} ha ≥ 10 ha`;
            taStatus.style.background = '#fee2e2';
            taStatus.style.color = '#b91c1c';
        }
    }

    // Critère 4 - >75% TA en couverts dérogatoires
    _setText('bcae7-cover-percent', coverPercent.toFixed(1).replace('.', ',') + ' %');
    _setText('bcae7-cover-detail', `${coverTaHa.toFixed(2).replace('.', ',')} ha / ${taHa.toFixed(2).replace('.', ',')} ha TA`);
    const coverBar = document.getElementById('bcae7-cover-bar');
    if (coverBar) coverBar.style.width = Math.min(coverPercent, 100) + '%';
    const coverStatus = document.getElementById('bcae7-cover-status');
    if (coverStatus) {
        if (coverPercent > 75) {
            coverStatus.innerHTML = '✅ >75% → Exemption applicable';
            coverStatus.style.background = '#d4f0d4';
            coverStatus.style.color = '#15803d';
        } else {
            coverStatus.innerHTML = `❌ ${coverPercent.toFixed(1)}% ≤ 75%`;
            coverStatus.style.background = '#fee2e2';
            coverStatus.style.color = '#b91c1c';
        }
    }

    // Critère 5 - >75% SAU en prairies
    _setText('bcae7-prairie-percent', prairiePercent.toFixed(1).replace('.', ',') + ' %');
    const prairieBar = document.getElementById('bcae7-prairie-bar');
    if (prairieBar) prairieBar.style.width = Math.min(prairiePercent, 100) + '%';
    const prairieStatus = document.getElementById('bcae7-prairie-status');
    if (prairieStatus) {
        if (prairiePercent > 75) {
            prairieStatus.innerHTML = '✅ >75% → Exemption applicable';
            prairieStatus.style.background = '#d4f0d4';
            prairieStatus.style.color = '#15803d';
        } else {
            prairieStatus.innerHTML = `❌ ${prairiePercent.toFixed(1)}% ≤ 75%`;
            prairieStatus.style.background = '#fee2e2';
            prairieStatus.style.color = '#b91c1c';
        }
    }

    // Tableau détaillé des cultures TA
    const tbody = document.getElementById('bcae7-cultures-tbody');
    const tfoot = document.getElementById('bcae7-cultures-tfoot');
    if (tbody) {
        tbody.innerHTML = culturesTA.map(c => {
            const percent = taHa > 0 ? (c.surface / taHa * 100) : 0;
            const group = getBCAE7Group(c.nom_culture);
            return `
                <tr>
                    <td><span class="code-badge">${c.code}</span></td>
                    <td>${c.nom_culture}</td>
                    <td>${c.precision || '—'}</td>
                    <td>${group}</td>
                    <td style="text-align:right;font-weight:600">${c.surface.toFixed(2).replace('.', ',')} ha</td>
                    <td style="text-align:right">${percent.toFixed(1).replace('.', ',')} %</td>
                    <td>${c.season || '—'}</td>
                </tr>
            `;
        }).join('');
    }

    if (tfoot) {
        tfoot.innerHTML = `
            <tr>
                <td colspan="4" style="padding:10px;text-align:right"><strong>TOTAL Terres arables (TA)</strong></td>
                <td style="padding:10px;text-align:right;font-weight:700">${taHa.toFixed(2).replace('.', ',')} ha</td>
                <td style="padding:10px;text-align:right">100 %</td>
                <td style="padding:10px"></td>
            </tr>
        `;
    }
}

function getSeason(nomCulture, code) {
    if (!nomCulture && !code) return '—';
    const lower = (nomCulture || '').toLowerCase();
    if (lower.includes('printemps') || code === 'AVP' || code === 'BDP' || code === 'BTP' || code === 'ORP' || code === 'SEP' || code === 'TTP' || code === 'CZP') {
        return '🌱 Printemps';
    }
    if (lower.includes('hiver') || code === 'AVH' || code === 'BDH' || code === 'BTH' || code === 'ORH' || code === 'SEH' || code === 'TTH' || code === 'CZH') {
        return '❄️ Hiver';
    }
    return '—';
}

function _setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}