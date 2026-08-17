import React, { useState, forwardRef, useRef } from 'react';
import { Row, Col, message, Button, Divider, Form, Input, Select, Switch } from 'antd';
import { 
    UserOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    LockOutlined,
    MailOutlined,
    CrownOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import AppModal from '@/Components/AppModal';
import AppSelect from '@/Components/AppSelect';
import AppUpload from '@/Components/AppUpload';
import AppForm from '@/Components/AppForm';
import { generatePresidenteFormData } from '@/Utils/dummyDataGenerator';

const PresidenteFormModal = forwardRef(({ onSuccess }, ref) => {
    const { auth } = usePage().props;
    const [form] = Form.useForm();
    const fotoRef = useRef();
    const ineFrenteRef = useRef();
    const ineReversoRef = useRef();

    // Al abrir o cerrar el modal
    const afterOpenChange = (open) => {
        if (open) {
            const record = ref.current?.getData();
            if (!record) {
                form.resetFields();
                form.setFieldsValue({ estado: true });
                fotoRef.current?.reset();
                ineFrenteRef.current?.reset();
                ineReversoRef.current?.reset();
            }
        }
    };

    return (
        <AppModal
            ref={ref}
            afterOpenChange={afterOpenChange}
            width={720}
            destroyOnClose
            title={(record) => (
                <div className="flex items-center justify-between w-full pr-8">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <CrownOutlined className="text-amber-500" />
                        {record?.id ? 'Editar Presidente Municipal' : 'Registrar Nuevo Presidente Municipal'}
                    </div>
                    {(auth?.user?.role === 'superuser' || auth?.is_impersonating || auth?.impersonator?.role === 'superuser') && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold border-none shadow-sm"
                            onClick={() => {
                                const dummy = generatePresidenteFormData({});
                                form.setFieldsValue(dummy);
                                message.success('⚡ Datos de prueba generados exitosamente');
                            }}
                        >
                            ⚡ Llenar datos de prueba
                        </Button>
                    )}
                </div>
            )}
            footer={null}
        >
            {(record, close) => (
                <AppForm 
                    form={form} 
                    className="mt-4"
                    endpoint={record?.id ? `/presidentes/${record.id}` : '/presidentes'}
                    method={record?.id ? 'PUT' : 'POST'}
                    fetchUrl={record?.id ? `/presidentes/${record.id}` : undefined}
                    onDataFetched={(data) => {
                        console.log(data)
                        fotoRef.current?.setExistingUrl(data.foto_url);
                        ineFrenteRef.current?.setExistingUrl(data.ine_frente_url);
                        ineReversoRef.current?.setExistingUrl(data.ine_reverso_url);
                    }}
                    submitText={record?.id ? 'Actualizar' : 'Guardar Presidente'}
                    cancelText="Cancelar"
                    modalClose={close}
                    successMessage={record?.id ? 'Presidente actualizado correctamente' : 'Presidente registrado correctamente'}
                    onSuccess={() => {
                        if (onSuccess) onSuccess();
                    }}
                    beforeSubmit={(values) => {
                        values.estado = values.estado ? 1 : 0;
                        const fotoFile = fotoRef.current?.getFile();
                        const ineFrenteFile = ineFrenteRef.current?.getFile();
                        const ineReversoFile = ineReversoRef.current?.getFile();
                        
                        if (fotoFile) values.foto = fotoFile;
                        if (ineFrenteFile) values.ine_frente = ineFrenteFile;
                        if (ineReversoFile) values.ine_reverso = ineReversoFile;
                        
                        return values;
                    }}
                >
                    <Divider orientation="left" className="!text-xs !text-gray-400 !font-normal">
                        Asignación Geográfica
                    </Divider>
                    
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item 
                                name="state_id" 
                                label="Estado (Entidad)" 
                                rules={[{ required: true, message: 'Selecciona un estado' }]}
                            >
                                <AppSelect 
                                    fetchUrl="/catalogos/estados"
                                    placeholder="Seleccionar Estado"
                                    onChange={() => form.setFieldsValue({ municipality_id: undefined })}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            {/* Force re-render of municipality select when state_id changes */}
                            <Form.Item
                                noStyle
                                shouldUpdate={(prev, curr) => prev.state_id !== curr.state_id}
                            >
                                {({ getFieldValue }) => (
                                    <Form.Item 
                                        name="municipality_id" 
                                        label="Municipio" 
                                        rules={[{ required: true, message: 'Selecciona un municipio' }]}
                                    >
                                        <AppSelect 
                                            fetchUrl={getFieldValue('state_id') ? `/catalogos/municipios?state_id=${getFieldValue('state_id')}` : null}
                                            placeholder="Seleccionar Municipio"
                                            disabled={!getFieldValue('state_id')}
                                        />
                                    </Form.Item>
                                )}
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" className="!text-xs !text-gray-400 !font-normal">
                        Datos Personales y de Acceso
                    </Divider>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item 
                                name="nombre" 
                                label="Nombre(s)" 
                                rules={[{ required: true, message: 'Ingresa el nombre' }]}
                            >
                                <Input prefix={<UserOutlined />} placeholder="Nombre(s)" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item 
                                name="apellidos" 
                                label="Apellidos" 
                                rules={[{ required: true, message: 'Ingresa los apellidos' }]}
                            >
                                <Input prefix={<UserOutlined />} placeholder="Apellidos" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item 
                                name="email" 
                                label="Correo Electrónico (Login)" 
                                rules={[{ required: true, type: 'email', message: 'Ingresa un email válido' }]}
                            >
                                <Input prefix={<MailOutlined />} placeholder="presidente@correo.com" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item 
                                name="password" 
                                label={record?.id ? "Nueva Contraseña (Opcional)" : "Contraseña de Acceso"} 
                                rules={record?.id ? [] : [{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
                            >
                                <Input.Password prefix={<LockOutlined />} placeholder="******" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="telefono" label="Teléfono (10 dígitos)">
                                <Input prefix={<PhoneOutlined />} placeholder="3111234567" maxLength={10} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="curp" label="CURP (18 Caracteres)">
                                <Input prefix={<IdcardOutlined />} placeholder="18 Caracteres" maxLength={18} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="clave_electoral" label="Clave Electoral">
                                <Input prefix={<IdcardOutlined />} placeholder="Clave INE" maxLength={18} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="sexo" label="Sexo">
                                <Select placeholder="Selecciona" options={[
                                    { label: 'Masculino', value: 'Masculino' },
                                    { label: 'Femenino', value: 'Femenino' },
                                    { label: 'Otro', value: 'Otro' }
                                ]} />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item 
                                name="estado" 
                                label="Estatus" 
                                valuePropName="checked"
                                initialValue={true}
                            >
                                <Switch 
                                    checkedChildren="Activo" 
                                    unCheckedChildren="Inactivo" 
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" className="!text-xs !text-gray-400 !font-normal">
                        Fotografía de Perfil e Identificación (Opcional)
                    </Divider>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item label="Foto Perfil">
                                <AppUpload ref={fotoRef} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="INE Frente">
                                <AppUpload ref={ineFrenteRef} title="INE Frente" icon={<IdcardOutlined />} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="INE Reverso">
                                <AppUpload ref={ineReversoRef} title="INE Reverso" icon={<IdcardOutlined />} />
                            </Form.Item>
                        </Col>
                    </Row>
                </AppForm>
            )}
        </AppModal>
    );
});

export default PresidenteFormModal;
