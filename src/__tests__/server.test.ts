import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '..', 'data.json');

let originalData: string | null = null;

beforeEach(() => {
  if (fs.existsSync(dbPath)) {
    originalData = fs.readFileSync(dbPath, 'utf8');
  }
});

afterEach(() => {
  if (originalData !== null) {
    fs.writeFileSync(dbPath, originalData, 'utf8');
  }
});

function createTestApp() {
  const testApp = express();
  testApp.use(express.json());

  const normalizePrize = (prize: Record<string, unknown>) => ({
    id: prize.id,
    name: prize.name,
    quantity: prize.quantity ?? 0,
    probability: prize.probability ?? 0,
    image_url: prize.image_url ?? '',
    active: prize.active ?? true,
    wheelCount: prize.wheelCount ?? 1,
    isLosePrize: prize.isLosePrize ?? false,
  });

  const loadDatabase = () => {
    try {
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(data);
        parsed.prizes = (parsed.prizes ?? []).map(normalizePrize);
        parsed.spinRequests = parsed.spinRequests ?? [];
        parsed.wheelUnlocked = parsed.wheelUnlocked ?? false;
        return parsed;
      }
      return { wheelUnlocked: false, prizes: [], spinRequests: [] };
    } catch {
      return { wheelUnlocked: false, prizes: [], spinRequests: [] };
    }
  };

  const saveDatabase = (data: Record<string, unknown>) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
  };

  testApp.get('/api/data', (_req, res) => {
    res.json(loadDatabase());
  });

  testApp.post('/api/prizes', (req, res) => {
    const db = loadDatabase();
    db.prizes = req.body;
    saveDatabase(db);
    res.json({ success: true, message: 'Prizes updated' });
  });

  testApp.post('/api/spin-requests', (req, res) => {
    const db = loadDatabase();
    db.spinRequests = req.body;
    saveDatabase(db);
    res.json({ success: true, message: 'Spin requests updated' });
  });

  testApp.post('/api/unlock-wheel', (_req, res) => {
    const db = loadDatabase();
    db.wheelUnlocked = true;
    saveDatabase(db);
    res.json({ success: true, message: 'Wheel unlocked', wheelUnlocked: true, timestamp: new Date().toISOString() });
  });

  testApp.post('/api/lock-wheel', (_req, res) => {
    const db = loadDatabase();
    db.wheelUnlocked = false;
    saveDatabase(db);
    res.json({ success: true, message: 'Wheel locked', wheelUnlocked: false, timestamp: new Date().toISOString() });
  });

  testApp.get('/api/wheel-status', (_req, res) => {
    const db = loadDatabase();
    res.json({ unlocked: db.wheelUnlocked, timestamp: new Date().toISOString() });
  });

  return testApp;
}

describe('Server API', () => {
  describe('GET /api/data', () => {
    it('should return database with prizes and wheelUnlocked', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/data');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('prizes');
      expect(res.body).toHaveProperty('wheelUnlocked');
      expect(res.body).toHaveProperty('spinRequests');
    });
  });

  describe('POST /api/prizes', () => {
    it('should update prizes', async () => {
      const app = createTestApp();
      const prizes = [
        { id: 999, name: 'Test', quantity: 10, probability: 50, image_url: '', active: true, wheelCount: 1 }
      ];
      const res = await request(app).post('/api/prizes').send(prizes);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const verify = await request(app).get('/api/data');
      expect(verify.body.prizes).toHaveLength(1);
      expect(verify.body.prizes[0].name).toBe('Test');
    });
  });

  describe('POST /api/spin-requests', () => {
    it('should update spin requests', async () => {
      const app = createTestApp();
      const requests = [
        { id: 1, prize: { id: 1, name: 'Test' }, timestamp: new Date().toISOString(), status: 'processed' }
      ];
      const res = await request(app).post('/api/spin-requests').send(requests);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/unlock-wheel', () => {
    it('should unlock the wheel', async () => {
      const app = createTestApp();
      const res = await request(app).post('/api/unlock-wheel');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wheelUnlocked).toBe(true);

      const verify = await request(app).get('/api/data');
      expect(verify.body.wheelUnlocked).toBe(true);
    });
  });

  describe('POST /api/lock-wheel', () => {
    it('should lock the wheel', async () => {
      const app = createTestApp();
      await request(app).post('/api/unlock-wheel');
      const res = await request(app).post('/api/lock-wheel');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.wheelUnlocked).toBe(false);
    });
  });

  describe('GET /api/wheel-status', () => {
    it('should return wheel status', async () => {
      const app = createTestApp();
      const res = await request(app).get('/api/wheel-status');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('unlocked');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Prize normalization', () => {
    it('should return prizes with default quantity when missing', async () => {
      const prizesWithMissingQuantity = [
        { id: 1, name: 'Test', probability: 50, image_url: '', active: true, wheelCount: 1 },
      ];
      fs.writeFileSync(dbPath, JSON.stringify({ wheelUnlocked: false, prizes: prizesWithMissingQuantity, spinRequests: [] }), 'utf8');

      const app = createTestApp();
      const res = await request(app).get('/api/data');
      expect(res.body.prizes[0].quantity).toBe(0);
    });

    it('should return prizes with all required fields when only id and name exist', async () => {
      const minimalPrizes = [{ id: 1, name: 'Minimal' }];
      fs.writeFileSync(dbPath, JSON.stringify({ wheelUnlocked: false, prizes: minimalPrizes, spinRequests: [] }), 'utf8');

      const app = createTestApp();
      const res = await request(app).get('/api/data');
      const prize = res.body.prizes[0];
      expect(prize.quantity).toBe(0);
      expect(prize.probability).toBe(0);
      expect(prize.image_url).toBe('');
      expect(prize.active).toBe(true);
      expect(prize.wheelCount).toBe(1);
      expect(prize.isLosePrize).toBe(false);
    });

    it('should preserve existing quantity when present', async () => {
      const prizesWithQuantity = [
        { id: 1, name: 'Test', quantity: 42, probability: 50, image_url: '', active: true, wheelCount: 1 },
      ];
      fs.writeFileSync(dbPath, JSON.stringify({ wheelUnlocked: false, prizes: prizesWithQuantity, spinRequests: [] }), 'utf8');

      const app = createTestApp();
      const res = await request(app).get('/api/data');
      expect(res.body.prizes[0].quantity).toBe(42);
    });

    it('should handle empty prizes array', async () => {
      fs.writeFileSync(dbPath, JSON.stringify({ wheelUnlocked: false, prizes: [], spinRequests: [] }), 'utf8');

      const app = createTestApp();
      const res = await request(app).get('/api/data');
      expect(res.body.prizes).toEqual([]);
    });

    it('should handle missing prizes key in database', async () => {
      fs.writeFileSync(dbPath, JSON.stringify({ wheelUnlocked: false }), 'utf8');

      const app = createTestApp();
      const res = await request(app).get('/api/data');
      expect(res.body.prizes).toEqual([]);
      expect(res.body.spinRequests).toEqual([]);
    });
  });
});
