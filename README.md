# SO Estimate Library

Frontend + Express API + Postgres (Render).

## Local

```bash
cd aso-estimate
npm install
npm start
```

Open http://localhost:3000  
Admin: http://localhost:3000/admin

Without `DATABASE_URL` data is saved in `data/formats.json`.

## Render (same workspace as Copilot)

1. New GitHub repo — upload this `aso-estimate` folder.
2. Render → New Web Service → that repo.
3. Build: `npm install`
4. Start: `npm start`
5. Instance: Free.
6. Add Postgres on same workspace (or use Supabase and paste its URI).
7. Web service Environment:
   - `DATABASE_URL` = Internal Database URL
   - `DATABASE_SSL` = `false` if using Render internal URL

Free Render Postgres expires in 30 days. For lasting data use paid Postgres or Supabase free project.

## API

- `GET /api/health`
- `GET /api/formats`
- `POST /api/formats`  
  `{ "district": "Kheda", "taluka": "Thasra", "works": ["CC Road","Gutter line"] }`
