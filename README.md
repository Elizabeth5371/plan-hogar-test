# Plan Hogar — Tests con Playwright

Proyecto de Especialización en Herramientas de Testing — Sprint 1
**Grupo 2:** Elizabeth Mustafá · Florencia Guanca · María José Pereira

## Sistema bajo prueba
Plan Hogar (ASP.NET Core MVC + MySQL) — aplicación de gestión de ventas y círculos
de ahorro de Empresa Avalos. Las pruebas corren exclusivamente contra el entorno
de desarrollo local (`localhost:7250`), sobre código propio del equipo.

## Herramienta
[Playwright](https://playwright.dev/) — automatización de tests end-to-end
multi-navegador (Chromium, Firefox, WebKit).

## Requisitos previos
- Node.js 18 o superior
- Plan Hogar corriendo localmente (`dotnet run` desde el proyecto principal)

## Instalación
```bash
git clone <url-de-este-repositorio>
cd <nombre-de-la-carpeta>
npm install
npx playwright install
```

## Cómo correr los tests
1. Levantar Plan Hogar en otra terminal (`dotnet run`) y confirmar el puerto HTTPS
   que muestra la consola (por defecto se usa `https://localhost:7250`).
2. Ejecutar:
```bash
npx playwright test
```
3. Ver el reporte HTML interactivo:
```bash
npx playwright show-report
```

## Estructura del proyecto
```
tests/
  example.spec.ts    # tests de verificación de instalación (playwright.dev)
  login.spec.ts       # test funcional: login de Plan Hogar
playwright.config.ts  # configuración (navegadores, evidencias, reportes)
.gitignore
README.md
```

## Primer artefacto funcional (Sprint 1)
`login.spec.ts` automatiza el inicio de sesión en Plan Hogar y valida que:
- La página de login cargue correctamente.
- Los campos "Usuario" y "Contraseña" sean accesibles y se puedan completar.
- El botón "Iniciar Sesión" funcione.
- El sistema redirija correctamente tras un login válido.

Resultado: test pasando en Chromium, Firefox y WebKit.

## Estado actual (Sprint 1)
- [x] Instalación y configuración de Playwright
- [x] Test funcional: login de Plan Hogar
- [ ] Tests adicionales (alta de cliente, alta de combo) — próximo sprint

## Integrantes y aportes
| Integrante | Aporte |
|---|---|
| Elizabeth Mustafá | Configuración del proyecto, `playwright.config.ts`, test de login |
| Florencia Guanca | Instalación documentada, evidencia (captura/video) |
| María José Pereira | Instalación documentada, evidencia (captura/video) |
