# NEXUS

Un estudio personal para capturar, conectar y consultar conocimiento. La biblioteca funciona desde el primer arranque en el navegador. Supabase y Mistral se habilitan al configurar el servidor.

## Empezar

Requiere Node.js 22 o posterior.

```sh
npm ci
npm run dev
```

Abre [localhost:3000](http://localhost:3000). Desde **Capturar** puedes crear una nota, idea, proyecto, concepto, persona, enlace, archivo de texto o colección. Puedes añadir etiquetas y crear una relación al guardar. La biblioteca busca por título, contenido y etiquetas, incluso sin tildes. Pulsa `⌘ K` o `Ctrl K` para abrir la búsqueda.

El editor guarda explícitamente, conserva cinco versiones de título y texto y permite previsualizar Markdown. El grafo muestra relaciones aceptadas y abre el original. Desde **Ajustes** puedes descargar o restaurar una copia JSON, cambiar de idioma o tema y reducir la transparencia.

## Estado

| Área | Implementación |
| --- | --- |
| Biblioteca | IndexedDB por origen y perfil de navegador. Importación de texto UTF-8. |
| Organización | Ocho tipos de elementos, etiquetas, destacados y relaciones dirigidas. |
| Grafo | Canvas con Cytoscape, dos distribuciones, filtros, zoom, exploración de vecinos y alternativa en lista. |
| Relaciones sugeridas | Coincidencias de etiquetas que se pueden aceptar o descartar. El grafo distingue su origen. |
| Nube | Inicio de sesión por correo y copia privada manual. Requiere configurar Supabase. |
| Asistente | Selección explícita de fuentes, recuperación híbrida y referencias navegables. Requiere configurar Supabase y Mistral. |
| Instalación web | Manifiesto e iconos. La reapertura sin conexión requiere un service worker futuro. |

Consulta [puesta en marcha de los servicios](docs/DEPLOYMENT.md), [arquitectura, límites y próximos hitos](docs/ARCHITECTURE.md) y [diseño](docs/DESIGN.md).

## Verificación

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

Las pruebas de navegador ejecutan el recorrido de captura, relación, búsqueda y reapertura, validan importación y preferencias, y revisan la portada con axe. WebKit con un perfil de iPhone complementa la prueba manual en Safari de un dispositivo real.
