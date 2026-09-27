# Backoffice QuantumJam v1 — Plan simplificado

## Objetivo y decisiones

Implementar `/admin` para consultar inscripciones y contactos: tres contadores, tres tablas, búsqueda y CSV, con usuario y contraseña fijos validados mediante HTTP Basic Auth en una Cloud Function.

**Contexto:** hoy hay aproximadamente 60 inscriptos y se espera poco crecimiento. El objetivo es resolver esta necesidad con pocos archivos y cambios puntuales, respetando la estructura de un proyecto cuyo dueño es otra persona. Este documento reemplaza el plan anterior; no implementa ni publica la aplicación.

La revisión original corresponde al ZIP `quantumjam-webpage-develop(1).zip`, commit `8ea64da5a5211be0b59f14e8863e3cfd95529fbc`. Antes de implementar, revisar los archivos de la rama actual: puede haber cambios posteriores, especialmente en el workflow. No asumir que se necesita un rebase ni modificar la historia de Git por cuenta propia.

Decisiones para esta versión:

- Una sola función nueva: **`quantumjamAdminApi`**, con tres rutas de lectura.
- Una consulta por colección, que devuelve todos sus registros. Sin cursores, lotes ni carga progresiva.
- Descargar las tres colecciones al ingresar. Obtener cada contador a partir de la cantidad de registros recibidos: **sin endpoint de resumen ni consultas `count()` adicionales**.
- Buscar y generar CSV en el navegador usando esos datos. Actualizar únicamente al ingresar o presionar Actualizar.
- Reutilizar componentes, estilos, traducciones y herramientas existentes. No agregar dependencias para tablas, autenticación, CSV o pruebas.
- Mantener el orden del workflow actual. Agregar únicamente la función nueva a la lista explícita de deploy.
- La IA implementadora ejecutará las pruebas directamente, con las herramientas existentes y los emuladores. **No agregar test runners, scripts de tests al proyecto, jobs de CI ni documentos de pruebas.**

Los 60 inscriptos no prueban que existan exactamente 60 contactos: `emailContacts` también incluye personas que abandonaron la inscripción. Verificar el tamaño y tiempo de respuesta de las tres colecciones; si eventualmente crecen mucho, se revisará la estrategia. No preparar ahora una infraestructura para ese crecimiento hipotético.

Fuera de alcance: editar, aprobar o eliminar inscripciones; enviar emails; administrar equipos; cambiar formularios; agregar nombres a competencia; migrar datos; incorporar Firebase Authentication o autenticación tipo HackITBA.

## 1. Delimitar los cambios y proteger HackITBA

El proyecto Firebase `webpage-36e40` comparte recursos entre aplicaciones. Las bases `quantumjam` y `hackitba` están separadas, pero eso no aísla automáticamente sus despliegues de Functions.

- [ ] Revisar `AGENTS.md` y el estado actual de `firebase.json`, `functions/src/index.ts`, `functions/package.json` y el workflow de merge antes de editar.
- [ ] Reutilizar `db` de `functions/src/admin.ts`, que selecciona explícitamente la base `quantumjam`. Ese archivo inicializa Firebase; no es un backoffice existente.
- [ ] Mantener las lecturas privadas bloqueadas por las reglas actuales. No tocar `firestore.rules`, índices, esquemas, configuración de otras bases ni funciones existentes.
- [ ] Antes de publicar, listar las funciones desplegadas y comprobar nombre, región y pertenencia. `quantumjamAdminApi` debe ser nueva o pertenecer inequívocamente a este backoffice. Un despliegue dirigido también puede sobrescribir una función ajena si se reutiliza su nombre.
- [ ] No ejecutar despliegues generales de Firebase ni de todas las Functions. No usar `--force` ni aceptar propuestas de eliminación de funciones de otras aplicaciones.
- [ ] Si el despliegue anuncia modificaciones o eliminaciones ajenas a QuantumJam, detenerlo y revisar su alcance.
- [ ] No cambiar `codebase`, reorganizar funciones, corregir workflows ajenos ni aprovechar este trabajo para refactorizar el proyecto. Comunicar cualquier problema previo sin arreglarlo como parte de esta tarea.

