import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ModalForm, ProFormText, ProFormSelect } from '@ant-design/pro-components';
import { Row, Col, message, Alert, Button, Divider, Upload, Form, Image } from 'antd';
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
    CameraOutlined,
    PictureOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { router, usePage } from '@inertiajs/react';
import IneScanner from './IneScanner';
import imageCompression from 'browser-image-compression';
import { generatePromovidoFormData } from '@/Utils/dummyDataGenerator';

const { Dragger } = Upload;

const PromovidoFormModal = forwardRef(({ onSuccess, availablePromotores = [] }, ref) => {
    const { auth } = usePage().props;
    const userRole = auth?.user?.role;

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
        },
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
                promotor_id: undefined,
                nombre: '',
                apellidos: '',
                clave_elector: '',
                curp: '',
                telefono: '',
                codigo_postal: '',
                colonia: '',
                calle: '',
                numero: '',
                demarcacion_id: undefined,
                seccion_electoral: undefined,
            });

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

            if (editId) {
                const url = fetchUrl || `/api/promovidos/${editId}`;
                axios
                    .get(url)
                    .then((response) => {
                        const data = response.data;
                        if (data.foto) {
                            setExistingFoto(`/storage/${data.foto}`);
                        } else {
                            setExistingFoto(null);
                        }
                        if (data.ine_frente) {
                            setExistingIneFrente(`/storage/${data.ine_frente}`);
                        } else {
                            setExistingIneFrente(null);
                        }
                        if (data.ine_reverso) {
                            setExistingIneReverso(`/storage/${data.ine_reverso}`);
                        } else {
                            setExistingIneReverso(null);
                        }

                        if (data.demarcacion_id) {
                            const demId = String(data.demarcacion_id);
                            setSelectedDemarcacion(demId);
                            setLoadingSecciones(true);
                            axios
                                .get(`/catalogos/demarcaciones/${demId}/secciones`)
                                .then((secRes) => {
                                    setSecciones(secRes.data || []);
                                    form.setFieldsValue({
                                        ...data,
                                        demarcacion_id: demId,
                                        seccion_electoral: data.seccion_electoral
                                            ? String(data.seccion_electoral)
                                            : undefined,
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
            maxSizeMB: 3.8, // Ligeramente debajo de 4MB
            maxWidthOrHeight: 1920,
            useWebWorker: true,
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
                maskClosable: false,
                keyboard: true,
                bodyStyle: { padding: 0 },
                closeIcon: null,
            }}
            submitter={{
                render: (props) => {
                    const isDisabled = !editId && userRole !== 'promotor' && availablePromotores.length === 0;
                    return (
                        <div className="flex justify-end gap-3 rounded-b-lg border-t border-gray-200 bg-gray-50 p-4">
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
                const endpoint = fetchUrl || (editId ? `/promovidos/${editId}` : '/promovidos');

                if (fileList.length > 0 && fileList[0].originFileObj) {
                    values.foto = fileList[0].originFileObj;
                } else {
                    delete values.foto;
                }

                if (fileListIneFrente.length > 0 && fileListIneFrente[0].originFileObj) {
                    values.ine_frente = fileListIneFrente[0].originFileObj;
                }

                if (fileListIneReverso.length > 0 && fileListIneReverso[0].originFileObj) {
                    values.ine_reverso = fileListIneReverso[0].originFileObj;
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
                        },
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
                        },
                    });
                }
                return false;
            }}
        >
            <div className="flex items-center justify-between rounded-t-lg bg-[#0f172a] p-6 text-white">
                <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-white/20 p-3">
                        <UsergroupAddOutlined className="text-3xl text-white" />
                    </div>
                    <div>
                        <h2 className="m-0 text-xl font-bold tracking-wide uppercase">
                            {editId ? 'EDICIÓN DE' : 'REGISTRO DE'} PROMOVIDO
                        </h2>
                        <p className="m-0 text-sm text-gray-300">Registro Simpatizantes</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {(auth?.user?.role === 'superuser' ||
                        auth?.is_impersonating ||
                        auth?.impersonator?.role === 'superuser') && (
                        <Button
                            type="primary"
                            icon={<ThunderboltOutlined />}
                            className="border-none bg-amber-500 font-semibold text-white shadow-md hover:bg-amber-600"
                            onClick={() => {
                                const dummy = generatePromovidoFormData({
                                    availablePromotores,
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
                    <div className="hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-gray-300 sm:flex">
                        <SafetyCertificateOutlined />
                        <span>Información segura</span>
                    </div>
                </div>
            </div>

            <div className="p-5">
                <Row gutter={48}>
                    <Col xs={24} md={15}>
                        <div className="mb-4 flex items-center gap-2">
                            <div className="rounded bg-[#0f172a] p-1 text-white">
                                <UserOutlined />
                            </div>
                            <h3 className="m-0 text-sm font-bold tracking-wide text-[#0f172a]">DATOS DEL PROMOVIDO</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />

                        <IneScanner
                            onDataExtracted={async (data, compressedFile) => {
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

                                // 2. Mapear clave_elector
                                const claveElector = data.clave_elector || data.clave_electoral || '';

                                // 3. Mapear numero_exterior e interior al campo "numero"
                                let numero = '';
                                if (data.numero_exterior) {
                                    numero = String(data.numero_exterior).trim();
                                    if (data.numero_interior && String(data.numero_interior).trim() !== '') {
                                        numero += ' Int ' + String(data.numero_interior).trim();
                                    }
                                } else if (data.numero_interior && String(data.numero_interior).trim() !== '') {
                                    numero = 'Int ' + String(data.numero_interior).trim();
                                }

                                const fieldsToSet = {
                                    nombre: data.nombre || '',
                                    apellidos: data.apellidos || '',
                                    clave_elector: claveElector,
                                    curp: data.curp || '',
                                    telefono: data.telefono || '',
                                    codigo_postal: data.codigo_postal || '',
                                    colonia: data.colonia || '',
                                    calle: data.calle || '',
                                    numero: numero,
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
                                            const foundSec = secList.find(
                                                (s) => String(s.numero) === rawSec || String(s.numero) === trimmedSec
                                            );
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
                            }}
                        />

                        <div className="mt-4">
                            {userRole !== 'promotor' &&
                                (availablePromotores.length > 0 ? (
                                    <Row gutter={16} className="mb-4 rounded-md border border-blue-100 bg-blue-50 p-3">
                                        <Col span={24}>
                                            <ProFormSelect
                                                name="promotor_id"
                                                label={
                                                    <span className="font-bold text-blue-800">Asignar a Promotor</span>
                                                }
                                                placeholder="Seleccionar el Promotor que trajo a este simpatizante"
                                                rules={[{ required: true, message: 'Debe seleccionar un Promotor' }]}
                                                options={availablePromotores.map((p) => ({
                                                    label: p.apodo ? `${p.name} (${p.apodo})` : p.name,
                                                    value: p.id,
                                                }))}
                                                fieldProps={{
                                                    prefix: <TeamOutlined className="mr-2 text-blue-500" />,
                                                    showSearch: true,
                                                }}
                                            />
                                        </Col>
                                    </Row>
                                ) : (
                                    <Row
                                        gutter={16}
                                        className="mb-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-red-600"
                                    >
                                        <Col span={24}>
                                            <strong>⚠️ Sin Promotores:</strong> No tienes promotores registrados en tu
                                            red. Debes registrar al menos un promotor antes de poder registrar un
                                            promovido.
                                        </Col>
                                    </Row>
                                ))}
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="nombre"
                                        label="Nombre(s)"
                                        placeholder="Ingresar nombre(s)"
                                        rules={[
                                            { required: true, message: 'Requerido' },
                                            { max: 100, message: 'Máximo 100 caracteres' },
                                        ]}
                                        fieldProps={{
                                            prefix: <UserOutlined className="mr-2 text-gray-400" />,
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
                                            { max: 100, message: 'Máximo 100 caracteres' },
                                        ]}
                                        fieldProps={{
                                            prefix: <UserOutlined className="mr-2 text-gray-400" />,
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
                                        rules={[{ max: 18, message: 'Máximo 18 caracteres' }]}
                                        formItemProps={{
                                            getValueFromEvent: (e) =>
                                                e.target.value.toUpperCase().replace(/[^A-Z0-9]/gi, ''),
                                        }}
                                        fieldProps={{
                                            prefix: <IdcardOutlined className="mr-2 text-gray-400" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' },
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="curp"
                                        label="CURP"
                                        placeholder="18 caracteres"
                                        rules={[{ len: 18, message: 'Debe contener exactamente 18 caracteres' }]}
                                        formItemProps={{
                                            getValueFromEvent: (e) =>
                                                e.target.value.toUpperCase().replace(/[^A-Z0-9Ñ]/gi, ''),
                                        }}
                                        fieldProps={{
                                            prefix: <IdcardOutlined className="mr-2 text-gray-400" />,
                                            maxLength: 18,
                                            style: { textTransform: 'uppercase' },
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="telefono"
                                        label="Teléfono de contacto"
                                        placeholder="10 dígitos"
                                        rules={[
                                            { pattern: /^[0-9]{10}$/, message: 'Debe contener exactamente 10 dígitos' },
                                        ]}
                                        fieldProps={{
                                            prefix: <PhoneOutlined className="mr-2 text-gray-400" />,
                                            maxLength: 10,
                                            onKeyPress: (e) => {
                                                if (!/[0-9]/.test(e.key)) e.preventDefault();
                                            },
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="codigo_postal"
                                        label="Código Postal"
                                        placeholder="5 dígitos"
                                        rules={[
                                            { pattern: /^[0-9]{5}$/, message: 'Debe contener exactamente 5 dígitos' },
                                        ]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="mr-2 text-gray-400" />,
                                            maxLength: 5,
                                            onKeyPress: (e) => {
                                                if (!/[0-9]/.test(e.key)) e.preventDefault();
                                            },
                                        }}
                                    />
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormText
                                        name="colonia"
                                        label="Colonia"
                                        placeholder="Ingresar colonia"
                                        rules={[{ max: 255, message: 'Máximo 255 caracteres' }]}
                                        fieldProps={{
                                            prefix: <BankOutlined className="mr-2 text-gray-400" />,
                                            maxLength: 255,
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <ProFormText
                                        name="calle"
                                        label="Calle"
                                        placeholder="Ingresar calle"
                                        rules={[{ max: 255, message: 'Máximo 255 caracteres' }]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="mr-2 text-gray-400" />,
                                            maxLength: 255,
                                        }}
                                    />
                                </Col>
                                <Col xs={24} md={4}>
                                    <ProFormText
                                        name="numero"
                                        label="Número"
                                        placeholder="Nº"
                                        rules={[{ max: 50, message: 'Máximo 50 caracteres' }]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="mr-2 text-gray-400" />,
                                            maxLength: 50,
                                        }}
                                    />
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col xs={24} md={12}>
                                    <ProFormSelect
                                        name="demarcacion_id"
                                        label="Demarcación"
                                        placeholder="Seleccionar demarcación"
                                        rules={[{ required: true, message: 'Requerido' }]}
                                        fieldProps={{
                                            prefix: <EnvironmentOutlined className="mr-2 text-gray-400" />,
                                            loading: loadingDemarcaciones,
                                            onChange: (value) => {
                                                setSelectedDemarcacion(value);
                                                form.setFieldsValue({ seccion_electoral: undefined });
                                                fetchSecciones(value);
                                            },
                                        }}
                                        options={demarcaciones.map((d) => ({
                                            label: d.nombre,
                                            value: String(d.id),
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
                                            prefix: <EnvironmentOutlined className="mr-2 text-gray-400" />,
                                            loading: loadingSecciones,
                                        }}
                                        options={secciones.map((s) => ({
                                            label: `Sección ${s.numero}`,
                                            value: String(s.numero),
                                        }))}
                                    />
                                </Col>
                            </Row>

                            <Alert
                                message={<span className="font-bold">Privacidad</span>}
                                description="Los datos del promovido están protegidos y solo deben utilizarse para la estructura política y contacto."
                                type="info"
                                showIcon
                                className="mt-4 border-blue-200 bg-blue-50"
                            />
                        </div>
                    </Col>

                    <Col xs={24} md={9}>
                        <div className="mb-4 flex items-center gap-2">
                            <div className="rounded bg-[#0f172a] p-1 text-white">
                                <CameraOutlined />
                            </div>
                            <h3 className="m-0 text-sm font-bold tracking-wide text-[#0f172a]">FOTOGRAFÍAS</h3>
                        </div>
                        <Divider className="my-2 border-gray-300" />

                        <div className="mt-4">
                            <Alert
                                description={
                                    <span className="text-sm text-blue-800">
                                        Fotografía del promovido para identificarlo fácilmente en campo.
                                    </span>
                                }
                                type="info"
                                showIcon
                                className="mb-6 border-blue-100 bg-blue-50"
                            />

                            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                                <span className="mb-2 font-bold text-gray-500">FOTO DE PERFIL</span>
                                {fileList.length > 0 ? (
                                    <div className="flex w-full flex-col items-center justify-center">
                                        <Image
                                            src={URL.createObjectURL(fileList[0].originFileObj)}
                                            alt="avatar"
                                            width={96}
                                            height={96}
                                            style={{ objectFit: 'cover' }}
                                            className="mb-3 rounded-lg border-4 border-white shadow-md"
                                        />
                                        <Button danger size="small" onClick={() => setFileList([])}>
                                            Eliminar foto
                                        </Button>
                                    </div>
                                ) : existingFoto ? (
                                    <div className="flex w-full flex-col items-center justify-center">
                                        <Image
                                            src={existingFoto}
                                            alt="avatar"
                                            width={96}
                                            height={96}
                                            style={{ objectFit: 'cover' }}
                                            className="mb-3 rounded-lg border-4 border-white shadow-md"
                                        />
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Upload
                                                beforeUpload={handleBeforeUploadFoto}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    className="bg-[#0f172a]"
                                                    icon={<CameraOutlined />}
                                                >
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
                                        <div className="relative mb-4 flex h-24 w-24 items-center justify-center rounded-lg bg-gray-200 shadow-inner">
                                            <UserOutlined className="text-6xl text-gray-400" />
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Upload
                                                beforeUpload={handleBeforeUploadFoto}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    className="bg-[#0f172a]"
                                                    icon={<CameraOutlined />}
                                                >
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
                                        <p className="mt-2 mb-0 text-xs text-gray-400">Max: 10MB</p>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                                <span className="mb-2 font-bold text-gray-500">INE FRENTE</span>
                                {fileListIneFrente.length > 0 ? (
                                    <div className="flex w-full flex-col items-center justify-center">
                                        <Image
                                            src={URL.createObjectURL(fileListIneFrente[0].originFileObj)}
                                            alt="ine frente"
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="mb-3 rounded-lg border-4 border-white shadow-md"
                                        />
                                        <Button danger size="small" onClick={() => setFileListIneFrente([])}>
                                            Eliminar foto
                                        </Button>
                                    </div>
                                ) : existingIneFrente ? (
                                    <div className="flex w-full flex-col items-center justify-center">
                                        <Image
                                            src={existingIneFrente}
                                            alt="ine frente"
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="mb-3 rounded-lg border-4 border-white shadow-md"
                                        />
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneFrente}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    className="bg-[#0f172a]"
                                                    icon={<CameraOutlined />}
                                                >
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
                                        <div className="relative mb-4 flex h-20 w-32 items-center justify-center rounded-lg bg-gray-200 shadow-inner">
                                            <IdcardOutlined className="text-4xl text-gray-400" />
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneFrente}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    className="bg-[#0f172a]"
                                                    icon={<CameraOutlined />}
                                                >
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
                                        <p className="mt-2 mb-0 text-xs text-gray-400">Max: 10MB</p>
                                    </>
                                )}
                            </div>

                            <div className="mt-4 flex min-h-[260px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center">
                                <span className="mb-2 font-bold text-gray-500">INE REVERSO</span>
                                {fileListIneReverso.length > 0 ? (
                                    <div className="flex w-full flex-col items-center justify-center">
                                        <Image
                                            src={URL.createObjectURL(fileListIneReverso[0].originFileObj)}
                                            alt="ine reverso"
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="mb-3 rounded-lg border-4 border-white shadow-md"
                                        />
                                        <Button danger size="small" onClick={() => setFileListIneReverso([])}>
                                            Eliminar foto
                                        </Button>
                                    </div>
                                ) : existingIneReverso ? (
                                    <div className="flex w-full flex-col items-center justify-center">
                                        <Image
                                            src={existingIneReverso}
                                            alt="ine reverso"
                                            width={128}
                                            height={80}
                                            style={{ objectFit: 'cover' }}
                                            className="mb-3 rounded-lg border-4 border-white shadow-md"
                                        />
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneReverso}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    className="bg-[#0f172a]"
                                                    icon={<CameraOutlined />}
                                                >
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
                                        <div className="relative mb-4 flex h-20 w-32 items-center justify-center rounded-lg bg-gray-200 shadow-inner">
                                            <IdcardOutlined className="text-4xl text-gray-400" />
                                        </div>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Upload
                                                beforeUpload={handleBeforeUploadIneReverso}
                                                showUploadList={false}
                                                accept="image/*"
                                                capture="environment"
                                            >
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    className="bg-[#0f172a]"
                                                    icon={<CameraOutlined />}
                                                >
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
                                        <p className="mt-2 mb-0 text-xs text-gray-400">Max: 10MB</p>
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
