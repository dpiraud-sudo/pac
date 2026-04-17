// js/data.js - Version COMPLÈTE avec tous les codes cultures PAC 2026

export const DB = {};

export function addC(nom, code, precs, surf, eco, section) {
  DB[code + '/'] = { nom, precision_label: '', surface_cat: surf, eco, section };
  if (precs) {
    for (const p of precs) {
      DB[code + '/' + p.code] = { nom, precision_label: p.label, surface_cat: surf, eco, section };
    }
  }
}

export function lookup(code, prec) {
  const p = (prec || '').trim();
  return DB[code + '/' + p] ||
         DB[code + '/' + p.replace(/^0+/, '')] ||
         DB[code + '/' + p.padStart(3, '0')] ||
         DB[code + '/'] ||
         { nom: code, precision_label: p, surface_cat: '?', eco: 'Inconnu', section: '?' };
}

// ===================================================
// 1.1 CÉRÉALES
// ===================================================
addC("Avoine d'hiver", "AVH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales d'hiver", "1.1");
addC("Avoine de printemps", "AVP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales de printemps", "1.1");
addC("Blé dur d'hiver", "BDH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales d'hiver", "1.1");
addC("Blé dur de printemps", "BDP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales de printemps", "1.1");
addC("Blé tendre d'hiver", "BTH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales d'hiver", "1.1");
addC("Blé tendre de printemps", "BTP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales de printemps", "1.1");
addC("Orge d'hiver", "ORH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales d'hiver", "1.1");
addC("Orge de printemps", "ORP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales de printemps", "1.1");
addC("Seigle d'hiver", "SEH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales d'hiver", "1.1");
addC("Seigle de printemps", "SEP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales de printemps", "1.1");
addC("Sorgho", "SOG", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.1");
addC("Triticale d'hiver", "TTH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales d'hiver", "1.1");
addC("Triticale de printemps", "TTP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Céréales de printemps", "1.1");
addC("Millet", "MLT", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.1");
addC("Moha", "MOH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.1");
addC("Maïs grain et ensilage", "MIS", [{ code: "001", label: "Grain" }, { code: "002", label: "Ensilage" }, { code: "003", label: "Semences" }, { code: "004", label: "Pop-corn" }, { code: "005", label: "Maïs doux" }], "TA", "Céréales de printemps", "1.1");
addC("Riz", "RIZ", [{ code: "001", label: "Riz grain" }, { code: "002", label: "Riz semences" }], "TA", "Autres cultures", "1.1");
addC("Autres céréales ou mélange de céréales", "ANR", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.1");
addC("Sarrasin (blé noir)", "SAB", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.1");
addC("Quinoa", "QUI", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.1");
addC("Autres pseudo-céréales", "APC", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.1");

// ===================================================
// 1.2 OLÉAGINEUX
// ===================================================
addC("Cameline", "CML", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Oléagineux de printemps", "1.2");
addC("Colza d'hiver", "CZH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Oléagineux d'hiver", "1.2");
addC("Colza de printemps", "CZP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Oléagineux de printemps", "1.2");
addC("Lin non textile d'hiver", "LIH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.2");
addC("Lin non textile de printemps", "LIP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.2");
addC("Moutarde d'hiver", "MOT", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Oléagineux d'hiver", "1.2");
addC("Oeillette (pavot)", "OEI", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.2");
addC("Tournesol", "TRN", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Oléagineux de printemps", "1.2");
addC("Autres oléagineux printemps/été", "OAG", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Oléagineux de printemps", "1.2");
addC("Autres oléagineux d'hiver", "OHR", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Oléagineux d'hiver", "1.2");

// ===================================================
// 1.3 PROTÉAGINEUX & LÉGUMINEUSES
// ===================================================
addC("Arachide", "ARA", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Féverole d'hiver", "FEH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Féverole de printemps", "FEP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Lentille", "LEN", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Lupin doux", "LUP", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Pois chiche", "PCH", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Pois protéagineux d'hiver", "PHI", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Pois protéagineux de printemps", "PPR", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Pois et haricot secs (alimentation humaine)", "PHS", [{ code: "001", label: "Haricot sec/demi-sec" }, { code: "002", label: "Pois cassé" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Pois et haricot frais (alimentation humaine)", "PHF", [{ code: "001", label: "Haricot frais" }, { code: "002", label: "Petit pois frais/semences" }, { code: "003", label: "Pois gourmand" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Gesse", "GES", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Luzerne", "LUZ", [{ code: "001", label: "Variété à gazon" }, { code: "GREENMED", label: "Greenmed" }, { code: "002", label: "Autre variété" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Sainfoin", "SAI", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Soja", "SOJ", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Trèfle", "TRE", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Vesce, mélilot, jarosse, serradelle", "VES", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Autre légumineuse à graines ou fourragère", "PAG", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");
addC("Mélange de légumineuses à graines ou fourragères pures", "MLF", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Protéagineux et légumineuses fourragères", "1.3");

// ===================================================
// 1.4 MÉLANGES MULTI-ESPÈCES
// ===================================================
addC("Mélange multi-espèces légumineuses à graines prépond.", "MPC", [{ code: "001", label: "Légumineuses à graines + céréales" }, { code: "002", label: "Autre mélange légumineuses + céréales/oléagineux" }], "TA", "Protéagineux et légumineuses fourragères", "1.4");
addC("Mélange multi-espèces légumineuses fourragères prépond.", "MLC", [{ code: "001", label: "Légumineuses fourragères + céréales/oléagineux" }, { code: "002", label: "Autre mélange légumineuses prépond. sans graminées" }], "TA", "Protéagineux et légumineuses fourragères", "1.4");
addC("Mélange multi-espèces (céréales, oléagineux, légumineuses) sans graminées", "CPL", [{ code: "001", label: "Récolte en grains" }, { code: "002", label: "Récolte plante entière" }], "TA", "Autres cultures", "1.4");
addC("Cultures en inter-rangs (2 cultures >25% chacune)", "CID", [{ code: "CID", label: "Culture 1 + Culture 2 à préciser" }], "TA", "Selon cultures présentes", "1.4");
addC("Cultures en inter-rangs (3 cultures >25%)", "CIT", [{ code: "CIT", label: "Trois cultures à déclarer" }], "TA", "Selon cultures présentes", "1.4");
addC("Maraîchage diversifié", "MDI", [{ code: "001", label: "Légumes frais et fruits (aide au maraîchage)" }, { code: "002", label: "Légumes/fruits/PPAM (non éligible aide)" }, { code: "003", label: "Légumes/fruits sous abattis" }], "TA", "Autres cultures", "1.4");
addC("Surfaces hautement diversifiées (DOM)", "SHD", [], "CP", "Sans objet", "1.4");

// ===================================================
// 1.5 PRAIRIES TEMPORAIRES & JACHÈRES
// ===================================================
addC("Mélange légumineuses prépond. + graminées fourragères ≤5 ans", "MLG", [{ code: "001", label: "Mélange implanté l'année" }, { code: "002", label: "Mélange déjà en place" }], "TA", "Protéagineux et légumineuses fourragères", "1.5");
addC("Prairie temporaire ≤5 ans / mélange avec graminées", "PTR", [], "TA", "Prairies temporaires et jachères", "1.5");
addC("Graminée pure pour gazon/semences certifiées", "GRA", [], "TA", "Prairies temporaires et jachères", "1.5");
addC("Jachère (terre arable)", "JAC", [{ code: "001", label: "Couvert herbacé" }, { code: "002", label: "Jachère mellifère (liste nationale)" }, { code: "003", label: "Autre jachère fleurie/mellifère" }, { code: "004", label: "Jachère faunistique" }, { code: "005", label: "Repousses de cultures couvrantes" }], "TA", "Prairies temporaires et jachères", "1.5");

// ===================================================
// 1.6 PRAIRIES PERMANENTES
// ===================================================
addC("Prairie de 6 ans et plus (herbacé)", "PPH", [{ code: "001", label: "Essentiellement fauche" }, { code: "002", label: "Essentiellement pâturée" }, { code: "003", label: "MAEC avant 2023 (PRL)" }, { code: "004", label: "Fauchée et pâturée" }], "PP", "PP", "1.6");
addC("Prairie herbe prédominante + ligneux présents", "SPH", [], "PP", "PP", "1.6");
addC("Surface pastorale - ressources ligneuses prédominantes", "SPL", [], "PP", "PP", "1.6");
addC("Châtaigneraie (porcins/petits ruminants) zones spécifiques", "CAE", [{ code: "001", label: "Futaie (<100 châtaigniers/ha)" }, { code: "002", label: "Taillis sous futaie" }, { code: "003", label: "Taillis dense" }], "PP", "PP", "1.6");
addC("Chênaie (porcins/petits ruminants) Corse/Causses", "CEE", [{ code: "001", label: "Futaie (<100 chênes/ha)" }, { code: "002", label: "Taillis sous futaie" }, { code: "003", label: "Taillis dense" }], "PP", "PP", "1.6");

// ===================================================
// 1.7 CULTURES INDUSTRIELLES & SPÉCIALES
// ===================================================
addC("Betterave", "BTN", [{ code: "001", label: "Betterave à sucre" }, { code: "002", label: "Betterave fourragère" }, { code: "003", label: "Betterave potagère" }, { code: "004", label: "Autre betterave" }], "TA", "Plantes sarclées", "1.7");
addC("Chanvre", "CHV", [{ code: "VAR", label: "Variété selon liste nationale (cf. notice §2.1)" }], "TA", "Autres cultures", "1.7");
addC("Canne à sucre", "CSA", [{ code: "001", label: "Fermage" }, { code: "002", label: "Propriété/FVD" }, { code: "003", label: "Indivision" }, { code: "004", label: "Réforme foncière" }, { code: "005", label: "Autre" }], "CP", "Sans objet", "1.7");
addC("Houblon", "HBL", [], "CP", "CP gérée comme une TA - Autres cultures", "1.7");
addC("Lin fibres", "LIF", [], "TA", "Autres cultures", "1.7");
addC("Pomme de terre", "PTC", [{ code: "001", label: "Consommation" }, { code: "002", label: "Féculière" }], "TA", "Plantes sarclées", "1.7");
addC("Tabac", "TAB", [], "TA", "Autres cultures", "1.7");

// ===================================================
// 1.8 LÉGUMES & FRUITS
// ===================================================
addC("Ail", "AIL", [], "TA", "Autres cultures", "1.8");
addC("Ananas", "ANA", [], "TA", "Sans objet", "1.8");
addC("Artichaut", "ART", [], "TA", "Autres cultures", "1.8");
addC("Banane (export)", "BEF", [{ code: "001", label: "Fermage" }, { code: "002", label: "Propriété/FVD" }, { code: "003", label: "Indivision" }, { code: "004", label: "Réforme foncière" }, { code: "005", label: "Autre" }], "CP", "Sans objet", "1.8");
addC("Banane (hors export)", "BCA", [], "CP", "Sans objet", "1.8");
addC("Carotte", "CAR", [{ code: "001", label: "Potagère" }, { code: "002", label: "Fourragère" }, { code: "003", label: "Terrapur" }], "TA", "Autres cultures", "1.8");
addC("Céleri", "CEL", [], "TA", "Autres cultures", "1.8");
addC("Chou", "CHU", [{ code: "001", label: "Potager" }, { code: "002", label: "Fourrager" }], "TA", "Autres cultures", "1.8");
addC("Concombre, cornichon, courgette", "CCN", [{ code: "001", label: "Concombre/Cornichon" }, { code: "002", label: "Courgette" }], "TA", "Autres cultures", "1.8");
addC("Epinard, oseille, bette", "EPI", [{ code: "001", label: "Epinard" }, { code: "002", label: "Oseille" }, { code: "003", label: "Bette" }], "TA", "Autres cultures", "1.8");
addC("Fraise (pleine terre)", "FRA", [], "TA", "Autres cultures", "1.8");
addC("Laitue, endive, salades", "LBF", [{ code: "001", label: "Endive" }, { code: "002", label: "Laitue" }, { code: "003", label: "Mâche" }, { code: "004", label: "Autres salades" }], "TA", "Autres cultures", "1.8");
addC("Melon, pastèque", "MLO", [{ code: "001", label: "Melon" }, { code: "002", label: "Pastèque" }], "TA", "Autres cultures", "1.8");
addC("Navet, rutabaga, racines", "NVT", [{ code: "001", label: "Navet potager" }, { code: "002", label: "Navet fourrager/Rutabaga" }, { code: "003", label: "Salsifis" }, { code: "004", label: "Panais" }, { code: "005", label: "Topinambour" }, { code: "006", label: "Autre légume racine" }], "TA", "Autres cultures", "1.8");
addC("Oignon, échalote", "OIG", [{ code: "001", label: "Oignon" }, { code: "002", label: "Echalote" }], "TA", "Autres cultures", "1.8");
addC("Radis", "RDI", [{ code: "001", label: "Potager" }, { code: "002", label: "Fourrager" }], "TA", "Autres cultures", "1.8");
addC("Poireau", "POR", [], "TA", "Autres cultures", "1.8");
addC("Poivron, piment, aubergine", "PVP", [{ code: "001", label: "Poivron" }, { code: "002", label: "Piment" }, { code: "003", label: "Aubergine" }], "TA", "Autres cultures", "1.8");
addC("Potiron, citrouille, courges", "POT", [{ code: "001", label: "Potiron" }, { code: "002", label: "Citrouille" }, { code: "003", label: "Autres courges" }], "TA", "Autres cultures", "1.8");
addC("Tomate (pleine terre)", "TOM", [{ code: "001", label: "Transformation" }, { code: "002", label: "Autre tomate" }], "TA", "Autres cultures", "1.8");
addC("Tubercule tropical", "TBT", [{ code: "001", label: "Igname" }, { code: "002", label: "Curcuma" }, { code: "003", label: "Gingembre" }, { code: "004", label: "Autres tubercules (taro, patate douce, arrow-root...)" }], "TA", "Autres cultures", "1.8");
addC("Autre légume ou fruit annuel", "FLA", [{ code: "001", label: "Autre fruit" }, { code: "002", label: "Autre légume frais" }, { code: "003", label: "Champignon (culture de plein champ)" }], "TA", "Autres cultures", "1.8");
addC("Autre légume ou fruit pérenne (hors petits fruits à baie)", "FLP", [{ code: "001", label: "Asperge" }, { code: "002", label: "Rhubarbe" }, { code: "003", label: "Autre fruit pérenne" }, { code: "004", label: "Autre légume pérenne" }], "CP", "CP gérée comme une TA - Autres cultures", "1.8");

// ===================================================
// 1.9 CULTURES PERMANENTES FRUITIÈRES
// ===================================================
addC("Agrume", "AGR", [{ code: "001", label: "Verger de plus de 5 ans" }, { code: "002", label: "Verger de 5 ans ou moins" }], "CP", "CP", "1.9");
addC("Café et cacao", "CAC", [{ code: "001", label: "Café" }, { code: "002", label: "Cacao" }], "CP", "CP", "1.9");
addC("Cerise", "CBT", [{ code: "001", label: "Cerise bigarreau pour transformation - verger >5ans" }, { code: "002", label: "Cerise bigarreau pour transformation - plantation ≤5ans" }, { code: "003", label: "Autre cerise - verger >5ans" }, { code: "004", label: "Autre cerise - plantation ≤5ans" }], "CP", "CP", "1.9");
addC("Châtaigne", "CTG", [{ code: "001", label: "Verger de plus de 5 ans" }, { code: "002", label: "Verger de 5 ans ou moins" }], "CP", "CP", "1.9");
addC("Noisette", "NOS", [], "CP", "CP", "1.9");
addC("Noix (y compris noix de coco)", "NOX", [], "CP", "CP", "1.9");
addC("Oliveraie", "OLI", [], "CP", "CP", "1.9");
addC("Pêche (nectarine, brugnon)", "PVT", [{ code: "001", label: "Pêche Pavie transfo >5ans" }, { code: "002", label: "Pêche Pavie transfo ≤5ans" }, { code: "003", label: "Autre pêche >5ans" }, { code: "004", label: "Autre pêche ≤5ans" }], "CP", "CP", "1.9");
addC("Poire", "PWT", [{ code: "001", label: "Williams transfo >5ans" }, { code: "002", label: "Williams transfo ≤5ans" }, { code: "003", label: "Autre poire >5ans" }, { code: "004", label: "Autre poire ≤5ans" }], "CP", "CP", "1.9");
addC("Prune (mirabelle, quetsche...)", "PRU", [{ code: "001", label: "Prune d'Ente transfo >5ans" }, { code: "002", label: "Prune d'Ente transfo ≤5ans" }, { code: "003", label: "Autre prune >5ans" }, { code: "004", label: "Autre prune ≤5ans" }], "CP", "CP", "1.9");
addC("Autre verger", "VRG", [{ code: "001", label: "Abricot" }, { code: "002", label: "Amande" }, { code: "003", label: "Pomme" }, { code: "004", label: "Autre (avocat, caroube, mangue...)" }], "CP", "CP", "1.9");
addC("Petit fruit à baie (hors fraise)", "PFR", [{ code: "001", label: "Myrtille, mûre" }, { code: "002", label: "Framboise" }, { code: "003", label: "Groseille, canneberge" }, { code: "004", label: "Argousier" }, { code: "005", label: "Baie de goji" }, { code: "006", label: "Cassis fruit" }, { code: "007", label: "Cassis feuille" }], "CP", "CP", "1.9");
addC("Plantes médicinales pérennes arbo", "PPP", [{ code: "001", label: "Ginkgo" }, { code: "002", label: "Hamamelis" }, { code: "003", label: "Sureau" }, { code: "004", label: "Tilleul" }, { code: "005", label: "Vigne rouge" }, { code: "006", label: "Lingue café/Fleurs jaunes/Cannelle/Bois de rose" }, { code: "007", label: "Autre plante médicinale arbo" }], "CP", "CP", "1.9");
addC("Vigne", "VRC", [{ code: "001", label: "Raisin de cuve" }, { code: "002", label: "Raisin de table" }, { code: "003", label: "Vigne sans production" }], "CP", "CP", "1.9");

// ===================================================
// 1.10 AROMATIQUES & MÉDICINALES
// ===================================================
addC("Plante aromatique pérenne non arbustive", "ARP", [{ code: "001", label: "Estragon" }, { code: "002", label: "Origan/Marjolaine" }, { code: "003", label: "Romarin" }, { code: "004", label: "Sarriette montagnes" }, { code: "005", label: "Thym" }, { code: "006", label: "Autre aromatique pérenne" }], "CP", "CP gérée comme une TA - Autres cultures", "1.10");
addC("Vanille", "VNL", [], "CP", "Sans objet", "1.10");
addC("Aromatiques herbacées non pérennes", "AAR", [{ code: "001", label: "Aneth/Anis vert" }, { code: "002", label: "Basilic" }, { code: "005", label: "Fenouil" }, { code: "006", label: "Menthe" }, { code: "007", label: "Safran" }, { code: "008", label: "Sarriette jardins" }, { code: "009", label: "Autre aromatique herbacée" }, { code: "010", label: "Cerfeuil/Ciboulette" }, { code: "011", label: "Carvi" }, { code: "012", label: "Coriandre" }, { code: "013", label: "Cumin" }], "TA", "Autres cultures", "1.10");
addC("Persil", "PSL", [], "TA", "Autres cultures", "1.10");
addC("Plantes à parfum pérennes", "PRF", [{ code: "001", label: "Géranium" }, { code: "002", label: "Hélichryse" }, { code: "003", label: "Vétiver" }, { code: "004", label: "Violette" }, { code: "005", label: "Ylang-ylang" }, { code: "006", label: "Autre parfum pérenne" }], "CP", "CP gérée comme une TA - Autres cultures", "1.10");
addC("Lavande, lavandin", "LAV", [{ code: "001", label: "Lavande" }, { code: "002", label: "Lavandin" }], "CP", "CP gérée comme une TA - Autres cultures", "1.10");
addC("Plantes médicinales non pérennes", "AME", [{ code: "001", label: "Angélique" }, { code: "002", label: "Bardane" }, { code: "004", label: "Livèche" }, { code: "005", label: "Marguerite/Millepertuis" }, { code: "006", label: "Ortie" }, { code: "007", label: "Pâquerette/Pensée" }, { code: "008", label: "Plantain psyllium" }, { code: "009", label: "Valériane" }, { code: "010", label: "Autre médicinale non pérenne" }, { code: "011", label: "Camomille" }, { code: "012", label: "Chardon-Marie" }], "TA", "Autres cultures", "1.10");
addC("Plantes médicinales pérennes (herbacées)", "PME", [{ code: "001", label: "Gentiane" }, { code: "002", label: "Hysope" }, { code: "003", label: "Mélisse" }, { code: "004", label: "Sauge" }, { code: "005", label: "Verveine" }, { code: "006", label: "Autre médicinale pérenne" }, { code: "007", label: "Cassis bourgeon" }], "CP", "CP gérée comme une TA - Autres cultures", "1.10");
addC("Horticulture ornementale", "HPC", [], "TA", "Autres cultures", "1.10");

// ===================================================
// 1.11 AUTRES / IAE / BOISEMENTS
// ===================================================
addC("Autre plante fourragère annuelle", "AFG", [], "TA", "Autres cultures", "1.11");
addC("Jachère sanitaire imposée", "JNO", [], "TA", "Non prise en compte", "1.11");
addC("Culture pérenne forte biomasse", "MSW", [{ code: "001", label: "Miscanthus" }, { code: "002", label: "Switchgrass" }, { code: "003", label: "Canne fourragère" }, { code: "004", label: "Silphie" }, { code: "005", label: "Autre biomasse" }], "CP", "CP gérée comme une TA - Autres cultures", "1.11");
addC("Autre culture pérenne/jachère bananeraie", "ACP", [{ code: "001", label: "Bambou" }, { code: "002", label: "Jachère entre plantations banane" }], "CP", "CP gérée comme une TA - Autres cultures", "1.11");
addC("Pépinière (>1 an)", "PEP", [], "CP", "CP", "1.11");
addC("Pépinière (<1 an)", "PEV", [], "CP", "CP gérée comme une TA - Autres cultures", "1.11");
addC("Truffières", "TRU", [], "CP", "CP", "1.11");
addC("Taillis à courte rotation (TCR)", "TCR", [{ code: "ESP", label: "Espèce selon liste (peuplier, saule, aulne, charme, châtaignier...)" }], "CP", "CP", "1.11");
addC("Boisement aidé", "SBO", [], "SBS", "Sans objet", "1.11");
addC("Bordure de champ", "BOR", [{ code: "REF", label: "Rattachement parcelle" }], "Selon parcelle associée", "Selon parcelle associée", "1.11");
addC("Bande tampon", "BTA", [{ code: "REF", label: "Rattachement parcelle" }], "Selon parcelle associée", "Selon parcelle associée", "1.11");
addC("Bordure le long forêts sans production", "BFS", [{ code: "REF", label: "Rattachement parcelle" }], "Selon parcelle associée", "Selon parcelle associée", "1.11");

// ===================================================
// 1.12 HORS SAU
// ===================================================
addC("Cultures sous serre hors sol", "CSS", [], "NA", "Sans objet", "1.12");
addC("Marais salants", "MRS", [], "NA", "Sans objet", "1.12");
addC("Roselière (récolte de sagnes)", "SAG", [], "NA", "Sans objet", "1.12");
addC("Parc d'élevage monogastrique sol nu", "SNU", [], "NA", "Sans objet", "1.12");
addC("Surface agricole temporairement non admissible", "SNE", [{ code: "001", label: "Dépôt temporaire" }, { code: "002", label: "Sol nu" }, { code: "003", label: "Utilisation non agricole temporaire" }, { code: "004", label: "Culture sapins Noël" }, { code: "005", label: "Autre" }], "NA", "Sans objet", "1.12");
addC("Surface pastorale non utilisée", "SIN", [], "NA", "Sans objet", "1.12");

// ===================================================
// AIDES COUPLÉES - BASE DE DONNÉES
// ===================================================
export const COUPLED_AIDES_DB = [];

export function addCoupledAide(code, libelle, precision, aide, semCert, semFerm, dehydrat) {
  COUPLED_AIDES_DB.push({
    code, libelle, precision: precision || "",
    aide, semCert, semFerm, dehydrat
  });
}

// RIZ
addCoupledAide("RIZ", "Riz", "001", "Aide à la production de riz", "non", "non", "non");

// BLÉ DUR
addCoupledAide("BDH", "Blé dur d'hiver", "001", "Aide à la production de blé dur", "non", "non", "non");
addCoupledAide("BDP", "Blé dur de printemps", "001", "Aide à la production de blé dur", "non", "non", "non");
addCoupledAide("BDH", "Blé dur d'hiver", "001", "Aide à la production de blé dur (semences certifiées)", "oui", "non", "non");
addCoupledAide("BDP", "Blé dur de printemps", "001", "Aide à la production de blé dur (semences certifiées)", "oui", "non", "non");

// HOUBLON
addCoupledAide("HBL", "Houblon", "", "Aide à la production de houblon", "non", "non", "non");

// TOMATES TRANSFORMATION
addCoupledAide("TOM", "Tomate", "001", "Aide à la production de tomates destinées à la transformation", "non", "non", "non");

// SEMENCES GRAMINÉES
addCoupledAide("GRA", "Graminée pure", "", "Aide à la production de semences de graminées prairiales", "oui", "non", "non");

// POMMES DE TERRE FÉCULIÈRES
addCoupledAide("PTC", "Pomme de terre", "002", "Aide à la production de pommes de terre féculières", "non", "non", "non");

// PRUNES
addCoupledAide("PRU", "Prune", "001", "Aide à la production de prunes d'Ente (verger >5 ans)", "non", "non", "non");
addCoupledAide("PRU", "Prune", "002", "Aide à la production de prunes d'Ente (plantation ≤5 ans)", "non", "non", "non");

// POIRES
addCoupledAide("PWT", "Poire", "001", "Aide à la production de poires Williams (verger >5 ans)", "non", "non", "non");
addCoupledAide("PWT", "Poire", "002", "Aide à la production de poires Williams (plantation ≤5 ans)", "non", "non", "non");

// PÊCHES
addCoupledAide("PVT", "Pêche", "001", "Aide à la production de pêches Pavie (verger >5 ans)", "non", "non", "non");
addCoupledAide("PVT", "Pêche", "002", "Aide à la production de pêches Pavie (plantation ≤5 ans)", "non", "non", "non");

// CERISES
addCoupledAide("CBT", "Cerise", "001", "Aide à la production de cerises Bigarreau (verger >5 ans)", "non", "non", "non");
addCoupledAide("CBT", "Cerise", "002", "Aide à la production de cerises Bigarreau (plantation ≤5 ans)", "non", "non", "non");

// CHANVRE
addCoupledAide("CHV", "Chanvre", "", "Aide à la production de chanvre", "non", "non", "non");

// LÉGUMINEUSES FOURRAGÈRES
const fourragerCodes = ["FVL", "FVP", "LEC", "FNU", "LOT", "LDH", "LDP", "LUZ", "PHI", "PPR", "SAI", "TRE", "VES", "GES", "PAG", "MLF", "MLC", "MLG"];
fourragerCodes.forEach(code => {
  addCoupledAide(code, "Légumineuse fourragère", "002", "Aide aux légumineuses fourragères", "non", "non", "non");
});

// LÉGUMINEUSES À GRAINES
const grainCodes = ["ARA", "FEV", "FVL", "FVP", "GES", "LDH", "LDP", "LEC", "LOT", "SOJ", "TRE", "VES", "PCH", "PHI", "PPR", "SAI", "MLF"];
grainCodes.forEach(code => {
  addCoupledAide(code, "Légumineuse à graines", "001", "Aide aux légumineuses à graines", "non", "non", "non");
  addCoupledAide(code, "Légumineuse à graines", "001", "Aide aux légumineuses à graines (semences certifiées)", "oui", "non", "non");
  addCoupledAide(code, "Légumineuse à graines", "001", "Aide aux légumineuses à graines (semences fermières)", "non", "oui", "non");
  addCoupledAide(code, "Légumineuse à graines", "002", "Aide aux légumineuses à graines (déshydratation)", "non", "non", "oui");
});

// MARAÎCHAGE
const maraichageCodes = ["AIL", "ART", "CAR", "CEL", "CHU", "CCN", "EPI", "FLA", "FLP", "FRA", "LBF", "MLO", "NVT", "OIG", "RDI", "PHF", "POR", "PVP", "POT", "MDI", "PFR"];
maraichageCodes.forEach(code => {
  addCoupledAide(code, "Maraîchage", "", "Aide au maraîchage", "non", "non", "non");
});

// ===================================================
// MAPPING DES AIDES VERS LEURS CODES XML
// ===================================================
export const AIDE_TO_CODE = {
  "Aide à la production de blé dur": "ble-dur",
  "Aide à la production de blé dur (semences certifiées)": "ble-dur",
  "Aide à la production de riz": "riz",
  "Aide à la production de houblon": "houblon",
  "Aide à la production de tomates destinées à la transformation": "tomates-industrie",
  "Aide à la production de semences de graminées prairiales": "semences-graminees",
  "Aide à la production de pommes de terre féculières": "pommes-terre-feculieres",
  "Aide à la production de prunes d'Ente (verger >5 ans)": "prunes-transformation",
  "Aide à la production de prunes d'Ente (plantation ≤5 ans)": "prunes-transformation",
  "Aide à la production de poires Williams (verger >5 ans)": "poires-transformation",
  "Aide à la production de poires Williams (plantation ≤5 ans)": "poires-transformation",
  "Aide à la production de pêches Pavie (verger >5 ans)": "peches-transformation",
  "Aide à la production de pêches Pavie (plantation ≤5 ans)": "peches-transformation",
  "Aide à la production de cerises Bigarreau (verger >5 ans)": "cerises-transformation",
  "Aide à la production de cerises Bigarreau (plantation ≤5 ans)": "cerises-transformation",
  "Aide à la production de chanvre": "chanvre",
  "Aide aux légumineuses fourragères": "legumineuse-fourragere",
  "Aide aux légumineuses à graines": "legumineuse-graine",
  "Aide au maraîchage": "maraichage"
};

export const AIDE_NOMS = {
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

// ===================================================
// PALETTE DE COULEURS POUR LA CARTE
// ===================================================
export const colorPaletteMap = [
  { color: '#2e7d32', fill: '#6fbf4c' },
  { color: '#ed6c02', fill: '#f4a460' },
  { color: '#1565c0', fill: '#64b5f6' },
  { color: '#6a1b9a', fill: '#ce93d8' },
  { color: '#c62828', fill: '#ef9a9a' },
  { color: '#00838f', fill: '#80deea' },
  { color: '#ef6c00', fill: '#ffb74d' },
  { color: '#43a047', fill: '#a5d6a7' },
  { color: '#5d4037', fill: '#bcaaa4' }
];

export const cultureColorCache = new Map();
let nextColorIdx = 0;

export function getCultureColor(code) {
  if (cultureColorCache.has(code)) return cultureColorCache.get(code);
  const idx = nextColorIdx % colorPaletteMap.length;
  const c = colorPaletteMap[idx];
  cultureColorCache.set(code, { color: c.color, fill: c.fill });
  nextColorIdx++;
  return cultureColorCache.get(code);
}

// Réinitialise le cache couleurs entre deux chargements de fichier
export function resetColorCache() {
  cultureColorCache.clear();
  nextColorIdx = 0;
}
