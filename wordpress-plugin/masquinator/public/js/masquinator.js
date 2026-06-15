/* =========================================================================
   MASQUINATOR — LOGICA APP (WordPress version)
   ========================================================================= */

(function () {
  'use strict';

  var config = window.MasquinatorConfig || {};
  var MQ_CSV_URL = config.csvUrl || '';
  var cptEnabled = config.cptEnabled || false;
  var ajaxUrl = config.ajaxUrl || '';
  var nonce = config.nonce || '';

  var mq_db = [];
  var mq_userAnswers = {};
  var mq_currentQuestionIndex = 0;
  var mq_isSharing = false;
  var mq_peopleCount = 1;
  var mq_activeQuestions = [];
  var mq_lastResults = null;

  var mq_questions = [
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

  function mq_applyTheme() {
    var t = (typeof window !== "undefined" && window.MQ_THEME) ? window.MQ_THEME : {};
    var root = document.querySelector('#mq-widget-root') || document.documentElement;
    var c = t.colors || {};
    var f = t.fonts || {};
    var s = t.shape || {};

    if (c.bg) root.style.setProperty('--mq-bg-dark', c.bg);
    if (c.primary) root.style.setProperty('--mq-gold', c.primary);
    if (c.primaryHover) root.style.setProperty('--mq-gold-hover', c.primaryHover);
    if (c.textLight) root.style.setProperty('--mq-text-light', c.textLight);
    if (c.textMuted) root.style.setProperty('--mq-text-muted', c.textMuted);

    var bg = t.background || {};
    if (bg.type === 'image' && bg.src) {
      var o = (bg.overlay != null ? bg.overlay : 0.55);
      root.style.setProperty('--mq-spotlight',
        'linear-gradient(rgba(0,0,0,' + o + '), rgba(0,0,0,' + o + ')), url("' + bg.src + '")');
    } else if (c.bg || c.spotlight) {
      var center = c.spotlight || '#2a1111';
      var edge = c.bg || '#07070a';
      root.style.setProperty('--mq-spotlight',
        'radial-gradient(circle at 50% 30%, ' + center + ' 0%, ' + edge + ' 65%)');
    }

    if (s.radiusBtn != null) root.style.setProperty('--mq-radius-btn', s.radiusBtn + 'px');
    if (s.radiusPlate != null) root.style.setProperty('--mq-radius-plate', s.radiusPlate + 'px');
    if (s.borderWidth != null) root.style.setProperty('--mq-border-width', s.borderWidth + 'px');
    if (s.btnGap != null) root.style.setProperty('--mq-btn-gap', s.btnGap + 'px');
    if (s.btnPadY != null) root.style.setProperty('--mq-btn-pad-y', s.btnPadY + 'px');

    if (f.serif) root.style.setProperty('--font-serif', "'" + f.serif + "', serif");
    if (f.sans) root.style.setProperty('--font-sans', "'" + f.sans + "', sans-serif");
    var wMap = { light: 300, normal: 400, medium: 500, bold: 700 };
    if (f.titleWeight && wMap[f.titleWeight]) root.style.setProperty('--mq-title-weight', wMap[f.titleWeight]);
    if (f.bodyWeight && wMap[f.bodyWeight]) root.style.setProperty('--mq-body-weight', wMap[f.bodyWeight]);
    if (f.titleItalic != null) root.style.setProperty('--mq-title-italic', f.titleItalic ? 'italic' : 'normal');
    if (f.bodyItalic != null) root.style.setProperty('--mq-body-italic', f.bodyItalic ? 'italic' : 'normal');
    if (f.sizeTitle != null) root.style.setProperty('--mq-size-title', f.sizeTitle + 'px');
    if (f.sizeSubtitle != null) root.style.setProperty('--mq-size-subtitle', f.sizeSubtitle + 'px');
    if (f.sizeDialog != null) root.style.setProperty('--mq-size-dialog', f.sizeDialog + 'px');

    if (t.text) {
      if (t.text.appTitle) {
        document.querySelectorAll('[data-mq="app-title"]').forEach(function(el) { el.innerText = t.text.appTitle; });
      }
      if (t.text.subtitle) {
        document.querySelectorAll('[data-mq="subtitle"]').forEach(function(el) { el.innerText = t.text.subtitle; });
      }
    }

    var copyStart = (t.copy && t.copy.start) || {};
    if (copyStart.bubble) {
      var elB = document.querySelector('[data-mq="start-bubble"]');
      if (elB) elB.innerText = copyStart.bubble;
    }
    if (copyStart.button) {
      var elBtn = document.querySelector('[data-mq="start-button"]');
      if (elBtn) elBtn.innerText = copyStart.button;
    }

    var logo = document.getElementById('mq-logo');
    if (logo) {
      if (t.logo && t.logo.show && t.logo.src) {
        logo.src = t.logo.src;
        logo.style.display = 'block';
      } else {
        logo.style.display = 'none';
      }
    }

    var m = t.mascotte || {};
    document.querySelectorAll('.mq-mascot-emoji').forEach(function(node) {
      if (m.type === 'image' && m.src) {
        node.innerHTML = '<img class="mq-mascot-img" src="' + m.src + '" alt="">';
      } else {
        node.textContent = m.emoji || '\uD83C\uDFAD';
      }
    });
  }

  function mq_getQuestions() {
    var copy = (window.MQ_THEME && window.MQ_THEME.copy && window.MQ_THEME.copy.questions) || [];
    return mq_questions.map(function(q, qi) {
      var ov = copy[qi];
      if (!ov) return q;
      return {
        text: ov.text || q.text,
        key: q.key,
        answers: q.answers.map(function(a, ai) {
          return {
            text: (ov.answers && ov.answers[ai]) ? ov.answers[ai] : a.text,
            tags: a.tags,
            sharing: a.sharing,
            count: a.count
          };
        })
      };
    });
  }

  function mq_showScreen(screenId) {
    document.querySelectorAll('#mq-widget-root .mq-screen').forEach(function(s) { s.classList.remove('mq-active'); });
    var target = document.getElementById('mq-' + screenId);
    if (target) target.classList.add('mq-active');
  }

  window.mq_startQuiz = function() {
    mq_showScreen('loading');

    if (cptEnabled && ajaxUrl) {
      fetch(ajaxUrl + '?action=mq_get_menu&nonce=' + encodeURIComponent(nonce))
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data && data.success) {
            mq_db = data.data;
            mq_activeQuestions = mq_getQuestions();
            mq_currentQuestionIndex = 0;
            mq_userAnswers = {};
            mq_renderQuestion();
          } else {
            throw new Error('AJAX error');
          }
        })
        .catch(function(err) {
          console.error("Errore caricamento menu:", err);
          alert("Gli spiriti sono muti. Impossibile caricare il menu.");
          mq_showScreen('start');
        });
      return;
    }

    if (!MQ_CSV_URL) {
      alert("URL del menu non configurato. Impostazioni > Masquinator.");
      mq_showScreen('start');
      return;
    }

    fetch(MQ_CSV_URL)
      .then(function(r) { return r.text(); })
      .then(function(csvText) {
        mq_db = mq_parseCSV(csvText);
        mq_activeQuestions = mq_getQuestions();
        mq_currentQuestionIndex = 0;
        mq_userAnswers = {};
        mq_renderQuestion();
      })
      .catch(function(error) {
        console.error("Errore fetch CSV:", error);
        alert("Gli spiriti sono muti. Impossibile caricare il menu.");
        mq_showScreen('start');
      });
  };

  function mq_renderQuestion() {
    var q = mq_activeQuestions[mq_currentQuestionIndex];

    document.getElementById('mq-current-num').innerText = mq_currentQuestionIndex + 1;
    var progressPerc = ((mq_currentQuestionIndex + 1) / mq_questions.length) * 100;
    document.getElementById('mq-progress-fill').style.width = progressPerc + '%';
    document.getElementById('mq-question-text').innerText = q.text;

    var backBtn = document.getElementById('mq-back');
    if (backBtn) backBtn.style.visibility = mq_currentQuestionIndex > 0 ? 'visible' : 'hidden';

    var answersContainer = document.getElementById('mq-answers');
    answersContainer.innerHTML = '';

    q.answers.forEach(function(ans, index) {
      var btn = document.createElement('button');
      btn.className = 'mq-btn';
      btn.innerText = ans.text;
      btn.onclick = function() { mq_handleAnswer(index); };
      answersContainer.appendChild(btn);
    });

    mq_showScreen('quiz');
  }

  function mq_handleAnswer(answerIndex) {
    var q = mq_activeQuestions[mq_currentQuestionIndex];
    var chosenAns = q.answers[answerIndex];

    if (q.key === "q1_people") {
      mq_isSharing = chosenAns.sharing;
      mq_peopleCount = chosenAns.count;
    }

    mq_userAnswers[q.key] = chosenAns.tags;
    mq_advanceQuiz();
  }

  window.mq_randomChoice = function() {
    var q = mq_activeQuestions[mq_currentQuestionIndex];
    var randIndex = Math.floor(Math.random() * q.answers.length);
    mq_handleAnswer(randIndex);
  };

  function mq_advanceQuiz() {
    mq_currentQuestionIndex++;
    if (mq_currentQuestionIndex < mq_questions.length) {
      mq_renderQuestion();
    } else {
      mq_generateResults();
    }
  }

  window.mq_goBack = function() {
    if (mq_currentQuestionIndex <= 0) return;
    mq_currentQuestionIndex--;
    var q = mq_activeQuestions[mq_currentQuestionIndex];
    if (q && q.key) delete mq_userAnswers[q.key];
    mq_renderQuestion();
  };

  function mq_drinkType(item) {
    var s = (item.sezione || '').toLowerCase();
    var cat = (item.categoria || '').toLowerCase();
    if (cat === 'analcolico' || s.includes('bevand')) return 'analcolico';
    if (s.includes('vini') || s.includes('vino') || s.includes('bollicine')) return 'vino';
    if (s.includes('cocktail')) return 'cocktail';
    return 'altro';
  }

  function mq_scoreItem(item, baseTags, strictTags) {
    strictTags = strictTags || [];
    var score = 0;
    var itemTags = Array.isArray(item.tag) ? item.tag : [];

    if (strictTags.length > 0 && !strictTags.includes('sorpresa')) {
      var hasMatch = strictTags.some(function(st) { return itemTags.includes(st); });
      if (!hasMatch) return -10000;
    }
    if (strictTags.includes('sorpresa')) score += 5;

    baseTags.forEach(function(uTag) { if (itemTags.includes(uTag)) score += 10; });
    score += Math.random() * 2;
    return score;
  }

  function mq_rankPool(pool, baseTags, strictTags) {
    strictTags = strictTags || [];
    var scored = pool
      .map(function(i) { return Object.assign({}, i, { score: mq_scoreItem(i, baseTags, strictTags) }); })
      .filter(function(i) { return i.score > -1000; })
      .sort(function(a, b) { return b.score - a.score; });

    if (scored.length === 0 && pool.length > 0) {
      scored = pool
        .map(function(i) { return Object.assign({}, i, { score: mq_scoreItem(i, baseTags, []) }); })
        .sort(function(a, b) { return b.score - a.score; });
    }
    return scored;
  }

  function mq_pickDistinct(pool, n) {
    var seen = {};
    var out = [];
    for (var idx = 0; idx < pool.length; idx++) {
      var item = pool[idx];
      if (!item || !item.titolo) continue;
      var key = item.titolo.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(item);
      if (out.length >= n) break;
    }
    return out;
  }

  function mq_generateResults() {
    mq_showScreen('loading');

    var allUserTags = [];
    Object.values(mq_userAnswers).forEach(function(tags) { allUserTags = allUserTags.concat(tags); });

    var travelTags = mq_userAnswers.q3_travel || [];
    var drinkTags = mq_userAnswers.q5_drink || [];

    var byCat = function(c) { return mq_db.filter(function(i) { return i.categoria && i.categoria.toLowerCase().trim() === c; }); };
    var db_salati = byCat('salato');
    var db_dolci = byCat('dolce');
    var db_drinks = mq_db.filter(function(i) {
      var c = (i.categoria || '').toLowerCase().trim();
      return c === 'drink' || c === 'analcolico';
    });

    var scoredSalati = mq_rankPool(db_salati, allUserTags, travelTags);
    var scoredDolci = mq_rankPool(db_dolci, allUserTags);
    var scoredDrinks = mq_rankPool(db_drinks, allUserTags, drinkTags);

    var finalSelection = [];
    var resultDesc = "";

    var isVino = function(item) { return mq_drinkType(item) === 'vino'; };

    if (mq_isSharing) {
      for (var i = 0; i < 3; i++) {
        if (scoredSalati[i]) {
          finalSelection.push(Object.assign({}, scoredSalati[i], { ui_category: 'DA CONDIVIDERE', qty: '1x', alt: scoredSalati[i + 3] || null }));
        }
      }
      for (var j = 0; j < 2; j++) {
        if (scoredDolci[j]) {
          finalSelection.push(Object.assign({}, scoredDolci[j], { ui_category: 'PECCATI CONDIVISI', qty: '1x', alt: scoredDolci[j + 2] || null }));
        }
      }

      if (scoredDrinks[0]) {
        var drinkScelto = Object.assign({}, scoredDrinks[0]);

        if (isVino(drinkScelto)) {
          drinkScelto.qty = '1 Bottiglia di';
          drinkScelto.ui_category = 'NETTARE PER LA TAVOLA';
          var viniCoerenti = scoredDrinks.filter(isVino).filter(function(w) { return w.titolo.toLowerCase() !== drinkScelto.titolo.toLowerCase(); });
          var mix = mq_pickDistinct(viniCoerenti, mq_peopleCount);
          if (mix.length >= 2) {
            var lista = mix.map(function(w) { return '<strong>' + w.titolo + '</strong>'; }).join(' · ');
            drinkScelto.altTextOverride = 'Oppure, un calice a testa mixando: ' + lista + ' (chiedi al cameriere)';
          } else if (scoredDrinks[1]) {
            drinkScelto.altTextOverride = 'Oppure: <strong>' + mq_peopleCount + ' calici di ' + scoredDrinks[1].titolo + '</strong> (chiedi al cameriere)';
          }
        } else {
          drinkScelto.ui_category = 'NETTARE (UNO A TESTA)';
          var mixC = mq_pickDistinct(scoredDrinks, mq_peopleCount);
          if (mixC.length >= 2) {
            drinkScelto = Object.assign({}, mixC[0], { ui_category: 'NETTARE (UNO A TESTA)', qty: '1x' });
            var altri = mixC.slice(1).map(function(d) { return '<strong>' + d.titolo + '</strong>'; }).join(' · ');
            drinkScelto.altTextOverride = 'E per gli altri al tavolo: ' + altri;
          } else {
            drinkScelto.qty = mq_peopleCount >= 3 ? '3x' : '2x';
          }
        }
        finalSelection.unshift(drinkScelto);
      }
      resultDesc = "La tela \u00E8 dipinta. Ecco il copione della vostra serata:";

    } else {
      if (scoredDrinks[0]) {
        var drinkSolo = Object.assign({}, scoredDrinks[0], { alt: scoredDrinks[1] || null });
        drinkSolo.ui_category = 'IL TUO NETTARE';

        if (isVino(drinkSolo)) {
          drinkSolo.qty = '1 calice di';
          drinkSolo.priceOverride = 'chiedi al cameriere';
          if (drinkSolo.alt) {
            drinkSolo.altTextOverride = 'Oppure potresti prendere: <strong>1 calice di ' + drinkSolo.alt.titolo + '</strong> (chiedi al cameriere)';
          }
        } else {
          drinkSolo.qty = '1x';
        }
        finalSelection.push(drinkSolo);
      }

      if (scoredSalati[0]) finalSelection.push(Object.assign({}, scoredSalati[0], { ui_category: 'LA TUA CENA', qty: '1x', alt: scoredSalati[1] || null }));
      if (scoredDolci[0]) finalSelection.push(Object.assign({}, scoredDolci[0], { ui_category: 'IL PECCATO FINALE', qty: '1x', alt: scoredDolci[1] || null }));

      resultDesc = "Ho letto la tua aura. Ecco la scena scritta per te:";
    }

    document.getElementById('mq-result-desc').innerText = resultDesc;
    var outputContainer = document.getElementById('mq-menu-output');
    outputContainer.innerHTML = '';

    finalSelection.forEach(function(item) {
      if (!item || !item.titolo) return;

      var descriptionText = item.descrizione || '';
      var prezzoFormattato = mq_formatPrice(item);

      var altTesto = item.altTextOverride
        ? '<p class="mq-plate-alt">' + item.altTextOverride + '</p>'
        : (item.alt ? '<p class="mq-plate-alt">Oppure potresti prendere: <strong>' + item.alt.titolo + '</strong></p>' : '');

      var div = document.createElement('div');
      div.className = 'mq-plate';
      div.innerHTML =
        '<span class="mq-plate-category">' + item.ui_category + '</span>' +
        '<h3 class="mq-plate-title-row">' +
          '<span class="mq-plate-qty">' + item.qty + '</span> ' + item.titolo + ' <span class="mq-plate-price">' + prezzoFormattato + '</span>' +
        '</h3>' +
        (descriptionText ? '<p class="mq-plate-desc">' + descriptionText + '</p>' : '') +
        altTesto;
      outputContainer.appendChild(div);
    });

    mq_lastResults = finalSelection.slice();

    window.scrollTo(0, 0);
    setTimeout(function() { mq_showScreen('results'); }, 1200);
  }

  function mq_wrapText(ctx, text, maxWidth) {
    var words = text.split(' ');
    var lines = [];
    var currentLine = '';
    for (var i = 0; i < words.length; i++) {
      var testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
      if (ctx.measureText(testLine).width > maxWidth && i > 0) {
        lines.push(currentLine);
        currentLine = words[i];
      } else {
        currentLine = testLine;
      }
    }
    lines.push(currentLine);
    return lines;
  }

  window.mq_downloadImage = function() {
    if (!mq_lastResults || mq_lastResults.length === 0) return;
    var items = mq_lastResults;

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var PAD = 30;
    var W = 500;
    var LEFT = PAD + 14;
    var RIGHT = W - PAD;
    var MAX_W = RIGHT - LEFT;

    ctx.font = 'bold 28px "Playfair Display","Georgia",serif';
    var titleTxt = 'Il Genio del Masque presenta:';
    var titleW = ctx.measureText(titleTxt).width;
    var titleLines = titleW > MAX_W ? mq_wrapText(ctx, titleTxt, MAX_W) : [titleTxt];
    var titleH = titleLines.length * 34 + 10;

    var catH = 16;
    var titleH2 = 24;
    var descH = 18;
    var itemGap = 10;

    var totalItemsH = 0;
    items.forEach(function(item) {
      var h = catH + titleH2 + itemGap;
      if (item.descrizione) {
        ctx.font = '12px "Inter","Arial",sans-serif';
        var dLines = mq_wrapText(ctx, item.descrizione, MAX_W);
        h += dLines.length * descH;
      }
      totalItemsH += h;
    });

    var footerH = 50;
    var H = PAD + 60 + titleH + 24 + totalItemsH + footerH + PAD;

    canvas.width = W;
    canvas.height = H;

    var grad = ctx.createRadialGradient(W / 2, 60, 0, W / 2, 60, W);
    grad.addColorStop(0, '#2a1111');
    grad.addColorStop(1, '#07070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    var y = PAD;

    ctx.font = '40px serif';
    ctx.textAlign = 'center';
    ctx.fillText('\uD83C\uDFAD', W / 2, y + 40);
    y += 55;

    ctx.fillStyle = '#c5a059';
    ctx.font = 'bold 28px "Playfair Display","Georgia",serif';
    ctx.textAlign = 'center';
    titleLines.forEach(function(l) { ctx.fillText(l, W / 2, y); y += 34; });

    ctx.fillStyle = '#8c8273';
    ctx.font = '11px "Inter","Arial",sans-serif';
    ctx.fillText('LA PERGAMENA DEI VOSTRI DESIDERI', W / 2, y);
    y += 20;

    items.forEach(function(item) {
      var descLineCount = 0;
      if (item.descrizione) {
        ctx.font = '12px "Inter","Arial",sans-serif';
        descLineCount = mq_wrapText(ctx, item.descrizione, MAX_W).length;
      }
      ctx.fillStyle = '#c5a059';
      ctx.fillRect(PAD, y - 5, 3, catH + titleH2 + 10 + descLineCount * descH);

      ctx.fillStyle = '#c5a059';
      ctx.font = '10px "Inter","Arial",sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((item.ui_category || '').toUpperCase(), LEFT, y);
      y += catH;

      ctx.fillStyle = '#f4ebd8';
      ctx.font = '500 17px "Playfair Display","Georgia",serif';
      ctx.textAlign = 'left';
      var titleStr = (item.qty ? item.qty + ' ' : '') + (item.titolo || '');
      var availW = item.prezzo ? MAX_W - 90 : MAX_W;
      if (ctx.measureText(titleStr).width > availW) {
        while (ctx.measureText(titleStr + '...').width > availW && titleStr.length > 3) titleStr = titleStr.slice(0, -1);
        titleStr += '...';
      }
      ctx.fillText(titleStr, LEFT, y);

      if (item.prezzo) {
        var pText = item.prezzo + '\u20AC';
        ctx.fillStyle = '#c5a059';
        ctx.font = '500 14px "Inter","Arial",sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(pText, RIGHT, y);
      }
      y += titleH2;

      if (item.descrizione) {
        ctx.fillStyle = '#8c8273';
        ctx.font = '12px "Inter","Arial",sans-serif';
        ctx.textAlign = 'left';
        var descLines = mq_wrapText(ctx, item.descrizione, MAX_W);
        descLines.forEach(function(l) { ctx.fillText(l, LEFT, y); y += descH; });
      }

      y += itemGap;
    });

    y += 5;
    ctx.fillStyle = '#c5a059';
    ctx.font = 'italic 14px "Playfair Display","Georgia",serif';
    ctx.textAlign = 'center';
    ctx.fillText('Porta questa pergamena allo staff del ristorante.', W / 2, y);

    canvas.toBlob(function(blob) {
      var a = document.createElement('a');
      a.download = 'pergamena-masquinator.png';
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
    });
  };

  function mq_formatPrice(item) {
    if (item.priceOverride) {
      return '<span class="mq-price-note">(' + item.priceOverride + ')</span>';
    }
    var p = (item.prezzo || '').trim();
    if (!p || p.toLowerCase() === 'nd') return '';
    var isNumeric = p.replace('.', '').replace(',', '').match(/^\d+$/);
    if (isNumeric) return p + '\u20AC';
    return '<span class="mq-price-note">' + p + '</span>';
  }

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
    var obj = {};
    headers.forEach(function(header, index) {
      obj[header] = currentLine[index] ? currentLine[index].trim() : '';
    });
    obj.tag = (obj.tag || '').toLowerCase().split(',').map(function(t) { return t.trim(); }).filter(Boolean);
    return obj;
  }

  function mq_parseCSV(csvData) {
    var lines = csvData.split('\n');
    if (lines.length < 2) return [];

    var headers = mq_CSVsmartSplit(lines[0]).map(mq_normHeader);
    var result = [];

    for (var i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      var currentLine = mq_CSVsmartSplit(lines[i]);
      var obj = mq_mapObject(headers, currentLine);
      if (obj.titolo && obj.categoria) result.push(obj);
    }
    return result;
  }

  function mq_CSVsmartSplit(text) {
    var q = false, field = '', fields = [];
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (c === '"') { q = !q; }
      else if (c === ',' && !q) { fields.push(field); field = ''; }
      else { field += c; }
    }
    fields.push(field);
    return fields;
  }

  window.mq_openWidget = function() {
    var ov = document.getElementById('mq-overlay');
    if (!ov) return;
    ov.classList.add('mq-open');
    var l = document.getElementById('mq-launcher');
    if (l) l.setAttribute('aria-expanded', 'true');
  };

  window.mq_closeWidget = function() {
    var ov = document.getElementById('mq-overlay');
    if (!ov) return;
    ov.classList.remove('mq-open');
    var l = document.getElementById('mq-launcher');
    if (l) l.setAttribute('aria-expanded', 'false');
  };

  window.mq_toggleWidget = function() {
    var ov = document.getElementById('mq-overlay');
    if (!ov) return;
    ov.classList.contains('mq-open') ? mq_closeWidget() : mq_openWidget();
  };

  window.mq_resetToStart = function() {
    mq_currentQuestionIndex = 0;
    mq_userAnswers = {};
    mq_isSharing = false;
    mq_peopleCount = 1;
    mq_showScreen('start');
  };

  document.addEventListener('DOMContentLoaded', function() {
    mq_applyTheme();
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') mq_closeWidget(); });
  });
})();
