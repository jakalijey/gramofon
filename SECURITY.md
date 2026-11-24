# Security policy

## Reporting a vulnerability

Please report security problems privately, not in a public issue:

- Email: gramofon@heylogram.com
- Or use **Report a vulnerability** on this repository's Security tab.

Tell us what you found, how to reproduce it and what it affects. We answer within a few days and fix confirmed problems as fast as we can. Please give us a chance to fix it before you share it publicly.

## Scope

- The site: https://gramofon.heylogram.com
- The server: https://api.heylogram.com/gramofon (and the test network at /gramofon-test)
- The code in this repository

## How Gramofon handles money and secrets

- Gramofon never sees your recovery words or private keys. Your wallet signs; our server checks that a transaction pays the right amount to the right address before it gives a membership or an upload pass.
- A payment counts only after two independent Electrum servers see it, and each payment can be used once.
- Server secrets live only in the server's environment. None of them are in this repository.
- Every push runs the tests. Dependabot watches the dependencies and GitHub Actions; CodeQL scans the JavaScript.
