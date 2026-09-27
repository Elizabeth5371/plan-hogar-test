import { test, expect } from '@playwright/test';

/**
 * CP-007: Validar que el sistema no permite registrar dos clientes con el mismo DNI.
 *
 * Precondiciones: usuario logueado como Administrador, en el formulario Nuevo Cliente.
 * Pasos:
 *   1. Crear un cliente con un DNI único (Cliente A).
 *   2. Intentar crear un segundo cliente distinto, usando el MISMO DNI (Cliente B).
 * Resultado esperado: el sistema rechaza el alta del segundo cliente, muestra el
 * mensaje "Ya existe un cliente registrado con ese DNI." y no navega fuera del
 * formulario.
 * Criterio de aceptación: solo el primer cliente (Cliente A) queda registrado con
 * ese DNI; el segundo intento no genera un registro nuevo.
 */

test.describe('CP-007: Bloqueo de DNI duplicado en Alta de Cliente', () => {
  test('no permite registrar un segundo cliente con un DNI ya existente', async ({ page }) => {
    const sufijo = `${Date.now().toString().slice(-6)}${test.info().parallelIndex}`;
    const dniCompartido = `30${sufijo}`;

    // --- Login ---
    await page.goto('https://localhost:7250/');
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);

    // --- Helper para completar los campos comunes del formulario ---
    async function completarFormularioCliente(apellido: string, nombre: string, email: string) {
      await page.locator('#Apellido').fill(apellido);
      await page.locator('#Nombre').fill(nombre);
      await page.locator('#Dni').fill(dniCompartido);
      await page.locator('#Telefono').fill('3834123456');
      await page.locator('#Email').fill(email);
      await page.locator('#Calle').fill('Av. Siempre Viva');
      await page.locator('#Numero').fill('742');
      await page.locator('#ddlProvincia').selectOption({ label: 'Catamarca' }); // ⚠️ ajustar a tus datos reales
      await page.waitForResponse(res => res.url().includes('/Clientes/GetLocalidades') && res.status() === 200);
      await page.locator('#ddlLocalidad').selectOption({ label: 'San Fernando del Valle de Catamarca' }); // ⚠️ ajustar
      await page.locator('#ConsentimientoDatos').check();
    }

    // --- Paso 1: crear el Cliente A con el DNI compartido ---
    await page.goto('https://localhost:7250/Clientes/Nuevo');
    await completarFormularioCliente(`DniDupA${sufijo}`, 'Cliente Original', 'cliente.a@example.com');
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
    await expect(page).toHaveURL(/.*Clientes\/Index/i);
    await expect(page.locator('table')).toContainText(dniCompartido);

    // --- Paso 2: intentar crear el Cliente B con el MISMO DNI ---
    await page.goto('https://localhost:7250/Clientes/Nuevo');
    await completarFormularioCliente(`DniDupB${sufijo}`, 'Cliente Duplicado', 'cliente.b@example.com');
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();

    // No debe navegar fuera del formulario (ModelState inválido → se re-renderiza la vista)
    await expect(page).toHaveURL(/.*Clientes\/Nuevo/i);
    await expect(page.locator('span[data-valmsg-for="Dni"]')).toHaveText(
      'Ya existe un cliente registrado con ese DNI.'
    );

    // --- Verificación final: solo debe existir UNA fila con ese DNI en el listado ---
    await page.goto(`https://localhost:7250/Clientes/Index?busqueda=${dniCompartido}`);
    const filasConDni = page.locator('tr', { hasText: dniCompartido });
    await expect(filasConDni).toHaveCount(1);
    await expect(filasConDni).toContainText('Cliente Original');
    await expect(filasConDni).not.toContainText('Cliente Duplicado');
  });
});