import React, { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Input, Select, Tag, Avatar, Spin, Empty, Button, Popover } from 'antd';
import {
    SearchOutlined,
    UserOutlined,
    UserSwitchOutlined,
    EnvironmentOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const ROLE_COLORS = {
    superuser: 'magenta',
    admin: 'red',
    presidente: 'gold',
    rd: 'blue',
    operador: 'cyan',
    promotor: 'green',
};

const ROLE_NAMES = {
    superuser: 'Superuser',
    admin: 'Admin',
    presidente: 'Presidente',
    rd: 'RD',
    operador: 'Operador',
    promotor: 'Promotor',
};

export default function HeaderImpersonateSearch() {
    const { auth } = usePage().props;
    const canImpersonate = auth?.can_impersonate ?? false;

    const [municipios, setMunicipios] = useState([]);
    const [selectedMunicipio, setSelectedMunicipio] = useState(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [impersonatingId, setImpersonatingId] = useState(null);

    const containerRef = useRef(null);

    // Cargar lista de municipios
    useEffect(() => {
        if (canImpersonate) {
            axios
                .get('/catalogos/municipios')
                .then((res) => {
                    setMunicipios(res.data || []);
                })
                .catch((err) => console.error('Error cargando municipios:', err));
        }
    }, [canImpersonate]);

    // Ejecutar búsqueda con debounce
    useEffect(() => {
        if (!canImpersonate) return;

        const timer = setTimeout(() => {
            fetchUsers(query, selectedMunicipio);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, selectedMunicipio, canImpersonate]);

    const fetchUsers = async (q, municipioId) => {
        setLoading(true);
        try {
            const res = await axios.get('/impersonate/search', {
                params: {
                    q: q || '',
                    municipality_id: municipioId || '',
                },
            });
            setResults(res.data || []);
        } catch (err) {
            console.error('Error buscando usuarios:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleTakeImpersonate = (userId) => {
        setImpersonatingId(userId);
        setOpen(false);
        router.post(
            `/impersonate/${userId}`,
            {},
            {
                onFinish: () => setImpersonatingId(null),
            }
        );
    };

    if (!canImpersonate) {
        return (
            <Input
                prefix={<SearchOutlined className="text-gray-400" />}
                placeholder="Buscar..."
                className="w-32 rounded-md border-gray-200 hover:border-blue-400 focus:border-blue-500 sm:w-48 md:w-80"
            />
        );
    }

    const popoverContent = (
        <div className="max-h-[380px] w-[320px] overflow-y-auto p-1 sm:w-[420px]">
            <div className="mb-2 flex items-center justify-between px-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">
                <span>Usuarios Disponibles</span>
                <span className="text-[10px] text-gray-400">{results.length} resultados</span>
            </div>

            {loading ? (
                <div className="py-8 text-center text-gray-400">
                    <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
                    <p className="mt-2 text-xs">Buscando usuarios...</p>
                </div>
            ) : results.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<span className="text-xs text-gray-400">No se encontraron usuarios</span>}
                    className="my-4"
                />
            ) : (
                <div className="divide-y divide-gray-100">
                    {results.map((u) => (
                        <div
                            key={u.id}
                            className="group flex cursor-pointer items-center justify-between rounded-lg p-2.5 transition-colors hover:bg-blue-50/60"
                            onClick={() => handleTakeImpersonate(u.id)}
                        >
                            <div className="flex min-w-0 items-center gap-2.5 pr-2">
                                <Avatar icon={<UserOutlined />} className="flex-shrink-0 bg-blue-100 text-blue-600" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="truncate text-sm leading-snug font-semibold text-gray-800">
                                            {u.name}
                                        </span>
                                        <Tag
                                            color={ROLE_COLORS[u.role] || 'default'}
                                            className="m-0 border-none px-1.5 py-0 text-[10px] font-medium"
                                        >
                                            {ROLE_NAMES[u.role] || u.role}
                                        </Tag>
                                    </div>

                                    <div className="mt-0.5 flex items-center gap-2 truncate text-xs text-gray-400">
                                        {u.email && <span className="truncate">{u.email}</span>}
                                        {u.municipality_name && (
                                            <span className="inline-flex items-center gap-0.5 font-medium text-gray-500">
                                                <EnvironmentOutlined className="text-gray-400" />
                                                {u.municipality_name}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="primary"
                                size="small"
                                icon={<UserSwitchOutlined />}
                                loading={impersonatingId === u.id}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleTakeImpersonate(u.id);
                                }}
                                className="flex-shrink-0 bg-blue-600 text-xs shadow-none hover:bg-blue-700"
                            >
                                Impersonar
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div ref={containerRef} className="flex items-center gap-2">
            {/* Filtro de Municipio */}
            <Select
                showSearch
                optionFilterProp="label"
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                placeholder="Todos los Municipios"
                allowClear
                value={selectedMunicipio}
                onChange={(val) => setSelectedMunicipio(val)}
                className="hidden w-36 sm:block sm:w-44"
                size="middle"
                options={[
                    { value: null, label: 'Todos los Municipios' },
                    ...municipios.map((m) => ({ value: m.id, label: m.nombre })),
                ]}
            />

            {/* Buscador de Usuario con Popover */}
            <Popover
                content={popoverContent}
                trigger="click"
                open={open}
                onOpenChange={(newOpen) => setOpen(newOpen)}
                placement="bottomRight"
                overlayClassName="impersonate-search-popover"
            >
                <Input
                    prefix={<SearchOutlined className="text-gray-400" />}
                    placeholder="Impersonar usuario..."
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    className="w-40 rounded-md border-gray-200 shadow-sm hover:border-blue-400 focus:border-blue-500 sm:w-56 md:w-64"
                    allowClear={{ clearIcon: <span onClick={() => setQuery('')}>×</span> }}
                />
            </Popover>
        </div>
    );
}
