# Tennyson

A great poem every day, with notes to help you understand it.

Each day brings one of 22 classic longer poems, from Donne and Marvell through Gray, Blake, Wordsworth, Coleridge, Keats, Shelley, Tennyson, Browning, Poe, Arnold and Hardy to Yeats, Frost and Eliot. It starts with Tennyson's "Ulysses".

- **Read**: the full poem with line numbers, section headings and epigraphs. Dotted-underlined words show a short definition when tapped.
- **Meaning** opens with reflection: the life lesson the poem offers, a short essay on what it can teach you, three takeaways, a line to carry with you, and questions to ask yourself, with a private journal box (saved only in your browser). Below that, *Understanding the poem* covers its context, a passage-by-passage walk-through, themes, form and sound, lines worth knowing, a glossary, and questions to think about. Each "Lines 12–20" button jumps to those lines in the poem and highlights them.
- **Library**: open any poem. Use ‹ › to revisit earlier days. "Mark as studied" tracks your progress through the collection.

## Texts

Poem texts were transcribed from public-domain editions on [Wikisource](https://en.wikisource.org). Each poem names its source edition at the foot of the Read view. Spelling follows those editions (Marvell's 1681 text, for example, keeps "then" for "than").

## Run it

It's a static site with no build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 5173
```

## Files

- `js/poems.js`: poem texts. Stanzas are arrays of lines, and `{h: "..."}` entries are section headings.
- `js/meanings.js`: study notes keyed by poem id.
- `js/reflections.js`: reflective lessons and journal prompts keyed by poem id.
- `js/app.js`: the app.
- `css/styles.css`: styles, including light and dark themes.
