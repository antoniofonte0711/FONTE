// FONTE DPE — prenotazione call gratuita (pagina prenota.html)
// Le prenotazioni stanno su Supabase (progetto fonte-dpe). Dal sito si possono solo
// leggere gli orari occupati e prenotarne uno libero: i dati dei clienti restano privati.
// Per annullare una call: Supabase > tabella prenotazioni > stato = annullata (lo slot torna libero).
(function () {
  const API = 'https://vvumumslmpmifqxqapdx.supabase.co/rest/v1/rpc/';
  const KEY = 'sb_publishable_u6GdDmPpGX90GKEYa0A7Lg_OOFeEcdE'; // chiave pubblica: puo stare nel sito
  const ORE = { mattina: [9, 10, 11, 12], sera: [18, 19] };
  const GIORNI_AVANTI = 28;     // quanti giorni mostrare
  const PREAVVISO_ORE = 2;      // non si prenota una call che inizia tra meno di 2 ore (lo controlla anche il database)
  const EMAIL = 'AntonioFonte0711@gmail.com';

  const page = document.querySelector('.bk');
  if (!page) return;
  const $ = s => page.querySelector(s);
  const $$ = s => page.querySelectorAll(s);

  const st = { step: 1, settore: '', giorno: '', ora: 0, occupati: new Set(), caricato: false, avviso: '' };

  // ---------- Date in ora italiana ----------
  // Lavoro con "orologio di Roma" scritto come se fosse UTC: basta per confrontare giorni e ore.
  function romaAdesso() {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).map(x => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
  }
  const iso = t => new Date(t).toISOString().slice(0, 10);
  const giornoUTC = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const fmt = (s, o) => new Date(giornoUTC(s)).toLocaleDateString('it-IT', { timeZone: 'UTC', ...o });
  const hh = h => `${h}:00`;
  const fascia = h => `${h}:00 – ${h}:30`;

  function giorni() {
    const oggi = giornoUTC(iso(romaAdesso()));
    const out = [];
    for (let i = 0; i < GIORNI_AVANTI; i++) {
      const t = oggi + i * 864e5;
      if (new Date(t).getUTCDay() !== 0) out.push(iso(t)); // domenica chiuso
    }
    return out;
  }
  const passato = (g, h) => giornoUTC(g) + h * 36e5 < romaAdesso() + PREAVVISO_ORE * 36e5;
  const occupato = (g, h) => st.occupati.has(`${g}|${h}`);
  const libero = (g, h) => !passato(g, h) && !occupato(g, h);
  const tutteLeOre = [...ORE.mattina, ...ORE.sera];

  // ---------- Supabase ----------
  async function rpc(fn, body) {
    const r = await fetch(API + fn, {
      method: 'POST',
      headers: { apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`${fn}: ${r.status}`);
    return r.json();
  }
  async function caricaOccupati() {
    const g = giorni();
    try {
      const rows = await rpc('slot_occupati', { da: g[0], a: g[g.length - 1] });
      st.occupati = new Set(rows.map(r => `${r.giorno}|${r.ora}`));
      st.caricato = true;
      say('stato2', st.avviso);
    } catch (e) {
      say('stato2', `Non riesco a caricare gli orari. Riprova tra poco o scrivimi a ${EMAIL}.`);
    }
    // se l'orario scelto e stato preso da qualcun altro nel frattempo, lo tolgo
    if (st.ora && !libero(st.giorno, st.ora)) st.ora = 0;
    disegna();
  }

  // ---------- Disegno ----------
  function say(k, txt) { page.querySelectorAll(`[data-out="${k}"]`).forEach(el => { el.textContent = txt; }); }

  function disegna() {
    const lista = giorni();
    if (!st.giorno || !lista.includes(st.giorno) || !tutteLeOre.some(h => libero(st.giorno, h))) {
      st.giorno = lista.find(g => tutteLeOre.some(h => libero(g, h))) || lista[0];
    }

    $('.bk__days').innerHTML = lista.map(g => {
      const pieno = st.caricato && !tutteLeOre.some(h => libero(g, h));
      const sel = g === st.giorno;
      return `<button type="button" role="option" class="bk__day${sel ? ' is-sel' : ''}${pieno ? ' is-full' : ''}" data-giorno="${g}" aria-selected="${sel}" ${pieno ? 'disabled' : ''}
        aria-label="${fmt(g, { weekday: 'long', day: 'numeric', month: 'long' })}${pieno ? ', nessun orario libero' : ''}">
        <small>${fmt(g, { weekday: 'short' })}</small><b>${fmt(g, { day: 'numeric' })}</b><small>${fmt(g, { month: 'short' })}</small>
      </button>`;
    }).join('');

    for (const [nome, ore] of Object.entries(ORE)) {
      page.querySelector(`[data-fascia="${nome}"]`).innerHTML = ore.map(h => {
        const occ = occupato(st.giorno, h), pas = passato(st.giorno, h);
        const sel = st.ora === h;
        const nota = occ ? ', già prenotato' : pas ? ', non più disponibile' : '';
        return `<button type="button" class="bk__slot${sel ? ' is-sel' : ''}${occ ? ' is-taken' : ''}${pas && !occ ? ' is-past' : ''}"
          data-ora="${h}" aria-pressed="${sel}" aria-label="${fascia(h)}${nota}" ${occ || pas || !st.caricato ? 'disabled' : ''}>${hh(h)}</button>`;
      }).join('');
    }

    $('[data-next="3"]').disabled = !st.ora;
    say('settore', st.settore || '—');
    say('giorno', st.giorno ? fmt(st.giorno, { weekday: 'long', day: 'numeric', month: 'long' }) : '—');
    say('ora', st.ora ? fascia(st.ora) : '—');
    $$('.bk__sector').forEach(b => b.classList.toggle('is-sel', b.dataset.settore === st.settore));
  }

  function vai(n) {
    if (n >= 2 && !st.settore) n = 1;
    if (n >= 3 && !st.ora) n = 2;
    st.step = n;
    $$('.bk__panel').forEach(p => p.classList.toggle('is-active', +p.dataset.step === n));
    $$('.bk__steps li').forEach(li => {
      const i = +li.dataset.si;
      li.classList.toggle('is-active', i === n);
      li.classList.toggle('is-done', i < n);
    });
    $('.bk__steps').hidden = n === 4;
    if (n === 2) caricaOccupati();
    disegna();
    const top = $('.bk__steps').hidden ? $('.bk__done') : $('.bk__steps');
    if (window.scrollY > top.getBoundingClientRect().top + window.scrollY - 120) top.scrollIntoView({ block: 'start' });
    if (n === 3) setTimeout(() => $('[name="nome"]').focus({ preventScroll: true }), 50);
  }

  // ---------- Eventi ----------
  page.addEventListener('click', e => {
    const b = e.target.closest('button, [data-goto]');
    if (!b || b.disabled) return;
    if (b.dataset.settore) { st.settore = b.dataset.settore; vai(2); }
    else if (b.dataset.giorno) { st.giorno = b.dataset.giorno; st.ora = 0; disegna(); }
    else if (b.dataset.ora) { st.ora = +b.dataset.ora; st.avviso = ''; say('stato2', ''); disegna(); }
    else if (b.dataset.goto) vai(+b.dataset.goto);
    else if (b.dataset.next) vai(+b.dataset.next);
  });

  const form = $('.bk__form');
  let invio = false;
  form.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (invio) return; // blocca il doppio click
    const d = Object.fromEntries(new FormData(form));
    if (d.sito) return; // campo trappola per i bot
    const errori = [];
    if (d.nome.trim().length < 2) errori.push('il nome');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email.trim())) errori.push("un'email valida");
    if (d.messaggio.trim().length < 5) errori.push('due righe su cosa ti serve');
    form.querySelectorAll('[required]').forEach(i => i.setAttribute('aria-invalid', !i.checkValidity() || (i.name === 'messaggio' && i.value.trim().length < 5)));
    if (errori.length) { say('stato3', `Manca ${errori.join(', ')}.`); return; }

    invio = true;
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true; btn.firstChild.textContent = 'Invio in corso… ';
    say('stato3', '');
    try {
      const r = await rpc('prenota_call', {
        p_giorno: st.giorno, p_ora: st.ora, p_nome: d.nome, p_email: d.email,
        p_telefono: d.telefono, p_settore: st.settore, p_messaggio: d.messaggio
      });
      if (r.ok) {
        fatto();
      } else if (r.errore === 'occupato' || r.errore === 'fuori_tempo') {
        st.occupati.add(`${st.giorno}|${st.ora}`);
        st.ora = 0;
        st.avviso = 'Questo orario non è più disponibile: qualcuno l’ha appena prenotato. Scegline un altro, i tuoi dati restano compilati.';
        say('stato2', st.avviso);
        vai(2);
      } else if (r.errore === 'troppe_prenotazioni') {
        say('stato3', `Hai già due call in programma con questa email. Se devi spostarne una scrivimi a ${EMAIL}.`);
      } else {
        say('stato3', 'Controlla i dati inseriti e riprova.');
      }
    } catch (err) {
      say('stato3', `Non riesco a salvare la prenotazione. Riprova tra poco o scrivimi a ${EMAIL}.`);
    } finally {
      invio = false;
      btn.disabled = false; btn.firstChild.textContent = 'Conferma la call ';
    }
  });

  function fatto() {
    const g = st.giorno.replace(/-/g, '');
    const p = n => String(n).padStart(2, '0');
    const gcal = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(`Call FONTE DPE · ${st.settore}`)
      + `&dates=${g}T${p(st.ora)}0000/${g}T${p(st.ora)}3000&ctz=Europe/Rome`
      + '&details=' + encodeURIComponent('Call gratuita di 30 minuti con Antonio Fonte. Il link arriva per email.');
    $('[data-out="gcal"]').href = gcal;
    say('quando', `${fmt(st.giorno, { weekday: 'long', day: 'numeric', month: 'long' })} alle ${hh(st.ora)}`);
    form.reset();
    vai(4);
    $('.bk__done').focus({ preventScroll: true });
    if (window.gtag) gtag('event', 'prenotazione_call', { settore: st.settore });
  }

  // Aggiorna gli orari ogni minuto mentre si sceglie, cosi chi arriva dopo vede subito gli slot presi
  setInterval(() => { if (st.step === 2 && !document.hidden) caricaOccupati(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && st.step === 2) caricaOccupati(); });

  // Settore gia scelto dal link (es. prenota.html?settore=digital)
  const q = new URLSearchParams(location.search).get('settore');
  const pre = ['Digital', 'Property', 'Experience'].find(s => s.toLowerCase() === (q || '').toLowerCase());
  if (pre) { st.settore = pre; vai(2); } else { disegna(); caricaOccupati(); }
})();
