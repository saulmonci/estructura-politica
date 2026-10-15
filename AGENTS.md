# Directivas de Desarrollo - Estructura Política

Este archivo define las reglas y estándares de arquitectura del proyecto para agentes de IA (Antigravity, Gemini, Claude, Cursor).

## 1. Arquitectura de Componentes Frontend (React 19 + Ant Design 5 + Inertia)

### Principio Fundamental: Componentes Wrapper, Cero Prop-Drilling y Render Props

Para evitar la proliferación de estados repetitivos (`isOpen`, `editingId`, `loading`, etc.) en las páginas padre y evitar el "prop-drilling", todos los formularios y modales deben adherirse a las siguientes directivas:

1. **Uso Obligatorio de Wrappers Reutilizables**:
   - Usar `<AppModal>` (`@/Components/Common/AppModal` o `@/Components/AppModal`) para ventanas modales.
   - Usar `<AppForm>` (`@/Components/Common/AppForm` o `@/Components/AppForm`) para formularios con gestión de estados de envío y validaciones.
   - Usar `<AppSelect>` (`@/Components/Common/AppSelect` o `@/Components/AppSelect`) para dropdowns de catálogos y selects dependientes en cascada.

2. **Control Imperativo (`useImperativeHandle`)**:
   - Las páginas padre no deben almacenar estados booleanos de visibilidad ni registros en edición en `useState`. En su lugar, usan una referencia `ref`:
     ```jsx
     const modalRef = useRef();

     // En los handlers de la página:
     modalRef.current?.open(); // Creación
     modalRef.current?.open(record); // Edición con datos precargados
     modalRef.current?.close();
     ```
   - Los formularios exponen `submit()`, `reset()`, `setValues(values)`, `setErrors(errors)`, `scrollToField(name)`.
   - `AppSelect` expone `reload()`, `setOptions(options)`, `getOptions()`.

3. **Patrón Render Props**:
   - Pasar `children` a `AppModal` o `AppForm` como función para recibir los parámetros contextuales sin prop-drilling:
     ```jsx
     <AppModal ref={modalRef} title={(data) => data?.id ? 'Editar' : 'Nuevo'}>
       {({ data, close, loading, setLoading }) => (
         <AppForm
           initialValues={data}
           onSubmit={async (values) => {
             await axios.post('/api/recurso', values);
             close();
           }}
         >
           {({ form, loading: formLoading, submit }) => (
             <>
               <AppForm.Item name="nombre" label="Nombre" rules={[{ required: true }]}>
                 <Input />
               </AppForm.Item>
               <Button type="primary" loading={formLoading} onClick={submit}>Guardar</Button>
             </>
           )}
         </AppForm>
       )}
     </AppModal>
     ```

4. **Componentes Hijos Autónomos y Contextos**:
   - Si un componente hijo o sección requiere interactuar con el formulario o modal, debe consumir los hooks contextuales:
     - `useAppModalContext()`: `{ data, close, open, loading, setLoading }`
     - `useAppFormContext()`: `{ form, loading, submit, reset, setErrors }`
   - Los componentes especializados (cámaras, escaneo de INE, selectores dependientes) deben manejar su propio estado interno en lugar de delegarlo al componente padre.

5. **Manejo Automático de Errores Laravel (HTTP 422)**:
   - `AppForm` procesa automáticamente las respuestas `error.response?.data?.errors`, resalta los campos con error mediante `form.setFields()`, emite la alerta y realiza scroll fluido al primer campo inválido.

