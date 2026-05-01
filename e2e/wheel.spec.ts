import { test, expect } from '@playwright/test';

test.describe('Wheel of Fortune E2E', () => {
  test.describe('Wheel Page', () => {
    test('should display the wheel page title', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('Gira la Rueda de la Fortuna');
    });

    test('should show locked state when wheel is locked', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=Rueda Bloqueada')).toBeVisible({ timeout: 5000 });
    });

    test('should display SPIN button', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('button:has-text("SPIN")')).toBeVisible();
    });

    test('should display wheel SVG', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('svg')).toBeVisible();
    });

    test('should show help text when locked', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=La rueda está bloqueada')).toBeVisible();
    });
  });

  test.describe('Admin Page', () => {
    test('should display admin page title', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('h1')).toContainText('Panel de Administración');
    });

    test('should show wheel control section', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('text=Control de Rueda')).toBeVisible();
    });

    test('should show inventory section', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('text=Gestión de Inventario')).toBeVisible();
    });

    test('should show lock/unlock button', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('button:has-text("Desbloquear"), button:has-text("Bloquear")')).toBeVisible();
    });

    test('should toggle wheel lock', async ({ page }) => {
      await page.goto('/admin');
      
      const lockButton = page.locator('button:has-text("Desbloquear"), button:has-text("Bloquear")');
      await lockButton.click();
      
      await page.waitForTimeout(1000);
      
      await expect(page.locator('text=Rueda Desbloqueada, text=Rueda Bloqueada')).toBeVisible();
    });

    test('should display prizes in inventory', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('text=Café')).toBeVisible({ timeout: 5000 });
    });

    test('should open add prize form', async ({ page }) => {
      await page.goto('/admin');
      await page.locator('button:has-text("Agregar Producto")').click();
      await expect(page.locator('input[placeholder="Ingrese el nombre"]')).toBeVisible();
    });

    test('should add a new prize', async ({ page }) => {
      await page.goto('/admin');
      
      await page.locator('button:has-text("Agregar Producto")').click();
      
      await page.locator('input[placeholder="Ingrese el nombre"]').fill('Test Prize E2E');
      
      const quantityInput = page.locator('input[type="number"]').first();
      await quantityInput.fill('10');
      
      const probabilityInput = page.locator('input[type="number"]').nth(1);
      await probabilityInput.fill('25');
      
      const submitButton = page.locator('button:has-text("Agregar Producto")').last();
      await submitButton.click();
      
      await expect(page.locator('text=Test Prize E2E')).toBeVisible({ timeout: 5000 });
    });

    test('should search for prizes', async ({ page }) => {
      await page.goto('/admin');
      
      await page.locator('input[placeholder="Buscar productos..."]').fill('Café');
      
      await expect(page.locator('text=Café')).toBeVisible();
      await expect(page.locator('text=Gaseosa')).not.toBeVisible();
    });

    test('should show statistics', async ({ page }) => {
      await page.goto('/admin');
      await page.locator('button:has-text("Estadísticas")').click();
      await expect(page.locator('text=Productos:')).toBeVisible();
    });

    test('should show delete confirmation', async ({ page }) => {
      await page.goto('/admin');
      
      const deleteButton = page.locator('button[title="Eliminar producto"]').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        await expect(page.locator('text=Confirmar eliminación')).toBeVisible();
      }
    });

    test('should show spin history section', async ({ page }) => {
      await page.goto('/admin');
      await expect(page.locator('text=Historial de Giros')).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between pages', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('Gira la Rueda de la Fortuna');
      
      await page.goto('/admin');
      await expect(page.locator('h1')).toContainText('Panel de Administración');
    });
  });

  test.describe('API Integration', () => {
    test('should fetch data from API', async ({ page }) => {
      const response = await page.request.get('/api/data');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('prizes');
      expect(data).toHaveProperty('wheelUnlocked');
      expect(data).toHaveProperty('spinRequests');
    });

    test('should get wheel status', async ({ page }) => {
      const response = await page.request.get('/api/wheel-status');
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(data).toHaveProperty('unlocked');
      expect(data).toHaveProperty('timestamp');
    });

    test('should lock and unlock wheel via API', async ({ page }) => {
      await page.request.post('/api/unlock-wheel');
      
      let response = await page.request.get('/api/data');
      let data = await response.json();
      expect(data.wheelUnlocked).toBe(true);
      
      await page.request.post('/api/lock-wheel');
      
      response = await page.request.get('/api/data');
      data = await response.json();
      expect(data.wheelUnlocked).toBe(false);
    });

    test('should update prizes via API', async ({ page }) => {
      const originalResponse = await page.request.get('/api/data');
      const originalData = await originalResponse.json();
      
      const newPrizes = [{ id: 999, name: 'E2E Test', quantity: 5, probability: 10, image_url: '', active: true, wheelCount: 1 }];
      await page.request.post('/api/prizes', { data: newPrizes });
      
      const response = await page.request.get('/api/data');
      const data = await response.json();
      expect(data.prizes[0].name).toBe('E2E Test');
      
      await page.request.post('/api/prizes', { data: originalData.prizes });
    });
  });
});
