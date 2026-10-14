# Regla de Arquitectura: Componentes Wrapper, Render Props y useImperativeHandle

Esta regla aplica a todos los desarrollos de interfaz en React (`resources/js/**/*.{jsx,js}`).

## 1. Principio Fundamental: Wrappers Reutilizables y Cero Prop-Drilling

1. **Prohibido duplicar estados de visibilidad y edición en páginas padre**:
   - En lugar de declarar `const [isOpen, setIsOpen] = useState(false)`, `const [editingId, setEditingId] = useState(null)` y `const [loading, setLoading] = useState(false)` en cada página padre, utiliza el componente wrapper **`AppModal`** y **`AppForm`** (`@/Components/Common` o `@/Components/{AppModal,AppForm}`).
   - La página padre únicamente mantiene una referencia `const modalRef = useRef();` y ejecuta:
     ```jsx
     modalRef.current?.open(); // Creación
     modalRef.current?.open(record); // Edición
     ```

2. **Control Imperativo (`useImperativeHandle`)**:
   - Los modales deben exponer mediante `ref`:
     - `open(payload, options)`
     - `close()`
     - `setData(data)`
     - `setLoading(boolean)`
     - `setTitle(string)`
   - Los formularios deben exponer mediante `ref`:
     - `submit()`
     - `reset()`
     - `setValues(values)`
     - `getValues()`
     - `setErrors(backendErrors)`
     - `scrollToField(name)`

3. **Patrón Render Props**:
   - `AppModal` y `AppForm` soportan pasar `children` como función (Render Prop):
     ```jsx
     <AppModal ref={modalRef} title={(data) => data?.id ? 'Editar' : 'Crear'}>
       {({ data, close, loading, setLoading }) => (
         <AppForm initialValues={data} onSubmit={handleSubmit}>
           {({ form, loading: formLoading }) => (
             <>
               {/* Inputs */}
             </>
           )}
         </AppForm>
       )}
     </AppModal>
     ```
   - Esto inyecta `data`, `close`, `loading` directamente al cuerpo sin pasar propiedades por múltiples niveles intermedios.

4. **Componentes Hijos Autónomos y Contextos (`useAppFormContext` / `useAppModalContext`)**:
   - Los componentes de inputs especializados (ej: escáneres INE, selectores dependientes, subidas de fotos) deben gestionar su propio estado interno o suscribirse al contexto usando `useAppFormContext()` o `useAppModalContext()`.
   - No subas estado al padre si dicho estado sólo le concierne al input o sub-sección.

5. **Mapeo Automático de Errores de Validación de Laravel**:
   - Siempre capturar respuestas HTTP 422 de Laravel (`error.response.data.errors`).
   - Usar `setErrors` de `AppForm` o `normalizeLaravelErrors` para asociar los mensajes de error a los campos correspondientes de Ant Design y hacer scroll automático al primer campo con error.
