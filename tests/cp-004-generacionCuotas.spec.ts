import { test, expect } from '@playwright/test';

/**
 * CP-004: Generación automática de plan de 18 cuotas en nueva adhesión.
 *
 * Precondiciones usadas en este test:
 * - Círculo 1 ("Combo Infantil"), que ya tiene un Valor de combo cargado.
 * - Plan de financiación "Plan 18 cuotas" ya existente en el sistema.
 *
 * Flujo: Circulos/Detalles/1 → "Nueva Adhesión" → Adhesiones/Crear → se genera
 * la adhesión y, automáticamente en el mismo POST del controller, las 18 cuotas.
 * Verificación final en Cuotas/Index (vía el botón "Cuotas" del participante).
 */

test.describe('CP-004: Generación automática de 18 cuotas', () => {
  test('genera exactamente 18 cuotas correlativas con monto igual al elegir Plan 18 cuotas', async ({ page }) => {
    const sufijo = `${Date.now().toString().slice(-6)}${test.info().parallelIndex}`;
    const dniUnico = `30${sufijo}`;
    const apellidoUnico = `Cuotas18Test${sufijo}`;
    const nombreUnico = 'Cliente Adhesion';

    // --- Login ---
    await page.goto('https://localhost:7250/');
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);

    // --- Crear un cliente nuevo para esta adhesión (así lo identificamos sin ambigüedad) ---
    await page.goto('https://localhost:7250/Clientes/Nuevo');
    await page.locator('#Apellido').fill(apellidoUnico);
    await page.locator('#Nombre').fill(nombreUnico);
    await page.locator('#Dni').fill(dniUnico);
    await page.locator('#Telefono').fill('3834123456');
    await page.locator('#Email').fill('cliente.adhesion@example.com');
    await page.locator('#Calle').fill('Av. Siempre Viva');
    await page.locator('#Numero').fill('742');
    await page.locator('#ddlProvincia').selectOption({ label: 'Catamarca' }); // ⚠️ ajustar a tus datos reales
    await page.waitForResponse(res => res.url().includes('/Clientes/GetLocalidades') && res.status() === 200);
    await page.locator('#ddlLocalidad').selectOption({ label: 'San Fernando del Valle de Catamarca' }); // ⚠️ ajustar
    await page.locator('#ConsentimientoDatos').check();
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
    await expect(page).toHaveURL(/.*Clientes\/Index/i);

    // --- Ir al Círculo 1 y crear la adhesión ---
    await page.goto('https://localhost:7250/Circulos/Detalles/1');
    await page.getByRole('link', { name: 'Nueva Adhesión' }).click();
    await expect(page).toHaveURL(/.*Adhesiones\/Crear/i);

    // El combo de Cliente muestra solo el Apellido (SelectList "IdCliente","Apellido")
    await page.locator('#IdCliente').selectOption({ label: apellidoUnico });
    await page.locator('#IdPlan').selectOption({ label: 'Plan 18 cuotas' });
    await page.locator('#IdEstadoAdhesion').selectOption({ label: 'Activa' }); // ⚠️ ajustar si el texto real difiere
    await page.getByRole('button', { name: 'Guardar Adhesión' }).click();

    // Debe volver al detalle del Círculo
    await expect(page).toHaveURL(/.*Circulos\/Detalles\/1/i);

    // --- Ubicar al participante recién agregado y entrar a sus Cuotas ---
    // El nombre del cliente aparece tanto en la tabla "Participantes" como en la de
    // "Adhesiones" más abajo; restringimos la búsqueda a la primera tabla (Participantes),
    // que es la que tiene el botón "Cuotas".
    const tablaParticipantes = page.locator('table').first();
    const filaParticipante = tablaParticipantes.locator('tr', { hasText: `${nombreUnico} ${apellidoUnico}` });
    await expect(filaParticipante).toBeVisible();
    await filaParticipante.getByRole('link', { name: 'Cuotas' }).click();
    await expect(page).toHaveURL(/.*Cuotas\/Index/i);

    // --- Verificaciones del plan de pagos ---
    // 1. El resumen debe indicar 18 cuotas en total
    await expect(page.getByText('Total: 18')).toBeVisible();

    // 2. La tabla debe tener exactamente 18 filas
    const filasCuota = page.locator('table tbody tr');
    await expect(filasCuota).toHaveCount(18);

    // 3. Numeración correlativa de 1 a 18
    for (let i = 0; i < 18; i++) {
      await expect(filasCuota.nth(i).locator('td').first()).toHaveText(String(i + 1));
    }

    // 4. Todas las cuotas deben tener el mismo monto (división exacta del valor del combo)
    const montosPorFila = await Promise.all(
      Array.from({ length: 18 }, (_, i) => filasCuota.nth(i).locator('td').nth(1).textContent())
    );
    const montoUnico = new Set(montosPorFila).size;
    expect(montoUnico).toBe(1); // todas las cuotas deben mostrar el mismo monto
  });
});