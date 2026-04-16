import { escHtml } from './utils.js';

const ASSUREUR_MAPPING = {
  "AZR": "ALLIANZ - Assurances récoltes",
  "AIS": "Abeille IARD et Santé",
  "CRM": "CRMAPT",
  "CMT": "Assurances du Crédit Mutuel et CIC Assurances",
  "GAN": "GAN",
  "GEN": "GENERALI",
  "GLB": "Groupama Loire Bretagne",
  "GCA": "Groupama Centre Atlantique",
  "GCM": "Groupama Centre Manche",
  "GGE": "Groupama Grand Est",
  "GME": "Groupama Méditerranée",
  "GNE": "Groupama Nord Est",
  "GOC": "Groupama Oc",
  "PVL": "Groupama Paris / Val de Loire",
  "GRA": "Groupama Rhône Alpes / Auvergne",
  "RUR": "La Rurale",
  "ETO": "L'ETOILE",
  "PAC": "PACIFICA",
  "SGR": "Suisse Grêle « Partenaire AXA »",
  "ATK": "Atekka (Vereinigte Hagel)"
};

const AIDE_NOMS = {
  "ble-dur": "🌾 Blé Dur",
  "riz": "🍚 Riz",
  "houblon": "🍺 Houblon",
  "tomates-industrie": "🍅 Tomates industrie",
  "semences-graminees": "🌱 Semences graminées",
  "pommes-terre-feculieres": "🥔 PDT féculières",
  "prunes-transformation": "🍑 Prunes transformation",
  "poires-transformation": "🍐 Poires transformation",
  "peches-transformation": "🍑 Pêches transformation",
  "cerises-transformation": "🍒 Cerises transformation",
  "chanvre": "🌿 Chanvre",
  "legumineuse-fourragere": "🌿 Légumineuses fourragères",
  "legumineuse-graine": "🫘 Légumineuses à graines",
  "maraichage": "🥕 Maraîchage"
};

function getAssureurLibelle(code) {
  if (!code) return null;
  const u = code.trim().toUpperCase();
  return ASSUREUR_MAPPING[u] ? `${u} – ${ASSUREUR_MAPPING[u]}` : `${u} (libellé non trouvé)`;
}

function aidesFormatBoolean(value) {
  if (value === "true") return { text: "Oui", cls: "aides-status-true" };
  if (value === "false") return { text: "Non", cls: "aides-status-false" };
  return { text: value || "Non renseigné", cls: "aides-status-other" };
}

function formatVoieEcoregime(code) {
  const m = { "VC": "Certification (VC)", "VP": "Pratiques (VP)", "VB": "Environnementale IAE (VB)", "VH": "Haies (VH)" };
  return m[code] || (code ? `Voie inconnue (${code})` : "-");
}

