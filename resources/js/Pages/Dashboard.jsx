import React, { useState, useEffect } from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head, usePage, Link, router } from '@inertiajs/react';
import { Card, Col, Row, Statistic, Table, Tag, Button, Tabs } from 'antd';
import { 
    UserOutlined, 
    TeamOutlined, 
    UsergroupAddOutlined, 
    EnvironmentOutlined,
    BarChartOutlined
} from '@ant-design/icons';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
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
            render: (text) => <span className="font-semibold text-gray-700">{text}</span>
        },
        { 
            title: 'RDs', 
            dataIndex: 'rds', 
            key: 'rds',
            sorter: (a, b) => a.rds - b.rds,
            align: 'center'
        },
        { 
            title: 'OPERADORES', 
            dataIndex: 'operadores', 
            key: 'operadores',
            sorter: (a, b) => a.operadores - b.operadores,
            align: 'center'
        },
        { 
            title: 'PROMOTORES', 
            dataIndex: 'promotores', 
            key: 'promotores',
            sorter: (a, b) => a.promotores - b.promotores,
            align: 'center'
        },
        { 
            title: 'PROMOVIDOS', 
            dataIndex: 'promovidos', 
            key: 'promovidos',
            sorter: (a, b) => a.promovidos - b.promovidos,
            align: 'center'
        },
        { 
            title: 'TOTAL EN ESTRUCTURA', 
            dataIndex: 'total', 
            key: 'total',
            sorter: (a, b) => a.total - b.total,
            align: 'center',
            render: (total) => <span className="font-bold text-[#0f172a]">{total}</span>
        },
    ];

    const vistaGeneralContent = (
        <>
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
                        <Statistic
                            title={<div className="font-semibold text-gray-700">RD <br/><span className="font-normal text-xs text-gray-400">Representantes de Demarcación</span></div>}
                            value={stats.rds !== undefined ? stats.rds : 0}
                            valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                            prefix={<UserOutlined />}
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-xs text-green-600 font-medium">Activos</span>
                            {['presidente', 'admin', 'superuser'].includes(user.role) && (
                                <Link href="/representantes" className="text-blue-600 text-sm hover:underline">Ver todos →</Link>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
                        <Statistic
                            title={<div className="font-semibold text-gray-700">Operadores <br/><span className="font-normal text-xs text-gray-400">Operadores Políticos</span></div>}
                            value={stats.operadores}
                            valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                            prefix={<TeamOutlined />}
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-xs text-green-600 font-medium">Activos</span>
                            {['presidente', 'rd'].includes(user.role) && (
                                <Link href="/operadores" className="text-blue-600 text-sm hover:underline">Ver todos →</Link>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow">
                        <Statistic
                            title={<div className="font-semibold text-gray-700">Promotores <br/><span className="font-normal text-xs text-gray-400">Promotores Registrados</span></div>}
                            value={stats.promotores}
                            valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                            prefix={<UsergroupAddOutlined />}
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-xs text-green-600 font-medium">Activos</span>
                            {['presidente', 'rd', 'operador'].includes(user.role) && (
                                <Link href="/promotores" className="text-blue-600 text-sm hover:underline">Ver todos →</Link>
                            )}
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card bordered={false} className="shadow-sm hover:shadow-md transition-shadow bg-blue-50">
                        <Statistic
                            title={<div className="font-semibold text-gray-700">Promovidos <br/><span className="font-normal text-xs text-gray-400">Promovidos Registrados</span></div>}
                            value={stats.promovidos}
                            valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                            prefix={<EnvironmentOutlined />}
                        />
                        <div className="mt-4 flex justify-between items-center">
                            <span className="text-xs text-gray-600 font-medium">Totales</span>
                            <Link href="/promovidos" className="text-blue-600 text-sm hover:underline">Ver todos →</Link>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={24} lg={12}>
                    <Card title={<span className="font-semibold">Resumen de la Estructura</span>} bordered={false} className="shadow-sm h-full">
                        <div className="flex flex-row flex-wrap xl:flex-nowrap items-center justify-center gap-2 py-6 px-2">
                            {/* Conversion Flow representation */}
                            <div className="text-center p-2 lg:p-3 bg-blue-50 rounded-lg border border-blue-100 flex-1 min-w-[70px]">
                                <div className="text-blue-600 font-bold text-xs lg:text-sm mb-1 truncate">RD</div>
                                <div className="text-xl lg:text-2xl font-bold text-gray-800">{stats.rds !== undefined ? stats.rds : 0}</div>
                            </div>
                            <div className="text-gray-400 text-xs lg:text-base hidden sm:block">→</div>
                            <div className="text-center p-2 lg:p-3 bg-green-50 rounded-lg border border-green-100 flex-1 min-w-[70px]">
                                <div className="text-green-600 font-bold text-xs lg:text-sm mb-1 truncate" title="Operadores">Operadores</div>
                                <div className="text-xl lg:text-2xl font-bold text-gray-800">{stats.operadores}</div>
                            </div>
                            <div className="text-gray-400 text-xs lg:text-base hidden sm:block">→</div>
                            <div className="text-center p-2 lg:p-3 bg-purple-50 rounded-lg border border-purple-100 flex-1 min-w-[70px]">
                                <div className="text-purple-600 font-bold text-xs lg:text-sm mb-1 truncate" title="Promotores">Promotores</div>
                                <div className="text-xl lg:text-2xl font-bold text-gray-800">{stats.promotores}</div>
                            </div>
                            <div className="text-gray-400 text-xs lg:text-base hidden sm:block">→</div>
                            <div className="text-center p-2 lg:p-3 bg-orange-50 rounded-lg border border-orange-100 flex-1 min-w-[70px]">
                                <div className="text-orange-600 font-bold text-xs lg:text-sm mb-1 truncate" title="Promovidos">Promovidos</div>
                                <div className="text-xl lg:text-2xl font-bold text-gray-800">{stats.promovidos}</div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title={<span className="font-semibold">Crecimiento general</span>} bordered={false} className="shadow-sm h-full">
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[...growthData].reverse()} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{fontSize: 12}} />
                                    <YAxis tick={{fontSize: 12}} />
                                    <RechartsTooltip />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                                    <Line type="monotone" dataKey="operadores" stroke="#52c41a" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="promotores" stroke="#722ed1" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="promovidos" stroke="#fa8c16" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>


        </>
    );

    const reportesContent = (
        <Card bordered={false} className="shadow-sm rounded-xl">
            <div className="flex items-center gap-2 mb-4 text-[#0f172a]">
                <BarChartOutlined className="text-blue-600 text-xl" /> 
                <h2 className="text-lg font-bold m-0">Reportes por Demarcación</h2>
            </div>
            <p className="text-gray-500 mb-6">Resumen detallado de la estructura agrupada por Demarcación</p>
            {isMobile ? (
                <div className="flex flex-col gap-4">
                    {reporteDemarcaciones.map(item => (
                        <Card 
                            key={item.demarcacion} 
                            size="small" 
                            className="shadow-sm border border-gray-100 rounded-lg"
                            title={<span className="font-semibold text-gray-800 text-sm">{item.demarcacion}</span>}
                        >
                            <Row gutter={[8, 8]}>
                                <Col span={12}>
                                    <div className="text-gray-400 text-xs">RDs</div>
                                    <div className="font-bold text-gray-800 text-sm">{item.rds}</div>
                                </Col>
                                <Col span={12}>
                                    <div className="text-gray-400 text-xs">Operadores</div>
                                    <div className="font-bold text-gray-800 text-sm">{item.operadores}</div>
                                </Col>
                                <Col span={12} className="mt-2">
                                    <div className="text-gray-400 text-xs">Promotores</div>
                                    <div className="font-bold text-gray-800 text-sm">{item.promotores}</div>
                                </Col>
                                <Col span={12} className="mt-2">
                                    <div className="text-gray-400 text-xs">Promovidos</div>
                                    <div className="font-bold text-gray-800 text-sm">{item.promovidos}</div>
                                </Col>
                            </Row>
                            <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center bg-gray-50 -mx-3 -mb-3 p-3 rounded-b-lg">
                                <span className="text-gray-500 font-semibold text-xs">TOTAL EN ESTRUCTURA:</span>
                                <span className="font-extrabold text-blue-600 text-sm">{item.total}</span>
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
            <Head title={`Panel de ${['presidente', 'admin', 'superuser'].includes(user.role) ? 'Administración' : (user.role === 'rd' ? 'Representante de Demarcación' : 'Promotor')}`} />
            
            <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1">
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
                    {
                        key: '2',
                        label: 'Reportes Estadísticos',
                        children: reportesContent,
                    }
                ]}
            />



        </MainLayout>
    );
}
