import { test, expect, Page } from '@playwright/test';
 
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
 
const BASE_URL = 'https://localhost:7250';
const PROVINCIA = 'Catamarca'; // ajustar a tus datos reales
const LOCALIDAD = 'San Fernando del Valle de Catamarca'; // ajustar a tus datos reales
 
// Completa los campos del formulario "Nuevo Cliente"
async function completarFormularioCliente(
  page: Page,
  datos: { apellido: string; nombre: string; dni: string; email: string }
) {
  await page.locator('#Apellido').fill(datos.apellido);
  await page.locator('#Nombre').fill(datos.nombre);
  await page.locator('#Dni').fill(datos.dni);
  await page.locator('#Telefono').fill('3834123456');
  await page.locator('#Email').fill(datos.email);
  await page.locator('#Calle').fill('Av. Siempre Viva');
  await page.locator('#Numero').fill('742');
 
  await page.locator('#ddlProvincia').selectOption({ label: PROVINCIA });
  // selectOption espera a que la localidad exista en el combo (se carga por AJAX),
  // por eso no hace falta waitForResponse.
  await page.locator('#ddlLocalidad').selectOption({ label: LOCALIDAD });
 
  await page.locator('#ConsentimientoDatos').check();
}
 
test.describe('CP-007: Bloqueo de DNI duplicado en Alta de Cliente', () => {
  test('no permite registrar un segundo cliente con un DNI ya existente', async ({ page }) => {
    // DNI de 8 dígitos, único por ejecución
    const timestamp = Date.now().toString();
    const dniCompartido = `30${timestamp.slice(-6)}`;
    // Sufijo para apellidos y emails únicos (evita choques si se repite la ejecución)
    const sufijo = `${timestamp.slice(-6)}${test.info().parallelIndex}`;
 
    // --- Login ---
    await page.goto(`${BASE_URL}/`);
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);
 
    // --- Paso 1: crear el Cliente A con el DNI compartido ---
    await page.goto(`${BASE_URL}/Clientes/Nuevo`);
    await completarFormularioCliente(page, {
      apellido: `DniDupA${sufijo}`,
      nombre: 'Cliente Original',
      dni: dniCompartido,
      email: `cliente.a.${sufijo}@example.com`,
    });
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
    await expect(page).toHaveURL(/.*Clientes\/Index/i);
 
    // --- Paso 2: intentar crear el Cliente B con el MISMO DNI ---
    await page.goto(`${BASE_URL}/Clientes/Nuevo`);
    await completarFormularioCliente(page, {
      apellido: `DniDupB${sufijo}`,
      nombre: 'Cliente Duplicado',
      dni: dniCompartido,
      email: `cliente.b.${sufijo}@example.com`,
    });
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
 
    // No debe navegar fuera del formulario (ModelState inválido → se re-renderiza la vista)
    await expect(page).toHaveURL(/.*Clientes\/Nuevo/i);
    await expect(page.locator('span[data-valmsg-for="Dni"]')).toContainText(
      'Ya existe un cliente registrado con ese DNI.'
    );
 
    // --- Verificación final: solo debe existir UNA fila con ese DNI en el listado ---
    // Se filtra por DNI para no depender de la paginación del listado.
    await page.goto(`${BASE_URL}/Clientes/Index?busqueda=${dniCompartido}`);
    const filasConDni = page.locator('tr', { hasText: dniCompartido });
    await expect(filasConDni).toHaveCount(1);
    await expect(filasConDni).toContainText('Cliente Original');
    await expect(filasConDni).not.toContainText('Cliente Duplicado');
  });
});