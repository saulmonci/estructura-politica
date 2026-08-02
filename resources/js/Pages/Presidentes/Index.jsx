import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image, Tag, Form, Row, Col, Upload, message, Input, Select, Divider, Switch } from 'antd';
import { 
    PlusOutlined, 
    UserOutlined, 
    PhoneOutlined, 
    EnvironmentOutlined, 
    CalendarOutlined, 
    EditOutlined, 
    DeleteOutlined, 
    MailOutlined, 
    DownloadOutlined, 
    ReloadOutlined,
    BankOutlined,
    LockOutlined,
    IdcardOutlined,
    CameraOutlined,
    TeamOutlined,
    CrownOutlined,
    SwapOutlined
} from '@ant-design/icons';
import TableCrud from '@/Components/TableCrud';
import axios from 'axios';
import imageCompression from 'browser-image-compression';

export default function PresidentesIndex({ presidentes }) {
    const { auth } = usePage().props;
    const actionRef = useRef();
    const [modal, contextHolder] = Modal.useModal();
    const [showTrashed, setShowTrashed] = useState(false);
    const [currentParams, setCurrentParams] = useState({});
    const [togglingId, setTogglingId] = useState(null);

    // Form modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

    const handleStatusToggle = async (record, checked) => {
        setTogglingId(record.id);
        try {
            await axios.post(`/presidentes/${record.id}/toggle-status`, {
                estado: checked ? 1 : 0,
            });
            message.success(`Estatus del presidente actualizado a ${checked ? 'Activo' : 'Inactivo'}`);
            actionRef.current?.reload();
        } catch (err) {
            console.error('Error al actualizar el estatus:', err);
            message.error('No se pudo actualizar el estatus del presidente');
        } finally {
            setTogglingId(null);
        }
    };

    const handleImpersonate = (record) => {
        modal.confirm({
            title: '¿Impersonar presidente?',
            content: `¿Deseas ingresar al sistema navegando en representación de ${record.nombre || record.name}?`,
            okText: 'Sí, impersonar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(`/impersonate/${record.id}`);
            }
        });
    };

    // Catalog state
    const [estados, setEstados] = useState([]);
    const [municipios, setMunicipios] = useState([]);
    const [loadingEstados, setLoadingEstados] = useState(false);
    const [loadingMunicipios, setLoadingMunicipios] = useState(false);

    // Upload state
    const [fileListFoto, setFileListFoto] = useState([]);
    const [existingFoto, setExistingFoto] = useState(null);
    const [fileListIneFrente, setFileListIneFrente] = useState([]);
    const [existingIneFrente, setExistingIneFrente] = useState(null);
    const [fileListIneReverso, setFileListIneReverso] = useState([]);
    const [existingIneReverso, setExistingIneReverso] = useState(null);

    useEffect(() => {
        fetchEstados();
    }, []);

    const fetchEstados = async () => {
        setLoadingEstados(true);
        try {
            const res = await axios.get('/catalogos/estados');
            setEstados(res.data || []);
        } catch (err) {
            console.error('Error al cargar estados:', err);
        } finally {
            setLoadingEstados(false);
        }
    };

    const fetchMunicipios = async (stateId) => {
        if (!stateId) {
            setMunicipios([]);
            return;
        }
        setLoadingMunicipios(true);
        try {
            const res = await axios.get(`/catalogos/municipios?state_id=${stateId}`);
            setMunicipios(res.data || []);
        } catch (err) {
            console.error('Error al cargar municipios:', err);
        } finally {
            setLoadingMunicipios(false);
        }
    };

    const handleStateChange = (stateId) => {
        form.setFieldsValue({ municipality_id: undefined });
        fetchMunicipios(stateId);
    };

    const handleExport = () => {
        const queryParams = new URLSearchParams();
        Object.entries(currentParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'per_page') {
                if (Array.isArray(value)) {
                    value.forEach(v => queryParams.append(`${key}[]`, v));
                } else {
                    queryParams.append(key, value);
                }
            }
        });
        if (showTrashed) {
            queryParams.append('trashed', '1');
        }
        window.location.href = `/presidentes/export?${queryParams.toString()}`;
    };

    const handleCreate = () => {
        setEditingId(null);
        form.resetFields();
        form.setFieldsValue({ estado: true });
        setFileListFoto([]);
        setExistingFoto(null);
        setFileListIneFrente([]);
        setExistingIneFrente(null);
        setFileListIneReverso([]);
        setExistingIneReverso(null);
        setMunicipios([]);
        setIsModalOpen(true);
    };

    const handleEdit = async (record) => {
        setEditingId(record.id);
        form.resetFields();
        setFileListFoto([]);
        setExistingFoto(record.foto_url || null);
        setFileListIneFrente([]);
        setExistingIneFrente(record.ine_frente_url || null);
        setFileListIneReverso([]);
        setExistingIneReverso(record.ine_reverso_url || null);

        if (record.state_id) {
            await fetchMunicipios(record.state_id);
        }

        form.setFieldsValue({
            nombre: record.nombre,
            apellidos: record.apellidos,
            email: record.email,
            telefono: record.telefono,
            curp: record.curp,
            clave_electoral: record.clave_electoral,
            state_id: record.state_id,
            municipality_id: record.municipality_id,
            sexo: record.sexo,
            calle: record.calle,
            numero_exterior: record.numero_exterior,
            numero_interior: record.numero_interior,
            colonia: record.colonia,
            codigo_postal: record.codigo_postal,
            apodo: record.apodo,
            notas: record.notas,
            estado: record.estado ?? true,
        });

        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        modal.confirm({
            title: '¿Estás seguro de eliminar este presidente?',
            content: 'Esta acción desactivará al presidente en la plataforma.',
            okText: 'Sí, eliminar',
            okType: 'danger',
            cancelText: 'Cancelar',
            onOk: () => {
                router.delete(`/presidentes/${id}`, {
                    preserveScroll: true,
                    onSuccess: () => {
                        actionRef.current?.reload();
                    }
                });
            }
        });
    };

    const handleRestore = (id) => {
        modal.confirm({
            title: '¿Estás seguro de restaurar este presidente?',
            content: 'El presidente volverá a estar activo.',
            okText: 'Sí, restaurar',
            cancelText: 'Cancelar',
            onOk: () => {
                router.post(`/presidentes/${id}/restore`, {}, {
                    preserveScroll: true,
                    onSuccess: () => {
                        actionRef.current?.reload();
                    }
                });
            }
        });
    };

    const handleFormSubmit = async (e) => {
        if (e?.preventDefault) e.preventDefault();
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            values.estado = values.estado ? 1 : 0;

            if (fileListFoto.length > 0 && fileListFoto[0].originFileObj) {
                values.foto = fileListFoto[0].originFileObj;
            }
            if (fileListIneFrente.length > 0 && fileListIneFrente[0].originFileObj) {
                values.ine_frente = fileListIneFrente[0].originFileObj;
            }
            if (fileListIneReverso.length > 0 && fileListIneReverso[0].originFileObj) {
                values.ine_reverso = fileListIneReverso[0].originFileObj;
            }

            if (editingId) {
                values._method = 'PUT';
                router.post(`/presidentes/${editingId}`, values, {
                    forceFormData: true,
                    onSuccess: () => {
                        message.success('Presidente actualizado correctamente');
                        setIsModalOpen(false);
                        actionRef.current?.reload();
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
                    onFinish: () => setSubmitting(false)
                });
            } else {
                router.post('/presidentes', values, {
                    forceFormData: true,
                    onSuccess: () => {
                        message.success('Presidente registrado correctamente');
                        setIsModalOpen(false);
                        actionRef.current?.reload();
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
                    onFinish: () => setSubmitting(false)
                });
            }
        } catch (err) {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            title: 'ID',
            dataIndex: 'id',
            key: 'id',
            width: 80,
            search: false,
            render: (id) => (
                <span className="text-blue-600 font-medium">PRES-{String(id).padStart(4, '0')}</span>
            ),
        },
        {
            title: 'FOTO',
            dataIndex: 'foto_url',
            key: 'foto_url',
            width: 70,
            align: 'center',
            search: false,
            render: (fotoUrl) => (
                fotoUrl ? (
                    <Image
                        src={fotoUrl}
                        width={44}
                        height={44}
                        className="object-cover rounded-md border border-blue-200"
                        style={{ borderRadius: '6px' }}
                    />
                ) : (
                    <Avatar shape="square" size={44} icon={<UserOutlined />} className="bg-blue-100 text-blue-600 font-bold" />
                )
            ),
        },
        {
            title: 'NOMBRE DEL PRESIDENTE',
            dataIndex: 'nombre',
            key: 'nombre',
            render: (_, record) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-gray-800 text-sm">{record.nombre || record.name} {record.apellidos || ''}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MailOutlined className="text-gray-400" /> {record.email}
                    </span>
                </div>
            ),
        },
        {
            title: 'Estado',
            dataIndex: 'state_id',
            key: 'state_id',
            valueType: 'select',
            hideInTable: true,
            request: async () => {
                const response = await axios.get('/catalogos/estados');
                return response.data.map(e => ({ label: e.name || e.nombre, value: e.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Estado',
            }
        },
        {
            title: 'Municipio',
            dataIndex: 'municipality_id',
            key: 'municipality_id',
            valueType: 'select',
            hideInTable: true,
            dependencies: ['state_id'],
            request: async (params) => {
                const stateId = params?.state_id;
                const url = stateId ? `/catalogos/municipios?state_id=${stateId}` : '/catalogos/municipios';
                const response = await axios.get(url);
                return response.data.map(m => ({ label: m.name || m.nombre, value: m.id }));
            },
            fieldProps: {
                showSearch: true,
                optionFilterProp: 'label',
                filterOption: (input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
                placeholder: 'Filtrar por Municipio',
            }
        },
        {
            title: 'ESTADO / MUNICIPIO',
            key: 'ubicacion',
            search: false,
            render: (_, record) => (
                <div className="flex flex-col text-xs">
                    <span className="font-medium text-gray-700">
                        <EnvironmentOutlined className="text-blue-500 mr-1" />
                        {record.municipality?.nombre || record.municipality?.name || 'N/A'}
                    </span>
                    <span className="text-gray-400 pl-4">{record.state?.nombre || record.state?.name || 'N/A'}</span>
                </div>
            ),
        },
        {
            title: 'TELÉFONO',
            dataIndex: 'telefono',
            key: 'telefono',
            width: 130,
            render: (tel) => (
                <span className="text-xs text-gray-600">
                    <PhoneOutlined className="mr-1 text-gray-400" />
                    {tel || 'N/A'}
                </span>
            ),
        },
        {
            title: 'ESTRUCTURA A CARGO',
            key: 'estructura',
            search: false,
            render: (_, record) => (
                <div className="flex items-center gap-2">
                    <Tag color="blue">{record.rds_count || 0} RD</Tag>
                    <Tag color="purple">{record.operadores_count || 0} Op</Tag>
                    <Tag color="cyan">{record.promotores_count || 0} Prom</Tag>
                </div>
            ),
        },
        {
            title: 'ESTATUS',
            dataIndex: 'estado',
            key: 'estado',
            width: 130,
            valueType: 'select',
            valueEnum: {
                true: { text: 'Activo', status: 'Success' },
                false: { text: 'Inactivo', status: 'Error' },
            },
            render: (_, record) => (
                record.deleted_at ? (
                    <Badge status="default" text="Eliminado" />
                ) : (
                    <Switch
                        checked={Boolean(record.estado)}
                        loading={togglingId === record.id}
                        checkedChildren="Activo"
                        unCheckedChildren="Inactivo"
                        onChange={(checked) => handleStatusToggle(record, checked)}
                    />
                )
            ),
        },
        {
            title: 'ACCIONES',
            key: 'actions',
            width: 120,
            align: 'center',
            search: false,
            render: (_, record) => (
                <Space size="small">
                    {record.deleted_at ? (
                        <Button 
                            type="text" 
                            icon={<ReloadOutlined className="text-green-600" />} 
                            onClick={() => handleRestore(record.id)}
                            title="Restaurar Presidente"
                        />
                    ) : (
                        <>
                            <Button 
                                type="text" 
                                icon={<EditOutlined className="text-blue-600" />} 
                                onClick={() => handleEdit(record)}
                                title="Editar Presidente"
                            />
                            {auth?.can_impersonate && record.id !== auth.user?.id && (
                                <Button 
                                    type="text" 
                                    icon={<SwapOutlined className="text-amber-600" />} 
                                    onClick={() => handleImpersonate(record)}
                                    title="Impersonar usuario"
                                />
                            )}
                            <Button 
                                type="text" 
                                icon={<DeleteOutlined className="text-red-500" />} 
                                onClick={() => handleDelete(record.id)}
                                title="Eliminar Presidente"
                            />
                        </>
                    )}
                </Space>
            ),
        },
    ];

    const renderMobileCard = (record) => {
        return (
            <Card styles={{ body: { padding: '16px' } }} className="mb-4 shadow-sm rounded-lg border border-gray-200 w-full">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        {record.foto_url ? (
                            <Image
                                src={record.foto_url}
                                width={48}
                                height={48}
                                className="object-cover rounded-md border border-blue-200"
                                style={{ borderRadius: '6px' }}
                            />
                        ) : (
                            <Avatar
                                shape="square"
                                size={48}
                                icon={<UserOutlined />}
                                className="bg-amber-100 text-amber-600 font-bold rounded-md"
                            />
                        )}
                        <div>
                            <div className="font-semibold text-base text-gray-800">
                                {record.nombre || record.name} {record.apellidos || ''}
                            </div>
                            <div className="text-xs text-blue-600 font-medium">
                                PRES-{String(record.id).padStart(4, '0')}
                            </div>
                        </div>
                    </div>
                    <div>
                        {record.deleted_at ? (
                            <Badge status="default" text="Eliminado" className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200" />
                        ) : (
                            <Switch
                                checked={Boolean(record.estado)}
                                loading={togglingId === record.id}
                                checkedChildren="Activo"
                                unCheckedChildren="Inactivo"
                                onChange={(checked) => handleStatusToggle(record, checked)}
                            />
                        )}
                    </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <MailOutlined className="text-gray-400 shrink-0" />
                        <span className="text-gray-400 shrink-0 w-16">Email:</span>
                        <span className="truncate flex-1 text-gray-800" title={record.email}>{record.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <PhoneOutlined className="text-gray-400 shrink-0" />
                        <span className="text-gray-400 shrink-0 w-16">Teléfono:</span>
                        <span className="truncate flex-1 text-gray-800">{record.telefono || 'N/A'}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <EnvironmentOutlined className="text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-gray-400 shrink-0 w-16">Ubicación:</span>
                        <span className="truncate flex-1 text-gray-800">
                            {record.municipality?.nombre || record.municipality?.name || 'N/A'}, {record.state?.nombre || record.state?.name || 'N/A'}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                        <TeamOutlined className="text-gray-400 shrink-0" />
                        <span className="text-gray-400 shrink-0 w-16">Estructura:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Tag color="blue" className="mr-0">{record.rds_count || 0} RD</Tag>
                            <Tag color="purple" className="mr-0">{record.operadores_count || 0} Op</Tag>
                            <Tag color="cyan" className="mr-0">{record.promotores_count || 0} Prom</Tag>
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                    {record.deleted_at ? (
                        <Button
                            type="default"
                            icon={<ReloadOutlined className="text-green-600" />}
                            onClick={() => handleRestore(record.id)}
                            className="text-xs text-green-600 border-green-200"
                        >
                            Restaurar
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="default"
                                icon={<EditOutlined className="text-blue-600" />}
                                onClick={() => handleEdit(record)}
                                size="small"
                                className="text-xs border-gray-300"
                            >
                                Editar
                            </Button>
                            {auth?.can_impersonate && record.id !== auth.user?.id && (
                                <Button
                                    type="default"
                                    icon={<SwapOutlined className="text-amber-600" />}
                                    onClick={() => handleImpersonate(record)}
                                    size="small"
                                    className="text-xs border-amber-300 text-amber-700 bg-amber-50"
                                >
                                    Impersonar
                                </Button>
                            )}
                            <Button
                                type="default"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => handleDelete(record.id)}
                                size="small"
                                className="text-xs"
                            >
                                Eliminar
                            </Button>
                        </>
                    )}
                </div>
            </Card>
        );
    };

    return (
        <MainLayout>
            <Head title="Gestión de Presidentes Municipales" />
            {contextHolder}

            <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <CrownOutlined className="text-amber-500" />
                            Presidentes Municipales / Coordinadores
                        </h1>
                        <p className="text-sm text-gray-500">
                            Módulo exclusivo de administración global de Presidentes para el rol Superuser.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs">
                            <span className="text-gray-600">Ver Eliminados:</span>
                            <input
                                type="checkbox"
                                checked={showTrashed}
                                onChange={(e) => {
                                    setShowTrashed(e.target.checked);
                                    actionRef.current?.reload();
                                }}
                                className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                        </div>

                        <Button 
                            icon={<DownloadOutlined />} 
                            onClick={handleExport}
                            className="bg-white border-gray-300 text-gray-700 hover:text-blue-600"
                        >
                            Exportar
                        </Button>

                        <Button 
                            type="primary" 
                            icon={<PlusOutlined />} 
                            onClick={handleCreate}
                            className="bg-amber-500 hover:bg-amber-600 font-medium"
                        >
                            Nuevo Presidente
                        </Button>
                    </div>
                </div>

                <TableCrud
                    actionRef={actionRef}
                    columns={columns}
                    endpoint="/presidentes"
                    rowKey="id"
                    search={true}
                    mobileCardRender={renderMobileCard}
                    params={{ trashed: showTrashed ? '1' : '0' }}
                    onParamsChange={(params) => setCurrentParams(params)}
                />
            </div>

            {/* Modal de Registro / Edición de Presidente */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-lg font-bold text-gray-800">
                        <CrownOutlined className="text-amber-500" />
                        {editingId ? 'Editar Presidente Municipal' : 'Registrar Nuevo Presidente Municipal'}
                    </div>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleFormSubmit}
                confirmLoading={submitting}
                okText={editingId ? 'Actualizar' : 'Guardar Presidente'}
                cancelText="Cancelar"
                width={720}
                destroyOnClose
            >
                <Form 
                    form={form} 
                    layout="vertical" 
                    className="mt-4"
                    onFinish={handleFormSubmit}
                    onSubmit={(e) => e.preventDefault()}
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
                                <Select
                                    showSearch
                                    placeholder="Seleccionar Estado"
                                    loading={loadingEstados}
                                    onChange={handleStateChange}
                                    optionFilterProp="label"
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={estados.map(e => ({ label: e.nombre || e.name, value: e.id }))}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item 
                                name="municipality_id" 
                                label="Municipio" 
                                rules={[{ required: true, message: 'Selecciona un municipio' }]}
                            >
                                <Select
                                    showSearch
                                    placeholder="Seleccionar Municipio"
                                    loading={loadingMunicipios}
                                    disabled={!form.getFieldValue('state_id') && municipios.length === 0}
                                    optionFilterProp="label"
                                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    options={municipios.map(m => ({ label: m.nombre || m.name, value: m.id }))}
                                />
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
                                label={editingId ? "Nueva Contraseña (Opcional)" : "Contraseña de Acceso"} 
                                rules={editingId ? [] : [{ required: true, min: 6, message: 'Mínimo 6 caracteres' }]}
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
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="INE Frente">
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
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item label="INE Reverso">
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
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </MainLayout>
    );
}
