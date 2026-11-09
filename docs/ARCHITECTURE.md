# Arquitectura de NEXUS

## Núcleo

Next.js App Router mantiene interfaz y API de servidor en un único proyecto. TypeScript y Zod definen el formato versionado de biblioteca. CSS contiene los tokens y transiciones. El editor y Cytoscape se cargan al abrir sus vistas. El mapa está acotado a 90 nodos y 240 conexiones por vista. La búsqueda del mapa y la exploración de vecinos acotan el conjunto antes de dibujar. El lienzo utiliza COSE para grafos relacionados y una cuadrícula para nodos aislados. También hay un diseño circular.

Cada entrada y relación tiene un UUID. Las relaciones contienen predicado, dirección, origen y estado. Una relación simétrica se deduplica en ambos sentidos. Quitar una entrada elimina sus relaciones en la misma operación. Una transacción IndexedDB compara la revisión antes de escribir. Una edición abierta detecta si cambió la versión del elemento desde que se abrió. El formato de exportación permite migrar la estructura en futuras versiones.

El estado local es por navegador y origen. Una sesión de Supabase autoriza las funciones remotas. En un navegador compartido, los datos locales siguen accesibles a quienes puedan abrir ese perfil. Las copias en nube son instantáneas JSON con RLS. El servidor compara la revisión al actualizar o borrar. Se conserva la revisión al eliminar una copia para impedir que una petición antigua reemplace silenciosamente una posterior. Las copias son manuales y requieren confirmación para reemplazar contenido existente.

## Recuperación y costes

El asistente requiere una cuenta autenticada y consentimiento por consulta. Usa hasta seis elementos seleccionados de la biblioteca local, con un máximo de 6.000 caracteres por elemento. Segmenta por proximidad a espacios con solapamiento. Usa `mistral-embed` para pregunta y fragmentos nuevos. La caché de Supabase usa un hash SHA-256 del fragmento y modelo, separado por cuenta y almacenado como `vector(1024)`. El asistente fusiona por rango la coincidencia textual y la similitud coseno en memoria sobre el conjunto autorizado. En esta escala no hace falta un índice HNSW global ni exponer el resto de la biblioteca a la búsqueda.

Envía un máximo de seis fragmentos a Chat Completions. El modelo de conversación es configurable y su salida JSON se valida antes de servirla. Los identificadores inválidos se rechazan. Cada bloque se etiqueta como fuente, inferencia, conocimiento general o evidencia insuficiente. Validar el identificador no demuestra que cada afirmación esté respaldada. La interfaz muestra el fragmento exacto para que el usuario pueda contrastarlo. Los documentos se tratan como datos no fiables, el modelo no tiene herramientas y las respuestas se muestran como texto.

La cuota atómica limita a ocho consultas por cuenta y 100 por despliegue al día UTC. Cada consulta puede consumir una llamada a embeddings y una de chat, con un máximo de 1.100 tokens de salida. Los intentos fallidos consumen cuota. Estima gasto multiplicando tokens de entrada, salida y embeddings por las tarifas del modelo en la cuenta. La caché reduce los tokens de embeddings cuando se repiten fuentes. Su máximo es 1.200 vectores por cuenta. Si se llena, la búsqueda sigue utilizando los vectores generados en la consulta y se puede vaciar la caché desde Ajustes.

## Privacidad

La clave de Mistral existe en el servidor. Los registros de aplicación no incluyen el contenido de preguntas, fuentes ni errores crudos del proveedor. Se comprueba origen en operaciones de escritura, se valida el cuerpo con límites de bytes y se consultan los datos de usuario con su sesión. Los usuarios pueden borrar su biblioteca local, la copia en Supabase y la caché de IA. El proyecto usa almacenamiento convencional e intercambio de contenido en servidor. No implementa cifrado de extremo a extremo.

Mistral recibe el texto de la pregunta y los fragmentos autorizados que necesita cada endpoint. Los vectores de Supabase son datos derivados del contenido y se protegen por cuenta. La retención y el uso del contenido en Mistral dependen del plan, la organización y el endpoint. Verifica la cobertura y activación de Zero Data Retention en la cuenta antes de tratar documentos confidenciales.

## Presupuestos y hoja de ruta

| Presupuesto inicial | Cómo medirlo |
| --- | --- |
| LCP ≤ 2,5 s e INP ≤ 200 ms, p75 | Medir en producción sobre móvil y red reales. |
| ≤ 90 nodos y 240 aristas por vista | El contador y los filtros del grafo muestran el recorte. |
| ≤ 300 ms para actualizar el grafo con 90 nodos en móvil reciente | Medir desde el cambio de filtro hasta primer pintado estable. |
| ≤ 100 ms para encontrar resultados en una biblioteca de 2.000 entradas de tamaño ordinario | Perfilar la búsqueda con un corpus representativo, además de textos grandes. |
| Copia en nube ≤ 3 MB por petición | El límite se aplica mientras se lee el cuerpo. |

Los tiempos son metas, no mediciones de producción. Primero se comprueban autenticación, copias y Mistral con cuentas reales. Después se aborda la sincronización incremental con entidades normalizadas en PostgreSQL y conflictos por elemento. La importación binaria y OCR necesitan un flujo separado con almacenamiento privado, control de tamaño y consentimiento específico. La búsqueda semántica de biblioteca completa necesita indexación optativa, aislamiento de consultas y validación de relevancia. En accesibilidad queda pendiente una revisión manual en VoiceOver y Safari físico.

## Referencias

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase búsqueda híbrida](https://supabase.com/docs/guides/ai/hybrid-search)
- [Mistral Embeddings](https://docs.mistral.ai/api/endpoint/embeddings)
- [Mistral JSON Mode](https://docs.mistral.ai/inference/conversations/structured-output/json_mode)
- [Mistral Zero Data Retention](https://docs.mistral.ai/admin/monitor-comply/zero-data-retention)
- [Cytoscape.js](https://js.cytoscape.org/)
