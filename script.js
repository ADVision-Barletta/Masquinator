/* =========================================================================
   MASQUINATOR — LOGICA APP
   -------------------------------------------------------------------------
   Il menu viene letto live dal Google Sheet (CSV pubblicato): comodo per
   l'uso interno. L'estetica vive in theme.js (gestibile con editor.html).
   ========================================================================= */

// === CONFIGURAZIONE ===
const MQ_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQWqaQeX4ndFLfpY8o8HXMdu7-g0-H5uJW7gKj6xN_EXtNs1tuCXLo3vz_qy2eUXvJZQUDEVg0-Qqb2/pub?output=csv";

// === STATO ===
let mq_db = [];
let mq_userAnswers = {};
let mq_currentQuestionIndex = 0;
let mq_isSharing = false;
let mq_peopleCount = 1;
let mq_activeQuestions = []; // copione effettivo (impostato all'avvio del quiz, con eventuali testi sovrascritti dal tema)

// === DOMANDE (Il copione della Maschera) ===
// I tag delle risposte usano lo STESSO vocabolario del menu, così il punteggio
// aggancia davvero i piatti.
const mq_questions = [
  {
    text: "Quanti siete a sedere al mio tavolo stasera?",
    key: "q1_people",
    answers: [
      {text: "Da solo", tags: ["solo"], sharing: false, count: 1},
      {text: "In coppia", tags: ["coppia"], sharing: true, count: 2},
      {text: "Siamo in 3 o più", tags: ["gruppo"], sharing: true, count: 3}
    ]
  },
  {
    text: "Se questa serata fosse una pellicola, di che genere staremmo parlando?",
    key: "q2_mood",
    answers: [
      {text: "Una commedia rilassata", tags: ["commedia", "comfort", "sicuro"]},
      {text: "Un noir di pura eleganza", tags: ["noir", "elegante", "intenso"]},
      {text: "Un fantasy speziato", tags: ["fantasy", "speziato", "innovativo"]},
      {text: "Un'avventura selvaggia", tags: ["avventura", "azzardo", "deciso"]}
    ]
  },
  {
    // q3 = filtro RIGIDO per il cibo (il piatto deve avere almeno uno di questi tag)
    text: "Dove desideri viaggiare con la portata principale?",
    key: "q3_travel",
    answers: [
      {text: "Voglio sentire il mare", tags: ["mare"]},
      {text: "Carne, brace e cose serie", tags: ["carne", "brace", "terra"]},
      {text: "Sfizi, fritti e golosità", tags: ["comfort", "sapido", "innovativo"]},
      {text: "Non lo so, sorprendimi tu", tags: ["sorpresa"]}
    ]
  },
  {
    text: "Come immagini il sapore al primissimo morso?",
    key: "q4_taste",
    answers: [
      {text: "Delicato, in perfetto equilibrio", tags: ["delicato", "leggero"]},
      {text: "Sapido e di carattere", tags: ["sapido", "deciso"]},
      {text: "Avvolto da spezie e fumo", tags: ["speziato", "intenso"]},
      {text: "Un comfort puro e cremoso", tags: ["cremoso", "comfort"]}
    ]
  },
  {
    // q5 = filtro RIGIDO per i drink
    text: "E per inumidire le labbra, in che direzione andiamo?",
    key: "q5_drink",
    answers: [
      {text: "Vino bianco o rosato, bello fresco", tags: ["vino_fresco"]},
      {text: "Un vino rosso importante", tags: ["vino_rosso"]},
      {text: "Un cocktail fresco e vivace", tags: ["cocktail_fresco"]},
      {text: "Un drink serio, di spessore", tags: ["cocktail_serio"]},
      {text: "Qualcosa di analcolico", tags: ["analcolico"]}
    ]
  },
  {
    text: "Dimmi la verità... quanto ti va di osare con me?",
    key: "q6_surprise",
    answers: [
      {text: "Poco, cerco una carezza sicura", tags: ["sicuro", "tradizione"]},
      {text: "Abbastanza, mi fido", tags: ["medio"]},
      {text: "Molto, fammi divertire", tags: ["molto", "innovativo"]},
      {text: "Totalmente. Fai la tua magia.", tags: ["azzardo", "molto"]}
    ]
  }
];

