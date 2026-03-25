# CareStore Web System

<div align="center">

A modern, full-stack pharmacy management platform built with the MERN ecosystem.

[![MERN](https://img.shields.io/badge/Stack-MERN-0ea5e9?style=for-the-badge)](#tech-stack)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-22c55e?style=for-the-badge)](#tech-stack)
[![Express](https://img.shields.io/badge/Backend-Express%20%2B%20MongoDB-f97316?style=for-the-badge)](#tech-stack)
[![License](https://img.shields.io/badge/License-ISC-a855f7?style=for-the-badge)](#license)

</div>

## Overview

CareStore Web System is an end-to-end pharmacy operations solution for managing medicines, purchases, suppliers, customers, billing, POS sales, reports, user access, and immutable system logs.

It is designed for real-world retail pharmacy workflows with role-based controls, inventory safety, and clean operational dashboards.

## Key Features

- Authentication and authorization with JWT
- Role and section-based permissions for Admin and Staff
- Medicine inventory management with stock and threshold alerts
- Supplier and customer management
- Purchase and sales workflows with stock reconciliation
- POS with invoice generation and print support
- Bill edit/delete with proper stock rollback
- Immutable activity logs (auth events + data-change audits)
- Filtered reporting modules and dashboard views
- Seed scripts for medicine and business demo data (Pakistan-focused dataset)

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Tailwind CSS
- Axios
- Lucide Icons
- react-to-print

### Backend

- Node.js
- Express.js
- MongoDB + Mongoose
- Joi validation
- JWT authentication
- bcrypt password hashing

## Project Structure

```text
CareStore-Web-System/
  Backend/
    controllers/
    middleware/
    models/
    routes/
    scripts/
    data/
    server.js
  Frontend/
    src/
      api/
      context/
      layouts/
      pages/
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB connection string (Atlas or local)

### 1. Clone Repository

```bash
git clone https://github.com/DanishButt586/CareStore-Web-System.git
cd CareStore-Web-System
```

### 2. Backend Setup

```bash
cd Backend
npm install
```

Create a `.env` file in `Backend/` with your environment variables:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
```

Run backend:

```bash
npm start
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd Frontend
npm install
npm run dev
```

Frontend will run on Vite default URL, usually:

- http://localhost:5173

Backend runs on:

- http://localhost:5000

## Available Scripts

### Backend (`Backend/package.json`)

- `npm start` - Start API server
- `npm run dev` - Start API server (dev alias)
- `npm run seed:medicines` - Seed medicine records
- `npm run seed:business` - Seed suppliers, customers, purchases data

### Frontend (`Frontend/package.json`)

- `npm run dev` - Run Vite development server
- `npm run build` - Build production frontend
- `npm start` - Run Vite (same as start script in this project)

## Core Modules

- Dashboard
- POS
- Bills
- Medicines
- Purchases
- Customers
- Suppliers
- Reports
- Admin Users
- Logs

## Security and Audit Notes

- Passwords are hashed using `bcrypt`
- API routes are protected using JWT middleware
- Section-level access is enforced for role-specific views
- Log entries are immutable (no delete actions)
- Activity tracking includes auth events and data changes

## Screenshots

Add your UI screenshots here after pushing to GitHub:

```text
/docs/screenshots/dashboard.png
/docs/screenshots/pos.png
/docs/screenshots/logs.png
```

Then reference them in this README:

```md
![Dashboard](docs/screenshots/dashboard.png)
![POS](docs/screenshots/pos.png)
![Logs](docs/screenshots/logs.png)
```

## Deployment Suggestions

- Frontend: Vercel / Netlify
- Backend: Render / Railway / VPS
- Database: MongoDB Atlas

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push branch
5. Open a pull request

## License

ISC

---

### Author

Developed by Danish Butt.
