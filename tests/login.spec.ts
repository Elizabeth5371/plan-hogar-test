import { test, expect } from '@playwright/test';

test('login exitoso', async ({ page }) => {
  // 1. Navegar al sistema
  await page.goto('https://localhost:7250/');

  // 2. Completar credenciales y presionar el botón
  await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
  await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();

  // 3. Aserción de validación (Asegura que el test pase realmente)
  await expect(page).toHaveURL(/.*dashboard/i);
});