# Hosting Chesswise for friends

Chesswise has two services:

- **API:** FastAPI, Stockfish, and the trained model.
- **Frontend:** React/Vite static files.

The frontend must be built with the public API URL. A browser cannot use
`127.0.0.1` to reach an API running on your computer or in another cloud
service.

## Quick local network test

Start the app normally:

```powershell
.\start-chesswise.bat
```

Find your computer's local IPv4 address:

```powershell
ipconfig
```

Then open this address on a device connected to the same Wi-Fi:

```text
http://YOUR_LOCAL_IPV4:5173/
```

Windows Firewall may ask permission for Python or Node. Allow private-network
access only. This works only while your computer and the app are running.

## Docker Compose test

Docker Compose uses Linux Stockfish inside the API container. It does not use
the Windows Stockfish executable in `tools/`.

```powershell
docker compose up --build
```

Open:

```text
http://127.0.0.1:5173/
```

The API health check is:

```text
http://127.0.0.1:8000/health
```

Stop the services with:

```powershell
docker compose down
```

## Public deployment

Use a Git repository and deploy the services separately:

1. **API:** deploy the root `Dockerfile` as a Docker web service.
2. **Frontend:** deploy `frontend/` as a Vite static site.

### API environment variables

Set these in the API service:

```text
STOCKFISH_PATH=/usr/games/stockfish
FRONTEND_ORIGINS=https://YOUR-FRONTEND-DOMAIN
```

The API service must listen on the platform-provided port. The repository
Dockerfile uses the `PORT` variable when provided and falls back to `8000`
locally.

Verify the deployment before connecting the frontend:

```text
https://YOUR-API-DOMAIN/health
```

The response should contain `"status": "ok"` and `"model_loaded": true`.

### Frontend environment variable

Set this build-time variable in the frontend service:

```text
VITE_API_URL=https://YOUR-API-DOMAIN
```

For a Docker frontend build, pass it as a build argument:

```powershell
docker build `
  --build-arg VITE_API_URL=https://YOUR-API-DOMAIN `
  -f frontend\Dockerfile `
  frontend
```

The frontend service should publish the generated `dist/` directory. Vercel,
Netlify, or a similar static host can use:

```text
Root directory: frontend
Build command: npm run build
Output directory: dist
```

## Common hosting failures

- **CORS error:** add the exact frontend origin to `FRONTEND_ORIGINS`.
- **Requests go to localhost:** set `VITE_API_URL` before the frontend build.
- **Stockfish not found:** use the Linux path `/usr/games/stockfish` in the
  container, not the Windows `.exe` path.
- **Model not found:** make sure `models/blunder_model.joblib` is included in
  the API image.
- **Maia unavailable:** expected until pretrained Maia weights are installed;
  the frontend intentionally keeps Maia disabled.

Do not publish `.env`, virtual environments, API keys, Stockfish binaries, or
private datasets.