export function extractAidesFromDoc(doc) {
  const NS2 = 'urn:x-telepac:fr.gouv.agriculture.telepac:echange-producteur';
  const getText = (el, tag) => {
    const e = el.getElementsByTagNameNS(NS2, tag)[0];
    return e ? e.textContent.trim() : "";
  };
  
  const result = {};
  const producteur = doc.getElementsByTagNameNS(NS2, "producteur")[0];
  result.pacage = producteur ? producteur.getAttribute("numero-pacage") : "";
  result.campagne = producteur ? producteur.getAttribute("campagne") : "";
  
  const demandeur = doc.getElementsByTagNameNS(NS2, "demandeur")[0];
  if (demandeur) {
    const identIndiv = demandeur.getElementsByTagNameNS(NS2, "identification-individuelle")[0];
    if (identIndiv) {
      const identite = identIndiv.getElementsByTagNameNS(NS2, "identite")[0];
      if (identite) {
        result.nom = getText(identite, "nom");
        result.prenom = getText(identite, "prenoms");
      }
    }
    const identSoc = demandeur.getElementsByTagNameNS(NS2, "identification-societe")[0];
    if (identSoc) {
      const n = getText(identSoc, "exploitation") || getText(identSoc, "raison-sociale");
      if (n) {
        result.nom = n;
        delete result.prenom;
      }
    }
    result.siret = getText(demandeur, "siret");
    result.email = getText(demandeur, "courriel");
  }
  
  const p1 = doc.getElementsByTagNameNS(NS2, "demandes-aides-pilier1-et-AR")[0];
  if (p1) {
    const aideAttrs = [
      "aide-jeunes-agriculteurs", "ble-dur", "prunes-transformation", "cerises-transformation",
      "peches-transformation", "poires-transformation", "tomates-industrie", "pommes-terre-feculieres",
      "chanvre", "houblon", "semences-graminees", "riz", "maraichage"
    ];
    for (const attr of aideAttrs) {
      const v = p1.getAttribute(attr);
      if (v !== null) result[attr] = v;
    }
    
    const dec = p1.getElementsByTagNameNS(NS2, "demande-aides-decouplees")[0];
    if (dec) result["aides-decouplees"] = dec.getAttribute("aides-decouplees") || "false";
    
    const eco = p1.getElementsByTagNameNS(NS2, "demande-aide-ecoregime")[0];
    if (eco) {
      result["eco-regime"] = eco.getAttribute("aide-ecoregime") || "false";
      if (result["eco-regime"] === "true") {
        result["voie-ecoregime"] = eco.getAttribute("voie-ecoregime") || "";
        result["certification"] = eco.getAttribute("certification") || "";
        result["bonus-haie"] = eco.getAttribute("bonus-haie") || "false";
      }
    }
    
    const legF = p1.getElementsByTagNameNS(NS2, "demande-legumineuses-fourrageres")[0];
    if (legF) {
      result["legumineuse-fourragere"] = legF.getAttribute("legumineuse-fourragere") || "false";
      if (result["legumineuse-fourragere"] === "true") {
        result["demandeur-eleveur"] = legF.getAttribute("demandeur-eleveur") || "false";
        result["numero-pacage-eleveur"] = legF.getAttribute("numero-pacage-eleveur") || "";
      }
    }
    
    const legG = p1.getElementsByTagNameNS(NS2, "demande-legumineuses-graines")[0];
    if (legG) result["legumineuse-graine"] = legG.getAttribute("legumineuse-graine") || "false";
    
    const ass = p1.getElementsByTagNameNS(NS2, "demande-assurance-recolte")[0];
    if (ass) {
      result["assurance-recolte"] = ass.getAttribute("assurance-recolte") || "false";
      const assureurs = ass.getElementsByTagNameNS(NS2, "assureurs")[0];
      if (assureurs) {
        const codes = [];
        for (let a of assureurs.getElementsByTagNameNS(NS2, "assureur")) {
          if (a.textContent) codes.push(a.textContent.trim());
        }
        if (codes.length) result["assureurs_codes"] = codes;
      }
    }
  }
  
  const p2 = doc.getElementsByTagNameNS(NS2, "demandes-aides-pilier2")[0];
  if (p2) {
    result["demande-ab"] = p2.getAttribute("demande-ab") || "false";
    result["demande-maec"] = p2.getAttribute("demande-maec") || "false";
    const ichn = p2.getElementsByTagNameNS(NS2, "ichn")[0];
    if (ichn) result["demande-ichn"] = ichn.getAttribute("demande-ichn") || "false";
  }
  
  const ao = doc.getElementsByTagNameNS(NS2, "autres-obligations")[0];
  if (ao) {
    const obligAttrs = [
      "periode-bcae6", "autorisation-transmission-donnees", "choix-bcae7",
      "interlocuteur-agree-ISN", "autorisation-transmission-donnees-interlocuteur-ISN",
      "transmission-donnees-fins-commerciales", "renonciation-ISN"
    ];
    for (const attr of obligAttrs) {
      const v = ao.getAttribute(attr);
      if (v !== null) result[attr] = v;
    }
  }
  
  const effectifsDeclares = {};
const eff = doc.getElementsByTagNameNS(NS2, "effectifs-animaux")[0];
if (eff) {
  for (let ef of eff.getElementsByTagNameNS(NS2, "effectif-animal")) {
    // Récupère TOUTES les balises "effectif-present-ou-transhumant" et "effectif-present"
    const presents = [
      ...ef.getElementsByTagNameNS(NS2, "effectif-present-ou-transhumant"),
      ...ef.getElementsByTagNameNS(NS2, "effectif-present")
    ];
    for (let pres of presents) {
      const type = getText(pres, "type-animal-1") || getText(pres, "type-animal-2");
      const nb   = getText(pres, "nb-animaux-1")  || getText(pres, "nb-animaux-2");
      if (type && nb !== "") effectifsDeclares[type] = parseInt(nb, 10);
    }
  }
}
result.effectifsDeclares = effectifsDeclares;
  result.effectifsDeclares = effectifsDeclares;
  
  return result;
}