**Resultado:** límites claros de lo que se puede modificar y publicar, sin intervenir en HackITBA.

## 2. Crear la función de lectura y Basic Auth

Crear `functions/src/backoffice.ts` y exportar `quantumjamAdminApi` desde `functions/src/index.ts`. Mantener en ese archivo la autenticación, las rutas y la selección explícita de campos; no construir una arquitectura de servicios o middleware para tres consultas.

- [ ] Usar una función HTTP `onRequest`, independiente de los `onCall` existentes, en `us-central1`.
- [ ] Definir `QUANTUMJAM_ADMIN_USERNAME` y `QUANTUMJAM_ADMIN_PASSWORD` mediante `defineSecret`, vincularlos a la función y leer sus valores al ejecutarla. No reutilizar secretos de email.
- [ ] Validar Basic Auth **en cada petición y antes de leer Firestore**, también al acceder directamente a la URL de la función.
- [ ] Validar formato, Base64 y separación por el primer `:`. Usar usuario sin `:` y credenciales ASCII; permitir `:` en la contraseña.
- [ ] Comparar ambos valores mediante hashes de longitud fija y `timingSafeEqual`, sin cortocircuitar la segunda comparación. Usar una contraseña larga y aleatoria.
- [ ] Rechazar credenciales ausentes, inválidas o malformadas con `401`, mensaje genérico y `WWW-Authenticate: Basic realm="QuantumJam Admin"`. Si falta un secreto, cerrar el acceso y devolver un error de configuración sin revelar su valor.
- [ ] Aplicar `Cache-Control: private, no-store` a todas las respuestas administrativas. No registrar contraseñas, Authorization ni listados completos.
- [ ] Aceptar únicamente lecturas `GET`: responder `405` a métodos no admitidos, `404` a rutas desconocidas y un error genérico `500` a fallos internos.
- [ ] No aceptar una colección arbitraria elegida mediante parámetros. Usar exclusivamente estas tres rutas:

| Ruta                         | Colección            | Respuesta              |
| ---------------------------- | -------------------- | ---------------------- |
| `GET /api/admin/workshops`   | `workshopSignups`    | `{ items, fetchedAt }` |
| `GET /api/admin/competition` | `competitionSignups` | `{ items, fetchedAt }` |
| `GET /api/admin/contacts`    | `emailContacts`      | `{ items, fetchedAt }` |

Cada ruta devuelve la colección completa. No introducir un límite silencioso de filas. No ordenar en Firestore por un campo opcional que pueda excluir documentos históricos; ordenar las filas recibidas en el frontend.

Seleccionar expresamente los siguientes campos, más el ID del documento; no enviar todo `doc.data()` sin filtrar:

| Tabla       | Campos                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workshops   | `email`, `name`, `career`, `level`, `reason`, `status`, `createdAt`, `lang`                                                                                                            |
| Competencia | `email`, `dni`, `age`, `university`, `major`, `gradYear`, `location`, `diet`, `github`, `linkedin`, `x`, `instagram`, `website`, `teamChoice`, `teamId`, `status`, `createdAt`, `lang` |
| Contactos   | `email`, `canonicalEmail`, `status`, `purposes`, `firstSeenAt`, `updatedAt`, `verifiedAt`                                                                                              |

Convertir timestamps a ISO UTC o `null`; conservar DNI, edad y año como strings. Tolerar campos faltantes. No consultar `emailVerifications`, devolver tokens, ejecutar escrituras ni enviar emails. Mostrar el `teamId` existente sin incorporar consultas a `teams`. No inventar nombres para competencia ni obtenerlos cruzando otras colecciones.

**Resultado:** tres lecturas pequeñas y completas, protegidas por la misma autenticación.

## 3. Conectar la API con Hosting

