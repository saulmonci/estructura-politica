import React, { useState, useEffect, useMemo, useCallback } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, router } from '@inertiajs/react';
import {
    Card,
    Row,
    Col,
    Progress,
    Input,
    Select,
    Button,
    Tag,
    Badge,
    Space,
    Table,
    Tooltip,
    message,
    Typography,
    Segmented,
    Empty,
} from 'antd';
import {
    CheckCircleFilled,
    ClockCircleOutlined,
    WhatsAppOutlined,
    PhoneOutlined,
    SearchOutlined,
    DownloadOutlined,
    ReloadOutlined,
    TeamOutlined,
    UserOutlined,
    EnvironmentOutlined,
    FireOutlined,
    CheckSquareOutlined,
    AuditOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import debounce from 'lodash/debounce';

const { Title, Text } = Typography;

export default function CaceriaIndex({
    voters: initialVoters,
    stats: initialStats,
    filters: initialFilters = {},
    demarcaciones = [],
    secciones = [],
    presidentesList = [],
    selectedPresidenteId,
}) {
    const [stats, setStats] = useState(initialStats);
    const [votersData, setVotersData] = useState(initialVoters?.data || []);
    const [pagination, setPagination] = useState({
        current: initialVoters?.current_page || 1,
        pageSize: initialVoters?.per_page || 25,
        total: initialVoters?.total || 0,
    });
    const [loading, setLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState(null);

    // Filtros activos
    const [search, setSearch] = useState(initialFilters.search || '');
    const [estatus, setEstatus] = useState(initialFilters.estatus || 'todos');
    const [tipo, setTipo] = useState(initialFilters.tipo || 'todos');
    const [demarcacionId, setDemarcacionId] = useState(
        initialFilters.demarcacion_id ? Number(initialFilters.demarcacion_id) : undefined
    );
    const [seccionElectoral, setSeccionElectoral] = useState(initialFilters.seccion_electoral || undefined);
    const [presidenteId, setPresidenteId] = useState(selectedPresidenteId || undefined);

    // Fetch data desde el backend
    const fetchData = useCallback(
        async (params = {}) => {
            setLoading(true);
            try {
                const queryParams = {
                    page: params.current || pagination.current,
                    per_page: params.pageSize || pagination.pageSize,
                    search: params.search !== undefined ? params.search : search,
                    estatus: params.estatus !== undefined ? params.estatus : estatus,
                    tipo: params.tipo !== undefined ? params.tipo : tipo,
                    demarcacion_id: params.demarcacion_id !== undefined ? params.demarcacion_id : demarcacionId,
                    seccion_electoral:
                        params.seccion_electoral !== undefined ? params.seccion_electoral : seccionElectoral,
                    presidente_id: params.presidente_id !== undefined ? params.presidente_id : presidenteId,
                };

                // Limpiar valores vacíos o nulos
                Object.keys(queryParams).forEach((key) => {
                    if (
                        queryParams[key] === undefined ||
                        queryParams[key] === null ||
                        queryParams[key] === '' ||
                        queryParams[key] === 'todos'
                    ) {
                        delete queryParams[key];
                    }
                });

                const response = await axios.get('/caceria', {
                    params: queryParams,
                    headers: { Accept: 'application/json' },
                });

                if (response.data.success) {
                    setVotersData(response.data.data);
                    setPagination({
                        current: response.data.current_page,
                        pageSize: response.data.per_page,
                        total: response.data.total,
                    });
                    if (response.data.stats) {
                        setStats(response.data.stats);
                    }
                }
            } catch (error) {
                console.error('Error al cargar datos de cacería:', error);
                message.error('Error al actualizar los datos.');
            } finally {
                setLoading(false);
            }
        },
        [pagination.current, pagination.pageSize, search, estatus, tipo, demarcacionId, seccionElectoral, presidenteId]
    );

    // Debounce para el input de búsqueda
    const debouncedSearch = useMemo(
        () =>
            debounce((val) => {
                fetchData({ search: val, current: 1 });
            }, 400),
        [fetchData]
    );

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearch(val);
        debouncedSearch(val);
    };

    const handleEstatusChange = (val) => {
        setEstatus(val);
        fetchData({ estatus: val, current: 1 });
    };

    const handleTipoChange = (val) => {
        setTipo(val);
        fetchData({ tipo: val, current: 1 });
    };

    const handleDemarcacionChange = (val) => {
        setDemarcacionId(val);
        fetchData({ demarcacion_id: val, current: 1 });
    };

    const handleSeccionChange = (val) => {
        setSeccionElectoral(val);
        fetchData({ seccion_electoral: val, current: 1 });
    };

    const handlePresidenteChange = (val) => {
        setPresidenteId(val);
        fetchData({ presidente_id: val, current: 1 });
    };

    // Toggle Check de Voto (1 clic)
    const handleToggleVoto = async (record) => {
        const targetId = record.id;
        const sourceType = record.source_type;
        setUpdatingId(`${sourceType}-${targetId}`);

        try {
            const response = await axios.post('/caceria/toggle-voto', {
                id: targetId,
                source_type: sourceType,
                presidente_id: presidenteId,
            });

            if (response.data.success) {
                message.success(response.data.message);

                // Actualizar estado local inmediatamente sin recarga completa
                setVotersData((prev) =>
                    prev.map((item) => {
                        if (item.id === targetId && item.source_type === sourceType) {
                            return {
                                ...item,
                                ha_votado: response.data.ha_votado,
                                voto_at: response.data.voto_at,
                                marcado_por_nombre: response.data.marcado_por_nombre,
                            };
                        }
                        return item;
                    })
                );

                if (response.data.stats) {
                    setStats(response.data.stats);
                }
            }
        } catch (error) {
            console.error('Error al cambiar check de voto:', error);
            message.error('No se pudo registrar el voto. Intenta nuevamente.');
        } finally {
            setUpdatingId(null);
        }
    };

    // Exportar CSV con los filtros actuales
    const handleExport = () => {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (estatus && estatus !== 'todos') queryParams.append('estatus', estatus);
        if (tipo && tipo !== 'todos') queryParams.append('tipo', tipo);
        if (demarcacionId) queryParams.append('demarcacion_id', demarcacionId);
        if (seccionElectoral) queryParams.append('seccion_electoral', seccionElectoral);
        if (presidenteId) queryParams.append('presidente_id', presidenteId);

        window.location.href = `/caceria/export?${queryParams.toString()}`;
    };

    // Etiqueta de Rol
    const renderRoleTag = (role) => {
        const ROLES_MAP = {
            coordinador_distrito: { text: 'Coordinador', color: 'blue' },
            rd: { text: 'RD (Demarcación)', color: 'purple' },
            operador: { text: 'Operador', color: 'cyan' },
            promotor: { text: 'Promotor', color: 'green' },
            promovido: { text: 'Promovido', color: 'geekblue' },
        };
        const conf = ROLES_MAP[role] || { text: role, color: 'default' };
        return (
            <Tag color={conf.color} className="font-medium">
                {conf.text}
            </Tag>
        );
    };

    // Generar enlace directo a WhatsApp para movilizar
    const getWhatsAppUrl = (voter) => {
        if (!voter.telefono) return null;
        let phone = voter.telefono.replace(/\D/g, '');
        if (phone.length === 10) {
            phone = `52${phone}`;
        }
        const text = encodeURIComponent(
            `Hola ${voter.nombre_completo}, te saludamos de la campaña. Te recordamos que la casilla correspondiente a tu sección (${voter.seccion_electoral || 'electoral'}) está abierta hoy para emitir tu voto. ¡Contamos con tu valiosa participación!`
        );
        return `https://wa.me/${phone}?text=${text}`;
    };

    // Definición de columnas de la tabla
    const columns = [
        {
            title: 'CHECK DE VOTO',
            dataIndex: 'ha_votado',
            key: 'ha_votado',
            width: 175,
            align: 'center',
            render: (haVotado, record) => {
                const isUpdating = updatingId === `${record.source_type}-${record.id}`;
                return (
                    <div className="flex flex-col items-center justify-center gap-1">
                        <Button
                            type={haVotado ? 'primary' : 'default'}
                            loading={isUpdating}
                            onClick={() => handleToggleVoto(record)}
                            className={`w-full font-bold transition-all ${
                                haVotado
                                    ? 'border-green-600 bg-green-600 text-white shadow-sm hover:bg-green-500'
                                    : 'text-gray-700 hover:border-blue-500 hover:text-blue-600'
                            }`}
                            icon={haVotado ? <CheckCircleFilled /> : <CheckSquareOutlined />}
                        >
                            {haVotado ? '¡YA VOTÓ!' : 'REGISTRAR VOTO'}
                        </Button>
                        {haVotado && record.voto_at && (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-gray-500">
                                <ClockCircleOutlined className="text-gray-400" />
                                {new Date(record.voto_at).toLocaleTimeString('es-MX', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </span>
                        )}
                        {haVotado && record.marcado_por_nombre && (
                            <span
                                className="max-w-[150px] truncate text-[10px] text-gray-400"
                                title={`Registrado por: ${record.marcado_por_nombre}`}
                            >
                                por: {record.marcado_por_nombre}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'PERSONA / VOTANTE',
            key: 'persona',
            render: (_, record) => (
                <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{record.nombre_completo}</span>
                        {renderRoleTag(record.role)}
                        {record.source_type === 'user' && (
                            <Tag color="volcano" className="px-1 py-0 text-[10px] font-bold tracking-wider uppercase">
                                Estructura
                            </Tag>
                        )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {record.curp && (
                            <span>
                                <Text type="secondary" className="font-mono text-[11px]">
                                    CURP: {record.curp}
                                </Text>
                            </span>
                        )}
                        {record.clave_elector && (
                            <span>
                                <Text type="secondary" className="font-mono text-[11px]">
                                    Clave: {record.clave_elector}
                                </Text>
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: 'CASILLA / TERRITORIO',
            key: 'territorio',
            width: 220,
            render: (_, record) => (
                <div className="flex flex-col gap-0.5 text-xs text-gray-700">
                    <div className="flex items-center gap-1 font-medium">
                        <EnvironmentOutlined className="text-blue-500" />
                        <span>{record.demarcacion_nombre || 'Sin demarcación'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tag color="cyan" className="m-0 font-mono text-xs">
                            Sección: {record.seccion_electoral || 'S/S'}
                        </Tag>
                    </div>
                    {record.colonia && (
                        <span className="truncate text-[11px] text-gray-500">Col. {record.colonia}</span>
                    )}
                </div>
            ),
        },
        {
            title: 'MOVILIZACIÓN / CONTACTO',
            key: 'contacto',
            width: 200,
            render: (_, record) => {
                const waUrl = getWhatsAppUrl(record);
                return (
                    <div className="flex flex-col gap-1.5">
                        {record.telefono ? (
                            <>
                                <span className="flex items-center gap-1 font-mono text-xs font-semibold text-gray-800">
                                    <PhoneOutlined className="text-gray-400" />
                                    {record.telefono}
                                </span>
                                <div className="flex items-center gap-2">
                                    {waUrl && (
                                        <a
                                            href={waUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                                        >
                                            <WhatsAppOutlined className="text-sm text-emerald-600" />
                                            WhatsApp
                                        </a>
                                    )}
                                    <a
                                        href={`tel:${record.telefono}`}
                                        className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                                    >
                                        <PhoneOutlined />
                                        Llamar
                                    </a>
                                </div>
                            </>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Sin teléfono</span>
                        )}
                        {record.responsable_nombre && (
                            <span
                                className="truncate text-[11px] text-gray-400"
                                title={`Responsable: ${record.responsable_nombre}`}
                            >
                                Resp: {record.responsable_nombre}
                            </span>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <MainLayout>
            <Head title="Cacería Electoral (Día D) - Control de Voto" />

            <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
                {/* Cabecera Principal */}
                <div className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white shadow-lg md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-black text-white uppercase shadow-sm">
                                <FireOutlined /> DÍA D EN VIVO
                            </span>
                            <span className="text-xs text-slate-400">Jornada Electoral</span>
                        </div>
                        <h1 className="mt-1 mb-0 text-2xl font-black tracking-tight text-white md:text-3xl">
                            Cacería y Movilización Electoral
                        </h1>
                        <p className="mt-1 mb-0 text-sm text-slate-300">
                            Pase de lista en casilla y control en tiempo real de estructura y promovidos.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {presidentesList.length > 0 && (
                            <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5">
                                <AuditOutlined className="text-slate-400" />
                                <Select
                                    value={presidenteId}
                                    onChange={handlePresidenteChange}
                                    placeholder="Filtrar Presidente"
                                    style={{ width: 220 }}
                                    variant="borderless"
                                    className="text-white"
                                    options={presidentesList.map((p) => ({
                                        value: p.id,
                                        label: p.name,
                                    }))}
                                />
                            </div>
                        )}

                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => fetchData()}
                            loading={loading}
                            className="rounded-xl border-slate-600 bg-slate-700/80 text-white hover:bg-slate-600"
                        >
                            Actualizar
                        </Button>

                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleExport}
                            className="rounded-xl bg-blue-600 font-semibold shadow-md hover:bg-blue-500"
                        >
                            Exportar CSV
                        </Button>
                    </div>
                </div>

                {/* Tarjetas KPI de Avance en Tiempo Real */}
                <Row gutter={[16, 16]}>
                    {/* Tarjeta 1: Gran Total Padrón */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="h-full rounded-2xl border-slate-200 shadow-sm transition-shadow hover:shadow">
                            <div className="mb-2 flex items-center justify-between text-slate-500">
                                <span className="text-xs font-bold tracking-wider uppercase">Gran Total Padrón</span>
                                <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                                    <TeamOutlined className="text-lg" />
                                </div>
                            </div>
                            <div className="mb-1 text-3xl font-black text-slate-900">
                                {stats?.total_general?.toLocaleString() || 0}
                            </div>
                            <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                                <span>
                                    Estructura: <b>{stats?.total_estructura || 0}</b>
                                </span>
                                <span>
                                    Promovidos: <b>{stats?.total_promovidos?.toLocaleString() || 0}</b>
                                </span>
                            </div>
                        </Card>
                    </Col>

                    {/* Tarjeta 2: Votos Confirmados (Ya votaron) */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="h-full rounded-2xl border-emerald-200 bg-emerald-50/40 shadow-sm transition-shadow hover:shadow">
                            <div className="mb-2 flex items-center justify-between text-emerald-700">
                                <span className="text-xs font-bold tracking-wider uppercase">Votos Confirmados</span>
                                <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                                    <CheckCircleFilled className="text-lg" />
                                </div>
                            </div>
                            <div className="mb-2 flex items-baseline gap-2">
                                <span className="text-3xl font-black text-emerald-800">
                                    {stats?.votaron_general?.toLocaleString() || 0}
                                </span>
                                <span className="text-sm font-bold text-emerald-600">({stats?.pct_general || 0}%)</span>
                            </div>
                            <Progress
                                percent={stats?.pct_general || 0}
                                showInfo={false}
                                strokeColor="#10b981"
                                trailColor="#d1fae5"
                                size="small"
                            />
                        </Card>
                    </Col>

                    {/* Tarjeta 3: Faltan por Votar (Objetivo Cacería) */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="h-full rounded-2xl border-amber-200 bg-amber-50/40 shadow-sm transition-shadow hover:shadow">
                            <div className="mb-2 flex items-center justify-between text-amber-800">
                                <span className="text-xs font-bold tracking-wider uppercase">Faltan por Votar</span>
                                <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                                    <FireOutlined className="text-lg" />
                                </div>
                            </div>
                            <div className="mb-2 flex items-baseline gap-2">
                                <span className="text-3xl font-black text-amber-900">
                                    {stats?.faltan_general?.toLocaleString() || 0}
                                </span>
                                <span className="text-xs font-medium text-amber-700">(Pendientes de movilizar)</span>
                            </div>
                            <div className="flex justify-between border-t border-amber-200/60 pt-2 text-xs text-amber-800">
                                <span>
                                    Faltan en estructura: <b>{stats?.faltan_estructura || 0}</b>
                                </span>
                                <span>
                                    Faltan promovidos: <b>{stats?.faltan_promovidos?.toLocaleString() || 0}</b>
                                </span>
                            </div>
                        </Card>
                    </Col>

                    {/* Tarjeta 4: Desglose por Estructura vs Promovidos */}
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="h-full rounded-2xl border-slate-200 shadow-sm transition-shadow hover:shadow">
                            <span className="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase">
                                Participación por Grupo
                            </span>
                            <div className="space-y-2 text-xs">
                                <div>
                                    <div className="mb-1 flex justify-between font-semibold text-slate-700">
                                        <span>Estructura Política</span>
                                        <span>
                                            {stats?.votaron_estructura || 0} / {stats?.total_estructura || 0} (
                                            {stats?.pct_estructura || 0}%)
                                        </span>
                                    </div>
                                    <Progress
                                        percent={stats?.pct_estructura || 0}
                                        size="small"
                                        strokeColor="#3b82f6"
                                        showInfo={false}
                                    />
                                </div>
                                <div>
                                    <div className="mb-1 flex justify-between font-semibold text-slate-700">
                                        <span>Promovidos en Campo</span>
                                        <span>
                                            {stats?.votaron_promovidos?.toLocaleString() || 0} /{' '}
                                            {stats?.total_promovidos?.toLocaleString() || 0} (
                                            {stats?.pct_promovidos || 0}%)
                                        </span>
                                    </div>
                                    <Progress
                                        percent={stats?.pct_promovidos || 0}
                                        size="small"
                                        strokeColor="#8b5cf6"
                                        showInfo={false}
                                    />
                                </div>
                            </div>
                        </Card>
                    </Col>
                </Row>

                {/* Desglose rápido de roles de estructura */}
                {stats?.desglose_roles && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {Object.entries(stats.desglose_roles).map(([roleKey, item]) => {
                            const pct = item.total > 0 ? Math.round((item.votaron / item.total) * 100) : 0;
                            return (
                                <div
                                    key={roleKey}
                                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                                >
                                    <div>
                                        <div className="text-xs font-medium text-slate-500">{item.nombre}</div>
                                        <div className="text-base font-black text-slate-800">
                                            {item.votaron}{' '}
                                            <span className="text-xs font-normal text-slate-400">/ {item.total}</span>
                                        </div>
                                    </div>
                                    <Badge
                                        count={`${pct}%`}
                                        style={{
                                            backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#64748b',
                                            fontWeight: 'bold',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Controles de Filtro & Búsqueda */}
                <Card className="rounded-2xl border-slate-200 shadow-sm">
                    <div className="flex flex-col gap-4">
                        {/* Fila 1: Pestañas de estatus y buscador principal */}
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="mr-1 text-xs font-bold tracking-wider text-slate-500 uppercase">
                                    Estatus:
                                </span>
                                <Segmented
                                    value={estatus}
                                    onChange={handleEstatusChange}
                                    options={[
                                        {
                                            label: (
                                                <div className="px-2 py-0.5 font-bold">
                                                    Todos ({stats?.total_general || 0})
                                                </div>
                                            ),
                                            value: 'todos',
                                        },
                                        {
                                            label: (
                                                <div className="flex items-center gap-1 px-2 py-0.5 font-bold text-amber-700">
                                                    <FireOutlined /> Faltan por Votar ({stats?.faltan_general || 0})
                                                </div>
                                            ),
                                            value: 'pendientes',
                                        },
                                        {
                                            label: (
                                                <div className="flex items-center gap-1 px-2 py-0.5 font-bold text-emerald-700">
                                                    <CheckCircleFilled /> Ya Votaron ({stats?.votaron_general || 0})
                                                </div>
                                            ),
                                            value: 'votaron',
                                        },
                                    ]}
                                    className="rounded-xl bg-slate-100 p-1"
                                />
                            </div>

                            <div className="w-full md:w-80">
                                <Input
                                    placeholder="Buscar nombre, clave, CURP o tel..."
                                    prefix={<SearchOutlined className="text-gray-400" />}
                                    value={search}
                                    onChange={handleSearchChange}
                                    allowClear
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Fila 2: Filtros de grupo, demarcación y sección */}
                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-600">Grupo:</span>
                                <Select
                                    value={tipo}
                                    onChange={handleTipoChange}
                                    style={{ width: 180 }}
                                    className="rounded-xl"
                                    options={[
                                        { label: 'Todos (Estructura + Promovidos)', value: 'todos' },
                                        { label: 'Toda la Estructura', value: 'estructura' },
                                        { label: 'Solo Promovidos', value: 'promovidos' },
                                        { label: 'Coordinadores', value: 'coordinador_distrito' },
                                        { label: 'Representantes (RD)', value: 'rd' },
                                        { label: 'Operadores', value: 'operador' },
                                        { label: 'Promotores', value: 'promotor' },
                                    ]}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-600">Demarcación:</span>
                                <Select
                                    value={demarcacionId}
                                    onChange={handleDemarcacionChange}
                                    placeholder="Todas las demarcaciones"
                                    allowClear
                                    style={{ width: 210 }}
                                    options={demarcaciones}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-slate-600">Sección:</span>
                                <Select
                                    value={seccionElectoral}
                                    onChange={handleSeccionChange}
                                    placeholder="Todas las secciones"
                                    allowClear
                                    showSearch
                                    style={{ width: 170 }}
                                    options={secciones}
                                />
                            </div>

                            {(search ||
                                (estatus && estatus !== 'todos') ||
                                (tipo && tipo !== 'todos') ||
                                demarcacionId ||
                                seccionElectoral) && (
                                <Button
                                    type="link"
                                    size="small"
                                    onClick={() => {
                                        setSearch('');
                                        setEstatus('todos');
                                        setTipo('todos');
                                        setDemarcacionId(undefined);
                                        setSeccionElectoral(undefined);
                                        fetchData({
                                            search: '',
                                            estatus: 'todos',
                                            tipo: 'todos',
                                            demarcacion_id: undefined,
                                            seccion_electoral: undefined,
                                            current: 1,
                                        });
                                    }}
                                    className="font-medium text-red-500"
                                >
                                    Limpiar Filtros
                                </Button>
                            )}

                            <div className="ml-auto text-xs text-slate-400">
                                Mostrando <b>{votersData.length}</b> de <b>{pagination.total}</b> registros
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Tabla de Votantes / Personas */}
                <Card className="overflow-hidden rounded-2xl border-slate-200 p-0 shadow-sm">
                    <Table
                        columns={columns}
                        dataSource={votersData}
                        rowKey={(record) => `${record.source_type}-${record.id}`}
                        loading={loading}
                        pagination={{
                            current: pagination.current,
                            pageSize: pagination.pageSize,
                            total: pagination.total,
                            showSizeChanger: true,
                            pageSizeOptions: ['15', '25', '50', '100'],
                            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} votantes`,
                            onChange: (page, pageSize) => {
                                fetchData({ current: page, pageSize });
                            },
                        }}
                        locale={{
                            emptyText: (
                                <Empty
                                    description={
                                        estatus === 'pendientes'
                                            ? '¡Excelente! No hay votantes pendientes con los filtros seleccionados.'
                                            : 'No se encontraron personas con los criterios especificados.'
                                    }
                                />
                            ),
                        }}
                        scroll={{ x: 850 }}
                    />
                </Card>
            </div>
        </MainLayout>
    );
}
