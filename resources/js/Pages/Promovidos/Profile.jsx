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
    HomeOutlined
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
        estado: 'Activo'
    };

    return (
        <MainLayout>
            <Head title="Perfil de Promovido" />

            <div className="flex items-center text-gray-500 mb-6 text-sm">
                <span className="font-semibold text-gray-800">Promovido</span>
                <span className="mx-2">|</span>
                <span>Inicio / Mi Información</span>
            </div>

            {/* Header Card */}
            <Card bordered={false} className="shadow-sm mb-6">
                <Row gutter={24} align="middle">
                    <Col>
                        <div className="w-32 h-32 rounded-lg bg-gray-200 overflow-hidden shadow-inner border border-gray-100">
                            <img src="https://i.pravatar.cc/300?u=pepe" alt="Perfil" className="w-full h-full object-cover" />
                        </div>
                    </Col>
                    <Col flex="auto">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold m-0">{data.nombre_completo}</h1>
                            <span className="text-2xl text-green-600 font-medium">"{data.apodo}"</span>
                        </div>
                        
                        <Row gutter={[32, 16]} className="mt-4">
                            <Col>
                                <div className="flex items-center gap-2 mb-2 text-gray-600">
                                    <UserOutlined className="text-gray-400" /> ID Promovido: <Tag color="green" className="ml-1 rounded-full font-bold">{data.id}</Tag>
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-gray-600">
                                    <Badge status="success" /> Estatus: <span className="text-green-600 font-medium ml-1">● Activo</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-gray-600">
                                    <CalendarOutlined className="text-gray-400" /> Fecha de registro: <span className="font-medium ml-1">{data.fecha_registro}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <UserOutlined className="text-gray-400" /> Registrado por: <span className="font-medium ml-1">{data.registrado_por}</span>
                                </div>
                            </Col>
                            <Col>
                                <div className="flex items-center gap-2 mb-2 text-gray-600">
                                    <EnvironmentOutlined className="text-gray-400" /> Colonia: <span className="font-medium ml-1">{data.colonia}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-gray-600">
                                    <HomeOutlined className="text-gray-400" /> Calle: <span className="font-medium ml-1">{data.calle}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-2 text-gray-600">
                                    <span className="text-gray-400 font-bold ml-1">#</span> Número exterior: <span className="font-medium ml-1">{data.num_ext}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-600">
                                    <PhoneOutlined className="text-gray-400" /> Teléfono: <span className="font-medium ml-1">{data.telefono}</span>
                                </div>
                            </Col>
                        </Row>
                    </Col>
                    <Col>
                         <div className="text-center text-sm text-gray-500 font-medium mb-2">Fotografía actual</div>
                         <div className="w-32 h-32 rounded-lg bg-gray-100 p-1 border border-dashed border-gray-300">
                            <img src="https://i.pravatar.cc/300?u=pepe" alt="Verificación" className="w-full h-full object-cover rounded" />
                         </div>
                    </Col>
                </Row>
            </Card>

            <Row gutter={24}>
                {/* Left Column */}
                <Col xs={24} lg={12}>
                    <Card title={<span className="text-blue-800 font-semibold flex items-center gap-2"><IdcardOutlined /> Información Personal</span>} bordered={false} className="shadow-sm mb-6">
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
                            <Card title={<span className="text-blue-800 font-semibold flex items-center gap-2"><CheckCircleOutlined /> Documentos y Verificación</span>} bordered={false} className="shadow-sm h-full">
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">INE / Identificación:</span>
                                        <span className="text-green-600 font-medium"><CheckCircleOutlined /> Verificado</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">CURP:</span>
                                        <span className="text-green-600 font-medium"><CheckCircleOutlined /> Verificado</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Domicilio:</span>
                                        <span className="text-green-600 font-medium"><CheckCircleOutlined /> Verificado</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600">Fotografía actual:</span>
                                        <span className="text-green-600 font-medium"><CheckCircleOutlined /> Verificado</span>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                        <Col span={12}>
                            <Card title={<span className="text-orange-500 font-semibold flex items-center gap-2">📝 Notas</span>} bordered={false} className="shadow-sm h-full bg-yellow-50">
                                <p className="text-gray-700 text-sm leading-relaxed m-0">
                                    Persona de confianza en la colonia. Participa activamente en las reuniones y apoya en eventos de la zona. Tiene buena comunicación con vecinos y familiares.
                                </p>
                            </Card>
                        </Col>
                    </Row>
                </Col>

                {/* Right Column */}
                <Col xs={24} lg={12}>
                    <Card title={<span className="text-purple-700 font-semibold flex items-center gap-2"><EnvironmentOutlined /> Ubicación</span>} bordered={false} className="shadow-sm mb-6 body-no-padding">
                        <div className="h-48 bg-gray-200 relative w-full overflow-hidden rounded-t-lg">
                            {/* Placeholder for Map */}
                            <div className="absolute inset-0 bg-blue-100 flex items-center justify-center">
                                <EnvironmentOutlined className="text-6xl text-purple-600 drop-shadow-md" />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-100 rounded-b-lg">
                            <p className="m-0 text-gray-700 font-medium text-sm">Col. San Juan, Municipio de Ejemplo, Estado de Ejemplo</p>
                        </div>
                    </Card>

                    <Card title={<span className="text-blue-800 font-semibold">Mi Posición en la Estructura</span>} bordered={false} className="shadow-sm mb-6">
                        <div className="space-y-2 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active border border-gray-200 rounded p-3 bg-white">
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-600 text-white font-bold w-10 h-10 rounded flex items-center justify-center">RD</div>
                                        <div>
                                            <div className="font-bold text-gray-800">RD-0001</div>
                                            <div className="text-sm text-gray-500">Ana Gabriela Torres</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">Representante de Demarcación</div>
                                </div>
                            </div>
                            
                            <div className="text-center text-gray-400">↓</div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active border border-gray-200 rounded p-3 bg-white ml-4">
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-800 text-white font-bold w-10 h-10 rounded flex items-center justify-center">OP</div>
                                        <div>
                                            <div className="font-bold text-gray-800">OP-0003</div>
                                            <div className="text-sm text-gray-500">Luis Alberto Martínez</div>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500">Operador Político</div>
                                </div>
                            </div>

                            <div className="text-center text-gray-400 ml-4">↓</div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active border border-gray-200 rounded p-3 bg-white ml-8">
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-600 text-white font-bold w-10 h-10 rounded flex items-center justify-center">PR</div>
                                        <div>
                                            <div className="font-bold text-gray-800">PR-0015</div>
                                            <div className="text-sm text-gray-500">Carlos Mendoza "El Charly"</div>
                                        </div>
                                    </div>
                                    <div className="text-sm font-semibold text-purple-600">Promotor</div>
                                </div>
                            </div>

                            <div className="text-center text-gray-400 ml-8">↓</div>

                            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active border border-green-200 rounded p-3 bg-green-50 ml-12">
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-green-600 text-white font-bold w-10 h-10 rounded flex items-center justify-center">PM</div>
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
