import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { Row, Col, Upload, message, Alert, Button, Divider, Form } from 'antd';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    CameraOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    InboxOutlined,
    SaveOutlined,
    CloseOutlined,
    BankOutlined,
    LockOutlined,
    MailOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { router, usePage } from '@inertiajs/react';

const { Dragger } = Upload;

const PersonaFormModal = forwardRef(({ onSuccess, entityType = 'RD', availableRds = [] }, ref) => {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editId, setEditingId] = useState(null);
    const [fetchUrl, setFetchUrl] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [existingFoto, setExistingFoto] = useState(null);

    useImperativeHandle(ref, () => ({
        open(id = null, url = null) {
            setFileList([]);
            setExistingFoto(null);
            setEditingId(id);
            setFetchUrl(url);
            setOpen(true);
        },
        close() {
            setOpen(false);
        }
    }));

    const [form] = Form.useForm();
    const [demarcaciones, setDemarcaciones] = useState([]);
    const [secciones, setSecciones] = useState([]);
    const [selectedDemarcacion, setSelectedDemarcacion] = useState(null);
    const [loadingDemarcaciones, setLoadingDemarcaciones] = useState(false);
    const [loadingSecciones, setLoadingSecciones] = useState(false);

    const fetchSecciones = async (demarcacionId) => {
        if (!demarcacionId) {
            setSecciones([]);
            return;
        }
        setLoadingSecciones(true);
        try {
            const res = await axios.get(`/catalogos/demarcaciones/${demarcacionId}/secciones`);
            setSecciones(res.data || []);
        } catch (err) {
            message.error('Error al cargar las secciones electorales');
        } finally {
            setLoadingSecciones(false);
        }
    };

    useEffect(() => {
        if (open) {
            setFileList([]);
            setExistingFoto(null);
            const fetchDemarcaciones = async () => {
                setLoadingDemarcaciones(true);
                try {
                    const res = await axios.get('/catalogos/demarcaciones');
                    setDemarcaciones(res.data || []);
                } catch (err) {
                    message.error('Error al cargar las demarcaciones');
                } finally {
                    setLoadingDemarcaciones(false);
                }
            };
            fetchDemarcaciones();
            if (!editId) {
                form.resetFields();
                setSelectedDemarcacion(null);
                setSecciones([]);
            }
        }
    }, [open, editId]);

    const handleUploadChange = (info) => {
        setFileList(info.fileList.slice(-1));
    };

    const handleBeforeUpload = (file) => {
        const maxSizeMB = 5;
        if (file.size / 1024 / 1024 > maxSizeMB) {
            message.error(`❌ La foto es demasiado pesada. El tamaño máximo es ${maxSizeMB} MB. Tu archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
            return Upload.LIST_IGNORE;
        }
        return false;
    };

    return (
        <ModalForm
            form={form}
            title={null}
            open={open}
            onOpenChange={setOpen}
            width={1000}
            modalProps={{
                destroyOnClose: true,
                maskClosable: true,
                keyboard: true,
                bodyStyle: { padding: 0 },
                closeIcon: null,
            }}
            submitter={{
                render: (props) => {
                    return (
                        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                            <Button 
                                key="cancel" 
                                onClick={() => setOpen(false)}
                                icon={<CloseOutlined />}
                                className="border-gray-300 text-gray-700"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                key="submit" 
                                type="primary" 
                                onClick={() => props.form?.submit?.()}
                                icon={<SaveOutlined />}
                                className="bg-[#0f172a]"
                            >
                                Guardar registro
                            </Button>
                        </div>
                    );
                },
            }}
            onFinish={async (values) => {
                const basePath = entityType === 'Operador' ? '/operadores' : (entityType === 'Promotor' ? '/promotores' : '/representantes');
                const endpoint = fetchUrl || (editId ? `${basePath}/${editId}` : basePath);
                
                if (fileList.length > 0 && fileList[0].originFileObj) {
                    values.foto = fileList[0].originFileObj;
                }

                if (values.estado !== undefined && values.estado !== null) {
                    values.estado = (values.estado === true || values.estado === 1 || values.estado === '1') ? 1 : 0;
                }

                if (editId) {
                    values._method = 'put';
                    router.post(endpoint, values, {
                        forceFormData: true,
                        onSuccess: () => {
                            message.success('Registro actualizado exitosamente');
                            if (onSuccess) onSuccess(values);
                            setOpen(false);
                        },
                        onError: () => message.error('Por favor revisa los campos en rojo')
                    });
                } else {
                    router.post(endpoint, values, {
                        forceFormData: true,
                        onSuccess: () => {
                            message.success('Registro creado exitosamente');
                            if (onSuccess) onSuccess(values);
                            setOpen(false);
                        },
                        onError: () => message.error('Por favor revisa los campos en rojo')
                    });
                }
                // Retornar false para evitar que ProForm cierre el modal automáticamente antes del response
                return false;
            }}
            request={async () => {
                if (!editId) {
                    setExistingFoto(null);
                    setSelectedDemarcacion(null);
                    setSecciones([]);
                    return {};
                }
                try {
                    const url = fetchUrl || `/api/personas/${editId}`;
                    const response = await axios.get(url);
                    if (response.data.foto_url) {
                        setExistingFoto(response.data.foto_url);
                    } else {
                        setExistingFoto(null);
                    }
                    
                    if (response.data.estado !== undefined && response.data.estado !== null) {
                        response.data.estado = (response.data.estado === true || response.data.estado === 1 || response.data.estado === '1');
                    }

                    if (response.data.demarcacion) {
                        setSelectedDemarcacion(response.data.demarcacion);
                        fetchSecciones(response.data.demarcacion);
                    } else {
                        setSelectedDemarcacion(null);
                        setSecciones([]);
                    }

                    return response.data;
                } catch (error) {
                    message.error('No se pudo cargar la información del registro');
                    return {};
                }
            }}
        >
            {/* Custom Header */}
            <div className="bg-[#0f172a] text-white p-6 rounded-t-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-lg">
                        <TeamOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold m-0 tracking-wide uppercase">
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} {entityType === 'RD' ? 'Representante Demarcación' : (entityType === 'Operador' ? 'Operador Político' : 'Promotor')}
                        </h2>
                        <p className="text-gray-300 text-sm m-0">Estructura Política y Control Territorial</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-gray-300 bg-white/10 px-4 py-2 rounded-full text-sm">
                    <SafetyCertificateOutlined />
                    <span>Información segura y confidencial</span>
                </div>
            </div>

            <div className="p-5">
                <Row gutter={48}>
                    {/* Left Column: Personal Data */}
                    <Col xs={24} md={15}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-[#0f172a] text-white p-1 rounded">
                                <UserOutlined />
                            </div>
                            <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">DATOS PERSONALES</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />

                        <div className="mt-4">
                            {(entityType === 'Operador' && auth?.user?.role === 'presidente') || (entityType === 'Promotor' && ['presidente', 'rd'].includes(auth?.user?.role)) ? (
                                <Row gutter={16} className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                                    <Col span={24}>
                                        <ProFormSelect
                                            name="parent_id"
                                            label={<span className="font-bold text-blue-800">Asignar a {entityType === 'Operador' ? 'Representante de Demarcación (RD)' : 'Operador'}</span>}
                                            placeholder={`Seleccionar el ${entityType === 'Operador' ? 'RD' : 'Operador'} responsable`}
                                            rules={[{ required: true, message: 'Requerido' }]}
                                            options={availableRds.map(rd => ({
                                                label: rd.apodo ? `${rd.name} (${rd.apodo})` : rd.name,
                                                value: rd.id
                                            }))}
                                            fieldProps={{ prefix: <TeamOutlined className="text-blue-500 mr-2" />, showSearch: true }}
                                        />
                                    </Col>
                                </Row>
                            ) : null}
                            <Row gutter={16}>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="nombre"
                                        label="Nombre(s)"
                                        placeholder="Ingresar nombre(s)"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <UserOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="apellidos"
                                        label="Apellidos"
                                        placeholder="Ingresar apellidos"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <UserOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="apodo"
                                        label="Apodo (alias)"
                                        placeholder="Ingresar apodo"
                                        fieldProps={{ prefix: <UserOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="sexo"
                                        label="Sexo"
                                        placeholder="Seleccionar"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        options={[
                                            { label: 'Masculino', value: 'Masculino' },
                                            { label: 'Femenino', value: 'Femenino' },
                                        ]}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="estado"
                                        label="Estatus"
                                        placeholder="Seleccionar estatus"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        options={[
                                            { label: 'Activo', value: true },
                                            { label: 'Inactivo', value: false },
                                        ]}
                                        initialValue={true}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={24}>
                                    <ProFormText.Password
                                        name="password"
                                        label="Contraseña de acceso"
                                        placeholder={editId ? "Dejar en blanco para conservar la actual" : "Ingresar contraseña (mín. 6 caracteres)"}
                                        rules={[{ required: !editId, message: 'La contraseña es requerida para un nuevo registro' }, { min: 6, message: 'Mínimo 6 caracteres' }]}
                                        fieldProps={{ prefix: <LockOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="calle"
                                        label="Calle"
                                        placeholder="Ingresar calle"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <EnvironmentOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={12} md={6}>
                                    <ProFormText
                                        name="numero_exterior"
                                        label="No. Ext"
                                        placeholder="Exterior"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <span className="text-gray-400 font-bold mr-2">#</span> }}
                                    />
                                </Col>
                                <Col xs={12} md={6}>
                                    <ProFormText
                                        name="numero_interior"
                                        label="No. Int"
                                        placeholder="Interior"
                                        fieldProps={{ prefix: <span className="text-gray-400 font-bold mr-2">#</span> }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="colonia"
                                        label="Colonia"
                                        placeholder="Ingresar colonia"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{ prefix: <BankOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="codigo_postal"
                                        label="Código Postal"
                                        placeholder="Ingresar C.P."
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { pattern: /^[0-9]{5}$/, message: 'Debe contener exactamente 5 números' }
                                        ]}
                                        fieldProps={{ 
                                            prefix: <span className="text-gray-400 font-bold mr-2">CP</span>,
                                            maxLength: 5,
                                            onKeyPress: (event) => {
                                                if (!/[0-9]/.test(event.key)) {
                                                    event.preventDefault();
                                                }
                                            }
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="demarcacion"
                                        label="Demarcación"
                                        placeholder="Seleccionar demarcación"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="text-gray-400 mr-2" />,
                                            loading: loadingDemarcaciones,
                                            onChange: (value) => {
                                                setSelectedDemarcacion(value);
                                                form.setFieldsValue({ seccion_electoral: undefined });
                                                fetchSecciones(value);
                                            }
                                        }}
                                        options={demarcaciones.map(d => ({
                                            label: d.nombre,
                                            value: String(d.id)
                                        }))}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="seccion_electoral"
                                        label="Sección Electoral"
                                        placeholder="Seleccionar sección"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        disabled={!selectedDemarcacion}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="text-gray-400 mr-2" />,
                                            loading: loadingSecciones,
                                        }}
                                        options={secciones.map(s => ({
                                            label: `Sección ${s.numero}`,
                                            value: String(s.numero)
                                        }))}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="curp"
                                        label="CURP"
                                        placeholder="Ingresar CURP"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { len: 18, message: 'Debe contener exactamente 18 caracteres' }
                                        ]}
                                        fieldProps={{ 
                                            prefix: <IdcardOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' }
                                        }}
                                        transform={(val) => val ? val.toUpperCase() : val}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="clave_electoral"
                                        label="Clave electoral"
                                        placeholder="Clave electoral"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { len: 18, message: 'Debe contener exactamente 18 caracteres' }
                                        ]}
                                        fieldProps={{ 
                                            prefix: <IdcardOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' }
                                        }}
                                        transform={(val) => val ? val.toUpperCase() : val}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="telefono"
                                        label="Teléfono"
                                        placeholder="Ingresar teléfono"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { pattern: /^[0-9]{10}$/, message: 'Debe contener exactamente 10 números' }
                                        ]}
                                        fieldProps={{ 
                                            prefix: <PhoneOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 10,
                                            onKeyPress: (event) => {
                                                if (!/[0-9]/.test(event.key)) {
                                                    event.preventDefault();
                                                }
                                            }
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="email"
                                        label="Correo electrónico"
                                        placeholder="Ingresar correo (opcional)"
                                        rules={[
                                            { type: 'email', message: 'Correo no válido' }
                                        ]}
                                        fieldProps={{ prefix: <MailOutlined className="text-gray-400 mr-2" /> }}
                                    />
                                </Col>
                            </Row>

                            {entityType === 'RD' && (
                                <Row gutter={16}>
                                    <Col span={24}>
                                        <ProFormTextArea
                                            name="notas"
                                            label="Notas"
                                            placeholder="Ingresar notas adicionales (opcional)"
                                            fieldProps={{ rows: 6 }}
                                        />
                                    </Col>
                                </Row>
                            )}

                            <Alert
                                message={<span className="font-bold">IMPORTANTE</span>}
                                description="Verifica que todos los datos sean correctos antes de guardar el registro. La información será utilizada únicamente para fines de organización y estrategia política."
                                type="success"
                                showIcon
                                className="mt-0 bg-green-50 border-green-200"
                            />
                        </div>
                    </Col>

                    {/* Right Column: Photography */}
                    <Col xs={24} md={9}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-[#0f172a] text-white p-1 rounded">
                                <CameraOutlined />
                            </div>
                            <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">FOTOGRAFÍA ACTUAL</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />
                        
                        <div className="mt-4">
                            <Alert
                                description={<span className="text-sm text-blue-800">Fotografía actual de la persona. Esto nos ayuda a identificarla fácilmente en campo.</span>}
                                type="info"
                                showIcon
                                className="mb-6 bg-blue-50 border-blue-100"
                            />

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50 h-[260px]">
                                {fileList.length > 0 ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <img 
                                            src={URL.createObjectURL(fileList[0].originFileObj)} 
                                            alt="avatar" 
                                            className="w-28 h-28 object-cover rounded-full border-4 border-white shadow-md mb-3"
                                        />
                                        <Button danger size="small" onClick={() => setFileList([])}>Eliminar foto</Button>
                                    </div>
                                ) : existingFoto ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <img 
                                            src={existingFoto} 
                                            alt="avatar" 
                                            className="w-28 h-28 object-cover rounded-full border-4 border-white shadow-md mb-3"
                                        />
                                        <Upload
                                            beforeUpload={handleBeforeUpload}
                                            onChange={handleUploadChange}
                                            showUploadList={false}
                                            accept="image/*"
                                            capture="environment"
                                        >
                                            <Button type="primary" size="small" className="bg-[#0f172a] mb-2" icon={<CameraOutlined />}>
                                                Cambiar fotografía
                                            </Button>
                                        </Upload>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-28 h-28 bg-gray-200 rounded-full flex items-center justify-center mb-4 relative shadow-inner">
                                            <UserOutlined className="text-6xl text-gray-400" />
                                            <div className="absolute bottom-2 right-2 bg-[#0f172a] w-10 h-10 rounded-full flex items-center justify-center border-2 border-white cursor-pointer hover:bg-blue-800 transition-colors">
                                                <CameraOutlined className="text-white text-lg" />
                                            </div>
                                        </div>
                                        <Upload
                                            beforeUpload={handleBeforeUpload}
                                            onChange={handleUploadChange}
                                            showUploadList={false}
                                            accept="image/*"
                                            capture="environment"
                                        >
                                            <Button type="primary" size="small" className="bg-[#0f172a] mb-2" icon={<CameraOutlined />}>
                                                Tomar fotografía
                                            </Button>
                                        </Upload>
                                        <p className="text-gray-400 text-xs mt-2">Formatos permitidos: JPG, PNG (Max: 5MB)</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>
        </ModalForm>
    );
});

export default PersonaFormModal;
