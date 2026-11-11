(function () {
  "use strict";

  /* ---------------- Helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  function h(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === "class") node.className = v;
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayNumber = (d) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  // Compare text regardless of curly/straight quotes and dashes.
  const fold = (s) => s.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[—–]/g, "-").toLowerCase();
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  /* ---------------- Data ---------------- */
  const POEMS = window.POEMS.map((p) => {
    // Number lines; a line starting with a tab completes the previous metrical line.
    let n = 0, words = 0;
    const blocks = p.stanzas.map((st) => {
      if (!Array.isArray(st)) return st;
      return st.map((raw) => {
        const cont = raw.startsWith("\t");
        const text = raw.replace(/^\t/, "");
        if (!cont) n++;
        words += text.split(/\s+/).length;
        return { text, n, cont };
      });
    });
    return { ...p, blocks, lineCount: n, minutes: Math.max(1, Math.round(words / 110)),
      notes: (window.MEANINGS || {})[p.id], reflect: (window.REFLECTIONS || {})[p.id] };
  });
  const byId = Object.fromEntries(POEMS.map((p) => [p.id, p]));

  // The rotation starts with Ulysses on 11 Nov 2026 and walks the anthology in order.
  const EPOCH = dayNumber(new Date(2026, 10, 11));
  const poemForDate = (d) => {
    const N = POEMS.length;
    return POEMS[(((dayNumber(d) - EPOCH) % N) + N) % N];
  };

  /* ---------------- Storage ---------------- */
  const KEY = "tennyson.v2";
  let data = { visits: [], studied: {}, journal: {}, theme: null };
  try { Object.assign(data, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* unavailable */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* unavailable */ } };

  function recordVisit() {
    const t = iso(today());
    if (!data.visits.includes(t)) { data.visits.push(t); data.visits = data.visits.slice(-400); save(); }
  }
  function streak() {
    const set = new Set(data.visits);
    let n = 0, d = today();
    while (set.has(iso(d))) { n++; d = addDays(d, -1); }
    return n;
  }

  /* ---------------- State ---------------- */
  const state = { date: today(), libraryPoem: null, tab: "read", highlight: null };
  const currentPoem = () => state.libraryPoem || poemForDate(state.date);

  /* ---------------- Theme ---------------- */
  function applyTheme() {
    if (data.theme) document.documentElement.setAttribute("data-theme", data.theme);
    else document.documentElement.removeAttribute("data-theme");
  }
  $("#themeBtn").addEventListener("click", () => {
    const isDark = data.theme ? data.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    data.theme = isDark ? "light" : "dark";
    save(); applyTheme();
  });

  /* ---------------- Header / day nav ---------------- */
  const fmtDate = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  function renderHeader() {
    const p = currentPoem();
    const diff = dayNumber(today()) - dayNumber(state.date);
    if (state.libraryPoem) {
      $("#dayKicker").textContent = "From the library";
      $("#dayDate").textContent = "Back to today’s poem ›";
      $("#dayDate").classList.add("link");
    } else {
      $("#dayKicker").textContent = diff === 0 ? "Today’s poem" : diff === 1 ? "Yesterday’s poem" : `${diff} days ago`;
      $("#dayDate").textContent = fmtDate.format(state.date);
      $("#dayDate").classList.remove("link");
    }
    $("#nextDay").disabled = !state.libraryPoem && diff <= 0;
    $("#prevDay").disabled = !!state.libraryPoem;

    $("#poemTitle").textContent = p.title;
    $("#poemAuthor").textContent = p.author;
    $("#poemYear").textContent = p.year;
    $("#poemStats").textContent = `${p.lineCount} lines · about ${p.minutes} min`;
    document.title = `${p.title} — Tennyson`;

    const s = streak();
    $("#streak").textContent = `${s} day${s === 1 ? "" : "s"} in a row`;
    $("#studied").textContent = `${Object.keys(data.studied).length} of ${POEMS.length} studied`;
  }

  function show(changes) {
    Object.assign(state, changes);
    hideGloss();
    render();
  }
  $("#prevDay").addEventListener("click", () => show({ date: addDays(state.date, -1), tab: "read", highlight: null }));
  $("#nextDay").addEventListener("click", () => {
    if (state.libraryPoem) return show({ libraryPoem: null, date: today(), tab: "read", highlight: null });
    if (dayNumber(state.date) < dayNumber(today())) show({ date: addDays(state.date, 1), tab: "read", highlight: null });
  });
  $("#dayDate").addEventListener("click", () => {
    if (state.libraryPoem) show({ libraryPoem: null, date: today(), tab: "read", highlight: null });
  });

  /* ---------------- Tabs ---------------- */
  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => { show({ tab: t.dataset.tab, highlight: null }); scrollToCard(); })
  );
  function scrollToCard() {
    const top = $(".card").getBoundingClientRect().top + window.scrollY - 12;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
  }

  /* ---------------- Render ---------------- */
  function render() {
    renderHeader();
    document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === state.tab)));
    const stage = $("#stage");
    stage.replaceChildren();
    const p = currentPoem();
    if (state.tab === "meaning" && p.notes) renderMeaning(stage, p);
    else renderRead(stage, p);
  }

  /* ----- Read ----- */
  function glossRegex(p) {
    const terms = (p.notes?.glossary || []).map(([t]) => t).sort((a, b) => b.length - a.length);
    if (!terms.length) return null;
    const alt = terms.map((t) => escapeRe(fold(t)).replace(/'/g, "['’]")).join("|");
    return new RegExp(`(?<![\\p{L}'’])(${alt})(?![\\p{L}])`, "iu");
  }

  function renderRead(stage, p) {
    const gloss = new Map((p.notes?.glossary || []).map(([t, d]) => [fold(t), d]));
    const re = glossRegex(p);
    const used = new Set(); // underline only the first occurrence of each term

    function lineContent(text) {
      if (!re) return text;
      const out = [];
      let rest = text;
      while (rest) {
        const m = rest.match(re);
        if (!m) { out.push(rest); break; }
        const key = fold(m[1]).replace(/’/g, "'");
        const def = gloss.get(key);
        out.push(rest.slice(0, m.index));
        rest = rest.slice(m.index + m[1].length);
        if (def && !used.has(key)) {
          used.add(key);
          // Keep trailing punctuation on the same line as the word.
          const punct = (rest.match(/^[^\s\p{L}\p{N}]+/u) || [""])[0];
          rest = rest.slice(punct.length);
          out.push(h("span", { class: "nowrap" },
            h("button", { class: "gloss", type: "button", "data-term": m[1], "data-def": def }, m[1]), punct));
        } else out.push(m[1]);
      }
      return out;
    }

    const [hlA, hlB] = state.highlight || [];
    const poem = h("div", { class: "poem" },
      p.epigraph && h("figure", { class: "epigraph" },
        h("blockquote", null, p.epigraph.split(" / ").map((l) => h("div", null, l))),
        h("figcaption", null, "— ", p.epigraphNote)),
      p.blocks.map((b) => {
        if (!Array.isArray(b)) return h("div", { class: b.h === "· · ·" ? "divider" : "section" }, b.h);
        return h("div", { class: "stanza" }, b.map((l) => h("div", {
          class: ["line", l.cont && "cont", hlA && l.n >= hlA && l.n <= hlB && "hl"].filter(Boolean).join(" "),
          "data-n": l.n,
        },
          !l.cont && l.n % 5 === 0 && h("span", { class: "ln", "aria-hidden": "true" }, l.n),
          lineContent(l.text))));
      })
    );

    stage.append(
      poem,
      h("div", { class: "read-foot" },
        p.notes && h("button", { class: "pill primary", onclick: () => { show({ tab: "meaning", highlight: null }); scrollToCard(); } }, "What can this poem teach me? →"),
        h("p", { class: "source" }, "Text: ", h("a", { href: `https://en.wikisource.org/wiki/${encodeURIComponent(p.source.replace(/ /g, "_")).replace(/%2F/g, "/")}`, target: "_blank", rel: "noopener" }, p.source), " · Wikisource"),
        used.size > 0 && h("p", { class: "hint" }, "Underlined words have a short definition. Tap one.")
      )
    );

    if (state.highlight) {
      const first = stage.querySelector(".line.hl");
      if (first) setTimeout(() => first.scrollIntoView({ block: "center", behavior: "smooth" }), 30);
    }
  }

  /* ----- Glossary popover ----- */
  const pop = $("#glossPop");
  let popFor = null;
  function showGloss(btn) {
    popFor = btn;
    pop.replaceChildren(h("strong", null, btn.dataset.term), " ", btn.dataset.def);
    pop.hidden = false;
    const r = btn.getBoundingClientRect();
    const w = pop.offsetWidth;
    const left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), window.innerWidth - w - 12);
    const below = r.bottom + 8 + pop.offsetHeight < window.innerHeight;
    pop.style.left = `${left + window.scrollX}px`;
    pop.style.top = `${(below ? r.bottom + 8 : r.top - pop.offsetHeight - 8) + window.scrollY}px`;
  }
  function hideGloss() { pop.hidden = true; popFor = null; }
  document.addEventListener("click", (e) => {
    const g = e.target.closest(".gloss");
    if (g) { e.stopPropagation(); popFor === g ? hideGloss() : showGloss(g); return; }
    if (!e.target.closest("#glossPop")) hideGloss();
  });
  window.addEventListener("resize", hideGloss);

  /* ----- Meaning ----- */
  function parseRange(r) {
    const [a, b] = r.split(/[–-]/).map(Number);
    return [a, b || a];
  }
  function jumpTo(range) {
    show({ tab: "read", highlight: range });
  }
  function findLine(p, quote) {
    const first = fold(quote.split(" / ")[0]).replace(/["]/g, "").trim();
    for (const b of p.blocks) if (Array.isArray(b)) for (const l of b) {
      if (fold(l.text).replace(/["]/g, "").includes(first)) return l.n;
    }
    return null;
  }

  function renderMeaning(stage, p) {
    const m = p.notes;
    const section = (title, ...body) => h("section", { class: "m-sec" }, h("h3", null, title), body);
    const studied = !!data.studied[p.id];
    const r = p.reflect;

    let reflection = null;
    if (r) {
      const carryN = findLine(p, r.carry);
      const note = h("textarea", { class: "journal", rows: 5, placeholder: "Write whatever comes to mind…", "aria-label": "Your reflection" });
      note.value = (data.journal || {})[p.id] || "";
      const savedMsg = h("span", { class: "saved" }, note.value ? "Saved in this browser only." : "Private. Saved in this browser only.");
      let t;
      note.addEventListener("input", () => {
        clearTimeout(t);
        t = setTimeout(() => {
          data.journal = data.journal || {};
          if (note.value.trim()) data.journal[p.id] = note.value; else delete data.journal[p.id];
          save();
          savedMsg.textContent = "Saved ✓ (in this browser only)";
        }, 400);
      });

      reflection = h("div", { class: "reflect" },
        h("div", { class: "lesson" },
          h("span", { class: "kicker" }, "What it can teach you"),
          h("p", null, r.lesson)),
        h("div", { class: "essay" }, r.essay.map((t) => h("p", null, t))),
        h("ul", { class: "takeaways" }, r.takeaways.map(([k, v]) => h("li", null, h("strong", null, k), h("span", null, v)))),
        h("figure", { class: "carry" },
          h("span", { class: "kicker" }, "A line to carry with you today"),
          h("blockquote", null, r.carry.split(" / ").map((l, i) => [i ? h("br") : null, l])),
          carryN && h("button", { class: "link-btn", type: "button", onclick: () => jumpTo([carryN, carryN + r.carry.split(" / ").length - 1]) }, `See it in the poem · line ${carryN}`)),
        h("section", { class: "m-sec journal-sec" },
          h("h3", null, "Ask yourself"),
          h("ol", { class: "prompts" }, r.journal.map((q) => h("li", null, q))),
          note, savedMsg)
      );
    }

    stage.append(
      h("p", { class: "gist" }, m.gist),
      reflection,
      h("div", { class: "study-head" }, h("span", null, "Understanding the poem")),
      section("Context", m.context.map((t) => h("p", null, t))),
      section("Passage by passage",
        h("ol", { class: "passages" }, m.passages.map(([r, t]) => h("li", null,
          h("button", { class: "range", type: "button", title: "Show these lines in the poem", onclick: () => jumpTo(parseRange(r)) }, `Lines ${r}`),
          h("p", null, t))))),
      section("Themes",
        h("dl", { class: "themes" }, m.themes.map(([k, v]) => [h("dt", null, k), h("dd", null, v)]))),
      section("Form & sound", h("p", null, m.form)),
      section("Lines worth knowing",
        h("ul", { class: "quotes" }, m.lines.map(([q, note]) => {
          const n = findLine(p, q);
          return h("li", null,
            h("blockquote", null, q.split(" / ").map((l, i) => [i ? h("br") : null, l])),
            h("p", null, note, n ? [" ", h("button", { class: "link-btn", type: "button", onclick: () => jumpTo([n, n + q.split(" / ").length - 1]) }, `line ${n}`)] : null));
        }))),
      section("Glossary",
        h("dl", { class: "glossary" }, m.glossary.map(([k, v]) => [h("dt", null, k), h("dd", null, v)]))),
      section("Questions about the poem",
        h("ul", { class: "ask" }, m.ask.map((q) => h("li", null, q)))),
      h("div", { class: "read-foot" },
        h("button", { class: `pill ${studied ? "on" : "primary"}`, onclick: () => {
          if (studied) delete data.studied[p.id]; else data.studied[p.id] = iso(today());
          save(); render();
        } }, studied ? "✓ Studied" : "Mark as studied"),
        h("button", { class: "pill", onclick: () => { show({ tab: "read", highlight: null }); scrollToCard(); } }, "← Back to the poem"))
    );
  }

  /* ---------------- Library ---------------- */
  function openLibrary() {
    $("#drawer").hidden = false; $("#scrim").hidden = false;
    $("#search").value = "";
    renderLibrary();
    setTimeout(() => $("#search").focus(), 50);
  }
  function closeLibrary() { $("#drawer").hidden = true; $("#scrim").hidden = true; }
  function renderLibrary() {
    const q = fold($("#search").value.trim());
    const cur = currentPoem().id;
    const list = POEMS
      .filter((p) => !q || fold(p.title).includes(q) || fold(p.author).includes(q))
      .sort((a, b) => a.title.replace(/^(The|A)\s+/, "").localeCompare(b.title.replace(/^(The|A)\s+/, "")));
    $("#poemList").replaceChildren(...list.map((p) => h("li", null,
      h("button", { class: p.id === cur ? "current" : "", onclick: () => {
        const isToday = p.id === poemForDate(today()).id;
        closeLibrary();
        show({ libraryPoem: isToday ? null : p, date: today(), tab: "read", highlight: null });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } },
        h("span", { class: "t" }, p.title, h("span", { class: "a" }, `${p.author} · ${p.year} · ${p.lineCount} lines`)),
        data.studied[p.id] && h("span", { class: "k", title: "Studied" }, "✓")
      )
    )));
  }
  $("#libraryBtn").addEventListener("click", openLibrary);
  $("#closeLibrary").addEventListener("click", closeLibrary);
  $("#scrim").addEventListener("click", closeLibrary);
  $("#search").addEventListener("input", renderLibrary);

  /* ---------------- Keyboard ---------------- */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { hideGloss(); if (!$("#drawer").hidden) closeLibrary(); return; }
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || "") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!$("#drawer").hidden) return;
    if (e.key === "1") show({ tab: "read", highlight: null });
    else if (e.key === "2") show({ tab: "meaning", highlight: null });
    else if (e.key === "ArrowLeft" && !$("#prevDay").disabled) $("#prevDay").click();
    else if (e.key === "ArrowRight" && !$("#nextDay").disabled) $("#nextDay").click();
  });

  /* ---------------- Boot ---------------- */
  applyTheme();
  recordVisit();
  render();

  // Roll over to the new poem if the page is left open past midnight.
  let lastDay = iso(today());
  setInterval(() => {
    const t = iso(today());
    if (t === lastDay) return;
    const wasToday = !state.libraryPoem && iso(state.date) === lastDay;
    lastDay = t;
    recordVisit();
    if (wasToday) show({ date: today(), tab: "read", highlight: null });
    else renderHeader();
  }, 60 * 1000);
})();