- [ ] Agregar un rewrite `/api/admin/**` hacia `quantumjamAdminApi`, región `us-central1`, **antes** del rewrite general `**` hacia `/index.html`.
- [ ] Conservar el Hosting site `csitba-quantumjam` y toda la configuración existente no relacionada con ese rewrite.
- [ ] Usar rutas relativas `/api/admin/...` desde el frontend. No abrir CORS a cualquier dominio ni incorporar URLs de producción dispersas en componentes.
- [ ] No crear archivos estáticos bajo `dist/api/admin`, que podrían tener prioridad sobre el rewrite.
- [ ] Probar localmente con el build y los emuladores existentes de Hosting, Functions y Firestore. Usar la base emulada `quantumjam` y credenciales ficticias en `functions/.secret.local`, ignorado por Git.
- [ ] No agregar proxy de Vite ni cambiar su configuración. Para esta funcionalidad alcanza con el emulador de Hosting.

**Resultado:** frontend y API comparten origen sin reorganizar el proyecto.

## 4. Agregar `/admin` y el formulario de acceso

Crear `src/pages/AdminPage.tsx`, registrar `/admin` en `src/routes.tsx` y concentrar las peticiones en `src/lib/adminApi.ts`. Mantener tipos y helpers cerca de su uso, siguiendo las convenciones existentes.

- [ ] Mostrar usuario, contraseña y botón de ingreso, con textos de `useTranslation()` en ES y EN.
- [ ] Comprobar el acceso consultando workshops. Reutilizar esa respuesta como datos de la primera tabla; después solicitar competencia y contactos. No crear un endpoint de login ni tokens de sesión.
- [ ] Enviar Authorization explícitamente con Basic Auth y configurar `fetch` con `credentials: 'omit'`, para no depender de credenciales automáticas del navegador. Conservar el `401` y el challenge Basic del servidor; comprobar que la contraseña incorrecta muestra el error del formulario sin otro diálogo nativo.
- [ ] Guardar credenciales y registros solo en memoria. No usar `VITE_*`, URL, cookies, localStorage o sessionStorage para persistirlos. Recargar la página requiere volver a ingresar.
- [ ] Al salir o recibir `401`, borrar credenciales, registros y contadores, cancelar solicitudes pendientes e impedir que respuestas tardías vuelvan a mostrar los datos.
- [ ] Diferenciar un error de red o de servidor de una contraseña incorrecta. No reintentar indefinidamente.
- [ ] Verificar entrada directa y recarga en `/admin`.

El HTML y el formulario son públicos; las inscripciones y contadores están protegidos en la función. Basic Auth necesita HTTPS en producción. Las credenciales ingresadas existen transitoriamente en el navegador, pero nunca deben venir predefinidas en el código o el bundle.

**Resultado:** acceso simple, comprobado por el servidor, sin un sistema nuevo de sesiones.

## 5. Mostrar los datos y permitir búsquedas

- [ ] Mostrar tres tarjetas: inscripciones a workshops, inscripciones a competencia y contactos recolectados. Cada total es la longitud de la lista recibida, antes de aplicar filtros.
- [ ] Contar todos los registros de inscripciones, incluidos `pending`, y todos los contactos, tanto `verified` como `unverified`.
- [ ] No sumar los tres totales como personas únicas. Un correo puede estar en varias colecciones y verificarlo no implica completar una inscripción.
- [ ] Mostrar tres pestañas con tablas sencillas. Para este volumen, no implementar paginación de datos, virtualización ni una biblioteca nueva de tablas.
- [ ] Mostrar columnas principales y, si la tabla resulta demasiado ancha, usar un detalle desplegable de solo lectura para campos secundarios. Todos los campos acordados deben ser consultables.
- [ ] Incluir búsqueda independiente por tabla, sobre todos sus registros, sin distinguir mayúsculas o acentos. Buscar también en los campos del detalle. Mostrar “N resultados de M registros”.
- [ ] Mostrar fechas en `America/Argentina/Buenos_Aires` y `—` para valores ausentes. Renderizar entradas como texto; si se usan enlaces, admitir solo `http:` y `https:`.
- [ ] Agregar Actualizar para releer las tres colecciones, con indicador de carga y hora de consulta. Sin polling ni listeners en tiempo real.
- [ ] Manejar cada carga como pendiente, exitosa o fallida. Una colección vacía tiene total cero; una consulta fallida muestra error, no cero. Deshabilitar su exportación hasta una carga exitosa y permitir reintentar.
- [ ] Al actualizar, no mostrar silenciosamente datos viejos como actuales. Limpiar la colección que se recarga o marcarla como desactualizada y bloquear su exportación hasta completar la consulta.
- [ ] Mantener etiquetas accesibles, navegación por teclado y scroll horizontal si hace falta. Reutilizar la estética del sitio.

