import React, { useState, useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, usePage, Link, router } from '@inertiajs/react';
import { Card, Col, Row, Statistic, Table, Tag, Button, Tabs } from 'antd';
import {
    UserOutlined,
    TeamOutlined,
    UsergroupAddOutlined,
    EnvironmentOutlined,
    BarChartOutlined,
} from '@ant-design/icons';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

export default function Dashboard({ stats, growthData, distribution, rds, reporteDemarcaciones }) {
    const { auth } = usePage().props;
    const user = auth?.user || { role: 'presidente' };
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // growthData ahora viene como prop desde el backend

    const reportesColumns = [
        {
            title: 'DEMARCACIÓN',
            dataIndex: 'demarcacion',
            key: 'demarcacion',
            sorter: (a, b) => a.demarcacion.localeCompare(b.demarcacion),
            render: (text) => <span className="font-semibold text-gray-700">{text}</span>,
        },
        {
            title: 'RDs',
            dataIndex: 'rds',
            key: 'rds',
            sorter: (a, b) => a.rds - b.rds,
            align: 'center',
        },
        {
            title: 'OPERADORES',
            dataIndex: 'operadores',
            key: 'operadores',
            sorter: (a, b) => a.operadores - b.operadores,
            align: 'center',
        },
        {
            title: 'PROMOTORES',
            dataIndex: 'promotores',
            key: 'promotores',
            sorter: (a, b) => a.promotores - b.promotores,
            align: 'center',
        },
        {
            title: 'PROMOVIDOS',
            dataIndex: 'promovidos',
            key: 'promovidos',
            sorter: (a, b) => a.promovidos - b.promovidos,
            align: 'center',
        },
        {
            title: 'TOTAL EN ESTRUCTURA',
            dataIndex: 'total',
            key: 'total',
            sorter: (a, b) => a.total - b.total,
            align: 'center',
            render: (total) => <span className="font-bold text-[#0f172a]">{total}</span>,
        },
    ];

    const vistaGeneralContent = (
        <>
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="shadow-sm transition-shadow hover:shadow-md">
                        <Statistic
                            title={
                                <div className="font-semibold text-gray-700">
                                    RD <br />
                                    <span className="text-xs font-normal text-gray-400">
                                        Representantes de Demarcación
                                    </span>
                                </div>
                            }
                            value={stats.rds !== undefined ? stats.rds : 0}
                            valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                            prefix={<UserOutlined />}
                        />
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-medium text-green-600">Activos</span>
                            {['presidente', 'admin', 'superuser'].includes(user.role) && (
                                <Link href="/representantes" className="text-sm text-blue-600 hover:underline">
                                    Ver todos →
                                </Link>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="shadow-sm transition-shadow hover:shadow-md">
                        <Statistic
                            title={
                                <div className="font-semibold text-gray-700">
                                    Operadores <br />
                                    <span className="text-xs font-normal text-gray-400">Operadores Políticos</span>
                                </div>
                            }
                            value={stats.operadores}
                            valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                            prefix={<TeamOutlined />}
                        />
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-medium text-green-600">Activos</span>
                            {['presidente', 'rd'].includes(user.role) && (
                                <Link href="/operadores" className="text-sm text-blue-600 hover:underline">
                                    Ver todos →
                                </Link>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="shadow-sm transition-shadow hover:shadow-md">
                        <Statistic
                            title={
                                <div className="font-semibold text-gray-700">
                                    Promotores <br />
                                    <span className="text-xs font-normal text-gray-400">Promotores Registrados</span>
                                </div>
                            }
                            value={stats.promotores}
                            valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                            prefix={<UsergroupAddOutlined />}
                        />
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-medium text-green-600">Activos</span>
                            {['presidente', 'rd', 'operador'].includes(user.role) && (
                                <Link href="/promotores" className="text-sm text-blue-600 hover:underline">
                                    Ver todos →
                                </Link>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="bg-blue-50 shadow-sm transition-shadow hover:shadow-md">
                        <Statistic
                            title={
                                <div className="font-semibold text-gray-700">
                                    Promovidos <br />
                                    <span className="text-xs font-normal text-gray-400">Promovidos Registrados</span>
                                </div>
                            }
                            value={stats.promovidos}
                            valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                            prefix={<EnvironmentOutlined />}
                        />
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-600">Totales</span>
                            <Link href="/promovidos" className="text-sm text-blue-600 hover:underline">
                                Ver todos →
                            </Link>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={12}>
                    <Card
                        title={<span className="font-semibold">Resumen de la Estructura</span>}
                        bordered={false}
                        className="h-full shadow-sm"
                    >
                        <div className="flex flex-row flex-wrap items-center justify-center gap-2 px-2 py-6 xl:flex-nowrap">
                            {/* Conversion Flow representation */}
                            <div className="min-w-[70px] flex-1 rounded-lg border border-blue-100 bg-blue-50 p-2 text-center lg:p-3">
                                <div className="mb-1 truncate text-xs font-bold text-blue-600 lg:text-sm">RD</div>
                                <div className="text-xl font-bold text-gray-800 lg:text-2xl">
                                    {stats.rds !== undefined ? stats.rds : 0}
                                </div>
                            </div>
                            <div className="hidden text-xs text-gray-400 sm:block lg:text-base">→</div>
                            <div className="min-w-[70px] flex-1 rounded-lg border border-green-100 bg-green-50 p-2 text-center lg:p-3">
                                <div
                                    className="mb-1 truncate text-xs font-bold text-green-600 lg:text-sm"
                                    title="Operadores"
                                >
                                    Operadores
                                </div>
                                <div className="text-xl font-bold text-gray-800 lg:text-2xl">{stats.operadores}</div>
                            </div>
                            <div className="hidden text-xs text-gray-400 sm:block lg:text-base">→</div>
                            <div className="min-w-[70px] flex-1 rounded-lg border border-purple-100 bg-purple-50 p-2 text-center lg:p-3">
                                <div
                                    className="mb-1 truncate text-xs font-bold text-purple-600 lg:text-sm"
                                    title="Promotores"
                                >
                                    Promotores
                                </div>
                                <div className="text-xl font-bold text-gray-800 lg:text-2xl">{stats.promotores}</div>
                            </div>
                            <div className="hidden text-xs text-gray-400 sm:block lg:text-base">→</div>
                            <div className="min-w-[70px] flex-1 rounded-lg border border-orange-100 bg-orange-50 p-2 text-center lg:p-3">
                                <div
                                    className="mb-1 truncate text-xs font-bold text-orange-600 lg:text-sm"
                                    title="Promovidos"
                                >
                                    Promovidos
                                </div>
                                <div className="text-xl font-bold text-gray-800 lg:text-2xl">{stats.promovidos}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card
                        title={<span className="font-semibold">Crecimiento general</span>}
                        bordered={false}
                        className="h-full shadow-sm"
                    >
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                    data={[...growthData].reverse()}
                                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <RechartsTooltip />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                                    <Line
                                        type="monotone"
                                        dataKey="operadores"
                                        stroke="#52c41a"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="promotores"
                                        stroke="#722ed1"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="promovidos"
                                        stroke="#fa8c16"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>
        </>
    );

    const reportesContent = (
        <Card bordered={false} className="rounded-xl shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-[#0f172a]">
                <BarChartOutlined className="text-xl text-blue-600" />
                <h2 className="m-0 text-lg font-bold">Reportes por Demarcación</h2>
            </div>
            <p className="mb-6 text-gray-500">Resumen detallado de la estructura agrupada por Demarcación</p>
            {isMobile ? (
                <div className="flex flex-col gap-4">
                    {reporteDemarcaciones.map((item) => (
                        <Card
                            key={item.demarcacion}
                            size="small"
                            className="rounded-lg border border-gray-100 shadow-sm"
                            title={<span className="text-sm font-semibold text-gray-800">{item.demarcacion}</span>}
                        >
                            <Row gutter={[8, 8]}>
                                <Col span={12}>
                                    <div className="text-xs text-gray-400">RDs</div>
                                    <div className="text-sm font-bold text-gray-800">{item.rds}</div>
                                </Col>
                                <Col span={12}>
                                    <div className="text-xs text-gray-400">Operadores</div>
                                    <div className="text-sm font-bold text-gray-800">{item.operadores}</div>
                                </Col>
                                <Col span={12} className="mt-2">
                                    <div className="text-xs text-gray-400">Promotores</div>
                                    <div className="text-sm font-bold text-gray-800">{item.promotores}</div>
                                </Col>
                                <Col span={12} className="mt-2">
                                    <div className="text-xs text-gray-400">Promovidos</div>
                                    <div className="text-sm font-bold text-gray-800">{item.promovidos}</div>
                                </Col>
                            </Row>
                            <div className="-mx-3 mt-3 -mb-3 flex items-center justify-between rounded-b-lg border-t border-gray-100 bg-gray-50 p-3 pt-2">
                                <span className="text-xs font-semibold text-gray-500">TOTAL EN ESTRUCTURA:</span>
                                <span className="text-sm font-extrabold text-blue-600">{item.total}</span>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <Table
                    columns={reportesColumns}
                    dataSource={reporteDemarcaciones}
                    rowKey="demarcacion"
                    pagination={{ pageSize: 15 }}
                    scroll={{ x: 'max-content' }}
                    className="overflow-x-auto"
                />
            )}
        </Card>
    );

    return (
        <MainLayout>
            <Head
                title={`Panel de ${['presidente', 'admin', 'superuser'].includes(user.role) ? 'Administración' : user.role === 'rd' ? 'Representante de Demarcación' : 'Promotor'}`}
            />

            <div className="mb-6">
                <h1 className="mb-1 text-2xl font-bold">
                    {['presidente', 'admin', 'superuser'].includes(user.role) && 'Panel General'}
                    {user.role === 'rd' && 'Panel de Representante de Demarcación'}
                    {user.role === 'promotor' && 'Panel de Promotor'}
                </h1>
                <p className="text-gray-500">Vista general de tu estructura</p>
            </div>

            <Tabs
                defaultActiveKey="1"
                className="dashboard-tabs"
                items={[
                    {
                        key: '1',
                        label: 'Vista General',
                        children: vistaGeneralContent,
                    },
                    user.role === 'presidente'
                        ? {
                              key: '2',
                              label: 'Reportes Estadísticos',
                              children: reportesContent,
                          }
                        : null,
                ].filter(Boolean)}
            />
        </MainLayout>
    );
}
