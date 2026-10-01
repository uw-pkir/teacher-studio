# /regdata — organizer-only registration report

`https://teacherstudio.org/regdata/` shows an analysis of the Teacher Studio
registration form (Nov 2022 – Oct 2026): sign-ups per workshop, turnout by
month and topic theme, return rates, and audience mix by role, organization
type and location. It deliberately lists no individual participants.

## How the password works

- `index.html` + `regdata.js` are public, but hold no data.
- `data.enc.json` holds the report data encrypted with AES-256-GCM. The key
  is derived from the password with PBKDF2-SHA256 (250,000 iterations, random
  salt), so the data can't be read from the page source without the password.
- The password prompt decrypts it in the browser. A correct password is kept
  in `sessionStorage` so refreshing the tab doesn't re-prompt.
- This is a speed bump against casual sharing, not real access control:
  anyone who has the password can read and copy the data. The page is also
  marked `noindex` so search engines skip it.

## Changing the password or refreshing the data

The data and the password are baked into `data.enc.json` together, so either
change means re-encrypting. With the report data saved as `data.json`
(same shape as before, produced by the analysis script):

```python
import json, os, base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

PASSWORD = b"new-password-here"
pt = json.dumps(json.load(open("data.json")), separators=(",", ":")).encode()
salt, iv, it = os.urandom(16), os.urandom(12), 250000
key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=it).derive(PASSWORD)
e = lambda b: base64.b64encode(b).decode()
json.dump({"v": 1, "kdf": "PBKDF2-SHA256", "iterations": it, "cipher": "AES-256-GCM",
           "salt": e(salt), "iv": e(iv), "data": e(AESGCM(key).encrypt(iv, pt, None))},
          open("data.enc.json", "w"))
```

Commit the new `data.enc.json`; nothing else needs to change.
