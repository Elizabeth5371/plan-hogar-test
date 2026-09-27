import { test, expect } from '@playwright/test';
 
/**
 * CP-001: Validar obligatoriedad de consentimiento de datos en Alta de Cliente (Ley 25.326)
 *
 * Precondición: usuario logueado como Vendedor o Administrador, en el formulario Nuevo Cliente.
 * Pasos: completar datos personales, dejar el checkbox de consentimiento sin marcar, clic en Guardar.
 * Resultado esperado: el sistema no guarda el registro, resalta el checkbox y muestra el mensaje
 * "Debe aceptar el consentimiento de tratamiento de datos personales para continuar".
 * Criterio de aceptación: cero registros insertados en la base de datos sin marca de consentimiento.
 */
 
test.describe('CP-001: Consentimiento obligatorio en Alta de Cliente', () => {
  test.beforeEach(async ({ page }) => {
    // Login (reutiliza el flujo del Sprint 1)
    await page.goto('https://localhost:7250/');
    await page.getByRole('textbox', { name: 'Usuario' }).fill('admin@avalos.com');
    await page.getByRole('textbox', { name: 'Contraseña' }).fill('admin123');
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
    await expect(page).toHaveURL(/.*dashboard/i);
 
    // Ir directo al formulario Nuevo Cliente
    await page.goto('https://localhost:7250/Clientes/Nuevo');
  });
 
  test('no permite guardar el cliente si no se marca el consentimiento', async ({ page }) => {
    // DNI único por corrida, para no chocar con la validación de DNI duplicado
    const dniUnico = `30${Date.now().toString().slice(-6)}`;
 
    // 1. Completar todos los datos personales (selectores por id: los <label> no tienen "for")
    await page.locator('#Apellido').fill('Gomez');
    await page.locator('#Nombre').fill('Cliente Prueba');
    await page.locator('#Dni').fill(dniUnico);
    await page.locator('#Telefono').fill('3834123456');
    await page.locator('#Email').fill('cliente.prueba@example.com');
    await page.locator('#Calle').fill('Av. Siempre Viva');
    await page.locator('#Numero').fill('742');
 
    // ⚠️ Ajustar estas opciones a los valores reales seedeados en tu BD
    await page.locator('#ddlProvincia').selectOption({ label: 'Catamarca' });
    // Esperamos a que el fetch de GetLocalidades complete y cargue el combo
    await page.waitForResponse(res => res.url().includes('/Clientes/GetLocalidades') && res.status() === 200);
    await page.locator('#ddlLocalidad').selectOption({ label: 'San Fernando del Valle de Catamarca' });
 
    // 2. Dejar el checkbox de consentimiento SIN marcar
    const checkbox = page.locator('#ConsentimientoDatos');
    await expect(checkbox).not.toBeChecked();
 
    // 3. Intentar guardar
    await page.locator('button[type="submit"]', { hasText: 'Guardar' }).click();
 
    // Resultado esperado: ModelState inválido → la vista se vuelve a renderizar en la misma URL
    await expect(page).toHaveURL(/.*Clientes\/Nuevo/i);
 
    // Mensaje real definido en ClientesController (no coincide textualmente con el redactado
    // originalmente en CP-001 — ver nota en la bitácora sobre esta diferencia)
    await expect(page.locator('span[data-valmsg-for="ConsentimientoDatos"]')).toHaveText(
      'Debés aceptar el tratamiento de tus datos personales (Ley 25.326) para continuar.'
    );
    await expect(checkbox).not.toBeChecked();
  });
});