export function renderAides(xmlDoc) {
  const area = document.getElementById('aides-result-area');
  if (!xmlDoc) {
    area.innerHTML = `<div style="text-align:center;padding:40px;color:#888;background:white;border-radius:16px;border:1px solid #deecda">
      <div style="font-size:2rem;margin-bottom:8px">📂</div>
      <div>Chargez d'abord un fichier XML.</div>
    </div>`;
    return;
  }
  
  const data = extractAidesFromDoc(xmlDoc);
  const nomComplet = data.nom ? data.nom + (data.prenom ? " " + data.prenom : "") : "-";
  
  let html = `
    <div class="aides-info-panel">
      <h3>📋 Identité du demandeur</h3>
      <div class="aides-info-grid">
        <div class="aides-info-item"><div class="aides-info-label">PACAGE</div><div class="aides-info-value">${escHtml(data.pacage || "-")}</div></div>
        <div class="aides-info-item"><div class="aides-info-label">Campagne</div><div class="aides-info-value">${escHtml(data.campagne || "-")}</div></div>
        <div class="aides-info-item"><div class="aides-info-label">Nom / Raison sociale</div><div class="aides-info-value">${escHtml(nomComplet)}</div></div>
        <div class="aides-info-item"><div class="aides-info-label">SIRET</div><div class="aides-info-value">${escHtml(data.siret || "-")}</div></div>
        <div class="aides-info-item"><div class="aides-info-label">Email</div><div class="aides-info-value">${escHtml(data.email || "-")}</div></div>
      </div>
    </div>
  `;
  
  function card(name, value, detail = "") {
    const v = aidesFormatBoolean(value);
    return `<div class="aides-card">
      <div class="aides-card-header">
        <span class="aides-card-name">${name}</span>
        <span class="aides-status ${v.cls}">${v.text}</span>
      </div>
      ${detail ? `<div class="aides-card-detail">${detail}</div>` : ""}
    </div>`;
  }
  
  // Pilier 1 découplées
  let s1 = "";
  if (data["aides-decouplees"] !== undefined) s1 += card("Aides découplées", data["aides-decouplees"]);
  if (data["eco-regime"] !== undefined) {
    let det = data["eco-regime"] === "true" ? `
      <div>Voie : ${escHtml(formatVoieEcoregime(data["voie-ecoregime"]))}</div>
      <div>Certification : ${escHtml(data["certification"] || "-")}</div>
      <div>Bonus Haie : ${aidesFormatBoolean(data["bonus-haie"]).text}</div>
    ` : "";
    s1 += card("Éco-régime", data["eco-regime"], det);
  }
  if (data["aide-jeunes-agriculteurs"] !== undefined) s1 += card("👨‍🌾 Jeunes Agriculteurs (JA)", data["aide-jeunes-agriculteurs"]);
  if (s1) html += `<div class="aides-section"><h2>🟢 PILIER 1 – Aides découplées, éco-régime et aide JA</h2>${s1}</div>`;
  
  // Aides couplées
  const coupledLabels = {
    "ble-dur": "Blé dur",
    "prunes-transformation": "Prunes (transformation)",
    "cerises-transformation": "Cerises (transformation)",
    "peches-transformation": "Pêches (transformation)",
    "poires-transformation": "Poires (transformation)",
    "tomates-industrie": "Tomates industrie",
    "pommes-terre-feculieres": "Pommes de terre féculières",
    "chanvre": "Chanvre",
    "houblon": "Houblon",
    "semences-graminees": "Semences graminées",
    "riz": "Riz",
    "maraichage": "Maraîchage",
    "legumineuse-fourragere": "🌿 Légumineuses fourragères",
    "legumineuse-graine": "🫘 Légumineuses à graines"
  };
  
  let s2 = "";
  const coupledOrder = [
    "legumineuse-fourragere", "legumineuse-graine", "ble-dur", "prunes-transformation",
    "cerises-transformation", "peches-transformation", "poires-transformation",
    "tomates-industrie", "pommes-terre-feculieres", "chanvre", "houblon",
    "semences-graminees", "riz", "maraichage"
  ];
  
  for (const key of coupledOrder) {
    if (data[key] === undefined) continue;
    if (key === "legumineuse-fourragere" && data[key] === "true") {
      s2 += card(coupledLabels[key], data[key], `
        <div>Demandeur éleveur : ${aidesFormatBoolean(data["demandeur-eleveur"]).text}</div>
        <div>PACAGE éleveur : ${escHtml(data["numero-pacage-eleveur"] || "-")}</div>
      `);
    } else {
      s2 += card(coupledLabels[key] || key, data[key]);
    }
  }
  if (s2) html += `<div class="aides-section"><h2>🌾 PILIER 1 – Aides couplées végétales</h2>${s2}</div>`;
  
  // Assurance récolte
  if (data["assurance-recolte"] !== undefined) {
    let det = "";
    if (data["assureurs_codes"]?.length) {
      det = `<div>Assureur(s) :</div><div class="assureur-list">${data["assureurs_codes"].map(c => `<span class="assureur-badge">${escHtml(getAssureurLibelle(c) || c)}</span>`).join('')}</div>`;
    }
    html += `<div class="aides-section"><h2>📋 Assurance récolte</h2>${card("Assurance récolte", data["assurance-recolte"], det)}</div>`;
  }
  
  // Pilier 2
  let s4 = "";
  const p2Labels = {
    "demande-ab": "Agriculture Biologique (AB)",
    "demande-maec": "Mesures agro-environnementales (MAEC)",
    "demande-ichn": "Indemnité compensatoire de handicaps naturels (ICHN)"
  };
  for (const key of ["demande-ab", "demande-maec", "demande-ichn"]) {
    if (data[key] !== undefined) s4 += card(p2Labels[key], data[key]);
  }
  if (s4) html += `<div class="aides-section"><h2>🚜 PILIER 2 – Développement rural</h2>${s4}</div>`;
  
  // Obligations
  let s5 = "";
  const obligLabels = {
    "periode-bcae6": "Période BCAE6",
    "autorisation-transmission-donnees": "Autorisation transmission données CartoBio",
    "choix-bcae7": "Choix BCAE7",
    "interlocuteur-agree-ISN": "Interlocuteur agréé ISN",
    "autorisation-transmission-donnees-interlocuteur-ISN": "Transmission données ISN",
    "transmission-donnees-fins-commerciales": "Transmission données fins commerciales",
    "renonciation-ISN": "Renonciation ISN"
  };
  for (const key of Object.keys(obligLabels)) {
    if (data[key] === undefined) continue;
    if (key === "interlocuteur-agree-ISN") {
      s5 += `<div class="aides-card"><div class="aides-card-header"><span class="aides-card-name">${obligLabels[key]}</span><span class="aides-status aides-status-other">${escHtml(getAssureurLibelle(data[key]) || data[key])}</span></div></div>`;
    } else {
      let det = (key === "choix-bcae7" && data[key] !== "true" && data[key] !== "false") ? `<div>Valeur : ${escHtml(data[key])}</div>` : "";
      s5 += card(obligLabels[key], data[key], det);
    }
  }
  if (s5) html += `<div class="aides-section"><h2>📋 Obligations & Engagements</h2>${s5}</div>`;
  
  // Effectifs animaux
  const animaux = [
    ["OV", "Ovins"], ["CA", "Caprins"], ["EQ", "Équins"], ["AL", "Alpaga"], ["LA", "Lama"],
    ["CE", "Cerf et Biche"], ["DA", "Daim et Daine"], ["TR", "Truies"], ["AP", "Autres porcins"],
    ["PP", "Poules pondeuses"], ["AV", "Autres volailles"]
  ];
  let s6 = "";
  for (const [code, label] of animaux) {
    const nb = data.effectifsDeclares?.[code] ?? 0;
    s6 += `<div class="aides-card"><div class="aides-card-header"><span class="aides-card-name">Effectif ${label}</span><span class="aides-status aides-status-other">${nb}</span></div></div>`;
  }
  if (s6) html += `<div class="aides-section"><h2>🐄 Animaux présents (y compris zéro)</h2>${s6}</div>`;
  
  area.innerHTML = html;
}