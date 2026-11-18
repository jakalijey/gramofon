# Gramofon

**Independent music, paid straight to the artists you play.**

Gramofon is a music club built around a giant gramophone. You walk into a hall with two doors: the Gramofon door leads to the
gramophone room, where a girl drops your token into the slot and plays your songs; the Recording door leads to the man at the
desk, who takes songs from independent artists. Payments are in Bitcoin Cash.

Live: https://gramofon.heylogram.com · Test network (free Chipnet coins): https://gramofon.heylogram.com/?test=1

## What you can do

- **Listen.** Drop a token: one month of music, paid in BCH through WizardConnect (Paytaca, Selene). Every song in the
  playlist is then yours to play, shuffle and add to your own playlist.
- **Radio.** The gramophone composes songs itself, new ones on every visit. Like one? Send it to the gramophone for free:
  it gets a title, an artist name and a drawn cover of its own, and everyone can play it. These artists are made up and marked
  "from the radio".
- **Bring your song.** In the recording room the man asks for a small review fee in BCH, takes your file (FLAC, WAV, MP3, M4A,
  OGG), checks it against every song already handed in, and listens to it by hand. The hall board shows where your song is.

## How it is built

| Part | Folder | Notes |
|---|---|---|
| Drawing core | `cizim/` | One C++17 file, compiled to WebAssembly with Emscripten (`build.sh`). Every frame of the hall, the rooms, the girl and the man is drawn by code, no image files. |
| Site | `site/` | Plain HTML, CSS and JavaScript, no framework. The phone gets its own layout (portrait and landscape). |
| Music | `site/cizim/gramofon-muzik.js` | The radio composer: the same seed always gives the same song, in the browser. |
| Payments | `payment/` | Bitcoin Cash with libauth and WizardConnect, bundled with esbuild into `site/odeme/odeme.js`. |
| Server | `server/` | Node 22: song catalog, streaming with a membership ticket, payment checks, artist uploads, the radio list. |
| Legal | `legal/` | Terms and privacy, published as `/terms` and `/privacy`. |

Build the drawing core: `cd cizim && sh build.sh` (needs Emscripten). Build the payment bundle: `cd payment && npm install && npm run build`.
Serve `site/` with any static web server.

## BCH BLAZE 2026

Gramofon was built from scratch for BCH BLAZE 2026 (Mainnet track). Support the project with a donation to its CashTokens address:
`bitcoincash:zrcq3lg6h3hdl04k0l8fzsger88yvwqvxuswgq9yhe`

Contact: gramofon@heylogram.com

## License

© 2026 Heylogram. All rights reserved. Third-party libraries inside `site/odeme/odeme.js` keep their own licenses, listed in
`site/odeme/odeme.js.LEGAL.txt`.