// === TEMA (estetica gestibile dall'editor, vedi theme.js) ===
function mq_applyTheme() {
  const t = (typeof window !== "undefined" && window.MQ_THEME) ? window.MQ_THEME : {};
  const root = document.documentElement;
  const c = t.colors || {};
  const f = t.fonts || {};
  const s = t.shape || {};

  // Colori
  if (c.bg) root.style.setProperty('--mq-bg-dark', c.bg);
  if (c.primary) root.style.setProperty('--mq-gold', c.primary);
  if (c.primaryHover) root.style.setProperty('--mq-gold-hover', c.primaryHover);
  if (c.textLight) root.style.setProperty('--mq-text-light', c.textLight);
  if (c.textMuted) root.style.setProperty('--mq-text-muted', c.textMuted);

  // Sfondo: riflettore (default) oppure immagine con velo per la leggibilità
  const bg = t.background || {};
  if (bg.type === 'image' && bg.src) {
    const o = (bg.overlay != null ? bg.overlay : 0.55);
    root.style.setProperty('--mq-spotlight',
      `linear-gradient(rgba(0,0,0,${o}), rgba(0,0,0,${o})), url("${bg.src}")`);
  } else if (c.bg || c.spotlight) {
    const center = c.spotlight || '#2a1111';
    const edge = c.bg || '#07070a';
    root.style.setProperty('--mq-spotlight',
      `radial-gradient(circle at 50% 30%, ${center} 0%, ${edge} 65%)`);
  }

  // Forme
  if (s.radiusBtn != null) root.style.setProperty('--mq-radius-btn', s.radiusBtn + 'px');
  if (s.radiusPlate != null) root.style.setProperty('--mq-radius-plate', s.radiusPlate + 'px');
  if (s.borderWidth != null) root.style.setProperty('--mq-border-width', s.borderWidth + 'px');

  // Spaziatura
  if (s.btnGap != null) root.style.setProperty('--mq-btn-gap', s.btnGap + 'px');
  if (s.btnPadY != null) root.style.setProperty('--mq-btn-pad-y', s.btnPadY + 'px');

  // Font
  if (f.googleHref) {
    let link = document.getElementById('mq-font-link');
    if (link) link.href = f.googleHref;
  }
  if (f.serif) root.style.setProperty('--font-serif', `'${f.serif}', serif`);
  if (f.sans) root.style.setProperty('--font-sans', `'${f.sans}', sans-serif`);
  // Pesi (mappa "morbida" → numero)
  const wMap = { light: 300, normal: 400, medium: 500, bold: 700 };
  if (f.titleWeight && wMap[f.titleWeight]) root.style.setProperty('--mq-title-weight', wMap[f.titleWeight]);
  if (f.bodyWeight && wMap[f.bodyWeight]) root.style.setProperty('--mq-body-weight', wMap[f.bodyWeight]);
  // Corsivo
  if (f.titleItalic != null) root.style.setProperty('--mq-title-italic', f.titleItalic ? 'italic' : 'normal');
  if (f.bodyItalic != null) root.style.setProperty('--mq-body-italic', f.bodyItalic ? 'italic' : 'normal');
  // Dimensioni
  if (f.sizeTitle != null) root.style.setProperty('--mq-size-title', f.sizeTitle + 'px');
  if (f.sizeSubtitle != null) root.style.setProperty('--mq-size-subtitle', f.sizeSubtitle + 'px');
  if (f.sizeDialog != null) root.style.setProperty('--mq-size-dialog', f.sizeDialog + 'px');

  // Testi
  if (t.text) {
    if (t.text.appTitle) {
      document.querySelectorAll('[data-mq="app-title"]').forEach(el => el.innerText = t.text.appTitle);
    }
    if (t.text.subtitle) {
      document.querySelectorAll('[data-mq="subtitle"]').forEach(el => el.innerText = t.text.subtitle);
    }
  }

  // Copy della schermata iniziale (sovrascrivibile dall'editor)
  const copyStart = (t.copy && t.copy.start) || {};
  if (copyStart.bubble) {
    const el = document.querySelector('[data-mq="start-bubble"]');
    if (el) el.innerText = copyStart.bubble;
  }
  if (copyStart.button) {
    const el = document.querySelector('[data-mq="start-button"]');
    if (el) el.innerText = copyStart.button;
  }

  // Logo cliente
  const logo = document.getElementById('mq-logo');
  if (logo) {
    if (t.logo && t.logo.show && t.logo.src) {
      logo.src = t.logo.src;
      logo.style.display = 'block';
    } else {
      logo.style.display = 'none';
    }
  }

  // Mascotte (emoji oppure immagine)
  const m = t.mascotte || {};
  document.querySelectorAll('.mq-mascot-emoji').forEach(node => {
    if (m.type === 'image' && m.src) {
      node.innerHTML = `<img class="mq-mascot-img" src="${m.src}" alt="">`;
    } else {
      node.textContent = m.emoji || '🎭';
    }
  });
}

