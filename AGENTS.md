# Directivas de Desarrollo - Estructura Política

Este archivo define las reglas y estándares de arquitectura del proyecto para agentes de IA (Antigravity, Gemini, Claude, Cursor).

## 1. Arquitectura de Componentes Frontend (React 19 + Ant Design 5 + Inertia)

### Principio Fundamental: Componentes Wrapper, Cero Prop-Drilling y Render Props

Para evitar la proliferación de estados repetitivos (`isOpen`, `editingId`, `loading`, etc.) en las páginas padre y evitar el "prop-drilling", todos los formularios y modales deben adherirse a las siguientes directivas:

1. **Uso Obligatorio de Wrappers Reutilizables**:
   - Usar `<AppModal>` (`@/Components/Common/AppModal` o `@/Components/AppModal`) para ventanas modales.
   - Usar `<AppForm>` (`@/Components/Common/AppForm` o `@/Components/AppForm`) para formularios con gestión de estados de envío y validaciones.

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

---

## 2. Reglas Específicas del Backend (Laravel 13)

- **Multi-tenancy por Territorio**: Todo está delimitado por `presidente_id` a través de `App\Models\Scopes\TerritoryScope`. Al consultar modelos como `User` o `Promovido`, el alcance territorial se aplica automáticamente excepto para superusuarios.
- **Unicidad Compuesta por Presidente**: La unicidad de CURP y clave electoral no es global; es por organización de `presidente`. Está implementada en los eventos `saving` de los modelos.
- **BaseCrudController**: Los controladores de catálogo extienden de `BaseCrudController`. `index()` responde JSON cuando `$request->wantsJson()` (para peticiones asíncronas de ProTable) y vista Inertia de lo contrario.
