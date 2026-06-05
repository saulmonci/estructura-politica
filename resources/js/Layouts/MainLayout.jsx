import React, { useState } from 'react';
import { ProLayout } from '@ant-design/pro-components';
import { Link, usePage, router } from '@inertiajs/react';
import { 
  DashboardOutlined, 
  TeamOutlined, 
  UsergroupAddOutlined, 
  EnvironmentOutlined,
  BarChartOutlined,
  MessageOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Dropdown, Avatar, Badge, ConfigProvider, Input } from 'antd';
import esES from 'antd/locale/es_ES';

export default function MainLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth?.user || { name: 'Presidente', role: 'presidente', id: 'PRES-0001' };
    const [pathname, setPathname] = useState(window.location.pathname);

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <ConfigProvider locale={esES}>
            <div
                style={{
                    height: '100vh',
                }}
            >
                <ProLayout
                    title="ORION Sistemas"
                    logo={<div className="bg-white p-1 rounded"><img src="/images/orion-logo.png" alt="logo" style={{height: 32}} /></div>}
                    layout="side"
                    navTheme="dark"
                    colorPrimary="#1677ff"
                    location={{ pathname }}
                    siderMenuType="group"
                    menu={{
                        type: 'sub',
                    }}
                    token={{
                        sider: {
                            colorMenuBackground: '#0f172a', // Very dark blue like the image
                            colorTextMenuTitle: '#ffffff',
                            colorTextMenu: '#94a3b8',
                            colorTextMenuItemHover: '#ffffff',
                            colorBgMenuItemSelected: '#2563eb', // Bright blue selection
                            colorTextMenuActive: '#ffffff',
                        },
                        header: {
                            colorBgHeader: '#ffffff',
                        }
                    }}
                    menuExtraRender={({ collapsed }) =>
                        !collapsed && (
                            <div className="flex items-center gap-3 px-4 py-6 border-b border-gray-800 mb-2">
                                <Avatar size={48} src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-white leading-tight">{user.id || 'PRES-0001'}</span>
                                    <span className="text-gray-300 text-sm capitalize leading-tight mb-1">{user.role}</span>
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                        <span className="text-green-500 text-xs font-medium">En línea</span>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    menuItemRender={(item, dom) => (
                        <Link 
                            href={item.path} 
                            onClick={() => setPathname(item.path)}
                            className="flex items-center"
                        >
                            {dom}
                            {item.badge && (
                                <Badge count={item.badge} className="ml-auto" size="small" />
                            )}
                        </Link>
                    )}
                    avatarProps={false}
                    route={{
                        path: '/',
                        routes: [
                            {
                                name: 'NAVEGACIÓN',
                                type: 'group',
                                children: [
                                    {
                                        path: '/dashboard',
                                        name: 'Dashboard',
                                        icon: <DashboardOutlined />,
                                    },
                                    user.role === 'presidente' && {
                                        path: '/representantes',
                                        name: 'Representantes (RD)',
                                        icon: <UsergroupAddOutlined />,
                                    },
                                    ['presidente', 'rd'].includes(user.role) && {
                                        path: '/operadores',
                                        name: 'Operadores',
                                        icon: <TeamOutlined />,
                                    },
                                    ['presidente', 'rd', 'operador'].includes(user.role) && {
                                        path: '/promotores',
                                        name: 'Promotores',
                                        icon: <TeamOutlined />,
                                    },
                                    {
                                        path: '/promovidos',
                                        name: 'Promovidos',
                                        icon: <UsergroupAddOutlined />,
                                    },
                                    user.role === 'presidente' && {
                                        path: '/mapa',
                                        name: 'Mapa Territorial',
                                        icon: <EnvironmentOutlined />,
                                    },
                                    user.role === 'presidente' && {
                                        path: '/reportes',
                                        name: 'Reportes',
                                        icon: <BarChartOutlined />,
                                    },
                                    user.role === 'presidente' && {
                                        path: '/estadisticas',
                                        name: 'Estadísticas',
                                        icon: <BarChartOutlined />,
                                    },
                                    {
                                        path: '/mensajes',
                                        name: 'Mensajes',
                                        icon: <MessageOutlined />,
                                        badge: 8,
                                    },
                                    {
                                        path: '/configuracion',
                                        name: 'Configuración',
                                        icon: <SettingOutlined />,
                                    },
                                ].filter(Boolean)
                            }
                        ],
                    }}
                    headerRender={false}
                >
                    <div className="flex flex-col h-[calc(100vh-64px)] w-full -m-6 relative">
                        {/* Custom Header that bypasses ProLayout header issues */}
                        <div className="flex items-center justify-between w-full h-16 bg-white px-6 shadow-sm border-b border-gray-100 flex-shrink-0 relative z-10">
                            <div className="flex items-center text-sm text-gray-500">
                                <span className="font-semibold text-gray-700">Representantes de Demarcación (RD)</span>
                                <span className="mx-2 text-gray-400 font-bold">&gt;</span>
                                <span>{user.id || 'RD-0001'} - Ana Gabriela Torres</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <Input 
                                    prefix={<SearchOutlined className="text-gray-400" />} 
                                    placeholder="Buscar personas, IDs, colonias..." 
                                    className="w-64 md:w-80 rounded-md border-gray-200 hover:border-blue-400 focus:border-blue-500"
                                />
                                <Badge count={5} size="small" className="cursor-pointer">
                                    <BellOutlined className="text-xl text-gray-600 hover:text-blue-600" />
                                </Badge>
                                <Dropdown
                                    menu={{
                                        items: [
                                            {
                                                key: 'logout',
                                                icon: <LogoutOutlined />,
                                                label: 'Cerrar sesión',
                                                onClick: handleLogout,
                                            },
                                        ],
                                    }}
                                >
                                    <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
                                        <Avatar src="https://i.pravatar.cc/150?u=a042581f4e29026024d" />
                                        <div className="flex flex-col leading-none text-left">
                                            <span className="font-bold text-gray-800 text-sm">{user.id || 'PRES-0001'}</span>
                                            <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                                        </div>
                                        <span className="text-gray-400 text-xs ml-1 font-bold">v</span>
                                    </div>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Page Content */}
                        <div className="flex-1 overflow-auto bg-gray-50 p-6 shadow-inner">
                            {children}
                        </div>
                    </div>
                </ProLayout>
            </div>
        </ConfigProvider>
    );
}