6. **Uso Obligatorio de `AppSelect` para Catálogos y Selects Dependientes**:
   - **Prohibido** declarar estados `useState` de catálogos (`estados`, `municipios`, `demarcaciones`, etc.), variables de carga `loading` y funciones manuales `fetch...` en los componentes padre o formularios.
   - Para catálogos directos:
     ```jsx
     <AppForm.Item name="state_id" label="Estado" rules={[{ required: true }]}>
       <AppSelect endpoint="/catalogos/estados" placeholder="Seleccionar Estado" />
     </AppForm.Item>
     ```
   - Para selects dependientes en cascada (ej. Municipios dependen de Estado, o Secciones dependen de Demarcación):
     ```jsx
     {/* Envía automáticamente ?state_id={valor} y se deshabilita si state_id está vacío */}
     <AppForm.Item name="municipality_id" label="Municipio" rules={[{ required: true }]}>
       <AppSelect
         endpoint="/catalogos/municipios"
         dependsOn="state_id"
         placeholder="Seleccionar Municipio"
       />
     </AppForm.Item>

     {/* Interpola URLs dinámicas estilo /catalogos/demarcaciones/{demarcacion_id}/secciones */}
     <AppForm.Item name="seccion_electoral_id" label="Sección">
       <AppSelect
         endpoint="/catalogos/demarcaciones/{demarcacion_id}/secciones"
         dependsOn="demarcacion_id"
         labelField="numero"
         placeholder="Seleccionar Sección"
       />
     </AppForm.Item>
     ```
   - `AppSelect` se encarga automáticamente de: observar la dependencia en el formulario, solicitar los datos correctos, vaciar su propio valor cuando la dependencia cambia, y habilitarse/deshabilitarse según corresponda.

7. **Uso Obligatorio de Acciones Integradas y Botón de Creación en `TableCrud`**:
   - **Prohibido** definir manualmente la columna `ACCIONES` (`key: 'actions'` o `'acciones'`) en el arreglo `columns` de cada página.
   - **Prohibido** duplicar métodos repetitivos `handleCreate`, `handleEdit`, `handleDelete`, `handleRestore` o `handleImpersonate`, así como instanciar `Modal.useModal()` con `{contextHolder}` en las páginas padre.
   - Para el botón de creación/alta, usar `<TableCrud.CreateButton modalRef={modalRef} resourceName="..." />` (o su alias `<TableCrud.AddButton />`).
   - Para la tabla, pasar `modalRef={modalRef}` y `resourceName="..."` directamente a `<TableCrud>`. `TableCrud` se encarga de:
     - Abrir automáticamente el modal en modo edición (`modalRef.current?.open(record)`).
     - Mostrar diálogos de confirmación nativos (usando `Modal.useModal()` interno sin requerir `{contextHolder}` en la página).
     - Ejecutar peticiones de eliminación (`router.delete`), restauración (`router.post(.../restore)`) e impersonación (`router.post(/impersonate/...)`) preservando el scroll y recargando la tabla.
     - Pasar `handlers` (`edit`, `delete`, `restore`, `impersonate`) como 3er argumento al callback `mobileCardRender(record, actionsNode, handlers)` para vincular botones en vistas móviles con cero boilerplate.
     - Si una tabla no admite eliminación (ej. catálogos fijos), especificar `onDelete={false}`.
     ```jsx
     <TableCrud.CreateButton modalRef={modalRef} resourceName="operador" />

     <TableCrud
       actionRef={actionRef}
       modalRef={modalRef}
       resourceName="operador"
       endpoint="/operadores"
       columns={columns}
       canImpersonate={true}
       extraActions={(record) => [
         <Button key="extra" type="text" icon={<GiftOutlined />} onClick={() => handleCustom(record)} />
       ]}
       mobileCardRender={(record, actionsNode, handlers) => (
         <Card>
           ...
           <Button onClick={handlers?.edit}>Editar</Button>
           <Button onClick={handlers?.delete}>Eliminar</Button>
         </Card>
       )}
     />
     ```

8. **Uso Obligatorio de Exportación Centralizada en `TableCrud`**:
   - **Prohibido** implementar lógica manual de exportación (`handleExport`), estados locales `currentParams` o construcción manual de `URLSearchParams` con `window.location.href = ...` en las páginas.
   - Usar el subcomponente `<TableCrud.ExportButton actionRef={actionRef} allowedRoles={['...']} />` o invocar imperativamente `actionRef.current?.export()` / `TableCrud.export(endpoint, params)`.
   - `TableCrud.ExportButton` automáticamente:
     - Valida el rol del usuario autenticado contra `allowedRoles`.
     - Serializa los parámetros de búsqueda activos, filtros de columna y flags como `trashed` manteniendo sincronía con la tabla.
     - Omite parámetros de paginación (`page`, `per_page`) y da formato adecuado a los arreglos (`key[]`).
     - Realiza la descarga directa del endpoint de streaming CSV (`/export`).

