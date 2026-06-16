import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Row, Col, message, Alert, Button, Divider, Upload, Form } from 'antd';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    SafetyCertificateOutlined,
    TeamOutlined,
    SaveOutlined,
    CloseOutlined,
    BankOutlined,
    UsergroupAddOutlined,
    CameraOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { router } from '@inertiajs/react';

const PromovidoFormModal = forwardRef(({ onSuccess, availablePromotores = [] }, ref) => {
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
        return false; // Previene la subida automática, la manejamos manualmente
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
                maskClosable: false,
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
                const endpoint = fetchUrl || (editId ? `/promovidos/${editId}` : '/promovidos');

                if (fileList.length > 0 && fileList[0].originFileObj) {
                    values.foto = fileList[0].originFileObj;
                } else {
                    // Si no hay archivo nuevo, eliminamos el campo foto para evitar que 
                    // la cadena de texto (ruta de la BD) cause un error de validación 'image'
                    delete values.foto;
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
                    const url = fetchUrl || `/api/promovidos/${editId}`;
                    const response = await axios.get(url);
                    if (response.data.foto) {
                        setExistingFoto(`/storage/${response.data.foto}`);
                    } else {
                        setExistingFoto(null);
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
            <div className="bg-[#0f172a] text-white p-6 rounded-t-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-lg">
                        <UsergroupAddOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold m-0 tracking-wide uppercase">
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} PROMOVIDO
                        </h2>
                        <p className="text-gray-300 text-sm m-0">Registro Simpatizantes</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-gray-300 bg-white/10 px-4 py-2 rounded-full text-sm">
                    <SafetyCertificateOutlined />
                    <span>Información segura</span>
                </div>
            </div>

            <div className="p-5">
                <Row gutter={48}>
                    <Col xs={24} md={15}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-[#0f172a] text-white p-1 rounded">
                                <UserOutlined />
                            </div>
                            <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">DATOS DEL PROMOVIDO</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />

                        <div className="mt-4">
                            {availablePromotores.length > 0 && (
                                <Row gutter={16} className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                                    <Col span={24}>
                                        <ProFormSelect
                                            name="promotor_id"
                                            label={<span className="font-bold text-blue-800">Asignar a Promotor</span>}
                                            placeholder="Seleccionar el Promotor que trajo a este simpatizante"
                                            rules={[{ required: true, message: 'Debe seleccionar un Promotor' }]}
                                            options={availablePromotores.map(p => ({
                                                label: p.apodo ? `${p.name} (${p.apodo})` : p.name,
                                                value: p.id
                                            }))}
                                            fieldProps={{ prefix: <TeamOutlined className="text-blue-500 mr-2" />, showSearch: true }}
                                        />
                                    </Col>
                                </Row>
                            )}
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="nombre"
                                        label="Nombre(s)"
                                        placeholder="Ingresar nombre(s)"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { max: 100, message: 'Máximo 100 caracteres' }
                                        ]}
                                        fieldProps={{
                                            prefix: <UserOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 100,
                                            showCount: true,
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="apellidos"
                                        label="Apellidos"
                                        placeholder="Ingresar apellidos"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { max: 100, message: 'Máximo 100 caracteres' }
                                        ]}
                                        fieldProps={{
                                            prefix: <UserOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 100,
                                            showCount: true,
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="clave_elector"
                                        label="Clave de elector"
                                        placeholder="18 caracteres"
                                        rules={[
                                            { max: 18, message: 'Máximo 18 caracteres' }
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
                                        name="telefono"
                                        label="Teléfono de contacto"
                                        placeholder="10 dígitos"
                                        rules={[
                                            { pattern: /^[0-9]{10}$/, message: 'Debe contener exactamente 10 dígitos' }
                                        ]}
                                        fieldProps={{
                                            prefix: <PhoneOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 10,
                                            onKeyPress: (e) => { if (!/[0-9]/.test(e.key)) e.preventDefault(); }
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={24}>
                                    <ProFormText
                                        name="colonia"
                                        label="Colonia"
                                        placeholder="Ingresar colonia"
                                        rules={[{ max: 255, message: 'Máximo 255 caracteres' }]}
                                        fieldProps={{
                                            prefix: <BankOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 255,
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

                            <Alert
                                message={<span className="font-bold">Privacidad</span>}
                                description="Los datos del promovido están protegidos y solo deben utilizarse para la estructura política y contacto."
                                type="info"
                                showIcon
                                className="mt-4 bg-blue-50 border-blue-200"
                            />
                        </div>
                    </Col>
                    
                    <Col xs={24} md={9}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-[#0f172a] text-white p-1 rounded">
                                <CameraOutlined />
                            </div>
                            <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">FOTOGRAFÍA</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />
                        
                        <div className="mt-4">
                            <Alert
                                description={<span className="text-sm text-blue-800">Fotografía del promovido para identificarlo fácilmente en campo.</span>}
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

export default PromovidoFormModal;
