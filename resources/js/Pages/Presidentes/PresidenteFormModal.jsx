import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
import { Row, Col, Input, Select, Switch, Upload, Button, Divider, message } from 'antd';
import {
    CrownOutlined,
    UserOutlined,
    MailOutlined,
    LockOutlined,
    PhoneOutlined,
    IdcardOutlined,
    CameraOutlined,
    ThunderboltOutlined,
    CloseOutlined,
    SaveOutlined,
} from '@ant-design/icons';
import { router, usePage } from '@inertiajs/react';
import { AppModal, AppForm, AppSelect } from '@/Components/Common';
import { generatePresidenteFormData } from '@/Utils/dummyDataGenerator';

const PresidenteFormModal = forwardRef(({ onSuccess }, ref) => {
    const { auth } = usePage().props;
    const modalRef = useRef();
    const formRef = useRef();

    const [editingRecord, setEditingRecord] = useState(null);
    const [fileListFoto, setFileListFoto] = useState([]);
    const [fileListIneFrente, setFileListIneFrente] = useState([]);
    const [fileListIneReverso, setFileListIneReverso] = useState([]);

    useImperativeHandle(ref, () => ({
        open(record = null) {
            setEditingRecord(record);
            setFileListFoto([]);
            setFileListIneFrente([]);
            setFileListIneReverso([]);
            modalRef.current?.open(record);
        },
        close() {
            modalRef.current?.close();
        },
    }));

    const isSuperuserOrImpersonating =
        auth?.user?.role === 'superuser' || auth?.is_impersonating || auth?.impersonator?.role === 'superuser';

    const isEdit = Boolean(editingRecord?.id);

    return (
        <AppModal
            ref={modalRef}
            title={(record) => (
                <div className="flex w-full items-center justify-between pr-8">
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <CrownOutlined className="text-amber-500" />
                        {record?.id ? 'Editar Presidente Municipal' : 'Registrar Nuevo Presidente Municipal'}
                    </div>
                    {isSuperuserOrImpersonating && (
                        <Button
                            type="primary"
                            size="small"
                            icon={<ThunderboltOutlined />}
                            className="border-none bg-amber-500 font-semibold text-white shadow-sm hover:bg-amber-600"
                            onClick={() => {
                                const dummy = generatePresidenteFormData();
                                formRef.current?.setValues(dummy);
                                message.success('⚡ Datos de prueba generados exitosamente');
                            }}
                        >
                            ⚡ Llenar datos de prueba
                        </Button>
                    )}
                </div>
            )}
            width={720}
            destroyOnHidden
        >
            {({ data, close }) => {
                const initialVals = data
                    ? {
                          nombre: data.nombre,
                          apellidos: data.apellidos,
                          email: data.email,
                          telefono: data.telefono,
                          curp: data.curp,
                          clave_electoral: data.clave_electoral,
                          state_id: data.state_id,
                          municipality_id: data.municipality_id,
                          sexo: data.sexo,
                          calle: data.calle,
                          numero_exterior: data.numero_exterior,
                          numero_interior: data.numero_interior,
                          colonia: data.colonia,
                          codigo_postal: data.codigo_postal,
                          apodo: data.apodo,
                          notas: data.notas,
                          estado: data.estado ?? true,
                      }
                    : {
                          estado: true,
                      };

                return (
                    <AppForm
                        ref={formRef}
                        initialValues={initialVals}
                        onSubmit={async (values, { setErrors, setLoading }) => {
                            const payload = {
                                ...values,
                                estado: values.estado ? 1 : 0,
                            };

                            if (fileListFoto.length > 0 && fileListFoto[0].originFileObj) {
                                payload.foto = fileListFoto[0].originFileObj;
                            }
                            if (fileListIneFrente.length > 0 && fileListIneFrente[0].originFileObj) {
                                payload.ine_frente = fileListIneFrente[0].originFileObj;
                            }
                            if (fileListIneReverso.length > 0 && fileListIneReverso[0].originFileObj) {
                                payload.ine_reverso = fileListIneReverso[0].originFileObj;
                            }

                            return new Promise((resolve) => {
                                const url = isEdit ? `/presidentes/${data.id}` : '/presidentes';
                                if (isEdit) {
                                    payload._method = 'PUT';
                                }

                                router.post(url, payload, {
                                    forceFormData: true,
                                    onSuccess: () => {
                                        message.success(
                                            isEdit
                                                ? 'Presidente actualizado correctamente'
                                                : 'Presidente registrado correctamente'
                                        );
                                        close();
                                        onSuccess?.();
                                        resolve();
                                    },
                                    onError: (errs) => {
                                        setErrors(errs);
                                        resolve();
                                    },
                                    onFinish: () => {
                                        setLoading(false);
                                    },
                                });
                            });
                        }}
                    >
                        {({ loading }) => (
                            <>
                                <Divider orientation="left" className="!text-xs !font-normal !text-gray-400">
                                    Asignación Geográfica
                                </Divider>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <AppForm.Item
                                            name="state_id"
                                            label="Estado (Entidad)"
                                            rules={[{ required: true, message: 'Selecciona un estado' }]}
                                        >
                                            <AppSelect endpoint="/catalogos/estados" placeholder="Seleccionar Estado" />
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={12}>
                                        <AppForm.Item
                                            name="municipality_id"
                                            label="Municipio"
                                            rules={[{ required: true, message: 'Selecciona un municipio' }]}
                                        >
                                            <AppSelect
                                                endpoint="/catalogos/municipios"
                                                dependsOn="state_id"
                                                dependencyParam="state_id"
                                                placeholder="Seleccionar Municipio"
                                                placeholderWhenDisabled="Selecciona primero un estado"
                                            />
                                        </AppForm.Item>
                                    </Col>
                                </Row>

                                <Divider orientation="left" className="!text-xs !font-normal !text-gray-400">
                                    Datos Personales y de Acceso
                                </Divider>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <AppForm.Item
                                            name="nombre"
                                            label="Nombre(s)"
                                            rules={[{ required: true, message: 'Ingresa el nombre' }]}
                                        >
                                            <Input prefix={<UserOutlined />} placeholder="Nombre(s)" />
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={12}>
                                        <AppForm.Item
                                            name="apellidos"
                                            label="Apellidos"
                                            rules={[{ required: true, message: 'Ingresa los apellidos' }]}
                                        >
                                            <Input prefix={<UserOutlined />} placeholder="Apellidos" />
                                        </AppForm.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <AppForm.Item
                                            name="email"
                                            label="Correo Electrónico (Login)"
                                            rules={[
                                                { required: true, type: 'email', message: 'Ingresa un email válido' },
                                            ]}
                                        >
                                            <Input prefix={<MailOutlined />} placeholder="presidente@correo.com" />
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={12}>
                                        <AppForm.Item
                                            name="password"
                                            label={isEdit ? 'Nueva Contraseña (Opcional)' : 'Contraseña de Acceso'}
                                            rules={
                                                isEdit
                                                    ? []
                                                    : [{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]
                                            }
                                        >
                                            <Input.Password prefix={<LockOutlined />} placeholder="******" />
                                        </AppForm.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <AppForm.Item name="telefono" label="Teléfono (10 dígitos)">
                                            <Input prefix={<PhoneOutlined />} placeholder="3111234567" maxLength={10} />
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={12}>
                                        <AppForm.Item name="curp" label="CURP (18 Caracteres)">
                                            <Input
                                                prefix={<IdcardOutlined />}
                                                placeholder="18 Caracteres"
                                                maxLength={18}
                                            />
                                        </AppForm.Item>
                                    </Col>
                                </Row>

                                <Row gutter={16}>
                                    <Col span={12}>
                                        <AppForm.Item name="clave_electoral" label="Clave Electoral">
                                            <Input prefix={<IdcardOutlined />} placeholder="Clave INE" maxLength={18} />
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={6}>
                                        <AppForm.Item name="sexo" label="Sexo">
                                            <Select
                                                placeholder="Selecciona"
                                                options={[
                                                    { label: 'Masculino', value: 'Masculino' },
                                                    { label: 'Femenino', value: 'Femenino' },
                                                    { label: 'Otro', value: 'Otro' },
                                                ]}
                                            />
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={6}>
                                        <AppForm.Item
                                            name="estado"
                                            label="Estatus"
                                            valuePropName="checked"
                                            initialValue={true}
                                        >
                                            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                                        </AppForm.Item>
                                    </Col>
                                </Row>

                                <Divider orientation="left" className="!text-xs !font-normal !text-gray-400">
                                    Fotografía de Perfil e Identificación (Opcional)
                                </Divider>

                                <Row gutter={16}>
                                    <Col span={8}>
                                        <AppForm.Item label="Foto Perfil">
                                            <Upload
                                                listType="picture-card"
                                                maxCount={1}
                                                fileList={fileListFoto}
                                                beforeUpload={() => false}
                                                onChange={({ fileList }) => setFileListFoto(fileList)}
                                            >
                                                {fileListFoto.length === 0 && (
                                                    <div>
                                                        <CameraOutlined />
                                                        <div style={{ marginTop: 8 }}>Subir Foto</div>
                                                    </div>
                                                )}
                                            </Upload>
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={8}>
                                        <AppForm.Item label="INE Frente">
                                            <Upload
                                                listType="picture-card"
                                                maxCount={1}
                                                fileList={fileListIneFrente}
                                                beforeUpload={() => false}
                                                onChange={({ fileList }) => setFileListIneFrente(fileList)}
                                            >
                                                {fileListIneFrente.length === 0 && (
                                                    <div>
                                                        <IdcardOutlined />
                                                        <div style={{ marginTop: 8 }}>INE Frente</div>
                                                    </div>
                                                )}
                                            </Upload>
                                        </AppForm.Item>
                                    </Col>
                                    <Col span={8}>
                                        <AppForm.Item label="INE Reverso">
                                            <Upload
                                                listType="picture-card"
                                                maxCount={1}
                                                fileList={fileListIneReverso}
                                                beforeUpload={() => false}
                                                onChange={({ fileList }) => setFileListIneReverso(fileList)}
                                            >
                                                {fileListIneReverso.length === 0 && (
                                                    <div>
                                                        <IdcardOutlined />
                                                        <div style={{ marginTop: 8 }}>INE Reverso</div>
                                                    </div>
                                                )}
                                            </Upload>
                                        </AppForm.Item>
                                    </Col>
                                </Row>

                                <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3">
                                    <Button onClick={close} icon={<CloseOutlined />}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={loading}
                                        icon={<SaveOutlined />}
                                        className="bg-[#0f172a] hover:bg-[#1e293b]"
                                    >
                                        {isEdit ? 'Actualizar' : 'Guardar Presidente'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </AppForm>
                );
            }}
        </AppModal>
    );
});

PresidenteFormModal.displayName = 'PresidenteFormModal';

export default PresidenteFormModal;
