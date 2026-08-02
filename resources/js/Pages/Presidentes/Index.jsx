import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Card, Button, Avatar, Space, Badge, Modal, Image, Tag, Form, Row, Col, Upload, message, Input, Select, Divider } from 'antd';
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
    CrownOutlined
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

    // Form modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form] = Form.useForm();
    const [submitting, setSubmitting] = useState(false);

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

    const handleFormSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const formData = new FormData();
            Object.keys(values).forEach(key => {
                if (values[key] !== undefined && values[key] !== null) {
                    formData.append(key, values[key]);
                }
            });

            if (fileListFoto.length > 0 && fileListFoto[0].originFileObj) {
                formData.append('foto', fileListFoto[0].originFileObj);
            }
            if (fileListIneFrente.length > 0 && fileListIneFrente[0].originFileObj) {
                formData.append('ine_frente', fileListIneFrente[0].originFileObj);
            }
            if (fileListIneReverso.length > 0 && fileListIneReverso[0].originFileObj) {
                formData.append('ine_reverso', fileListIneReverso[0].originFileObj);
            }

            if (editingId) {
                formData.append('_method', 'PUT');
                await axios.post(`/presidentes/${editingId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                message.success('Presidente actualizado correctamente');
            } else {
                await axios.post('/presidentes', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                message.success('Presidente registrado correctamente');
            }

            setIsModalOpen(false);
            actionRef.current?.reload();
        } catch (err) {
            console.error('Error al guardar presidente:', err);
            if (err.response?.data?.errors) {
                const errors = err.response.data.errors;
                Object.keys(errors).forEach(field => {
                    message.error(errors[field][0]);
                });
            } else if (err.response?.data?.message) {
                message.error(err.response.data.message);
            } else {
                message.error('Ocurrió un error al procesar la solicitud');
            }
        } finally {
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
            width: 100,
            valueType: 'select',
            valueEnum: {
                true: { text: 'Activo', status: 'Success' },
                false: { text: 'Inactivo', status: 'Error' },
            },
            render: (_, record) => (
                record.deleted_at ? (
                    <Badge status="default" text="Eliminado" />
                ) : (
                    <Badge status={record.estado ? 'success' : 'error'} text={record.estado ? 'Activo' : 'Inactivo'} />
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

                <Card className="shadow-sm border-gray-200 rounded-lg">
                    <TableCrud
                        actionRef={actionRef}
                        columns={columns}
                        endpoint="/presidentes"
                        rowKey="id"
                        search={true}
                        params={{ trashed: showTrashed ? '1' : '0' }}
                        onParamsChange={(params) => setCurrentParams(params)}
                    />
                </Card>
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
                <Form form={form} layout="vertical" className="mt-4">
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
                        <Col span={12}>
                            <Form.Item name="sexo" label="Sexo">
                                <Select placeholder="Selecciona" options={[
                                    { label: 'Masculino', value: 'Masculino' },
                                    { label: 'Femenino', value: 'Femenino' },
                                    { label: 'Otro', value: 'Otro' }
                                ]} />
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
