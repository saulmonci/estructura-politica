---
name: react-wrapper-components
description: >-
  Guía y recetas para crear y utilizar componentes wrapper de React (como AppModal y AppForm)
  aplicando render props, useImperativeHandle y gestión autónoma de estado hijo para eliminar
  el prop-drilling y simplificar vistas en aplicaciones Inertia + Ant Design.
---

# Skill: Componentes Wrapper en React (AppModal, AppForm, Render Props y useImperativeHandle)

Este skill define la metodología y los patrones oficiales para crear interfaces desacopladas, reutilizables y sin prop-drilling en la aplicación.

---

## 1. El Problema que Resolvemos

En componentes tradicionales de React (como modales de creación/edición):
- Las páginas padre acumulan decenas de hooks: `const [isOpen, setIsOpen]`, `const [editId, setEditId]`, `const [loading, setLoading]`.
- Las funciones y estados deben pasarse por 3 o 4 niveles de componentes (prop-drilling).
- Cada modal duplica la lógica de apertura, cierre, animaciones, spinner de carga y mapeo de errores de Laravel.

### La Solución Arquitectónica
1. **Control Imperativo (`useImperativeHandle`)**: El padre solo mantiene un `modalRef` o `formRef` y llama a `ref.current.open(data)` o `ref.current.submit()`.
2. **Render Props**: El wrapper inyecta su estado interno (`data`, `close`, `loading`, etc.) como argumentos de una función `children`, entregando el contexto directamente al consumidor.
3. **Contextos de Apoyo (`useAppModalContext`, `useAppFormContext`)**: Los inputs o widgets anidados pueden suscribirse al contexto para acceder a helpers sin recibir props intermedias.
4. **Hijos Autónomos**: Cada widget hijo (ej: selector de foto, cámara, scanner INE) maneja sus propios estados locales.

---

## 2. Componentes Wrapper Disponibles

Los componentes están disponibles en:
- `@/Components/Common` (`AppModal`, `AppForm`, `useAppModalContext`, `useAppFormContext`, etc.)
- O mediante importación directa: `@/Components/AppModal` y `@/Components/AppForm`.

### API de `AppModal`

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `ref` | `Ref` | — | Permite llamar `open(data, options)`, `close()`, `setData()`, `setLoading()`, etc. |
| `title` | `string \| ReactNode \| (data) => ReactNode` | `null` | Título del modal. Soporta función que recibe el payload actual. |
| `subtitle` | `string \| (data) => string` | `null` | Subtítulo opcional (ideal con `headerBanner`). |
| `headerBanner` | `boolean` | `false` | Activa encabezado con estilo corporativo oscuro (`#0f172a`). |
| `headerIcon` | `ReactNode` | `null` | Ícono representativo en el encabezado. |
| `children` | `ReactNode \| (context) => ReactNode` | — | **Render prop** con `{ data, close, open, loading, setLoading, setData }`. |
| `footer` | `ReactNode \| null \| (context) => ReactNode` | `undefined` | Personalización del footer. Si no se pasa y hay `onOk`, genera botones estándar. |
| `onOk` | `async (data, context) => void` | — | Callback al presionar el botón de confirmación. Maneja `loading` automáticamente. |
| `width` | `number` | `650` | Ancho del modal en píxeles. |

#### Métodos expuestos vía `ref`:
- `modalRef.current.open(payload = null, options = { title, subtitle })`: Abre el modal con datos iniciales.
- `modalRef.current.close()`: Cierra el modal y limpia el payload al terminar la animación.
- `modalRef.current.setLoading(boolean)`: Activa/desactiva estado de carga.
- `modalRef.current.setData(payload)`: Modifica el payload actual.
- `modalRef.current.getData()`: Obtiene el payload actual.

---

### API de `AppForm`

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `ref` | `Ref` | — | Expone `submit()`, `reset()`, `setValues()`, `setErrors()`, `scrollToField()`. |
| `initialValues` | `object` | `{}` | Valores iniciales; se sincronizan automáticamente si cambian. |
| `onSubmit` | `async (values, helpers) => void` | — | Callback de envío. Gestiona `loading`, mapea errores 422 y hace scroll automático al error. |
| `onSuccess` | `(result, helpers) => void` | — | Invocado tras un envío exitoso. |
| `children` | `ReactNode \| (context) => ReactNode` | — | **Render prop** con `{ form, loading, submit, reset, setErrors }`. |
| `autoScrollToError` | `boolean` | `true` | Hace scroll suave al primer campo inválido ante un error de validación. |

#### Propiedades estáticas de conveniencia:
- `<AppForm.Item ...>`: Alias directo de `Form.Item` de Ant Design.
- `<AppForm.List ...>`: Alias directo de `Form.List`.

---

