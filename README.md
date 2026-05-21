Create a file named `README.md` and paste this:

```md
# FundLENS

FundLENS is a local mutual fund analytics web app. It helps track portfolio transactions, calculate portfolio value, estimate XIRR, compare fund holding overlap, and generate simple NAV predictions.

## Project Structure

```txt
fundlens2.0/
  Backend/    FastAPI backend API
  Frontend/   Next.js frontend app
```

## Main Features

- User registration and login
- Add buy/sell mutual fund transactions
- Track invested amount, current value, gain/loss, and allocation
- Update fund NAV values
- Calculate portfolio XIRR
- Compare overlap between two mutual funds
- Predict future NAV using recent NAV history
- Search mutual funds by fund name, AMC, category, or tags

## Local URLs

Frontend:

```txt
http://localhost:3000
http://localhost:3000/overlap
http://localhost:3000/prediction
```

Backend:

```txt
http://127.0.0.1:8001
http://127.0.0.1:8001/docs
http://127.0.0.1:8001/health
```

## Backend Setup

Go to the backend folder:

```bash
cd Backend
```

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file:

```env
APP_NAME=FundLENS API
ENVIRONMENT=development
DATABASE_URL=sqlite:///./fundlens.db
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Run the backend:

```bash
./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Health check:

```bash
curl http://127.0.0.1:8001/health
```

Expected response:

```json
{"status":"ok"}
```

## Frontend Setup

Go to the frontend folder:

```bash
cd Frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
NEXT_PUBLIC_API_URL=http://127.0.0.1:8001
```

Run the frontend:

```bash
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Important API Routes

Auth:

```txt
POST /auth/register
POST /auth/login
GET  /auth/me
```

Funds:

```txt
GET   /funds
POST  /funds
GET   /funds/{fund_id}
PATCH /funds/{fund_id}
POST  /funds/{fund_id}/nav
GET   /funds/{fund_id}/nav
PUT   /funds/{fund_id}/holdings
GET   /funds/{fund_id}/holdings
```

Portfolio:

```txt
POST   /portfolio/transactions
GET    /portfolio/transactions
GET    /portfolio/transactions/{transaction_id}
PATCH  /portfolio/transactions/{transaction_id}
DELETE /portfolio/transactions/{transaction_id}
GET    /portfolio/summary
GET    /portfolio/xirr
```

Analytics:

```txt
POST /analytics/xirr
POST /analytics/overlap
POST /analytics/overlap/stored
POST /analytics/predict-nav
GET  /analytics/funds/{fund_id}/predict-nav
```

## Notes

The frontend imports local mutual fund data from:

```ts
@/library/mutualfunds
```

That is a code import path, not a website URL.

## Troubleshooting

If the server does not run, make sure you are inside the correct folder:

```bash
cd /Users/rachitsoni/Desktop/Projects/fundlens2.0
```

The old folder name `FUNDLENS` may not exist anymore.

If backend reload mode fails, run without `--reload`:

```bash
./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8001
```

If the frontend cannot connect to the backend, confirm the backend is running:

```bash
curl http://127.0.0.1:8001/health
```
```