// Restituisce il copione con i testi sovrascritti dal tema (i TAG restano intatti).
function mq_getQuestions() {
  const copy = (window.MQ_THEME && window.MQ_THEME.copy && window.MQ_THEME.copy.questions) || [];
  return mq_questions.map((q, qi) => {
    const ov = copy[qi];
    if (!ov) return q;
    return {
      ...q,
      text: ov.text || q.text,
      answers: q.answers.map((a, ai) => ({
        ...a,
        text: (ov.answers && ov.answers[ai]) ? ov.answers[ai] : a.text
      }))
    };
  });
}

// === CORE FUNCTIONS ===
function mq_showScreen(screenId) {
  document.querySelectorAll('.mq-screen').forEach(s => s.classList.remove('mq-active'));
  document.getElementById(`mq-${screenId}`).classList.add('mq-active');
}

async function mq_startQuiz() {
  mq_showScreen('loading');
  try {
    const response = await fetch(MQ_CSV_URL);
    const csvText = await response.text();
    mq_db = mq_parseCSV(csvText);
    mq_activeQuestions = mq_getQuestions();
    mq_currentQuestionIndex = 0;
    mq_userAnswers = {};
    mq_renderQuestion();
  } catch (error) {
    console.error("Errore fetch CSV:", error);
    alert("Gli spiriti sono muti. Impossibile caricare il menu.");
    mq_showScreen('start');
  }
}

function mq_renderQuestion() {
  const q = mq_activeQuestions[mq_currentQuestionIndex];

  document.getElementById('mq-current-num').innerText = mq_currentQuestionIndex + 1;
  const progressPerc = ((mq_currentQuestionIndex + 1) / mq_questions.length) * 100;
  document.getElementById('mq-progress-fill').style.width = `${progressPerc}%`;
  document.getElementById('mq-question-text').innerText = q.text;

  // Freccia "indietro" visibile solo dalla seconda domanda in poi.
  const backBtn = document.getElementById('mq-back');
  if (backBtn) backBtn.style.visibility = mq_currentQuestionIndex > 0 ? 'visible' : 'hidden';

  const answersContainer = document.getElementById('mq-answers');
  answersContainer.innerHTML = '';

  q.answers.forEach((ans, index) => {
    const btn = document.createElement('button');
    btn.className = 'mq-btn';
    btn.innerText = ans.text;
    btn.onclick = () => mq_handleAnswer(index);
    answersContainer.appendChild(btn);
  });

  mq_showScreen('quiz');
}

function mq_handleAnswer(answerIndex) {
  const q = mq_activeQuestions[mq_currentQuestionIndex];
  const chosenAns = q.answers[answerIndex];

  if (q.key === "q1_people") {
    mq_isSharing = chosenAns.sharing;
    mq_peopleCount = chosenAns.count;
  }

  mq_userAnswers[q.key] = chosenAns.tags;
  mq_advanceQuiz();
}

function mq_randomChoice() {
  const q = mq_activeQuestions[mq_currentQuestionIndex];
  const randIndex = Math.floor(Math.random() * q.answers.length);
  mq_handleAnswer(randIndex);
}

function mq_advanceQuiz() {
  mq_currentQuestionIndex++;
  if (mq_currentQuestionIndex < mq_questions.length) {
    mq_renderQuestion();
  } else {
    mq_generateResults();
  }
}