### API de `AppSelect`

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `endpoint` | `string \| (depVal, params) => string` | — | URL del catálogo (ej. `/catalogos/estados`, `/catalogos/municipios`). |
| `dependsOn` | `string` | — | Nombre del campo en el formulario del que depende este select (ej. `state_id`). |
| `dependencyParam` | `string` | `dependsOn` | Nombre del parámetro query a enviar (por defecto usa el nombre de `dependsOn`). |
| `dependencyValue` | `any` | — | Valor directo de dependencia (si se usa fuera de un formulario). |
| `resetOnDependencyChange` | `boolean` | `true` | Limpia automáticamente el valor de este select cuando la dependencia cambia. |
| `labelField` | `string` | auto | Campo para la etiqueta (busca `nombre`, `name`, `numero`, `label`, etc.). |
| `valueField` | `string` | auto | Campo para el valor (busca `id`, `value`, `key`). |
| `transform` | `(item) => ({ label, value })` | — | Función opcional para formatear cada opción personalizada. |
| `allOption` | `boolean \| string \| object` | `false` | Agrega opción "Todos" (ej. en filtros de tablas). |
| `cache` | `boolean` | `true` | Habilita caché en memoria para evitar llamadas de red redundantes. |
| `autoFetch` | `boolean` | `true` | Ejecuta la consulta automáticamente al montar o cambiar dependencia. |
| `showSearch` | `boolean` | `true` | Búsqueda local insensible a mayúsculas/minúsculas. |
| `allowClear` | `boolean` | `true` | Botón para limpiar selección. |

#### Métodos expuestos vía `ref`:
- `selectRef.current.reload()`: Vuelve a consultar los datos desde el servidor (omite caché).
- `selectRef.current.setOptions(options)`: Sobrescribe las opciones manualmente.
- `selectRef.current.getOptions()`: Devuelve las opciones actuales.

---

### API de `AppUpload`

Componente autónomo para carga de imágenes, credenciales y archivos generales. Compatible con `AppForm.Item` y `Form.Item`.

| Prop | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `variant` | `'avatar' \| 'card' \| 'dragger' \| 'button'` | `'avatar'` | Aspecto visual del uploader. |
| `endpoint` | `string` | `null` | Si se define, sube inmediatamente vía HTTP multipart con progreso (0-100%). De lo contrario opera en modo **diferido** para payloads de formularios. |
| `allowUrlInput` | `boolean` | `false` | Permite alternar a ingreso de URL remota directa. |
| `maxSizeMB` | `number` | `5` | Límite máximo en Megabytes antes de compresión o rechazo. |
| `compress` | `boolean` | `true` | Comprime imágenes en el navegador mediante `browser-image-compression`. |
| `compressOptions` | `object` | `{ maxSizeMB: 1, maxWidthOrHeight: 1920 }` | Opciones de compresión personalizadas. |
| `aspectRatio` | `string \| number` | `'16/9'` | Relación de aspecto (aplica en variante `'card'`). Soporta `'credit-card'`, `'16/9'`, `'4/3'`, etc. |
| `shape` | `'circle' \| 'square'` | `'circle'` | Forma (aplica en variante `'avatar'`). |
| `size` | `number` | `110` | Diámetro o ancho en px para avatar. |
| `showCamera` | `boolean` | `true` | Muestra botón para invocar la cámara trasera en dispositivos móviles (`capture="environment"`). |
| `showPreview` | `boolean` | `true` | Habilita lightbox o visualizador de imagen ampliada. |
| `value` | `File \| Blob \| string \| null` | — | Valor controlado (manejado automáticamente por `AppForm.Item`). |
| `onChange` | `(value) => void` | — | Emite el nuevo valor (File/Blob en modo diferido, o string/URL en modo endpoint o URL directa). |

#### Métodos expuestos vía `ref`:
- `uploadRef.current.openGallery()`: Abre el selector de archivos del sistema.
- `uploadRef.current.openCamera()`: Dispara directamente el disparador de cámara móvil.
- `uploadRef.current.openUrlInput()`: Muestra el campo para pegar URL externa.
- `uploadRef.current.clear()`: Limpia el archivo o URL cargada.
- `uploadRef.current.getFile()`: Retorna el `File` actual si está en modo diferido.
- `uploadRef.current.getUrl()`: Retorna la URL actual.
- `uploadRef.current.upload(customEndpoint)`: Ejecuta la subida forzada inmediata a un endpoint.

---

## 3. Recetas de Código

### Receta 1: Modal + Formulario CRUD con Render Props

