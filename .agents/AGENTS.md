## Patrones de Diseño en React: Encapsulación de Estados

Al desarrollar o refactorizar componentes en React para este proyecto, debes adherirte estrictamente a la siguiente filosofía de diseño:

1. **Evitar Estados Redundantes en Componentes Contenedores:** 
   No infles componentes padre (como páginas, modales o grandes formularios) con múltiples `useState` para controlar el estado interno de sus componentes hijos (ej. listas de archivos subidos, opciones de un select remoto, estados de carga locales).
   
2. **Componentes Hoja Inteligentes (Smart Leaf Components):**
   Delega la lógica compleja (llamadas a la API con axios, compresión de archivos, procesamiento de datos) al propio componente hoja (ej. un `Select` especializado o un componente de subida de archivos). Estos deben manejar sus propios ciclos de vida (via `useEffect`) y su propio estado de `loading` o previsualización.

3. **Uso de `forwardRef` y `useImperativeHandle`:**
   En lugar de sincronizar constantemente el estado entre el hijo y el padre (a través de props como `onChange` pasando datos complejos hacia arriba en tiempo real y disparando re-renders en todo el formulario), utiliza `forwardRef`. Expón métodos imperativos mediante `useImperativeHandle` (tales como `getFile()`, `reset()`, `fetchData()`, `setExistingUrl()`). 
   El componente padre debe ser puramente declarativo en su JSX y solo invocar estos métodos de forma imperativa en momentos críticos (como en la función de submit `onFinish` del formulario).

4. **Separación de Responsabilidades en Modales y Formularios (Single Responsibility Principle):**
   Los componentes de tipo Modal (ej. `AppModal` o `PresidenteFormModal`) **no deben** encargarse de mapear, poblar o inyectar manualmente los datos de edición en el formulario a partir de un `record` de tabla. 
   Su única responsabilidad es abrir, cerrar y mostrar el contenedor.
   La responsabilidad de recuperar, cargar e inyectar la data desde el backend recae estrictamente en el componente del formulario base (ej. `AppForm`). Utiliza sus propiedades integradas (como `fetchUrl` y `onDataFetched`) para que el formulario se nutra automáticamente desde la API, garantizando que los datos mostrados son frescos y desvinculando la estructura del formulario de los datos de la fila de la tabla.
