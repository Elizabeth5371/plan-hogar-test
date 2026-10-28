# Instalación y ejecución - Florencia Guanca

Fecha: 22/10/2026
Equipo: Windows, Node v24.21.0, npm 11.19.0, Git 2.56, .NET SDK 9 (runtime 8), MySQL 8.0.41

## Pasos realizados
1. Configuré Git con mi nombre y email de GitHub (Florencia1305).
2. Cloné el repositorio plan-hogar-test y creé mi rama florencia/instalacion-evidencias.
3. Ejecuté npm install y npx playwright install.
4. Cloné ProyectoGestorVentaPH (el sistema bajo prueba).
5. Creé la base combos_empresaavalos en MySQL Workbench.
6. Instalé dotnet-ef y ejecuté dotnet ef database update.
7. Importé el dump Dump20261005.sql para cargar usuarios y datos.
8. Levanté Plan Hogar con dotnet run --launch-profile https (puerto 7250).
9. Ejecuté npx playwright test --project=chromium: 8 tests pasaron.

## Problemas encontrados y cómo los resolví
- dotnet ef database update falló: faltaba restaurar paquetes. Ejecuté dotnet restore.
- Access denied for user root: la contraseña de mi MySQL no era la del proyecto. La cambié solo en mi copia local de appsettings.json, sin subirla a GitHub.
- Error de tipeo en un comando (llave de más). Lo escribí de nuevo sin el carácter extra.
- La base quedó vacía tras las migraciones: importé el dump con MySQL Workbench.
- Los tests fallaron cuando Plan Hogar estaba apagado (ERR_CONNECTION_REFUSED). Entendí que Plan Hogar tiene que estar encendido en una ventana aparte antes de correr los tests.
- El reporte no abría porque la ventana que lo servía se cerraba. Lo abrí con npx playwright show-report --port 9400.

## Resultado
8 tests pasados en Chromium (34.4 s) el 25/10/2026. Reporte HTML revisado.