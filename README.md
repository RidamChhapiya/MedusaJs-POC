# MedusaJs-POC

A full-stack e-commerce application built with Medusa (backend) and Next.js (frontend).

## Project Structure

```
MedusaJs-POC/
├── MedusaJs-POC-backend/    # Medusa backend server
└── MedusaJs-POC-frontend/    # Next.js storefront
```

## Getting Started

### Backend

```bash
cd MedusaJs-POC-backend
npm install
npm run dev
```

Backend runs on `http://localhost:9000`

### Frontend

```bash
cd MedusaJs-POC-frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:8000`

## Requirements

- Node.js >= 20
- PostgreSQL database
- Redis (optional, uses in-memory fallback if not configured)

## Environment Variables

Each project has its own `.env` file. See individual project READMEs for configuration details.

