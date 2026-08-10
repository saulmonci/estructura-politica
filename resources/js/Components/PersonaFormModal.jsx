import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ModalForm, ProFormText, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { Row, Col, Upload, message, Alert, Button, Divider, Form, Image } from 'antd';
import { 
    UserOutlined, 
    EnvironmentOutlined, 
    IdcardOutlined, 
    PhoneOutlined, 
    CameraOutlined,
    PictureOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    InboxOutlined,
    SaveOutlined,
    CloseOutlined,
    BankOutlined,
    LockOutlined,
    MailOutlined,
    ThunderboltOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import IneScanner from './IneScanner';
import imageCompression from 'browser-image-compression';
import { generatePersonaFormData } from '@/Utils/dummyDataGenerator';

const { Dragger } = Upload;

const PersonaFormModal = forwardRef(({ onSuccess, entityType = 'RD', availableRds = [], availablePresidentes = [] }, ref) => {
    const { auth } = usePage().props;
    const [open, setOpen] = useState(false);
    const [editId, setEditingId] = useState(null);
    const [fetchUrl, setFetchUrl] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [existingFoto, setExistingFoto] = useState(null);
    const [fileListIneFrente, setFileListIneFrente] = useState([]);
    const [existingIneFrente, setExistingIneFrente] = useState(null);
    const [fileListIneReverso, setFileListIneReverso] = useState([]);
    const [existingIneReverso, setExistingIneReverso] = useState(null);

    useImperativeHandle(ref, () => ({
        open(id = null, url = null) {
            setFileList([]);
            setExistingFoto(null);
            setFileListIneFrente([]);
            setExistingIneFrente(null);
            setFileListIneReverso([]);
            setExistingIneReverso(null);
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
            setFileListIneFrente([]);
            setExistingIneFrente(null);
            setFileListIneReverso([]);
            setExistingIneReverso(null);
            setSelectedDemarcacion(null);
            setSecciones([]);

            // Limpiar todos los campos inmediatamente al abrir para evitar stale data flash
            form.resetFields();
            form.setFieldsValue({
                parent_id: undefined,
                nombre: '',
                apellidos: '',
                apodo: '',
                sexo: undefined,
                estado: true,
                password: '',
                calle: '',
                numero_exterior: '',
                numero_interior: '',
                colonia: '',
                codigo_postal: '',
                demarcacion_id: undefined,
                demarcacion_asignada_id: undefined,
                seccion_electoral: undefined,
                curp: '',
                clave_electoral: '',
                telefono: '',
                email: '',
                notas: ''
            });

            const fetchDemarcaciones = async () => {
                setLoadingDemarcaciones(true);
                try {
                    const res = await axios.get('/catalogos/demarcaciones');
                    const data = res.data || [];
                    setDemarcaciones(data);
                    
                    // Auto-seleccionar si solo hay una demarcación disponible (ej. para RDs)
                    if (data.length === 1 && !editId) {
                        const demId = String(data[0].id);
                        form.setFieldsValue({ demarcacion_id: demId });
                        setSelectedDemarcacion(demId);
                        fetchSecciones(demId);
                    }
                } catch (err) {
                    message.error('Error al cargar las demarcaciones');
                } finally {
                    setLoadingDemarcaciones(false);
                }
            };
            fetchDemarcaciones();

            if (editId) {
                const url = fetchUrl || `/api/personas/${editId}`;
                axios.get(url)
                    .then(response => {
                        const data = response.data;
                        if (data.foto_url) {
                            setExistingFoto(data.foto_url);
                        } else {
                            setExistingFoto(null);
                        }
                        if (data.ine_frente_url) {
                            setExistingIneFrente(data.ine_frente_url);
                        } else {
                            setExistingIneFrente(null);
                        }
                        if (data.ine_reverso_url) {
                            setExistingIneReverso(data.ine_reverso_url);
                        } else {
                            setExistingIneReverso(null);
                        }
                        
                        if (data.estado !== undefined && data.estado !== null) {
                            data.estado = (data.estado === true || data.estado === 1 || data.estado === '1');
                        }

                        if (data.demarcacion_id) {
                            if (data.demarcacion_asignada_id) {
                                data.demarcacion_asignada_id = String(data.demarcacion_asignada_id);
                            }
                            
                            const demId = String(data.demarcacion_id);
                            setSelectedDemarcacion(demId);
                            setLoadingSecciones(true);
                            axios.get(`/catalogos/demarcaciones/${demId}/secciones`)
                                .then(secRes => {
                                    setSecciones(secRes.data || []);
                                    form.setFieldsValue({
                                        ...data,
                                        demarcacion_id: demId,
                                        seccion_electoral: data.seccion_electoral ? String(data.seccion_electoral) : undefined
                                    });
                                })
                                .catch(() => {
                                    message.error('Error al cargar las secciones electorales');
                                })
                                .finally(() => {
                                    setLoadingSecciones(false);
                                });
                        } else {
                            setSelectedDemarcacion(null);
                            setSecciones([]);
                            form.setFieldsValue(data);
                        }
                    })
                    .catch(() => {
                        message.error('No se pudo cargar la información del registro');
                    });
            }
        }
    }, [open, editId, fetchUrl]);

    const compressImage = async (file) => {
        const options = {
            maxSizeMB: 3.8, // Ligeramente debajo de 4MB para estar seguros
            maxWidthOrHeight: 1920,
            useWebWorker: true
        };
        try {
            message.loading({ content: 'Procesando y comprimiendo imagen...', key: 'compress' });
            const compressedFile = await imageCompression(file, options);
            message.success({ content: 'Imagen procesada', key: 'compress' });
            return compressedFile;
        } catch (error) {
            console.error(error);
            message.error({ content: 'Error procesando imagen', key: 'compress' });
            return file;
        }
    };

    const handleBeforeUploadFoto = async (file) => {
        const compressedFile = await compressImage(file);
        setFileList([{ originFileObj: compressedFile }]);
        return Upload.LIST_IGNORE;
    };

    const handleBeforeUploadIneFrente = async (file) => {
        const compressedFile = await compressImage(file);
        setFileListIneFrente([{ originFileObj: compressedFile }]);
        return Upload.LIST_IGNORE;
    };

    const handleBeforeUploadIneReverso = async (file) => {
        const compressedFile = await compressImage(file);
        setFileListIneReverso([{ originFileObj: compressedFile }]);
        return Upload.LIST_IGNORE;
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
                    const userRole = auth?.user?.role?.toLowerCase() || '';
                    const requiresParent = ((entityType === 'Representante' || entityType === 'Coordinador') && ['admin', 'superadmin', 'superuser'].includes(userRole)) || (entityType === 'Operador' && ['presidente', 'coordinador_distrito', 'admin', 'superadmin', 'superuser'].includes(userRole)) || (entityType === 'Promotor' && ['presidente', 'coordinador_distrito', 'rd', 'admin', 'superadmin', 'superuser'].includes(userRole));
                    const isDisabled = requiresParent && ((entityType === 'Representante' || entityType === 'Coordinador') ? availablePresidentes.length === 0 : availableRds.length === 0);
                    
                    return (
                        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
                            <Button 
                                key="cancel" 
                                htmlType="button"
                                onClick={() => setOpen(false)}
                                icon={<CloseOutlined />}
                                className="border-gray-300 text-gray-700"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                key="submit" 
                                type="primary" 
                                htmlType="button"
                                onClick={() => props.form?.submit?.()}
                                icon={<SaveOutlined />}
                                className="bg-[#0f172a]"
                                disabled={isDisabled}
                            >
                                Guardar registro
                            </Button>
                        </div>
                    );
                },
            }}
            onFinish={async (values) => {
                const basePath = entityType === 'Operador' ? '/operadores' : (entityType === 'Promotor' ? '/promotores' : (entityType === 'Coordinador' ? '/coordinadores' : '/representantes'));
                const endpoint = fetchUrl || (editId ? `${basePath}/${editId}` : basePath);
                
                if (fileList.length > 0 && fileList[0].originFileObj) {
                    values.foto = fileList[0].originFileObj;
                }

                if (fileListIneFrente.length > 0 && fileListIneFrente[0].originFileObj) {
                    values.ine_frente = fileListIneFrente[0].originFileObj;
                }
                
                if (fileListIneReverso.length > 0 && fileListIneReverso[0].originFileObj) {
                    values.ine_reverso = fileListIneReverso[0].originFileObj;
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
                        onError: (errors) => {
                            if (errors) {
                                const fieldErrors = Object.keys(errors).map((key) => ({
                                    name: key,
                                    errors: Array.isArray(errors[key]) ? errors[key] : [errors[key]],
                                }));
                                form.setFields(fieldErrors);
                            }
                            message.error('Por favor revisa los campos en rojo');
                        }
                    });
                } else {
                    router.post(endpoint, values, {
                        forceFormData: true,
                        onSuccess: () => {
                            message.success('Registro creado exitosamente');
                            if (onSuccess) onSuccess(values);
                            setOpen(false);
                        },
                        onError: (errors) => {
                            if (errors) {
                                const fieldErrors = Object.keys(errors).map((key) => ({
                                    name: key,
                                    errors: Array.isArray(errors[key]) ? errors[key] : [errors[key]],
                                }));
                                form.setFields(fieldErrors);
                            }
                            message.error('Por favor revisa los campos en rojo');
                        }
                    });
                }
                // Retornar false para evitar que ProForm cierre el modal automáticamente antes del response
                return false;
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
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} {entityType === 'Coordinador' ? 'Coordinador de Distrito' : (entityType === 'RD' || entityType === 'Representante' ? 'Representante Demarcación' : (entityType === 'Operador' ? 'Operador Político' : 'Promotor'))}
                        </h2>
                        <p className="text-gray-300 text-sm m-0">Estructura Política y Control Territorial</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(auth?.user?.role === 'superuser' || auth?.is_impersonating || auth?.impersonator?.role === 'superuser') && (
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold border-none shadow-md"
                            onClick={() => {
                                const dummy = generatePersonaFormData({
                                    entityType,
                                    userRole: auth?.user?.role,
                                    availablePresidentes,
                                    availableRds,
                                    demarcaciones,
                                    secciones,
                                });
                                form.setFieldsValue(dummy);
                                if (dummy.demarcacion_id) {
                                    setSelectedDemarcacion(dummy.demarcacion_id);
                                    fetchSecciones(dummy.demarcacion_id);
                                }
                                message.success('⚡ Datos de prueba generados exitosamente');
                            }}
                        >
                            ⚡ Llenar datos de prueba
                        </Button>
                    )}
                    <div className="hidden sm:flex items-center gap-2 text-gray-300 bg-white/10 px-4 py-2 rounded-full text-sm">
                        <SafetyCertificateOutlined />
                        <span>Información segura</span>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <Row gutter={48}>
                    <Col xs={24} lg={15}>
                        <IneScanner onDataExtracted={async (data, compressedFile) => {
                            // 1. Normalizar sexo
                            let sexo = data.sexo;
                            if (sexo) {
                                const s = String(sexo).trim().toUpperCase();
                                if (s === 'H' || s === 'MASCULINO' || s === 'HOMBRE') {
                                    sexo = 'Masculino';
                                } else if (s === 'M' || s === 'FEMENINO' || s === 'MUJER') {
                                    sexo = 'Femenino';
                                }
                            }

                            // 2. Clave electoral
                            const claveElectoral = data.clave_electoral || data.clave_elector || '';

                            // 3. Preparar campos
                            const fieldsToSet = {
                                nombre: data.nombre || '',
                                apellidos: data.apellidos || '',
                                sexo: sexo || undefined,
                                calle: data.calle || '',
                                numero_exterior: data.numero_exterior || '',
                                numero_interior: data.numero_interior || '',
                                colonia: data.colonia || '',
                                codigo_postal: data.codigo_postal || '',
                                curp: data.curp || '',
                                clave_electoral: claveElectoral,
                            };

                            // 4. Si viene imagen comprimida y no hay foto de frente asignada, asignarla
                            if (compressedFile && fileListIneFrente.length === 0) {
                                setFileListIneFrente([{ originFileObj: compressedFile }]);
                            }

                            // 5. Manejar Demarcación y Sección
                            if (data.demarcacion_id) {
                                const demId = String(data.demarcacion_id);
                                fieldsToSet.demarcacion_id = demId;
                                setSelectedDemarcacion(demId);
                                
                                setLoadingSecciones(true);
                                try {
                                    const secRes = await axios.get(`/catalogos/demarcaciones/${demId}/secciones`);
                                    const secList = secRes.data || [];
                                    setSecciones(secList);
                                    
                                    if (data.seccion_electoral) {
                                        const rawSec = String(data.seccion_electoral);
                                        const trimmedSec = rawSec.replace(/^0+/, '');
                                        const foundSec = secList.find(s => String(s.numero) === rawSec || String(s.numero) === trimmedSec);
                                        if (foundSec) {
                                            fieldsToSet.seccion_electoral = String(foundSec.numero);
                                        } else {
                                            fieldsToSet.seccion_electoral = rawSec;
                                        }
                                    }
                                } catch (e) {
                                    console.error('Error al cargar secciones para la demarcación', e);
                                } finally {
                                    setLoadingSecciones(false);
                                }
                            } else if (data.seccion_electoral) {
                                fieldsToSet.seccion_electoral = String(data.seccion_electoral);
                            }

                            form.setFieldsValue(fieldsToSet);
                            message.success('Campos llenados automáticamente');
                        }} />

                        <div className="mt-4">
                            {(() => {
                                const userRole = auth?.user?.role?.toLowerCase() || '';
                                const requiresParent = ((entityType === 'Representante' || entityType === 'Coordinador') && ['admin', 'superadmin', 'superuser'].includes(userRole)) || (entityType === 'Operador' && ['presidente', 'coordinador_distrito', 'admin', 'superadmin', 'superuser'].includes(userRole)) || (entityType === 'Promotor' && ['presidente', 'coordinador_distrito', 'rd', 'admin', 'superadmin', 'superuser'].includes(userRole));
                                
                                const parentOptions = (entityType === 'Representante' || entityType === 'Coordinador')
                                    ? availablePresidentes.map(p => ({ label: p.apodo ? `${p.name} (${p.apodo})` : p.name, value: p.id }))
                                    : availableRds.map(rd => ({ label: rd.apodo ? `${rd.name} (${rd.apodo})` : rd.name, value: rd.id }));
                                    
                                const parentLabel = (entityType === 'Representante' || entityType === 'Coordinador') ? 'Presidente a cargo' : (entityType === 'Operador' ? 'Representante de Demarcación (RD)' : 'Operador');
                                
                                return requiresParent ? (
                                <Row gutter={16} className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                                    <Col span={24}>
                                        <ProFormSelect
                                            name="parent_id"
                                            label={<span className="font-bold text-blue-800">Asignar a {parentLabel}</span>}
                                            placeholder={`Seleccionar el ${parentLabel} responsable`}
                                            rules={[{ required: true, message: 'Requerido' }]}
                                            options={parentOptions}
                                            fieldProps={{ prefix: <TeamOutlined className="text-blue-500 mr-2" />, showSearch: true }}
                                        />
                                    </Col>
                                </Row>
                            ) : null;
                            })()}
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
                                        rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}
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

                            {entityType === 'RD' && (
                                <Row gutter={16} className="mb-4">
                                    <Col span={24}>
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                            <h4 className="text-blue-800 font-bold mb-2 flex items-center">
                                                <TeamOutlined className="mr-2" /> ZONA DE RESPONSABILIDAD
                                            </h4>
                                            <p className="text-sm text-blue-700 mb-3">
                                                Selecciona la demarcación de la cual este Representante será responsable. Esta demarcación determinará los datos que el RD podrá visualizar.
                                            </p>
                                            <ProFormSelect
                                                name="demarcacion_asignada_id"
                                                label="Demarcación Asignada / A Cargo"
                                                placeholder="Seleccionar demarcación asignada"
                                                rules={[{ required: true, message: 'Requerido' }]}
                                                fieldProps={{
                                                    prefix: <EnvironmentOutlined className="text-blue-500 mr-2" />,
                                                    loading: loadingDemarcaciones,
                                                }}
                                                options={demarcaciones.map(d => ({
                                                    label: d.nombre,
                                                    value: String(d.id)
                                                }))}
                                            />
                                        </div>
                                    </Col>
                                </Row>
                            )}

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="demarcacion_id"
                                        label={entityType === 'RD' ? "Demarcación (Info Personal)" : "Demarcación"}
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
                                        formItemProps={{
                                            getValueFromEvent: (e) => e.target.value.toUpperCase().replace(/[^A-Z0-9Ñ]/ig, '')
                                        }}
                                        fieldProps={{ 
                                            prefix: <IdcardOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' }
                                        }}
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
                                        formItemProps={{
                                            getValueFromEvent: (e) => e.target.value.toUpperCase().replace(/[^A-Z0-9]/ig, '')
                                        }}
                                        fieldProps={{ 
                                            prefix: <IdcardOutlined className="text-gray-400 mr-2" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' }
                                        }}
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
                            <h3 className="text-[#0f172a] font-bold m-0 tracking-wide text-sm">FOTOGRAFÍAS</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />
                        
                        <div className="mt-4">
                            <Alert
                                description={<span className="text-sm text-blue-800">Fotografía actual de la persona. Esto nos ayuda a identificarla fácilmente en campo.</span>}
                                type="info"
                                showIcon
                                className="mb-6 bg-blue-50 border-blue-100"
                            />

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50 min-h-[260px]">
                                <span className="text-gray-500 font-bold mb-2">FOTO DE PERFIL</span>
                                {fileList.length > 0 ? (
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <Image 
                                            src={URL.createObjectURL(fileList[0].originFileObj)} 
                                            alt="avatar" 
                                            width={96}
                                            height={96}
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-lg border-4 border-white shadow-md mb-3"
                                        />
                                        <Button danger size="small" onClick={() => setFileList([])}>Eliminar foto</Button>
                                    </div>
                                ) : existingFoto ? (
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <Image 
                                            src={existingFoto} 
                                            alt="avatar" 
                                            width={96}
                                            height={96}
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-lg border-4 border-white shadow-md mb-3"
                                        />
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Upload
                                                beforeUpload={handleBeforeUploadFoto}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                                    Cámara
                                                </Button>
                                            </Upload>
                                            <Upload
                                                beforeUpload={handleBeforeUploadFoto}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <Button size="small" icon={<PictureOutlined />}>
                                                    Galería
                                                </Button>
                                            </Upload>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center mb-4 relative shadow-inner">
                                            <UserOutlined className="text-6xl text-gray-400" />
                                        </div>
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Upload
                                                beforeUpload={handleBeforeUploadFoto}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                                    Cámara
                                                </Button>
                                            </Upload>
                                            <Upload
                                                beforeUpload={handleBeforeUploadFoto}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <Button size="small" icon={<PictureOutlined />}>
                                                    Galería
                                                </Button>
                                            </Upload>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-2 mb-0">Max: 4MB</p>
                                    </>
                                )}
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50 min-h-[260px] mt-4">
                                <span className="text-gray-500 font-bold mb-2">INE FRENTE</span>
                                {fileListIneFrente.length > 0 ? (
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <Image 
                                            src={URL.createObjectURL(fileListIneFrente[0].originFileObj)} 
                                            alt="ine frente" 
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-lg border-4 border-white shadow-md mb-3"
                                        />
                                        <Button danger size="small" onClick={() => setFileListIneFrente([])}>Eliminar foto</Button>
                                    </div>
                                ) : existingIneFrente ? (
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <Image 
                                            src={existingIneFrente} 
                                            alt="ine frente" 
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-lg border-4 border-white shadow-md mb-3"
                                        />
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneFrente}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                                    Cámara
                                                </Button>
                                            </Upload>
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneFrente}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <Button size="small" icon={<PictureOutlined />}>
                                                    Galería
                                                </Button>
                                            </Upload>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center mb-4 relative shadow-inner">
                                            <IdcardOutlined className="text-4xl text-gray-400" />
                                        </div>
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneFrente}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                                    Cámara
                                                </Button>
                                            </Upload>
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneFrente}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <Button size="small" icon={<PictureOutlined />}>
                                                    Galería
                                                </Button>
                                            </Upload>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-2 mb-0">Max: 4MB</p>
                                    </>
                                )}
                            </div>

                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-gray-50 min-h-[260px] mt-4">
                                <span className="text-gray-500 font-bold mb-2">INE REVERSO</span>
                                {fileListIneReverso.length > 0 ? (
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <Image 
                                            src={URL.createObjectURL(fileListIneReverso[0].originFileObj)} 
                                            alt="ine reverso" 
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-lg border-4 border-white shadow-md mb-3"
                                        />
                                        <Button danger size="small" onClick={() => setFileListIneReverso([])}>Eliminar foto</Button>
                                    </div>
                                ) : existingIneReverso ? (
                                    <div className="w-full flex flex-col items-center justify-center">
                                        <Image 
                                            src={existingIneReverso} 
                                            alt="ine reverso" 
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="rounded-lg border-4 border-white shadow-md mb-3"
                                        />
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneReverso}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                                    Cámara
                                                </Button>
                                            </Upload>
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneReverso}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <Button size="small" icon={<PictureOutlined />}>
                                                    Galería
                                                </Button>
                                            </Upload>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-32 h-20 bg-gray-200 rounded-lg flex items-center justify-center mb-4 relative shadow-inner">
                                            <IdcardOutlined className="text-4xl text-gray-400" />
                                        </div>
                                        <div className="flex gap-2 justify-center flex-wrap">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneReverso}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button type="primary" size="small" className="bg-[#0f172a]" icon={<CameraOutlined />}>
                                                    Cámara
                                                </Button>
                                            </Upload>
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneReverso}
                                                showUploadList={false}
                                                accept="image/*"
                                            >
                                                <Button size="small" icon={<PictureOutlined />}>
                                                    Galería
                                                </Button>
                                            </Upload>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-2 mb-0">Max: 4MB</p>
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