9. **Uso Obligatorio de Gestión de Papelera (`TrashedSwitch`) Integrada en `TableCrud`**:
   - **Prohibido** declarar estados `useState` locales `showTrashed`/`setShowTrashed`, comprobaciones manuales de roles para el switch o pasar manualmente `params={{ trashed: ... }}` a `<TableCrud>` en las páginas padre.
   - Usar el subcomponente `<TableCrud.TrashedSwitch actionRef={actionRef} />` (o activar la prop `showTrashedSwitch={true}` en `<TableCrud>`).
   - `TableCrud.TrashedSwitch` y `TableCrud` se encargan automáticamente de:
     - Validar roles permitidos (`allowedRoles`, por defecto `['presidente', 'admin', 'superuser', 'coordinador_distrito']`).
     - Sincronizar el estado de manera bidireccional con `actionRef` (`actionRef.current.setTrashed`, `getTrashed`, `toggleTrashed`).
     - Incluir automáticamente el flag `trashed: '1'` en las peticiones de consulta asíncronas y paginadas.
     - Mantener sincronizada la exportación de CSV para descargar registros eliminados si el switch está activo.
     - Activar automáticamente la acción de restauración (`Restaurar`) para los registros que tengan `deleted_at`.

10. **Uso Obligatorio de `AppUpload` para Carga de Imágenes y Archivos**:
    - **Prohibido** crear inputs manuales `<input type="file" />`, hooks duplicados de `FileReader`, estados manuales de previsualización `previewUrl` o llamadas directas dispersas de compresión de imágenes en formularios y páginas padre.
    - Usar `<AppUpload>` (`@/Components/Common/AppUpload` o `@/Components/AppUpload`).
    - Es 100% compatible con `<AppForm.Item name="...">` y `<Form.Item name="...">` implementando el contrato controlado `value` y `onChange`.
    - **Modos de Operación**:
      - **Diferido (por defecto)**: Retiene el `File` o `Blob` localmente, genera previsualización automática con `URL.createObjectURL` (con limpieza de memoria al desmontar) y lo envía en el payload de `AppForm` a Laravel (adecuado para formularios multipart estándar).
      - **Inmediato**: Al especificar `endpoint="/api/upload"`, sube el archivo inmediatamente vía axios multipart, muestra barra de progreso en tiempo real (0-100%) y asigna la URL/respuesta retornada.
      - **URL Directa**: Con `allowUrlInput={true}`, permite ingresar o precargar URLs externas (S3, CDN, `/storage/...`).
    - **Variantes visuales (`variant`)**:
      - `'avatar'`: Fotos de perfil circulares o cuadradas con hover overlay y botones directos.
      - `'card'`: Credenciales INE (frente/reverso) y documentos rectangulares con aspect ratio 16/9 o formato tarjeta.
      - `'dragger'`: Zona drag & drop para carga de documentos.
      - `'button'`: Botón compacto con badge/tag informativo del archivo.
    - **Captura Móvil Nativa**:
      - Botón dual de "Cámara" (`capture="environment"`) y "Galería" para dispositivos móviles.
    - **Compresión en Cliente**:
      - Integra `browser-image-compression` para optimizar automáticamente fotos pesadas de smartphones (1920px max, calidad 0.8) reduciendo el tiempo de carga y consumo de datos sin pérdida perceptible de calidad.

---


## 2. Reglas Específicas del Backend (Laravel 13)

- **Multi-tenancy por Territorio**: Todo está delimitado por `presidente_id` a través de `App\Models\Scopes\TerritoryScope`. Al consultar modelos como `User` o `Promovido`, el alcance territorial se aplica automáticamente excepto para superusuarios.
- **Unicidad Compuesta por Presidente**: La unicidad de CURP y clave electoral no es global; es por organización de `presidente`. Está implementada en los eventos `saving` de los modelos.
- **BaseCrudController**: Los controladores de catálogo extienden de `BaseCrudController`. `index()` responde JSON cuando `$request->wantsJson()` (para peticiones asíncronas de ProTable) y vista Inertia de lo contrario.
