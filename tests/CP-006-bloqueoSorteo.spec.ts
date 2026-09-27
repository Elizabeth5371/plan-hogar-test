import { test, expect } from '@playwright/test';

/**
 * CP-006: Bloqueo de ejecución de sorteo si ningún participante tiene la cuota
 * del mes pagada.
 *
 * Precondición usada en este test: Sorteo ID 5 (Círculo 1, Ronda 1, fecha 30/8/2026,
 * estado "Programado"), verificado manualmente: ningún participante tiene la cuota
 * de agosto 2026 pagada.
 *
 * Nota: el mensaje de error real generado por el controller usa el mes/año del
 * sorteo en minúsculas ("agosto 2026"), coincidiendo con lo documentado en CP-006.
 */

test.describe('CP-006: Bloqueo de sorteo sin cuotas pagadas', () => {
  test('no permite ejecutar el sorteo y no asigna ganador si nadie pagó la cuota del mes', async ({ page }) => {
    const idSorteo = 5;

    // --- Login ---
    await page.goto('https://localhost:7250/');
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);

    // --- Verificar estado inicial: el sorteo debe estar "Programado" ---
    await page.goto('https://localhost:7250/Sorteos/Index');
    const filaSorteo = page.locator('tr', { hasText: '30/8/2026' });
    await expect(filaSorteo).toContainText('Programado');

    // --- Intentar ejecutar el sorteo (acción GET vía link "Ejecutar") ---
    await page.goto(`https://localhost:7250/Sorteos/Ejecutar/${idSorteo}`);
    await expect(page).toHaveURL(/.*Sorteos\/Index/i);

    // --- Debe mostrar el error específico, mencionando el mes y año del sorteo ---
    await expect(
      page.getByText('No hay participantes con la cuota de agosto 2026 pagada. No se puede realizar el sorteo.')
    ).toBeVisible();

    // --- El sorteo debe seguir "Programado" (no debe pasar a "Realizado") ---
    await expect(filaSorteo).toContainText('Programado');
    await expect(filaSorteo).not.toContainText('Realizado');

    // --- No debe haberse registrado ningún ganador para este sorteo ---
    await page.goto(`https://localhost:7250/Sorteos/Ganador/${idSorteo}`);
    await expect(page).toHaveURL(/.*Sorteos\/Index/i);
    await expect(page.getByText('Este sorteo aún no tiene ganador.')).toBeVisible();
  });
});