```jsx
import React, { forwardRef } from 'react';
import { Input, Row, Col, Button, message } from 'antd';
import { UserOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import { AppModal, AppForm } from '@/Components/Common';

const UsuarioFormModal = forwardRef(({ onSuccess }, ref) => {
    return (
        <AppModal
            ref={ref}
            title={(data) => (data?.id ? `Editar: ${data.nombre}` : 'Registrar Nuevo Usuario')}
            headerBanner
            width={600}
        >
            {/* Render Prop de AppModal */}
            {({ data, close, loading: modalLoading }) => (
                <AppForm
                    initialValues={data || { nombre: '', email: '' }}
                    onSubmit={async (values) => {
                        const isEdit = Boolean(data?.id);
                        const url = isEdit ? `/usuarios/${data.id}` : '/usuarios';
                        const method = isEdit ? 'put' : 'post';

                        const res = await axios[method](url, values);
                        message.success(isEdit ? 'Actualizado con éxito' : 'Creado con éxito');
                        close();
                        if (onSuccess) onSuccess(res.data);
                    }}
                >
                    {/* Render Prop de AppForm */}
                    {({ loading }) => (
                        <>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <AppForm.Item
                                        name="nombre"
                                        label="Nombre"
                                        rules={[{ required: true, message: 'Campo requerido' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="Nombre completo" />
                                    </AppForm.Item>
                                </Col>
                                <Col span={24}>
                                    <AppForm.Item
                                        name="email"
                                        label="Correo"
                                        rules={[
                                            { required: true, message: 'Campo requerido' },
                                            { type: 'email', message: 'Correo no válido' },
                                        ]}
                                    >
                                        <Input placeholder="correo@dominio.com" />
                                    </AppForm.Item>
                                </Col>
                            </Row>

                            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                                <Button onClick={close} icon={<CloseOutlined />}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading || modalLoading}
                                    icon={<SaveOutlined />}
                                    className="bg-[#0f172a]"
                                >
                                    Guardar
                                </Button>
                            </div>
                        </>
                    )}
                </AppForm>
            )}
        </AppModal>
    );
});

UsuarioFormModal.displayName = 'UsuarioFormModal';
export default UsuarioFormModal;
```

---

### Receta 2: Consumo en la Página Padre (Sin useState ni Prop-Drilling)

```jsx
import React, { useRef } from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import UsuarioFormModal from './UsuarioFormModal';

export default function UsuariosIndex() {
    const modalRef = useRef();
    const tableRef = useRef();

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1>Catálogo de Usuarios</h1>
                {/* Apertura imperativa sin booleanos en el padre */}
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => modalRef.current?.open()}
                >
                    Nuevo Usuario
                </Button>
            </div>

            <TableCrud
                actionRef={tableRef}
                endpoint="/api/usuarios"
                columns={[
                    { title: 'Nombre', dataIndex: 'nombre' },
                    { title: 'Email', dataIndex: 'email' },
                    {
                        title: 'Acciones',
                        render: (_, record) => (
                            <Space>
                                <Button
                                    icon={<EditOutlined />}
                                    onClick={() => modalRef.current?.open(record)}
                                >
                                    Editar
                                </Button>
                            </Space>
                        ),
                    },
                ]}
            />

            {/* Modal montado sin prop-drilling */}
            <UsuarioFormModal
                ref={modalRef}
                onSuccess={() => tableRef.current?.reload()}
            />
        </div>
    );
}
```

---

### Receta 3: Componente Hijo Autónomo con `useAppFormContext`

Cuando un input o bloque visual necesita interactuar con el formulario sin que la página o modal le pase props intermedias:

```jsx
import React, { useState } from 'react';
import { Upload, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useAppFormContext } from '@/Components/Common';

export function ImageUploadSection({ name = 'foto' }) {
    // Acceso al formulario sin prop-drilling
    const { form, loading } = useAppFormContext();
    const [preview, setPreview] = useState(null);

    const handleCustomRequest = async ({ file, onSuccess }) => {
        // Maneja su propio estado interno
        const base64 = await toBase64(file);
        setPreview(base64);
        form.setFieldValue(name, base64);
        onSuccess('ok');
    };

    return (
        <div>
            {preview && <img src={preview} alt="Vista previa" className="w-24 h-24 rounded object-cover mb-2" />}
            <Upload customRequest={handleCustomRequest} showUploadList={false}>
                <Button icon={<UploadOutlined />} disabled={loading}>
                    Seleccionar Foto
                </Button>
            </Upload>
        </div>
    );
}
```

---

### Receta 4: Selects Dependientes en Cascada con `AppSelect`

