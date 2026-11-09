# Configurar la nube y el asistente

1. Crea o selecciona un proyecto Supabase. Aplica `supabase/migrations/202611100001_nexus.sql` en una base de desarrollo primero. Puedes ejecutar la migración en el editor SQL del proyecto.
2. Configura el correo de Supabase Auth y añade las URL exactas permitidas para redirección. En local usa `http://localhost:3000/auth/callback`. Añade la URL HTTPS de producción seguida de `/auth/callback`. Usa un SMTP configurado para los correos de acceso antes de admitir usuarios externos.
3. Copia `.env.example` a `.env.local` para pruebas locales o define las variables en el panel del alojamiento.

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable de Supabase. |
| `MISTRAL_API_KEY` | Clave de Mistral, solo en secretos del servidor. |
| `MISTRAL_CHAT_MODEL` | Modelo de Chat Completions con JSON mode. Por defecto, `mistral-small-latest`. |
| `NEXUS_SITE_URL` | Origen canónico del despliegue. Usa `http://localhost:3000` en local o el origen HTTPS en producción. |

4. Arranca o vuelve a compilar la app con las variables públicas ya definidas. Usa un alojamiento con runtime Node para Next.js, como Vercel o un servidor Node compatible. GitHub aloja el código. La API requiere un servidor.
5. En **Ajustes**, prueba iniciar sesión con un enlace de correo abierto en el mismo navegador, guardar una copia, restaurarla y borrarla. Verifica el aislamiento con dos cuentas. Repite con una biblioteca recién creada.
6. En **Asistente**, crea una nota de prueba con un dato distintivo, autorízala y pregunta por ese dato. Abre la referencia. Prueba también una pregunta sin respaldo y un documento que contenga instrucciones maliciosas. Confirma el consumo en el panel de Mistral.

Antes de abrir registros públicos, revisa la política de retención de Mistral, configura las protecciones de Supabase Auth y valida las cuotas con datos de prueba. Durante pruebas privadas, puedes limitar altas e invitar las cuentas de verificación desde Supabase.
