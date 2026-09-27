import { test, expect } from '@playwright/test';

/**
 * CP-002: Verificar anonimización de datos personales en baja de cliente (derecho al olvido)
 *
 * Nota sobre discrepancias con el documento de diseño original:
 * - El sistema reemplaza los campos por "DATO ELIMINADO" (no por la palabra "Anonimizado").
 *   El DNI queda como "ANON-{id}".
 * - No existe una vista de "ficha del cliente" individual; se usa /Clientes/Editar/{id}
 *   como comprobación porque esa acción no filtra clientes anonimizados.
 * - Index sí filtra los clientes anonimizados (Where(c => !c.Anonimizado)), por lo que
 *   tras la baja el cliente deja de listarse completamente.
 * - No hay registro de auditoría (fecha/usuario ejecutor) implementado todavía.
 */

test.describe('CP-002: Anonimización de datos en baja de cliente', () => {
  test('anonimiza los datos del cliente y lo oculta del listado', async ({ page }) => {
    // Se incluye el índice de worker para que Chromium/Firefox/WebKit, al correr en
    // paralelo, nunca generen el mismo DNI ni el mismo apellido al mismo tiempo.
    const sufijo = `${Date.now().toString().slice(-6)}${test.info().parallelIndex}`;
    const dniUnico = `30${sufijo}`;
    const apellidoOriginal = `FernandezTest${test.info().parallelIndex}`;
    const nombreOriginal = 'Cliente Baja';

    // --- Login ---
    await page.goto('https://localhost:7250/');
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);

    // --- Crear un cliente conocido para después darlo de baja ---
    await page.goto('https://localhost:7250/Clientes/Nuevo');
    await page.locator('#Apellido').fill(apellidoOriginal);
    await page.locator('#Nombre').fill(nombreOriginal);
    await page.locator('#Dni').fill(dniUnico);
    await page.locator('#Telefono').fill('3834123456');
    await page.locator('#Email').fill('cliente.baja@example.com');
    await page.locator('#Calle').fill('Av. Siempre Viva');
    await page.locator('#Numero').fill('742');
    await page.locator('#ddlProvincia').selectOption({ label: 'Catamarca' }); // ⚠️ ajustar a tus datos reales
    await page.waitForResponse(res => res.url().includes('/Clientes/GetLocalidades') && res.status() === 200);
    await page.locator('#ddlLocalidad').selectOption({ label: 'San Fernando del Valle de Catamarca' }); // ⚠️ ajustar
    await page.locator('#ConsentimientoDatos').check();
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
    await expect(page).toHaveURL(/.*Clientes\/Index/i);

    // --- Ubicar la fila del cliente recién creado y extraer su id desde el link "Eliminar" ---
    const fila = page.locator('tr', { hasText: dniUnico });
    await expect(fila).toBeVisible();
    const linkEliminar = fila.getByRole('link', { name: 'Eliminar' });
    const href = await linkEliminar.getAttribute('href'); // ej: /Clientes/Eliminar/57
    const idCliente = href!.split('/').pop();

    // --- Ir a la pantalla de confirmación y verificar que muestra los datos correctos ---
    await linkEliminar.click();
    await expect(page).toHaveURL(new RegExp(`.*Clientes/Eliminar/${idCliente}$`));
    await expect(page.locator('dd').nth(0)).toHaveText(apellidoOriginal);
    await expect(page.locator('dd').nth(1)).toHaveText(nombreOriginal);
    await expect(page.locator('dd').nth(2)).toHaveText(dniUnico);

    // --- Confirmar la baja ---
    // Esperamos explícitamente la respuesta del POST antes de seguir: en navegadores
    // más lentos (WebKit) el chequeo de la tabla podía correr antes de que el servidor
    // terminara de anonimizar el registro, dando un falso fallo (condición de carrera).
    await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/Clientes/Eliminar') && res.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Sí, eliminar' }).click(),
    ]);
    await expect(page).toHaveURL(/.*Clientes\/Index/i);

    // --- El cliente ya no debe aparecer en el listado (Index filtra Anonimizado = true) ---
    await expect(page.locator('table')).not.toContainText(dniUnico);
    await expect(page.locator('table')).not.toContainText(apellidoOriginal);

    // --- Verificar que los datos se sobreescribieron realmente en la base ---
    // (Editar no filtra por Anonimizado, así que sirve como comprobación indirecta)
    await page.goto(`https://localhost:7250/Clientes/Editar/${idCliente}`);
    await expect(page.locator('#Apellido')).toHaveValue('DATO ELIMINADO');
    await expect(page.locator('#Nombre')).toHaveValue('DATO ELIMINADO');
    await expect(page.locator('#Dni')).toHaveValue(`ANON-${idCliente}`);
  });
});