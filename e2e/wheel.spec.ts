import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001';

test.describe('API Data Integrity', () => {
  test('GET /api/data returns prizes array with all required fields', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/data`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    expect(data).toHaveProperty('prizes');
    expect(data).toHaveProperty('wheelUnlocked');
    expect(data).toHaveProperty('spinRequests');
    expect(Array.isArray(data.prizes)).toBe(true);
    expect(data.prizes.length).toBeGreaterThan(0);

    for (const prize of data.prizes) {
      expect(prize).toHaveProperty('id');
      expect(prize).toHaveProperty('name');
      expect(prize).toHaveProperty('quantity');
      expect(prize).toHaveProperty('probability');
      expect(prize).toHaveProperty('active');
      expect(prize).toHaveProperty('wheelCount');
      expect(typeof prize.quantity).toBe('number');
      expect(typeof prize.name).toBe('string');
      expect(prize.name.length).toBeGreaterThan(0);
    }
  });

  test('lose prize has quantity field after normalization', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/data`);
    const data = await res.json();
    const losePrize = data.prizes.find((p: { isLosePrize?: boolean }) => p.isLosePrize);
    expect(losePrize).toBeDefined();
    expect(typeof losePrize.quantity).toBe('number');
    expect(losePrize.quantity).toBe(0);
  });

  test('all prizes have quantity >= 0', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/data`);
    const data = await res.json();
    for (const prize of data.prizes) {
      expect(prize.quantity).toBeGreaterThanOrEqual(0);
    }
  });

  test('POST /api/prizes then GET returns updated data', async ({ request }) => {
    const orig = await request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    const testPrizes = [
      { id: 888, name: 'E2E Probe', quantity: 7, probability: 10, image_url: '', active: true, wheelCount: 1 },
    ];
    await request.post(`${API_BASE}/api/prizes`, { data: testPrizes });

    const updated = await request.get(`${API_BASE}/api/data`);
    const updatedData = await updated.json();
    expect(updatedData.prizes).toHaveLength(1);
    expect(updatedData.prizes[0].name).toBe('E2E Probe');
    expect(updatedData.prizes[0].quantity).toBe(7);

    // restore
    await request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('POST /api/prizes with prize missing quantity preserves it via normalization', async ({ request }) => {
    const orig = await request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    const badPrizes = [
      { id: 777, name: 'No Qty', probability: 10, image_url: '', active: true, wheelCount: 1 },
    ];
    await request.post(`${API_BASE}/api/prizes`, { data: badPrizes });

    const updated = await request.get(`${API_BASE}/api/data`);
    const updatedData = await updated.json();
    expect(updatedData.prizes[0].quantity).toBe(0);

    // restore
    await request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });
});

test.describe('Wheel Page', () => {
  test('displays wheel SVG with prize segments', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('svg')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Gira la Rueda de la Fortuna');
  });

  test('shows prize names as text on wheel segments', async ({ page }) => {
    await page.goto('/');
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const activePrizes = apiData.prizes.filter(
      (p: { active?: boolean; quantity?: number; isLosePrize?: boolean }) =>
        (p.isLosePrize || (p.quantity ?? 0) > 0) && p.active !== false,
    );
    expect(activePrizes.length).toBeGreaterThan(0);

    const firstPrize = activePrizes[0];
    await expect(page.locator(`text=${firstPrize.name.toUpperCase()}`)).toBeVisible({ timeout: 5000 });
  });

  test('shows locked state when wheel is locked', async ({ page }) => {
    await page.request.post(`${API_BASE}/api/lock-wheel`);
    await page.goto('/');
    await expect(page.locator('text=Rueda Bloqueada')).toBeVisible({ timeout: 5000 });
  });

  test('shows unlocked state when wheel is unlocked', async ({ page }) => {
    await page.request.post(`${API_BASE}/api/unlock-wheel`);
    await page.goto('/');
    await expect(page.locator('text=¡Girar la Rueda!')).toBeVisible({ timeout: 5000 });
    await page.request.post(`${API_BASE}/api/lock-wheel`);
  });

  test('SPIN button exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('button:has-text("SPIN")')).toBeVisible();
  });

  test('pointer arrow exists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[role="img"][aria-label="Wheel pointer"]')).toBeVisible();
  });

  test('shows empty state when no prizes available', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();
    await page.request.post(`${API_BASE}/api/prizes`, { data: [] });
    await page.goto('/');
    await expect(page.locator('text=No prizes available')).toBeVisible({ timeout: 5000 });
    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('spin decrements prize quantity', async ({ page }) => {
    await page.request.post(`${API_BASE}/api/unlock-wheel`);
    await page.goto('/');

    const beforeRes = await page.request.get(`${API_BASE}/api/data`);
    const beforeData = await beforeRes.json();
    const totalBefore = beforeData.prizes.reduce(
      (s: number, p: { isLosePrize?: boolean; quantity?: number }) => s + (p.isLosePrize ? 0 : p.quantity ?? 0),
      0,
    );

    await page.locator('text=¡Girar la Rueda!').click();
    await page.waitForTimeout(5000);

    const afterRes = await page.request.get(`${API_BASE}/api/data`);
    const afterData = await afterRes.json();
    const totalAfter = afterData.prizes.reduce(
      (s: number, p: { isLosePrize?: boolean; quantity?: number }) => s + (p.isLosePrize ? 0 : p.quantity ?? 0),
      0,
    );

    expect(totalAfter).toBeLessThanOrEqual(totalBefore);
    await page.request.post(`${API_BASE}/api/lock-wheel`);
  });
});

test.describe('Admin Page', () => {
  test('page title is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Panel de Administración');
  });

  test('control de rueda section is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Control de Rueda')).toBeVisible();
  });

  test('gestion de inventario section is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Gestión de Inventario')).toBeVisible();
  });

  test('historial de giros section is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('text=Historial de Giros')).toBeVisible();
  });

  test('lock/unlock button is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(
      page.locator('button:has-text("Desbloquear"), button:has-text("Bloquear")'),
    ).toBeVisible();
  });

  test('search input is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('input[placeholder="Buscar productos..."]')).toBeVisible();
  });

  test('add product button is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('button:has-text("Agregar Producto")')).toBeVisible();
  });

  test('sort buttons are visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('button:has-text("Nombre")')).toBeVisible();
    await expect(page.locator('button:has-text("Stock")')).toBeVisible();
    await expect(page.locator('button:has-text("Probabilidad")')).toBeVisible();
  });

  test('export and import buttons are visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('button:has-text("Exportar")')).toBeVisible();
    await expect(page.locator('text=Importar')).toBeVisible();
  });

  test('statistics button is visible', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('button:has-text("Estadísticas")')).toBeVisible();
  });
});

test.describe('Admin Page – Inventory Display (Critical)', () => {
  test('API returns prizes and admin page renders them', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const prizeCount = apiData.prizes.length;
    expect(prizeCount).toBeGreaterThan(0);

    await page.goto('/admin');
    await expect(page.locator('text=Gestión de Inventario')).toBeVisible();

    const firstPrize = apiData.prizes[0];
    await expect(page.locator(`text=${firstPrize.name}`)).toBeVisible({ timeout: 8000 });
  });

  test('admin inventory shows actual prize names from database', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const nonLose = apiData.prizes.filter((p: { isLosePrize?: boolean }) => !p.isLosePrize);
    expect(nonLose.length).toBeGreaterThan(0);

    await page.goto('/admin');

    for (const prize of nonLose.slice(0, 5)) {
      await expect(page.locator(`text=${prize.name}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('admin inventory does NOT show empty state when prizes exist in API', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    expect(apiData.prizes.length).toBeGreaterThan(0);

    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const emptyState = page.locator('text=No hay productos en el inventario');
    await expect(emptyState).not.toBeVisible();
  });

  test('admin inventory prize count matches API', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const apiCount = apiData.prizes.length;

    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const prizeItems = page.locator('.prize-item');
    await expect(prizeItems.first()).toBeVisible({ timeout: 5000 });
    const uiCount = await prizeItems.count();
    expect(uiCount).toBe(apiCount);
  });

  test('admin inventory shows stock values for non-lose prizes', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const stockLabels = page.locator('.prize-quantity:has-text("Stock:")');
    const count = await stockLabels.count();
    expect(count).toBeGreaterThan(0);

    const firstStock = await stockLabels.first().textContent();
    expect(firstStock).toMatch(/Stock: \d+/);
  });

  test('admin shows same prizes as wheel', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const activePrizes = apiData.prizes.filter(
      (p: { active?: boolean }) => p.active !== false,
    );

    await page.goto('/admin');
    await page.waitForTimeout(3000);

    for (const prize of activePrizes.slice(0, 5)) {
      await expect(page.locator(`text=${prize.name}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('prize-list container has non-zero height when prizes exist', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const prizeList = page.locator('.prize-list');
    await expect(prizeList).toBeVisible();
    const box = await prizeList.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThan(0);
  });

  test('prize-item elements are rendered and visible', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const items = page.locator('.prize-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    const first = items.first();
    await expect(first).toBeVisible();
    const firstBox = await first.boundingBox();
    expect(firstBox!.height).toBeGreaterThan(0);
  });
});

test.describe('Admin Page – Inventory CRUD', () => {
  test('add prize form opens and submits', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('button:has-text("Agregar Producto")').click();
    await expect(page.locator('input[placeholder="Ingrese el nombre"]')).toBeVisible();

    await page.locator('input[placeholder="Ingrese el nombre"]').fill('Premio E2E');
    await page.locator('input[type="number"]').first().fill('5');
    await page.locator('input[type="number"]').nth(1).fill('20');

    await page.locator('button:has-text("Agregar Producto")').last().click();
    await expect(page.locator('text=Premio E2E')).toBeVisible({ timeout: 5000 });
  });

  test('cancel add form hides form', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('button:has-text("Agregar Producto")').click();
    await expect(page.locator('input[placeholder="Ingrese el nombre"]')).toBeVisible();
    await page.locator('button:has-text("Cancelar")').click();
    await expect(page.locator('input[placeholder="Ingrese el nombre"]')).not.toBeVisible();
  });

  test('increment stock updates quantity', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    await page.goto('/admin');
    const plusButtons = page.locator('button[title="Incrementar stock"]');
    await expect(plusButtons.first()).toBeVisible({ timeout: 5000 });
    await plusButtons.first().click();

    await page.waitForTimeout(1000);
    const after = await page.request.get(`${API_BASE}/api/data`);
    const afterData = await after.json();
    expect(afterData.prizes[0].quantity).toBe(origData.prizes[0].quantity + 1);

    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('decrement stock updates quantity', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    await page.goto('/admin');
    const minusButtons = page.locator('button[title="Decrementar stock (compra manual)"]');
    await expect(minusButtons.first()).toBeVisible({ timeout: 5000 });
    await minusButtons.first().click();

    await page.waitForTimeout(1000);
    const after = await page.request.get(`${API_BASE}/api/data`);
    const afterData = await after.json();
    expect(afterData.prizes[0].quantity).toBe(origData.prizes[0].quantity - 1);

    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('toggle active status', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    await page.goto('/admin');
    const toggleButtons = page.locator('button[title*="ruleta"]');
    await expect(toggleButtons.first()).toBeVisible({ timeout: 5000 });
    await toggleButtons.first().click();

    await page.waitForTimeout(1000);
    const after = await page.request.get(`${API_BASE}/api/data`);
    const afterData = await after.json();
    expect(afterData.prizes[0].active).toBe(!origData.prizes[0].active);

    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('increase wheel count', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    await page.goto('/admin');
    const upButtons = page.locator('button[title="Aumentar veces en ruleta"]');
    await expect(upButtons.first()).toBeVisible({ timeout: 5000 });
    await upButtons.first().click();

    await page.waitForTimeout(1000);
    const after = await page.request.get(`${API_BASE}/api/data`);
    const afterData = await after.json();
    expect(afterData.prizes[0].wheelCount).toBe(origData.prizes[0].wheelCount + 1);

    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('decrease wheel count', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    await page.goto('/admin');
    const downButtons = page.locator('button[title="Disminuir veces en ruleta"]');
    await expect(downButtons.first()).toBeVisible({ timeout: 5000 });
    await downButtons.first().click();

    await page.waitForTimeout(1000);
    const after = await page.request.get(`${API_BASE}/api/data`);
    const afterData = await after.json();
    expect(afterData.prizes[0].wheelCount).toBe(origData.prizes[0].wheelCount - 1);

    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('delete prize with confirmation', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    await page.goto('/admin');
    const deleteButtons = page.locator('button[title="Eliminar producto"]');
    await expect(deleteButtons.first()).toBeVisible({ timeout: 5000 });
    await deleteButtons.first().click();

    await expect(page.locator('text=Confirmar eliminación')).toBeVisible();
    await page.locator('button:has-text("Eliminar")').last().click();

    await page.waitForTimeout(1000);
    const after = await page.request.get(`${API_BASE}/api/data`);
    const afterData = await after.json();
    expect(afterData.prizes.length).toBe(origData.prizes.length - 1);

    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });

  test('edit prize via form', async ({ page }) => {
    const orig = await page.request.get(`${API_BASE}/api/data`);
    const origData = await orig.json();

    await page.goto('/admin');
    const editButtons = page.locator('button[title="Editar producto"]');
    await expect(editButtons.first()).toBeVisible({ timeout: 5000 });
    await editButtons.first().click();

    await expect(page.locator('input[placeholder="Ingrese el nombre"]')).toBeVisible();
    await page.locator('input[placeholder="Ingrese el nombre"]').fill('Editado E2E');
    await page.locator('button:has-text("Actualizar")').click();

    await expect(page.locator('text=Editado E2E')).toBeVisible({ timeout: 5000 });

    await page.request.post(`${API_BASE}/api/prizes`, { data: origData.prizes });
  });
});

test.describe('Admin Page – Search & Sort', () => {
  test('search filters prizes', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    await page.locator('input[placeholder="Buscar productos..."]').fill('Café');
    await expect(page.locator('text=Café')).toBeVisible();
    await expect(page.locator('.prize-item')).toHaveCount(1);
  });

  test('search with no matches shows empty', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    await page.locator('input[placeholder="Buscar productos..."]').fill('xyz123noexiste');
    await expect(page.locator('text=No se encontraron productos')).toBeVisible();
  });

  test('sort by name toggles', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("Nombre")').click();
    const items = page.locator('.prize-name');
    const first = await items.first().textContent();
    const last = await items.last().textContent();
    expect(first).toBeDefined();
    expect(last).toBeDefined();
  });

  test('sort by stock', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("Stock")').click();
    const items = page.locator('.prize-name');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('sort by probability', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);

    await page.locator('button:has-text("Probabilidad")').click();
    const items = page.locator('.prize-name');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Admin Page – Statistics', () => {
  test('statistics panel shows correct counts', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();

    await page.goto('/admin');
    await page.locator('button:has-text("Estadísticas")').click();

    await expect(page.locator(`text=Productos: ${apiData.prizes.length}`)).toBeVisible();
    const active = apiData.prizes.filter((p: { active?: boolean }) => p.active !== false).length;
    await expect(page.locator(`text=Activos: ${active}`)).toBeVisible();
  });
});

test.describe('Admin Page – Wheel Lock Control', () => {
  test('toggle lock/unlock', async ({ page }) => {
    await page.request.post(`${API_BASE}/api/lock-wheel`);
    await page.goto('/admin');

    await expect(page.locator('text=Rueda Bloqueada')).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Desbloquear")').click();
    await expect(page.locator('text=Rueda Desbloqueada')).toBeVisible({ timeout: 5000 });

    await page.locator('button:has-text("Bloquear")').click();
    await expect(page.locator('text=Rueda Bloqueada')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Page – Spin History', () => {
  test('shows last processed spin or empty message', async ({ page }) => {
    await page.goto('/admin');
    const hasLast = await page.locator('text=Último Giro').isVisible();
    const hasEmpty = await page.locator('text=No hay giros procesados.').isVisible();
    expect(hasLast || hasEmpty).toBe(true);
  });
});

test.describe('Navigation', () => {
  test('wheel page to admin page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Gira la Rueda de la Fortuna');

    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Panel de Administración');
  });

  test('admin page to wheel page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Panel de Administración');

    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Gira la Rueda de la Fortuna');
  });
});

test.describe('Wheel + Admin Consistency', () => {
  test('prizes visible on wheel are also visible in admin inventory', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const activePrizes = apiData.prizes.filter(
      (p: { active?: boolean; quantity?: number; isLosePrize?: boolean }) =>
        (p.isLosePrize || (p.quantity ?? 0) > 0) && p.active !== false,
    );
    expect(activePrizes.length).toBeGreaterThan(0);

    // Check wheel page
    await page.goto('/');
    const firstPrize = activePrizes[0];
    await expect(page.locator(`text=${firstPrize.name.toUpperCase()}`)).toBeVisible({ timeout: 5000 });

    // Check admin page shows same prize
    await page.goto('/admin');
    await expect(page.locator(`text=${firstPrize.name}`).first()).toBeVisible({ timeout: 8000 });
  });

  test('admin inventory count matches API prize count', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const apiCount = apiData.prizes.length;

    await page.goto('/admin');
    await page.waitForTimeout(3000);

    const prizeItems = page.locator('.prize-item');
    await expect(prizeItems.first()).toBeVisible({ timeout: 5000 });
    const uiCount = await prizeItems.count();

    expect(uiCount).toBe(apiCount);
  });

  test('wheel segment count matches active prizes with stock', async ({ page }) => {
    const apiRes = await page.request.get(`${API_BASE}/api/data`);
    const apiData = await apiRes.json();
    const available = apiData.prizes.filter(
      (p: { active?: boolean; quantity?: number; isLosePrize?: boolean }) =>
        (p.isLosePrize || (p.quantity ?? 0) > 0) && p.active !== false,
    );
    const expectedSegments = available.reduce(
      (s: number, p: { wheelCount?: number }) => s + (p.wheelCount || 1),
      0,
    );

    await page.goto('/');
    const textElements = page.locator('svg text');
    const textCount = await textElements.count();
    expect(textCount).toBe(expectedSegments);
  });
});
