# Rabbit Race Game - Frontend

Este es el frontend interactivo del juego Rabbit Race, optimizado para una experiencia de usuario rápida y dinámica.

## Requisitos Previos

- [Node.js](https://nodejs.org/) (v18+)
- [npm](https://www.npmjs.com/) o [pnpm](https://pnpm.io/)

## Instalación

1. Navega a la carpeta `frontend`:
   ```bash
   cd frontend
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Instala los componentes Shadcn (si es necesario):
   ```bash
   npx shadcn-ui@latest init
   ```

## Scripts Disponibles

- `npm run dev`: Levanta el servidor de desarrollo en `http://localhost:5173`.
- `npm run build`: Crea la versión de producción optimizada en la carpeta `dist`.
- `npm run preview`: Previsualiza localmente el build de producción.
- `npm run test`: Ejecuta las pruebas unitarias con Vitest.
- `npm run lint`: Realiza el análisis estático del código (ESLint).

## Tecnologías Utilizadas

- **Vite**: Empaquetador rápido para el desarrollo moderno.
- **React**: Biblioteca de JavaScript para interfaces de usuario reactivas.
- **TypeScript**: Superset de JavaScript con tipado estático.
- **Tailwind CSS**: Framework de CSS utilitario para un diseño rápido y flexible.
- **Shadcn UI**: Componentes UI reutilizables y accesibles.
- **React Router**: Manejo de rutas y navegación.
- **TanStack Query (React Query)**: Gestión de estado del servidor y caché.
- **Socket.io-client**: Comunicación en tiempo real con el backend.
- **Vitest**: Framework de pruebas nativo para Vite.

## Arquitectura

- `src/components/`: Componentes UI reutilizables.
- `src/lib/`: Utilidades y configuraciones (autenticación, API, sockets).
- `src/pages/`: Vistas principales de la aplicación.
- `src/hooks/`: Hooks personalizados de React.