// Torna alla domanda precedente azzerando la risposta su cui si atterra,
// così l'utente può sceglierne una nuova in modo netto.
function mq_goBack() {
  if (mq_currentQuestionIndex <= 0) return;
  mq_currentQuestionIndex--;
  const q = mq_activeQuestions[mq_currentQuestionIndex];
  if (q && q.key) delete mq_userAnswers[q.key];
  mq_renderQuestion();
}

// Tipo di drink dedotto dalla SEZIONE (più affidabile di un tag).
function mq_drinkType(item) {
  const s = (item.sezione || '').toLowerCase();
  const cat = (item.categoria || '').toLowerCase();
  if (cat === 'analcolico' || s.includes('bevand')) return 'analcolico';
  if (s.includes('vini') || s.includes('vino') || s.includes('bollicine')) return 'vino';
  if (s.includes('cocktail')) return 'cocktail';
  return 'altro';
}

// Punteggio di un piatto rispetto ai tag dell'utente.
// strictTags: se valorizzati, il piatto è escluso se non ne ha almeno uno
// (eccezione: "sorpresa" disattiva il filtro e regala un bonus).
function mq_scoreItem(item, baseTags, strictTags = []) {
  let score = 0;
  const itemTags = Array.isArray(item.tag) ? item.tag : [];

  if (strictTags.length > 0 && !strictTags.includes('sorpresa')) {
    const hasMatch = strictTags.some(st => itemTags.includes(st));
    if (!hasMatch) return -10000;
  }
  if (strictTags.includes('sorpresa')) score += 5;

  baseTags.forEach(uTag => { if (itemTags.includes(uTag)) score += 10; });
  score += Math.random() * 2; // piccola varietà tra piatti a pari punteggio
  return score;
}

// Ordina una lista per punteggio e scarta i piatti esclusi (-10000).
// Se il filtro rigido azzera tutto, ricalcola SENZA filtro così non resti a mani vuote.
function mq_rankPool(pool, baseTags, strictTags = []) {
  let scored = pool
    .map(i => ({ ...i, score: mq_scoreItem(i, baseTags, strictTags) }))
    .filter(i => i.score > -1000)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0 && pool.length > 0) {
    scored = pool
      .map(i => ({ ...i, score: mq_scoreItem(i, baseTags, []) }))
      .sort((a, b) => b.score - a.score);
  }
  return scored;
}

// Ritorna fino a n elementi distinti (per titolo) da una lista già ordinata.
function mq_pickDistinct(pool, n) {
  const seen = new Set();
  const out = [];
  for (const item of pool) {
    if (!item || !item.titolo) continue;
    const key = item.titolo.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= n) break;
  }
  return out;
}

