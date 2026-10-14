import React, { forwardRef } from 'react';
import { Input, Row, Col, Button, message } from 'antd';
import { UserOutlined, MailOutlined, PhoneOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import axios from 'axios';
import AppModal from './AppModal';
import AppForm from './AppForm';

/**
 * Ejemplo ilustrativo de cómo componer AppModal + AppForm eliminando prop-drilling
 *
 * El padre simplemente consume este componente así:
 * const modalRef = useRef();
 * <Button onClick={() => modalRef.current.open()}>Crear</Button>
 * <Button onClick={() => modalRef.current.open(usuario)}>Editar</Button>
 * <ExampleEntityModal ref={modalRef} onSuccess={reloadTable} />
 */
const ExampleEntityModal = forwardRef(({ onSuccess }, ref) => {
    return (
        <AppModal
            ref={ref}
            title={(data) => (data?.id ? `Editar Usuario #${data.id}` : 'Crear Nuevo Usuario')}
            subtitle={(data) => (data?.id ? 'Actualiza los campos necesarios' : 'Ingresa los datos del nuevo miembro')}
            headerBanner
            headerIcon={<UserOutlined />}
            width={650}
        >
            {({ data, close, loading: modalLoading }) => (
                <AppForm
                    initialValues={data || { nombre: '', email: '', telefono: '' }}
                    onSubmit={async (values) => {
                        const isEdit = Boolean(data?.id);
                        const url = isEdit ? `/api/usuarios/${data.id}` : '/api/usuarios';
                        const method = isEdit ? 'put' : 'post';

                        const response = await axios[method](url, values);

                        message.success(isEdit ? 'Usuario actualizado con éxito' : 'Usuario registrado con éxito');

                        // Cierra el modal automáticamente
                        close();

                        // Notifica al padre
                        if (onSuccess) {
                            onSuccess(response.data);
                        }
                    }}
                >
                    {({ loading, reset }) => (
                        <>
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <AppForm.Item
                                        name="nombre"
                                        label="Nombre Completo"
                                        rules={[{ required: true, message: 'El nombre es requerido' }]}
                                    >
                                        <Input prefix={<UserOutlined />} placeholder="Juan Pérez" />
                                    </AppForm.Item>
                                </Col>
                                <Col xs={24} md={12}>
                                    <AppForm.Item
                                        name="email"
                                        label="Correo Electrónico"
                                        rules={[
                                            { required: true, message: 'El correo es requerido' },
                                            { type: 'email', message: 'Ingresa un correo válido' },
                                        ]}
                                    >
                                        <Input prefix={<MailOutlined />} placeholder="correo@ejemplo.com" />
                                    </AppForm.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24}>
                                    <AppForm.Item name="telefono" label="Teléfono de Contacto">
                                        <Input prefix={<PhoneOutlined />} placeholder="55 1234 5678" />
                                    </AppForm.Item>
                                </Col>
                            </Row>

                            {/* Footer del Formulario */}
                            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                                <Button onClick={close} icon={<CloseOutlined />}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="primary"
                                    htmlType="submit"
                                    loading={loading || modalLoading}
                                    icon={<SaveOutlined />}
                                    className="bg-[#0f172a] hover:bg-[#1e293b]"
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

ExampleEntityModal.displayName = 'ExampleEntityModal';

export default ExampleEntityModal;
