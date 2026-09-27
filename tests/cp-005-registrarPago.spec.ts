import { test, expect } from '@playwright/test';

/**
 * CP-005: Registro de pago parcial/total y generación de recibo autonumerado.
 *
 * Nota: el cálculo del próximo N° de comprobante (GenerarProximoComprobante) mira
 * TODOS los pagos del sistema, no solo los de esta adhesión. Si este test corre en
 * paralelo en varios navegadores, dos workers podrían leer el mismo "próximo número"
 * antes de que el otro guarde su pago (condición de carrera, mismo patrón que el
 * N° de orden de participantes en CP-004). Si este test resulta flaky en paralelo,
 * correrlo con --workers=1 para confirmarlo y documentarlo como hallazgo.
 */

// Extrae el número entero de un comprobante con formato "REC-000123"
function numeroDeComprobante(comprobante: string): number {
  const match = comprobante.match(/REC-(\d+)/);
  if (!match) throw new Error(`Formato de comprobante inesperado: "${comprobante}"`);
  return parseInt(match[1], 10);
}

test.describe('CP-005: Registro de pago y recibo autonumerado', () => {
  test('registra el pago total de una cuota y numera el recibo correlativamente', async ({ page }) => {
    const sufijo = `${Date.now().toString().slice(-6)}${test.info().parallelIndex}`;
    const dniUnico = `30${sufijo}`;
    const apellidoUnico = `PagoTest${sufijo}`;
    const nombreUnico = 'Cliente Pago';

    // --- Login ---
    await page.goto('https://localhost:7250/');
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);

    // --- Crear cliente nuevo ---
    await page.goto('https://localhost:7250/Clientes/Nuevo');
    await page.locator('#Apellido').fill(apellidoUnico);
    await page.locator('#Nombre').fill(nombreUnico);
    await page.locator('#Dni').fill(dniUnico);
    await page.locator('#Telefono').fill('3834123456');
    await page.locator('#Email').fill('cliente.pago@example.com');
    await page.locator('#Calle').fill('Av. Siempre Viva');
    await page.locator('#Numero').fill('742');
    await page.locator('#ddlProvincia').selectOption({ label: 'Catamarca' }); // ⚠️ ajustar a tus datos reales
    await page.waitForResponse(res => res.url().includes('/Clientes/GetLocalidades') && res.status() === 200);
    await page.locator('#ddlLocalidad').selectOption({ label: 'San Fernando del Valle de Catamarca' }); // ⚠️ ajustar
    await page.locator('#ConsentimientoDatos').check();
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
    await expect(page).toHaveURL(/.*Clientes\/Index/i);

    // --- Crear una adhesión para tener cuotas generadas ---
    await page.goto('https://localhost:7250/Circulos/Detalles/1');
    await page.getByRole('link', { name: 'Nueva Adhesión' }).click();
    await page.locator('#IdCliente').selectOption({ label: apellidoUnico });
    await page.locator('#IdPlan').selectOption({ label: 'Plan 18 cuotas' });
    await page.locator('#IdEstadoAdhesion').selectOption({ label: 'Activa' }); // ⚠️ ajustar si difiere
    await page.getByRole('button', { name: 'Guardar Adhesión' }).click();
    await expect(page).toHaveURL(/.*Circulos\/Detalles\/1/i);

    const tablaParticipantes = page.locator('table').first();
    const filaParticipante = tablaParticipantes.locator('tr', { hasText: `${nombreUnico} ${apellidoUnico}` });
    await expect(filaParticipante).toBeVisible();
    await filaParticipante.getByRole('link', { name: 'Cuotas' }).click();
    await expect(page).toHaveURL(/.*Cuotas\/Index/i);

    // --- Pagar la Cuota N°1 ---
    const filasCuota = page.locator('table tbody tr');
    const cuota1 = filasCuota.nth(0);
    await cuota1.getByRole('link', { name: 'Registrar Pago' }).click();
    await expect(page).toHaveURL(/.*Cuotas\/Pagar/i);

    const comprobante1 = await page.locator('input[name="comprobante"]').inputValue();
    await page.locator('select[name="idFormaPago"]').selectOption({ index: 1 });
    // Dejamos el monto por defecto (saldo pendiente completo) → pago total
    await page.getByRole('button', { name: 'Confirmar Pago' }).click();
    await expect(page).toHaveURL(/.*Cuotas\/Index/i);

    // La Cuota N°1 debe quedar marcada como Pagada, con saldo $0,00
    await expect(filasCuota.nth(0)).toContainText('Pagada');
    await expect(filasCuota.nth(0)).toContainText('$0,00');

    // --- Pagar la Cuota N°2, para comprobar la numeración correlativa del recibo ---
    const cuota2 = filasCuota.nth(1);
    await cuota2.getByRole('link', { name: 'Registrar Pago' }).click();
    await expect(page).toHaveURL(/.*Cuotas\/Pagar/i);

    const comprobante2 = await page.locator('input[name="comprobante"]').inputValue();

    // El segundo recibo debe ser exactamente el número anterior + 1
    expect(numeroDeComprobante(comprobante2)).toBe(numeroDeComprobante(comprobante1) + 1);

    await page.locator('select[name="idFormaPago"]').selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Confirmar Pago' }).click();
    await expect(page).toHaveURL(/.*Cuotas\/Index/i);
    await expect(filasCuota.nth(1)).toContainText('Pagada');
  });
});