function mq_generateResults() {
  mq_showScreen('loading');

  let allUserTags = [];
  Object.values(mq_userAnswers).forEach(tags => allUserTags.push(...tags));

  const travelTags = mq_userAnswers.q3_travel || [];
  const drinkTags = mq_userAnswers.q5_drink || [];

  const byCat = (c) => mq_db.filter(i => i.categoria && i.categoria.toLowerCase().trim() === c);
  const db_salati = byCat('salato');
  const db_dolci = byCat('dolce');
  // Pool drink = alcolici + analcolici (gli analcolici emergono solo come ripiego)
  const db_drinks = mq_db.filter(i => {
    const c = (i.categoria || '').toLowerCase().trim();
    return c === 'drink' || c === 'analcolico';
  });

  const scoredSalati = mq_rankPool(db_salati, allUserTags, travelTags);
  const scoredDolci = mq_rankPool(db_dolci, allUserTags);
  const scoredDrinks = mq_rankPool(db_drinks, allUserTags, drinkTags);

  let finalSelection = [];
  let resultDesc = "";

  const isVino = (item) => mq_drinkType(item) === 'vino';

  if (mq_isSharing) {
    // --- CONDIVISIONE (cibo) ---
    for (let i = 0; i < 3; i++) {
      if (scoredSalati[i]) {
        finalSelection.push({ ...scoredSalati[i], ui_category: 'DA CONDIVIDERE', qty: '1x', alt: scoredSalati[i + 3] || null });
      }
    }
    for (let i = 0; i < 2; i++) {
      if (scoredDolci[i]) {
        finalSelection.push({ ...scoredDolci[i], ui_category: 'PECCATI CONDIVISI', qty: '1x', alt: scoredDolci[i + 2] || null });
      }
    }

    // --- CONDIVISIONE (drink) ---
    if (scoredDrinks[0]) {
      let drinkScelto = { ...scoredDrinks[0] };

      if (isVino(drinkScelto)) {
        // Una bottiglia per la tavola + alternativa "a calici" MISTA e coerente
        drinkScelto.qty = '1 Bottiglia di';
        drinkScelto.ui_category = 'NETTARE PER LA TAVOLA';
        const viniCoerenti = scoredDrinks.filter(isVino).filter(w => w.titolo.toLowerCase() !== drinkScelto.titolo.toLowerCase());
        const mix = mq_pickDistinct(viniCoerenti, mq_peopleCount);
        if (mix.length >= 2) {
          const lista = mix.map(w => `<strong>${w.titolo}</strong>`).join(' · ');
          drinkScelto.altTextOverride = `Oppure, un calice a testa mixando: ${lista} (chiedi al cameriere)`;
        } else if (scoredDrinks[1]) {
          drinkScelto.altTextOverride = `Oppure: <strong>${mq_peopleCount} calici di ${scoredDrinks[1].titolo}</strong> (chiedi al cameriere)`;
        }
      } else {
        // Cocktail/analcolici: uno a testa, ma MIXATI quando ci sono opzioni coerenti
        drinkScelto.ui_category = 'NETTARE (UNO A TESTA)';
        const mix = mq_pickDistinct(scoredDrinks, mq_peopleCount);
        if (mix.length >= 2) {
          drinkScelto = { ...mix[0], ui_category: 'NETTARE (UNO A TESTA)', qty: '1x' };
          const altri = mix.slice(1).map(d => `<strong>${d.titolo}</strong>`).join(' · ');
          drinkScelto.altTextOverride = `E per gli altri al tavolo: ${altri}`;
        } else {
          drinkScelto.qty = mq_peopleCount >= 3 ? '3x' : '2x';
        }
      }
      finalSelection.unshift(drinkScelto);
    }
    resultDesc = "La tela è dipinta. Ecco il copione della vostra serata:";

  } else {
    // --- DA SOLO ---
    if (scoredDrinks[0]) {
      let drinkScelto = { ...scoredDrinks[0], alt: scoredDrinks[1] || null };
      drinkScelto.ui_category = 'IL TUO NETTARE';

      if (isVino(drinkScelto)) {
        drinkScelto.qty = '1 calice di';
        drinkScelto.priceOverride = 'chiedi al cameriere';
        if (drinkScelto.alt) {
          drinkScelto.altTextOverride = `Oppure potresti prendere: <strong>1 calice di ${drinkScelto.alt.titolo}</strong> (chiedi al cameriere)`;
        }
      } else {
        drinkScelto.qty = '1x';
      }
      finalSelection.push(drinkScelto);
    }

    if (scoredSalati[0]) finalSelection.push({ ...scoredSalati[0], ui_category: 'LA TUA CENA', qty: '1x', alt: scoredSalati[1] || null });
    if (scoredDolci[0]) finalSelection.push({ ...scoredDolci[0], ui_category: 'IL PECCATO FINALE', qty: '1x', alt: scoredDolci[1] || null });

    resultDesc = "Ho letto la tua aura. Ecco la scena scritta per te:";
  }

  document.getElementById('mq-result-desc').innerText = resultDesc;
  const outputContainer = document.getElementById('mq-menu-output');
  outputContainer.innerHTML = '';

  finalSelection.forEach(item => {
    if (!item || !item.titolo) return;

    const descriptionText = item.descrizione || '';
    let prezzoFormattato = mq_formatPrice(item);

    const altTesto = item.altTextOverride
      ? `<p class="mq-plate-alt">${item.altTextOverride}</p>`
      : (item.alt ? `<p class="mq-plate-alt">Oppure potresti prendere: <strong>${item.alt.titolo}</strong></p>` : '');

    const div = document.createElement('div');
    div.className = 'mq-plate';
    div.innerHTML = `
      <span class="mq-plate-category">${item.ui_category}</span>
      <h3 class="mq-plate-title-row">
        <span class="mq-plate-qty">${item.qty}</span> ${item.titolo} <span class="mq-plate-price">${prezzoFormattato}</span>
      </h3>
      ${descriptionText ? `<p class="mq-plate-desc">${descriptionText}</p>` : ''}
      ${altTesto}
    `;
    outputContainer.appendChild(div);
  });

  window.scrollTo(0, 0);
  setTimeout(() => mq_showScreen('results'), 1200);
}

