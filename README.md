# Nexus React Project

## Local Setup

### Prerequisites

- Node.js
- PostgreSQL installed and running locally

---

### 1. Environment Variables

Copy the example env file and fill in your values:

```bash
cp server/.env.example server/.env
```

Then edit `server/.env`:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/nexusdb?schema=public"
PAYME_API_URL_DEV="https://sandbox.payme.io/api/generate-sale"
PAYME_API_URL_PROD=""
PAYME_ID=""
PAYME_SALE_CALLBACK_URL=""
```

Replace `<user>` and `<password>` with your local PostgreSQL credentials.
Make sure a database named `nexusdb` exists, or create one:

```sql
CREATE DATABASE nexusdb;
```

---

### 2. Install Dependencies

```bash
# Server
cd server && npm install

# Client
cd client && npm install
```

---

### 3. Run Migrations

```bash
cd server
npx prisma migrate dev
```

---

### 4. Start the App

```bash
# Server (from server/)
npm start

# Client (from client/)
npm run dev
```

Client runs on `http://localhost:3000`.
