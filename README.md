# Gramofon

[![Test](https://github.com/jakalijey/gramofon/actions/workflows/test.yml/badge.svg)](https://github.com/jakalijey/gramofon/actions/workflows/test.yml)

**Independent music, paid straight to the artists you play.**

Gramofon is a music club built around a giant gramophone. You walk into a hall with two doors: the Gramofon door leads to the
gramophone room, where a girl drops your token into the slot and plays your songs; the Recording door leads to the man at the
desk, who takes songs from independent artists. Payments are in Bitcoin Cash.

Live: https://gramofon.heylogram.com · Test network (free Chipnet coins): https://gramofon.heylogram.com/?test=1

## What you can do

- **Listen.** Drop a token: one month of music, paid in BCH through WizardConnect (Paytaca, Selene). Every song in the
  playlist is then yours to play, shuffle and add to your own playlist.
- **Sign in with your wallet.** On another device, or after clearing your browser, connect the wallet you paid with:
  the server derives its addresses from the wallet's public keys and finds your payment. Nothing is paid or signed.
- **Artists get paid.** Half of every membership goes to the artists that member played, split by plays. A play counts
  after 30 seconds and plays that look automated don't count. Artists who are members count like any member, own songs
  included: a member's money only ever goes to what that member played. Shares are added up each month and
  paid in BCH to the wallet that paid the upload fee; balances under $1 carry over. Artists can get a monthly email with
  their plays, listeners and earnings.
- **Radio.** The gramophone composes songs itself, new ones on every visit. Like one? Send it to the gramophone for free:
  it gets a title, an artist name and a drawn cover of its own, and everyone can play it. These artists are made up and marked
  "from the radio".
- **Bring your song.** In the recording room the man asks for a small review fee in BCH, takes your file (FLAC, WAV, MP3, M4A,
  OGG), checks it against every song already handed in, and listens to it by hand. WAV and AIFF files are kept as FLAC, bit for
  bit the same sound in less space. The hall board shows where your song is, and if you leave an email you get a receipt and the result.

## How it is built

| Part | Folder | Notes |
|---|---|---|
| Drawing core | `drawing/` | C++17 (`scene.cpp`; the girl in `girl.inc` and `girl-3d.inc`), compiled to WebAssembly with Emscripten (`build.sh`) into `site/engine/`. Every frame of the hall, the rooms, the girl and the man is drawn by code, no image files. |
| Site | `site/` | Plain HTML, CSS and JavaScript, no framework: `app.js` runs the hall and the gramophone room, `recording.js` the recording room, `player.js` the music. The phone gets its own layout (portrait and landscape). |
| Music | `site/engine/gramofon-music.js` | The radio composer: the same seed always gives the same song, in the browser. |
| Payments | `payment/` | Bitcoin Cash with libauth and WizardConnect, bundled with esbuild into `site/payment/payment.js`. |
| Server | `server/` | Node 22: song catalog, streaming with a membership ticket, payment checks, wallet sign-in, artist uploads, play counts and monthly artist shares, the radio list. |
| Legal | `legal/` | Terms and privacy, published as `/terms` and `/privacy`. |

Names inside the code (functions, variables, server messages) are in Turkish, the language Gramofon is written in. Everything a
listener sees is in English.

Build the drawing core: `cd drawing && sh build.sh` (needs Emscripten). Build the payment bundle: `cd payment && npm install && npm run build`.
Serve `site/` with any static web server. Run the tests with `npm test` (Node 22, no packages needed); every push runs them
on GitHub, and rebuilds the drawing core from source to check it matches the committed build.

## BCH BLAZE 2026

Gramofon was built from scratch for BCH BLAZE 2026 (Mainnet track).

- Presentation: [docs/gramofon-blaze-2026.pdf](docs/gramofon-blaze-2026.pdf)
- Try it: https://gramofon.heylogram.com. During judging, a month of music costs one cent.
- Vote with EMBER2026 tokens, or support the project, at its CashTokens address:
  `bitcoincash:zrcq3lg6h3hdl04k0l8fzsger88yvwqvxuswgq9yhe`

Contact: gramofon@heylogram.com

## Security

Please report security problems privately. See [SECURITY.md](SECURITY.md).

## License

© 2026 Heylogram. All rights reserved. Third-party libraries inside `site/payment/payment.js` keep their own licenses, listed in
`site/payment/payment.js.LEGAL.txt`.