// Formattazione prezzo robusta:
//  - vuoto / "nd"        -> niente
//  - numero ("3", "5.5") -> "3€"
//  - testo ("7 l'etto")  -> nota piccola
//  - priceOverride       -> nota piccola (es. "chiedi al cameriere")
function mq_formatPrice(item) {
  if (item.priceOverride) {
    return `<span class="mq-price-note">(${item.priceOverride})</span>`;
  }
  const p = (item.prezzo || '').trim();
  if (!p || p.toLowerCase() === 'nd') return '';
  const isNumeric = p.replace('.', '').replace(',', '').match(/^\d+$/);
  if (isNumeric) return `${p}€`;
  return `<span class="mq-price-note">${p}</span>`;
}

// === CSV PARSER ===
// Normalizza le intestazioni del foglio in chiavi pulite, così la logica
// non dipende dal nome esatto delle colonne (es. "Tag (Logica Masquinator)").
function mq_normHeader(h) {
  h = h.trim().toLowerCase();
  if (h === 'id') return 'id';
  if (h.includes('categoria')) return 'categoria';
  if (h.includes('sezione')) return 'sezione';
  if (h.includes('titolo')) return 'titolo';
  if (h.includes('prezzo')) return 'prezzo';
  if (h.includes('descriz') || h.includes('ingredient')) return 'descrizione';
  if (h.includes('tag')) return 'tag';
  return h;
}

function mq_mapObject(headers, currentLine) {
  let obj = {};
  headers.forEach((header, index) => {
    obj[header] = currentLine[index] ? currentLine[index].trim() : '';
  });
  // I tag diventano un array di etichette pulite
  obj.tag = (obj.tag || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
  return obj;
}

function mq_parseCSV(csvData) {
  const lines = csvData.split('\n');
  if (lines.length < 2) return [];

  const headers = mq_CSVsmartSplit(lines[0]).map(mq_normHeader);
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let currentLine = mq_CSVsmartSplit(lines[i]);
    let obj = mq_mapObject(headers, currentLine);
    if (obj.titolo && obj.categoria) result.push(obj);
  }
  return result;
}

function mq_CSVsmartSplit(text) {
  let q = false, field = '', fields = [];
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
    if (c === '"') { q = !q; }
    else if (c === ',' && !q) { fields.push(field); field = ''; }
    else { field += c; }
  }
  fields.push(field);
  return fields;
}

// === WIDGET (modale flottante) ===
function mq_openWidget() {
  const ov = document.getElementById('mq-overlay');
  if (!ov) return;
  ov.classList.add('mq-open');
  const l = document.getElementById('mq-launcher');
  if (l) l.setAttribute('aria-expanded', 'true');
}

function mq_closeWidget() {
  const ov = document.getElementById('mq-overlay');
  if (!ov) return;
  ov.classList.remove('mq-open');
  const l = document.getElementById('mq-launcher');
  if (l) l.setAttribute('aria-expanded', 'false');
}

function mq_toggleWidget() {
  const ov = document.getElementById('mq-overlay');
  if (!ov) return;
  ov.classList.contains('mq-open') ? mq_closeWidget() : mq_openWidget();
}

// Riavvia il quiz senza ricaricare la pagina ospite.
function mq_resetToStart() {
  mq_currentQuestionIndex = 0;
  mq_userAnswers = {};
  mq_isSharing = false;
  mq_peopleCount = 1;
  mq_showScreen('start');
}

// Applica il tema e collega i comportamenti del widget al caricamento.
document.addEventListener('DOMContentLoaded', () => {
  mq_applyTheme();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') mq_closeWidget(); });
});
