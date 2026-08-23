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
    SearchOutlined,
    MenuOutlined,
    HistoryOutlined,
    UserOutlined,
    CrownOutlined,
} from '@ant-design/icons';
import { Dropdown, Avatar, Badge, ConfigProvider, Input } from 'antd';
import esES from 'antd/locale/es_ES';
import ImpersonateBanner from '../Components/ImpersonateBanner';
import HeaderImpersonateSearch from '../Components/HeaderImpersonateSearch';

export default function MainLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth?.user || { name: 'Presidente', role: 'presidente', id: 'PRES-0001' };
    const displayName = user.name || `${user.nombre || ''} ${user.apellidos || ''}`.trim() || `Usuario ${user.id}`;

    const ROLE_NAMES = {
        superuser: 'Superusuario',
        admin: 'Administrador',
        presidente: 'Presidente',
        coordinador_distrito: 'Coordinador de Distrito',
        rd: 'Representante de Demarcación (RD)',
        operador: 'Operador',
        promotor: 'Promotor',
    };
    const roleName = ROLE_NAMES[user.role] || user.role;
    const [pathname, setPathname] = useState(window.location.pathname);
    const [collapsed, setCollapsed] = useState(false);

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
                    title=""
                    collapsed={collapsed}
                    onCollapse={setCollapsed}
                    menuHeaderRender={(logoDom, titleDom, props) => (
                        <div
                            className={`flex w-full items-center justify-center transition-all duration-200 ${props?.collapsed ? 'p-2' : 'p-3 px-4'}`}
                        >
                            <img
                                src="/images/orion-legal-logo.png"
                                alt="ORION Sistemas - Legal Smart Gov"
                                className={`object-contain transition-all duration-200 ${props?.collapsed ? 'h-8 w-auto' : 'h-auto max-h-24 w-full rounded-lg'}`}
                            />
                        </div>
                    )}
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
                        },
                    }}
                    menuExtraRender={({ collapsed }) =>
                        !collapsed && (
                            <div className="mb-2 flex items-center gap-3 border-b border-gray-800 px-4 py-6">
                                <Avatar
                                    size={48}
                                    icon={<UserOutlined />}
                                    src={user?.foto ? `/storage/${user.foto}` : null}
                                    className="bg-gray-700"
                                />
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <span className="truncate leading-tight font-bold text-white" title={displayName}>
                                        {displayName}
                                    </span>
                                    <span className="mb-1 truncate text-sm leading-tight text-gray-300 capitalize">
                                        {roleName}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        <span className="text-xs font-medium text-green-500">En línea</span>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                    menuItemRender={(item, dom) => (
                        <Link href={item.path} onClick={() => setPathname(item.path)} className="flex items-center">
                            {dom}
                            {item.badge && <Badge count={item.badge} className="ml-auto" size="small" />}
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
                                    ['superuser'].includes(user.role) && {
                                        path: '/presidentes',
                                        name: 'Presidentes',
                                        icon: <CrownOutlined />,
                                    },
                                    ['presidente', 'admin', 'superuser'].includes(user.role) && {
                                        path: '/coordinadores',
                                        name: 'Coordinadores de Distrito',
                                        icon: <UserOutlined />,
                                    },
                                    ['presidente', 'admin', 'superuser', 'coordinador_distrito'].includes(
                                        user.role
                                    ) && {
                                        path: '/representantes',
                                        name: 'Representantes (RD)',
                                        icon: <UsergroupAddOutlined />,
                                    },
                                    ['presidente', 'admin', 'superuser', 'coordinador_distrito', 'rd'].includes(
                                        user.role
                                    ) && {
                                        path: '/operadores',
                                        name: 'Operadores',
                                        icon: <TeamOutlined />,
                                    },
                                    [
                                        'presidente',
                                        'admin',
                                        'superuser',
                                        'coordinador_distrito',
                                        'rd',
                                        'operador',
                                    ].includes(user.role) && {
                                        path: '/promotores',
                                        name: 'Promotores',
                                        icon: <TeamOutlined />,
                                    },
                                    {
                                        path: '/promovidos',
                                        name: 'Promovidos',
                                        icon: <UsergroupAddOutlined />,
                                    },
                                    ['presidente', 'admin', 'superuser', 'coordinador_distrito'].includes(
                                        user.role
                                    ) && {
                                        path: '/mapa',
                                        name: 'Mapa Territorial',
                                        icon: <EnvironmentOutlined />,
                                    },
                                    ['presidente', 'admin', 'superuser', 'coordinador_distrito'].includes(
                                        user.role
                                    ) && {
                                        path: '/demarcaciones',
                                        name: 'Demarcaciones',
                                        icon: <EnvironmentOutlined />,
                                    },
                                    ['presidente', 'admin', 'superuser', 'coordinador_distrito'].includes(
                                        user.role
                                    ) && {
                                        path: '/logs',
                                        name: 'Bitácora',
                                        icon: <HistoryOutlined />,
                                    },
                                ].filter(Boolean),
                            },
                        ],
                    }}
                    headerRender={false}
                >
                    <div className="relative flex h-[calc(100vh-64px)] w-full flex-col">
                        <ImpersonateBanner />
                        {/* Custom Header that bypasses ProLayout header issues */}
                        <div className="relative z-10 flex h-16 w-full flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm md:px-6">
                            <div className="mr-4 hidden min-w-0 items-center truncate text-sm text-gray-500 md:flex">
                                <span className="truncate font-semibold text-gray-700">{roleName}</span>
                                <span className="mx-2 flex-shrink-0 font-bold text-gray-400">&gt;</span>
                                <span className="truncate">
                                    {user.id} - {displayName}
                                </span>
                            </div>
                            {/* Mobile menu toggle */}
                            <div className="mr-3 flex items-center md:hidden">
                                <MenuOutlined
                                    className="cursor-pointer text-xl text-gray-800"
                                    onClick={() => setCollapsed(!collapsed)}
                                />
                            </div>

                            <div className="flex items-center gap-3 md:gap-6">
                                <HeaderImpersonateSearch />
                                <Badge count={5} size="small" className="hidden cursor-pointer sm:block">
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
                                    <div className="flex cursor-pointer items-center gap-2 rounded p-1 transition-colors hover:bg-gray-50 md:p-1.5">
                                        <Avatar
                                            icon={<UserOutlined />}
                                            src={user?.foto ? `/storage/${user.foto}` : null}
                                            className="bg-blue-100 text-blue-600"
                                        />
                                        <div className="hidden max-w-[120px] min-w-0 flex-col text-left leading-none sm:flex">
                                            <span
                                                className="truncate text-sm font-bold text-gray-800"
                                                title={displayName}
                                            >
                                                {displayName}
                                            </span>
                                            <span className="truncate text-xs text-gray-500 capitalize">
                                                {roleName}
                                            </span>
                                        </div>
                                        <span className="hidden text-xs font-bold text-gray-400 sm:block">v</span>
                                    </div>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Page Content */}
                        <div className="flex-1 overflow-auto bg-gray-50 p-4 shadow-inner md:p-6">{children}</div>
                    </div>
                </ProLayout>
            </div>
        </ConfigProvider>
    );
}