Los totales coinciden con las filas descargadas de cada colección. Las tres consultas no forman una instantánea transaccional conjunta: los cambios posteriores aparecen al actualizar.

**Resultado:** vista completa, legible y suficiente para el tamaño real del evento.

## 6. Agregar CSV por tabla

Implementar un helper pequeño en `src/lib/csv.ts`, sin dependencias nuevas.

- [ ] Generar el archivo en el navegador. Sin búsqueda, exportar toda la tabla; con búsqueda, todos los resultados filtrados. Indicar claramente ese alcance en el botón.
- [ ] Incluir todas las columnas acordadas, también las del detalle, con orden fijo y nombre de archivo que identifique colección y fecha.
- [ ] Usar UTF-8 con BOM, escapar comillas, comas y saltos de línea, convertir `null` en celda vacía y unir `purposes` con un separador interno.
- [ ] Mantener fechas en ISO UTC. Conservar documentos como texto en la serialización; al abrir un CSV, una planilla puede requerir importar la columna DNI como texto para preservar ceros iniciales.
- [ ] Neutralizar las celdas que puedan interpretarse como fórmulas, incluidos prefijos `=`, `+`, `-`, `@` y caracteres de control iniciales. Escapar comillas no resuelve por sí solo ese riesgo.
- [ ] No habilitar exportación de una tabla cuya carga falló. Liberar el object URL después de descargar.

**Resultado:** tres exportaciones completas, coherentes con el filtro y sin un endpoint adicional.

## 7. La IA verifica directamente la implementación

Esta fase es trabajo de ejecución de la IA, no una solicitud de crear infraestructura o un informe aparte. Usar herramientas existentes, solicitudes HTTP, navegador y emuladores con datos ficticios. Si necesita un script auxiliar, que sea temporal y fuera del código entregado.

- [ ] Probar credenciales correctas, incorrectas, ausentes y malformadas; verificar que ninguna respuesta rechazada exponga registros o contadores y que se valide antes de consultar la base.
- [ ] Probar acceso mediante Hosting y mediante la URL directa de la función emulada; comprobar `401`, `404`, `405` y `no-store`.
- [ ] Verificar que el error del formulario no abra otro diálogo de autenticación, que salir limpie los datos y que una petición pendiente no los restaure.
- [ ] Probar tablas vacías, campos faltantes, errores de carga, actualización, contadores, búsqueda y los tres CSV. Incluir acentos, comillas, saltos de línea y valores que parezcan fórmulas.
- [ ] Revisar que las credenciales ficticias no queden incorporadas al bundle ni persistidas por la aplicación. Medir la carga con aproximadamente 60 registros y comprobar que devuelve todos.
- [ ] Verificar que las rutas y formularios públicos sigan funcionando. No enviar correos reales ni sembrar datos de prueba en producción.
- [ ] Ejecutar las validaciones ya disponibles: frontend `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:run` y `npm run build`; backend `npm --prefix functions run lint` y `npm --prefix functions run build`.
- [ ] Revisar el diff final: sin dependencias, cambios de reglas, CI adicional, refactors, modificaciones de HackITBA ni secretos.

No agregar herramientas de tests, scripts nuevos a `package.json`, jobs de CI, archivos permanentes de pruebas ni documentos de validación. En la respuesta de entrega, informar brevemente qué se comprobó y qué no pudo comprobarse. Si un chequeo existente falla por un problema previo, señalarlo sin ampliar el alcance para corregirlo.

**Resultado:** cambios comprobados directamente, manteniendo intacta la infraestructura de pruebas actual.

## 8. Preparar un despliegue acotado

Esta fase describe la publicación posterior; reescribir este Markdown no autoriza ni ejecuta un despliegue. Respetar las reglas del repositorio sobre commits y publicación.