```jsx
import React from 'react';
import { Row, Col } from 'antd';
import { AppForm, AppSelect } from '@/Components/Common';

export function GeolocationFormFields() {
    return (
        <Row gutter={16}>
            {/* 1. Estado: se carga automáticamente desde el endpoint */}
            <Col xs={24} md={12}>
                <AppForm.Item
                    name="state_id"
                    label="Estado"
                    rules={[{ required: true, message: 'Selecciona un estado' }]}
                >
                    <AppSelect
                        endpoint="/catalogos/estados"
                        placeholder="Seleccionar Estado"
                    />
                </AppForm.Item>
            </Col>

            {/* 2. Municipio: depende de state_id. Se deshabilita si state_id está vacío,
                   envía ?state_id={valor} y se resetea si el usuario cambia el estado */}
            <Col xs={24} md={12}>
                <AppForm.Item
                    name="municipality_id"
                    label="Municipio"
                    rules={[{ required: true, message: 'Selecciona un municipio' }]}
                >
                    <AppSelect
                        endpoint="/catalogos/municipios"
                        dependsOn="state_id"
                        placeholder="Seleccionar Municipio"
                        placeholderWhenDisabled="Selecciona primero un estado"
                    />
                </AppForm.Item>
            </Col>

            {/* 3. Secciones: depende de demarcacion_id con URL interpolada */}
            <Col xs={24}>
                <AppForm.Item name="seccion_electoral_id" label="Sección Electoral">
                    <AppSelect
                        endpoint="/catalogos/demarcaciones/{demarcacion_id}/secciones"
                        dependsOn="demarcacion_id"
                        placeholder="Seleccionar Sección"
                    />
                </AppForm.Item>
            </Col>
        </Row>
    );
}
```

---

### Receta 5: Tabla CRUD con Acciones Automáticas en `TableCrud`

```jsx
import React, { useRef } from 'react';
import { Button } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';

export default function ModuloIndex() {
    const actionRef = useRef();

    // Las columnas definen únicamente datos del dominio (sin columna manual de acciones)
    const columns = [
        { title: 'FOLIO', dataIndex: 'id', width: 90 },
        { title: 'NOMBRE', dataIndex: 'name', sorter: true },
        { title: 'ESTADO', dataIndex: 'estado' },
    ];

    return (
        <TableCrud
            actionRef={actionRef}
            columns={columns}
            endpoint="/api/recurso"
            rowKey="id"
            search={true}
            // Props de acciones automáticas:
            onEdit={(record) => handleEdit(record.id)}
            onDelete={(record) => handleDelete(record.id)}
            onRestore={(record) => handleRestore(record.id)}
            onImpersonate={handleImpersonate}
            extraActions={(record) => [
                <Button
                    key="apoyos"
                    type="text"
                    icon={<GiftOutlined className="text-green-600" />}
                    title="Kardex de Apoyos"
                    onClick={() => handleOpenApoyos(record)}
                />,
            ]}
            // En móvil, recibe actions pre-renderizado para ubicarlo donde sea
            mobileCardRender={(record, actions) => (
                <div className="p-4 border rounded">
                    <div>{record.name}</div>
                    <div className="mt-2 flex justify-end border-t pt-2">{actions}</div>
                </div>
            )}
        />
    );
}
```

---

### Receta 5: Exportación a Excel/CSV con `<TableCrud.ExportButton>` y `actionRef`

```jsx
import React, { useRef } from 'react';
import TableCrud from '@/Components/TableCrud';

export default function ModuloIndex() {
    const actionRef = useRef();

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1>Catálogo</h1>
                {/* Botón declarativo: valida roles, extrae filtros activos y descarga el CSV */}
                <TableCrud.ExportButton
                    actionRef={actionRef}
                    allowedRoles={['presidente', 'admin', 'superuser']}
                />
            </div>

            <TableCrud
                actionRef={actionRef}
                columns={columns}
                endpoint="/api/recurso"
                search={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        </div>
    );
}
```

---

## 4. Checklist para Refactorizar o Crear Componentes

1. [ ] ¿El componente modal implementa `forwardRef` y expone `open` / `close` mediante `useImperativeHandle`?
2. [ ] ¿La página padre eliminó los estados `const [isModalOpen, setIsModalOpen]` y `const [editingItem, setEditingItem]`?
3. [ ] ¿Se utiliza el patrón **Render Props** en `<AppModal>` o `<AppForm>` para compartir datos con el cuerpo?
4. [ ] ¿Los dropdowns usan `<AppSelect>` eliminando `useState`, `loading` y `fetch...` manuales?
5. [ ] ¿Los selects dependientes en cascada usan `dependsOn="..."` para auto-deshabilitarse y auto-limpiarse?
6. [ ] ¿La tabla usa las props automáticas de acciones de `<TableCrud>` (`onEdit`, `onDelete`, `onRestore`, `onImpersonate`, `extraActions`) en lugar de definir la columna `ACCIONES` a mano?
7. [ ] ¿Se utiliza `<TableCrud.ExportButton>` o `actionRef.current?.export()` en lugar de duplicar estados `currentParams` y funciones `handleExport`?
8. [ ] ¿Los campos anidados acceden al formulario mediante `useAppFormContext()` si están profundamente anidados?
9. [ ] ¿Los errores de Laravel 422 se capturan y mapean al formulario con scroll automático?


