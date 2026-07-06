# Fixtures — DEV ONLY

Seed data for local development. **Do not deploy to production.**

- `user.yaml` — user credentials (plaintext; hashed on insert)
- `account.yaml` — account profile linked to user by `username`

Consumed by `npm run seed`. Guarded by `NODE_ENV !== 'production'` in [../seed.js](../seed.js).
