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

## 4. Checklist para Refactorizar o Crear Componentes

1. [ ] ¿El componente modal implementa `forwardRef` y expone `open` / `close` mediante `useImperativeHandle`?
2. [ ] ¿La página padre eliminó los estados `const [isModalOpen, setIsModalOpen]` y `const [editingItem, setEditingItem]`?
3. [ ] ¿Se utiliza el patrón **Render Props** en `<AppModal>` o `<AppForm>` para compartir datos con el cuerpo?
4. [ ] ¿Los campos anidados acceden al formulario mediante `useAppFormContext()` si están profundamente anidados?
5. [ ] ¿Los errores de Laravel 422 se capturan y mapean al formulario con scroll automático?
