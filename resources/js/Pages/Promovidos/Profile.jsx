import React from 'react';
import MainLayout from '@/Layouts/MainLayout';
import { Head } from '@inertiajs/react';
import { Card, Row, Col, Badge, Divider, Tag } from 'antd';
import {
    UserOutlined,
    IdcardOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    EnvironmentOutlined,
    PhoneOutlined,
    HomeOutlined,
} from '@ant-design/icons';

export default function PromovidoProfile({ promovido }) {
    // Mock data based on the image
    const data = promovido || {
        id: 'PM-0087',
        nombre_completo: 'José Antonio Ruiz',
        apodo: 'Pepe',
        clave_elector: 'RUIZJOSE19900101HMCZSN05',
        curp: 'RUIZ900101HMCZSN05',
        fecha_nacimiento: '01/01/1990',
        seccion_electoral: '1234',
        fecha_registro: '20/05/2024',
        registrado_por: 'Carlos Mendoza (PR-0015)',
        colonia: 'Col. San Juan',
        calle: 'Calle Hidalgo',
        num_ext: '125',
        telefono: '55 1234 5678',
        estado: 'Activo',
    };

    return (
        <MainLayout>
            <Head title="Perfil de Promovido" />

            <div className="mb-6 flex items-center text-sm text-gray-500">
                <span className="font-semibold text-gray-800">Promovido</span>
                <span className="mx-2">|</span>
                <span>Inicio / Mi Información</span>
            </div>

            {/* Header Card */}
            <Card bordered={false} className="mb-6 shadow-sm">
                <Row gutter={24} align="middle">
                    <Col>
                        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-200 text-gray-400 shadow-inner">
                            {data.foto_url ? (
                                <img src={data.foto_url} alt="Perfil" className="h-full w-full object-cover" />
                            ) : (
                                <UserOutlined style={{ fontSize: '48px' }} />
                            )}
                        </div>
                    </Col>
                    <Col flex="auto">
                        <div className="mb-2 flex items-center gap-3">
                            <h1 className="m-0 text-3xl font-bold">{data.nombre_completo}</h1>
                            <span className="text-2xl font-medium text-green-600">"{data.apodo}"</span>
                        </div>

                        <Row gutter={[32, 16]} className="mt-4">
                            <Col>
                                <div className="mb-2 flex items-center gap-2 text-gray-600">
                                    <UserOutlined className="text-gray-400" /> ID Promovido:{' '}
                                    <Tag color="green" className="ml-1 rounded-full font-bold">
                                        {data.id}
                                    </Tag>
                                </div>
                                <div className="mb-2 flex items-center gap-2 text-gray-600">
                                    <Badge status="success" /> Estatus:{' '}
                                    <span className="ml-1 font-medium text-green-600">● Activo</span>
                                </div>
                                <div className="mb-2 flex items-center gap-2 text-gray-600">
                                    <CalendarOutlined className="text-gray-400" /> Fecha de registro:{' '}
                                    <span className="ml-1 font-medium">{data.fecha_registro}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <UserOutlined className="text-gray-400" /> Registrado por:{' '}
                                    <span className="ml-1 font-medium">{data.registrado_por}</span>
                                </div>
                            </Col>
                            <Col>
                                <div className="mb-2 flex items-center gap-2 text-gray-600">
                                    <EnvironmentOutlined className="text-gray-400" /> Colonia:{' '}
                                    <span className="ml-1 font-medium">{data.colonia}</span>
                                </div>
                                <div className="mb-2 flex items-center gap-2 text-gray-600">
                                    <HomeOutlined className="text-gray-400" /> Calle:{' '}
                                    <span className="ml-1 font-medium">{data.calle}</span>
                                </div>
                                <div className="mb-2 flex items-center gap-2 text-gray-600">
                                    <span className="ml-1 font-bold text-gray-400">#</span> Número exterior:{' '}
                                    <span className="ml-1 font-medium">{data.num_ext}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <PhoneOutlined className="text-gray-400" /> Teléfono:{' '}
                                    <span className="ml-1 font-medium">{data.telefono}</span>
                                </div>
                            </Col>
                        </Row>
                    </Col>
                    <Col>
                        <div className="mb-2 text-center text-sm font-medium text-gray-500">Fotografía actual</div>
                        <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100 p-1 text-gray-400">
                            {data.foto_url ? (
                                <img
                                    src={data.foto_url}
                                    alt="Verificación"
                                    className="h-full w-full rounded object-cover"
                                />
                            ) : (
                                <UserOutlined style={{ fontSize: '48px' }} />
                            )}
                        </div>
                    </Col>
                </Row>
            </Card>

            <Row gutter={24}>
                {/* Left Column */}
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span className="flex items-center gap-2 font-semibold text-blue-800">
                                <IdcardOutlined /> Información Personal
                            </span>
                        }
                        bordered={false}
                        className="mb-6 shadow-sm"
                    >
                        <div className="grid grid-cols-2 gap-y-4">
                            <div className="text-gray-500">Nombre completo:</div>
                            <div className="font-medium">{data.nombre_completo}</div>

                            <div className="text-gray-500">Clave electoral:</div>
                            <div className="font-medium">{data.clave_elector}</div>

                            <div className="text-gray-500">CURP:</div>
                            <div className="font-medium">{data.curp}</div>

                            <div className="text-gray-500">Fecha de nacimiento:</div>
                            <div className="font-medium">{data.fecha_nacimiento}</div>

                            <div className="text-gray-500">Sección electoral:</div>
                            <div className="font-medium">{data.seccion_electoral}</div>
                        </div>
                    </Card>

                    <Row gutter={24}>
                        <Col span={12}>
                            <Card
                                title={
                                    <span className="flex items-center gap-2 font-semibold text-blue-800">
                                        <CheckCircleOutlined /> Documentos y Verificación
                                    </span>
                                }
                                bordered={false}
                                className="h-full shadow-sm"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">INE / Identificación:</span>
                                        <span className="font-medium text-green-600">
                                            <CheckCircleOutlined /> Verificado
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">CURP:</span>
                                        <span className="font-medium text-green-600">
                                            <CheckCircleOutlined /> Verificado
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Domicilio:</span>
                                        <span className="font-medium text-green-600">
                                            <CheckCircleOutlined /> Verificado
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-600">Fotografía actual:</span>
                                        <span className="font-medium text-green-600">
                                            <CheckCircleOutlined /> Verificado
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card
                                title={
                                    <span className="flex items-center gap-2 font-semibold text-orange-500">
                                        📝 Notas
                                    </span>
                                }
                                bordered={false}
                                className="h-full bg-yellow-50 shadow-sm"
                            >
                                <p className="m-0 text-sm leading-relaxed text-gray-700">
                                    Persona de confianza en la colonia. Participa activamente en las reuniones y apoya
                                    en eventos de la zona. Tiene buena comunicación con vecinos y familiares.
                                </p>
                            </Card>
                        </Col>
                    </Row>
                </Col>

                {/* Right Column */}
                <Col xs={24} lg={12}>
                    <Card
                        title={
                            <span className="flex items-center gap-2 font-semibold text-purple-700">
                                <EnvironmentOutlined /> Ubicación
                            </span>
                        }
                        bordered={false}
                        className="body-no-padding mb-6 shadow-sm"
                    >
                        <div className="relative h-48 w-full overflow-hidden rounded-t-lg bg-gray-200">
                            {/* Placeholder for Map */}
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-100">
                                <EnvironmentOutlined className="text-6xl text-purple-600 drop-shadow-md" />
                            </div>
                        </div>
                        <div className="rounded-b-lg border-t border-gray-100 bg-gray-50 p-4">
                            <p className="m-0 text-sm font-medium text-gray-700">
                                Col. San Juan, Municipio de Ejemplo, Estado de Ejemplo
                            </p>
                        </div>
                    </Card>

                    <Card
                        title={<span className="font-semibold text-blue-800">Mi Posición en la Estructura</span>}
                        bordered={false}
                        className="mb-6 shadow-sm"
                    >
                        <div className="relative space-y-2 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:-translate-x-px before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent md:before:mx-auto md:before:translate-x-0">
                            <div className="group is-active relative flex items-center justify-between rounded border border-gray-200 bg-white p-3 md:justify-normal md:odd:flex-row-reverse">
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-600 font-bold text-white">
                                            RD
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">RD-0001</div>
                                            <div className="text-sm text-gray-500">Ana Gabriela Torres</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">Representante de Demarcación</div>
                                </div>
                            </div>

                            <div className="text-center text-gray-400">↓</div>

                            <div className="group is-active relative ml-4 flex items-center justify-between rounded border border-gray-200 bg-white p-3 md:justify-normal md:odd:flex-row-reverse">
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-800 font-bold text-white">
                                            OP
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">OP-0003</div>
                                            <div className="text-sm text-gray-500">Luis Alberto Martínez</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">Operador Político</div>
                                </div>
                            </div>

                            <div className="ml-4 text-center text-gray-400">↓</div>

                            <div className="group is-active relative ml-8 flex items-center justify-between rounded border border-gray-200 bg-white p-3 md:justify-normal md:odd:flex-row-reverse">
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded bg-purple-600 font-bold text-white">
                                            PR
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">PR-0015</div>
                                            <div className="text-sm text-gray-500">Carlos Mendoza "El Charly"</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-purple-600">Promotor</div>
                                </div>
                            </div>

                            <div className="ml-8 text-center text-gray-400">↓</div>

                            <div className="group is-active relative ml-12 flex items-center justify-between rounded border border-green-200 bg-green-50 p-3 md:justify-normal md:odd:flex-row-reverse">
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded bg-green-600 font-bold text-white">
                                            PM
                                        </div>
                                        <div>
                                            <div className="font-bold text-green-800">{data.id}</div>
                                            <div className="text-sm text-green-700">{data.nombre_completo}</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-green-600">Promovido</div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>
        </MainLayout>
    );
}
