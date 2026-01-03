# Frontend (Vite + React + Tailwind)

This frontend uses Vite for development/build and talks to the backend via HTTP (`/api/v1`) and Socket.IO (`/ws`).

## Available Scripts

In the project directory, you can run:

### `npm run dev`

Runs the app in the development mode.\
Open [http://localhost:3001](http://localhost:3001) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `dist` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run preview`

Serves the production build locally on `http://localhost:3001`.

## Backend / Proxy

- Configure `BACKEND_URL` (see `.env.example`) if your backend is not on `http://localhost:3000`.
- In dev, Vite proxies `/api/*` and `/ws/*` to `BACKEND_URL`.
