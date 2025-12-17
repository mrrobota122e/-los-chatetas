# ⚽ AARON STUD10S - LOS CHATETAS (FÚTBOL EDITION)

> Juego web multijugador de deducción social en tiempo real con temática de fútbol

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp server/.env.example server/.env
cp client/.env.example client/.env

# Iniciar base de datos
cd server
npx prisma migrate dev
npx prisma generate

# Iniciar desarrollo (ambos: client + server)
npm run dev
```

Abrir en navegador:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## 📁 Estructura

```
los-chatetas/
├── client/          # Frontend React + Vite
├── server/          # Backend Node.js + Socket.io
├── shared/          # Tipos compartidos TypeScript
└── docs/            # Documentación (ver carpeta .gemini)
```

## 📚 Documentación Completa

Ver documentos de planificación en:
`C:\Users\Administrator\.gemini\antigravity\brain\b61ed8f0-05e6-48f2-91b0-da5b9e37a8ba\`

- **implementation_plan.md** - Arquitectura completa
- **GAME_DESIGN.md** - Mecánicas de juego
- **API.md** - WebSocket events
- **DEPLOYMENT.md** - Guía de deployment

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Three.js, GSAP
- **Backend**: Node.js, Express, Socket.io, Prisma
- **Database**: PostgreSQL (prod) / SQLite (dev)

---

**AARON STUD10S** © 2024
