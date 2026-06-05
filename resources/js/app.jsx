import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { ProConfigProvider, esESIntl } from '@ant-design/pro-components';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Estructura Política';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(
            <ConfigProvider locale={esES}>
                <ProConfigProvider intl={esESIntl}>
                    <App {...props} />
                </ProConfigProvider>
            </ConfigProvider>
        );
    },
    progress: {
        color: '#1677ff',
    },
});
