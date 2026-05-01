# Wheel of Fortune - Server Setup

## Development Mode (React Dev Server)
```bash
npm install
npm start
```
Access at: `http://localhost:3000`

## Production Mode (Express Server)

### 1. Build the React app
```bash
npm run build
```

### 2. Install Express dependency
```bash
npm install
```

### 3. Start the server
```bash
npm run server
```

### 4. Access the application
- **From localhost**: `http://localhost:3000`
- **From network**: `http://<your-server-ip>:3000`

### Or use the combined command
```bash
npm run build-and-serve
```

## API Endpoints

### Unlock the Wheel
```bash
POST /api/unlock-wheel
```
Response:
```json
{
  "success": true,
  "message": "Wheel unlocked",
  "timestamp": "2025-11-03T21:00:00.000Z"
}
```

### Lock the Wheel
```bash
POST /api/lock-wheel
```
Response:
```json
{
  "success": true,
  "message": "Wheel locked",
  "timestamp": "2025-11-03T21:00:00.000Z"
}
```

### Get Wheel Status
```bash
GET /api/wheel-status
```
Response:
```json
{
  "unlocked": true,
  "timestamp": "2025-11-03T21:00:00.000Z"
}
```

## Example: Unlock Wheel from Another Server
```bash
curl -X POST http://<server-ip>:3000/api/unlock-wheel
```

## Notes
- The server listens on `0.0.0.0` (all network interfaces)
- Default port is `3000` (can be changed with `PORT` environment variable)
- Wheel state is stored in memory and will reset on server restart
- No authentication required (simple endpoints)