- [ ] Confirmar el inventario de funciones y que `quantumjamAdminApi` no colisione con una función ajena. Confirmar también que el dominio corresponda a `csitba-quantumjam`.
- [ ] Crear los secretos en Firebase con entrada interactiva, sin escribir valores en el repositorio, comandos guardados o logs:

```bash
firebase functions:secrets:set QUANTUMJAM_ADMIN_USERNAME --project webpage-36e40
firebase functions:secrets:set QUANTUMJAM_ADMIN_PASSWORD --project webpage-36e40
```

- [ ] En el workflow de merge, agregar únicamente `functions:quantumjamAdminApi` a la lista explícita de `--only`. Conservar orden, acciones, jobs y demás funciones existentes.
- [ ] Si se mantiene el script de deploy de `functions/package.json`, agregar solamente ese mismo nombre a su lista. No aprovechar para arreglar su omisión previa de `submitSponsorInquiry`; señalarla al dueño.
- [ ] Para la primera publicación, coordinar un despliegue dirigido de la nueva función antes de que se publique el frontend que la usa. Esto no requiere cambiar el orden del workflow:

```bash
firebase deploy --project webpage-36e40 --only functions:quantumjamAdminApi
```

- [ ] Verificar que la función nueva rechace peticiones sin credenciales. Después, publicar el frontend por el proceso habitual. Si la publicación de Hosting se hace manualmente, limitarla al site:

```bash
firebase deploy --project webpage-36e40 --only hosting:csitba-quantumjam
```

- [ ] Si todavía no existe la función, no dar por funcional una preview: el workflow de PR actual publica Hosting, no un backend aislado. Para pruebas completas previas, usar emuladores.
- [ ] No ejecutar `firebase deploy` sin filtros ni `firebase deploy --only functions`. No aceptar eliminaciones de funciones ajenas ni utilizar `--force`.
- [ ] Comprobar tras el despliegue que el inventario de funciones de HackITBA no haya cambiado y hacer una comprobación básica de disponibilidad de ambos sitios, sin operaciones de escritura.
- [ ] Si se agrega documentación operativa, limitarla a una nota breve en el README existente, en inglés según las convenciones del repo: acceso, secretos y comando dirigido. No crear documentos adicionales.

**Resultado:** incorporación del backoffice mediante una función nueva y cambios puntuales, sin reorganizar el despliegue compartido.

## Archivos previstos

| Archivo                                        | Cambio acotado                                                          |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `functions/src/backoffice.ts`                  | Nuevo: Basic Auth, tres rutas y selección de campos.                    |
| `functions/src/index.ts`                       | Exportar `quantumjamAdminApi`.                                          |
| `firebase.json`                                | Agregar un rewrite antes del fallback de la SPA.                        |
| `src/pages/AdminPage.tsx`                      | Nuevo: acceso, contadores, tablas y búsqueda.                           |
| `src/lib/adminApi.ts`                          | Nuevo: tipos y peticiones HTTP administrativas.                         |
| `src/lib/csv.ts`                               | Nuevo: helper de exportación.                                           |
| `src/routes.tsx`                               | Agregar `/admin`.                                                       |
| `src/i18n/locales/es.json` y `en.json`         | Agregar textos administrativos.                                         |
| `.github/workflows/firebase-hosting-merge.yml` | Agregar solo el nombre de la función a la lista de deploy.              |
| `functions/package.json`                       | Agregar solo el nombre al script de deploy, si se mantiene ese comando. |
| `README.md`                                    | Nota operativa breve, si hace falta.                                    |

Extraer un componente de tabla local solo si mejora claramente la legibilidad; no crear una biblioteca de componentes administrativos. Mantener sin cambios `ci.yml`, `vite.config.ts`, reglas, índices, funciones existentes, formularios públicos y configuración de codebases.

## Criterio de finalización

Una persona con las credenciales puede ingresar a `/admin`, ver los tres totales, consultar las tres tablas, buscar y exportar CSV. Sin credenciales no obtiene datos ni contadores por ninguna ruta administrativa. La nueva función solo lee `quantumjam`; el despliegue no modifica ni elimina funciones de HackITBA. No se agrega infraestructura de pruebas ni se reorganiza el proyecto.
