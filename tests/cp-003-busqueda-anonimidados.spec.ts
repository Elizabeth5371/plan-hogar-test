import { test, expect } from '@playwright/test';

/**
 * CP-003: Verificar que la búsqueda de clientes ignora o no recupera datos personales
 * de clientes anonimizados.
 *
 * Nota: la funcionalidad de búsqueda (input "busqueda" + filtro por DNI/Apellido/Nombre
 * en ClientesController.Index) se implementó como parte de este sprint, ya que no
 * existía en el sistema original.
 */

test.describe('CP-003: Búsqueda no recupera datos de clientes anonimizados', () => {
  test('no devuelve resultados al buscar el DNI o apellido de un cliente ya anonimizado', async ({ page }) => {
    const sufijo = `${Date.now().toString().slice(-6)}${test.info().parallelIndex}`;
    const dniUnico = `30${sufijo}`;
    const apellidoOriginal = `BuscarTest${test.info().parallelIndex}`;
    const nombreOriginal = 'Cliente Busqueda';

    // --- Login ---
    await page.goto('https://localhost:7250/');
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);

    // --- Crear un cliente conocido ---
    await page.goto('https://localhost:7250/Clientes/Nuevo');
    await page.locator('#Apellido').fill(apellidoOriginal);
    await page.locator('#Nombre').fill(nombreOriginal);
    await page.locator('#Dni').fill(dniUnico);
    await page.locator('#Telefono').fill('3834123456');
    await page.locator('#Email').fill('cliente.busqueda@example.com');
    await page.locator('#Calle').fill('Av. Siempre Viva');
    await page.locator('#Numero').fill('742');
    await page.locator('#ddlProvincia').selectOption({ label: 'Catamarca' }); // ⚠️ ajustar a tus datos reales
    await page.waitForResponse(res => res.url().includes('/Clientes/GetLocalidades') && res.status() === 200);
    await page.locator('#ddlLocalidad').selectOption({ label: 'San Fernando del Valle de Catamarca' }); // ⚠️ ajustar
    await page.locator('#ConsentimientoDatos').check();
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
    await expect(page).toHaveURL(/.*Clientes\/Index/i);

    // --- Verificación previa: buscando el cliente ANTES de anonimizarlo, sí aparece ---
    await page.goto(`https://localhost:7250/Clientes/Index?busqueda=${dniUnico}`);
    await expect(page.locator('table')).toContainText(apellidoOriginal);

    // --- Anonimizar el cliente (mismo flujo que CP-002) ---
    const fila = page.locator('tr', { hasText: dniUnico });
    const linkEliminar = fila.getByRole('link', { name: 'Eliminar' });
    await linkEliminar.click();
    await expect(page).toHaveURL(/.*Clientes\/Eliminar\/\d+$/);

    await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/Clientes/Eliminar') && res.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Sí, eliminar' }).click(),
    ]);
    await expect(page).toHaveURL(/.*Clientes\/Index/i);

    // --- Buscar por DNI original: no debe encontrar nada ---
    await page.goto(`https://localhost:7250/Clientes/Index?busqueda=${dniUnico}`);
    // La tabla directamente no se renderiza cuando no hay resultados (comportamiento correcto)
    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.getByText('No se encontraron resultados para la búsqueda realizada')).toBeVisible();

    // --- Buscar por apellido original: tampoco debe encontrar nada ---
    await page.goto(`https://localhost:7250/Clientes/Index?busqueda=${apellidoOriginal}`);
    await expect(page.locator('table')).toHaveCount(0);
    await expect(page.getByText('No se encontraron resultados para la búsqueda realizada')).toBeVisible();
  });
});