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

7. **Uso Obligatorio de Acciones Integradas en `TableCrud`**:
   - **Prohibido** definir manualmente la columna `ACCIONES` (`key: 'actions'` o `'acciones'`) en el arreglo `columns` de cada página.
   - Pasar los callbacks directamente como props a `<TableCrud>`:
     ```jsx
     <TableCrud
       columns={columns}
       endpoint="/recurso"
       onEdit={(record) => handleEdit(record.id)}
       onDelete={(record) => handleDelete(record.id)}
       onRestore={(record) => handleRestore(record.id)}
       onImpersonate={handleImpersonate}
       extraActions={(record) => [
         <Button key="extra" type="text" icon={<GiftOutlined />} onClick={() => handleCustom(record)} />
       ]}
       mobileCardRender={renderMobileCard}
     />
     ```
   - `TableCrud` se encarga de inyectar la columna con el ancho adecuado, centrado, soft delete (`deleted_at` para restaurar), comprobación de permisos de impersonación y reusabilidad en tarjetas móviles (`mobileCardRender(record, actions)`).

8. **Uso Obligatorio de Exportación Centralizada en `TableCrud`**:
   - **Prohibido** implementar lógica manual de exportación (`handleExport`), estados locales `currentParams` o construcción manual de `URLSearchParams` con `window.location.href = ...` en las páginas.
   - Usar el subcomponente `<TableCrud.ExportButton actionRef={actionRef} allowedRoles={['...']} />` o invocar imperativamente `actionRef.current?.export()` / `TableCrud.export(endpoint, params)`.
   - `TableCrud.ExportButton` automáticamente:
     - Valida el rol del usuario autenticado contra `allowedRoles`.
     - Serializa los parámetros de búsqueda activos, filtros de columna y flags como `trashed` manteniendo sincronía con la tabla.
     - Omite parámetros de paginación (`page`, `per_page`) y da formato adecuado a los arreglos (`key[]`).
     - Realiza la descarga directa del endpoint de streaming CSV (`/export`).

---

## 2. Reglas Específicas del Backend (Laravel 13)

- **Multi-tenancy por Territorio**: Todo está delimitado por `presidente_id` a través de `App\Models\Scopes\TerritoryScope`. Al consultar modelos como `User` o `Promovido`, el alcance territorial se aplica automáticamente excepto para superusuarios.
- **Unicidad Compuesta por Presidente**: La unicidad de CURP y clave electoral no es global; es por organización de `presidente`. Está implementada en los eventos `saving` de los modelos.
- **BaseCrudController**: Los controladores de catálogo extienden de `BaseCrudController`. `index()` responde JSON cuando `$request->wantsJson()` (para peticiones asíncronas de ProTable) y vista Inertia de lo contrario.
