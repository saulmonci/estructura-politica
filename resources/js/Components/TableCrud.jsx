import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import debounce from 'lodash/debounce';
import { Grid, Button, Space } from 'antd';
import { EditOutlined, DeleteOutlined, ReloadOutlined, SwapOutlined, DownloadOutlined } from '@ant-design/icons';

const { useBreakpoint } = Grid;

/**
 * Disparador universal de exportación a CSV con serialización limpia de parámetros
 */
export function triggerTableExport(endpoint, params = {}) {
    if (!endpoint) {
        console.warn('triggerTableExport: No se especificó un endpoint para exportar.');
        return;
    }

    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && key !== 'page' && key !== 'per_page') {
            if (Array.isArray(value)) {
                value.forEach((v) => queryParams.append(`${key}[]`, v));
            } else {
                queryParams.append(key, value);
            }
        }
    });

    const cleanEndpoint = endpoint.endsWith('/export') ? endpoint : `${endpoint.replace(/\/$/, '')}/export`;
    const queryString = queryParams.toString();
    const targetUrl = queryString ? `${cleanEndpoint}?${queryString}` : cleanEndpoint;
    window.location.href = targetUrl;
}

/**
 * Botón reutilizable de exportación con control de roles y enlace a actionRef
 */
export function ExportButton({
    actionRef,
    endpoint,
    params,
    allowedRoles,
    label = 'Descargar Excel',
    icon = <DownloadOutlined />,
    className = 'w-full border-gray-300 sm:w-auto',
    type = 'default',
    onClick,
    children,
    ...buttonProps
}) {
    let auth;
    try {
        const page = usePage();
        auth = page?.props?.auth;
    } catch {
        // Fuera de contexto Inertia
    }
    const userRole = auth?.user?.role;

    // Si se especifican roles permitidos y el usuario actual no los tiene, ocultar el botón
    if (allowedRoles && Array.isArray(allowedRoles) && userRole) {
        if (!allowedRoles.includes(userRole)) {
            return null;
        }
    }

    const handleClick = (e) => {
        if (onClick) {
            onClick(e);
            return;
        }
        if (actionRef?.current && typeof actionRef.current.export === 'function') {
            actionRef.current.export(params);
        } else if (endpoint) {
            triggerTableExport(endpoint, params);
        } else {
            const fallbackEndpoint = window.location.pathname.replace(/\/$/, '');
            triggerTableExport(fallbackEndpoint, params);
        }
    };

    return (
        <Button type={type} icon={icon} className={className} onClick={handleClick} {...buttonProps}>
            {children || label}
        </Button>
    );
}

/**
 * Renderizador reusable de acciones para tablas y tarjetas móviles
 */
export function RecordActions({
    record,
    onEdit,
    onDelete,
    onRestore,
    onImpersonate,
    extraActions,
    renderActions,
    auth: propAuth,
    size = 'middle',
    editTitle = 'Editar',
    deleteTitle = 'Eliminar',
    restoreTitle = 'Restaurar',
    impersonateTitle = 'Impersonar usuario',
    editIconClass = 'text-blue-600 hover:text-blue-700',
    className,
}) {
    let auth = propAuth;
    if (!auth) {
        try {
            const page = usePage();
            auth = page?.props?.auth;
        } catch {
            // Fuera de contexto Inertia
        }
    }

    if (renderActions) {
        return renderActions(record, {
            onEdit,
            onDelete,
            onRestore,
            onImpersonate,
            extraActions,
        });
    }

    const isDeleted = Boolean(record?.deleted_at);

    if (isDeleted) {
        if (!onRestore) return null;
        return (
            <Space size={size} className={className}>
                <Button
                    type="text"
                    className="text-green-600 hover:text-green-700"
                    icon={<ReloadOutlined />}
                    onClick={() => onRestore(record)}
                    title={restoreTitle}
                />
            </Space>
        );
    }

    const actions = [];

    // Acciones extra previas (ej. Kardex de apoyos o Secciones)
    if (extraActions) {
        const extra = typeof extraActions === 'function' ? extraActions(record) : extraActions;
        if (Array.isArray(extra)) {
            actions.push(...extra.filter(Boolean));
        } else if (extra) {
            actions.push(extra);
        }
    }

    if (onEdit) {
        actions.push(
            <Button
                key="edit"
                type="text"
                className={editIconClass}
                icon={<EditOutlined />}
                onClick={() => onEdit(record)}
                title={editTitle}
            />
        );
    }

    const canImpersonate = Boolean(auth?.can_impersonate && record?.id && record?.id !== auth?.user?.id);
    if (onImpersonate && canImpersonate) {
        actions.push(
            <Button
                key="impersonate"
                type="text"
                className="text-amber-600 hover:text-amber-700"
                icon={<SwapOutlined />}
                onClick={() => onImpersonate(record)}
                title={impersonateTitle}
            />
        );
    }

    if (onDelete) {
        actions.push(
            <Button
                key="delete"
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
                title={deleteTitle}
            />
        );
    }

    if (actions.length === 0) return null;

    return (
        <Space size={size} className={className}>
            {actions}
        </Space>
    );
}

export default function TableCrud({
    data, // Objeto de paginación de Laravel o un array simple (modo Inertia)
    endpoint, // Si se proporciona, la tabla maneja sus propios datos asíncronamente
    columns,
    loading = false,
    rowKey = 'id',
    search = false, // Configuración de búsqueda de ProTable
    headerTitle,
    toolBarRender,
    url = null, // URL para peticiones Inertia
    exportUrl, // Endpoint alternativo de exportación (por defecto `${endpoint}/export`)
    formRef: externalFormRef,
    // Props de gestión automática de columna de acciones
    actions = true,
    onEdit,
    onDelete,
    onRestore,
    onImpersonate,
    extraActions,
    renderActions,
    actionsColumnProps,
    editTitle = 'Editar',
    deleteTitle = 'Eliminar',
    restoreTitle = 'Restaurar',
    impersonateTitle = 'Impersonar usuario',
    editIconClass = 'text-blue-600 hover:text-blue-700',
    actionRef: externalActionRef,
    ...props
}) {
    let auth = props.auth;
    try {
        const page = usePage();
        if (page?.props?.auth) {
            auth = page.props.auth;
        }
    } catch {
        // Fuera de contexto Inertia
    }
    const { mobileCardRender, ...restProps } = props;
    const isAsync = !!endpoint;
    const internalFormRef = React.useRef();
    const formRef = externalFormRef || internalFormRef;
    const screens = useBreakpoint();
    const lastParamsRef = React.useRef({});
    const internalActionRef = React.useRef();

    // Función de exportación automática con los filtros activos
    const handleExport = React.useCallback(
        (customParams = {}) => {
            const finalExportUrl = exportUrl || (endpoint ? `${endpoint.replace(/\/$/, '')}/export` : null);
            const combinedParams = {
                ...lastParamsRef.current,
                ...(props.params || {}),
                ...customParams,
            };
            triggerTableExport(finalExportUrl, combinedParams);
        },
        [exportUrl, endpoint, props.params]
    );

    // Sincronizar métodos imperativos con el actionRef externo de forma síncrona y continua
    const syncActionRef = React.useCallback(() => {
        if (externalActionRef && typeof externalActionRef === 'object') {
            if (!externalActionRef.current) {
                externalActionRef.current = {};
            }
            externalActionRef.current.export = handleExport;
            externalActionRef.current.getParams = () => ({
                ...lastParamsRef.current,
                ...(props.params || {}),
            });
            externalActionRef.current.reload = (...args) => internalActionRef.current?.reload?.(...args);
            externalActionRef.current.reloadAndRest = (...args) => internalActionRef.current?.reloadAndRest?.(...args);
            externalActionRef.current.reset = (...args) => internalActionRef.current?.reset?.(...args);
            externalActionRef.current.clearSelected = (...args) => internalActionRef.current?.clearSelected?.(...args);
        }
    }, [externalActionRef, handleExport, props.params]);

    // Ejecutar síncronamente en cada render
    syncActionRef();

    // Y reforzar en useEffect
    React.useEffect(() => {
        syncActionRef();
    });

    // Debounce de 500ms para enviar el formulario automáticamente
    const debouncedSubmit = React.useRef(
        debounce(() => {
            if (formRef.current) {
                formRef.current.submit();
            }
        }, 500)
    ).current;

    const internalRequest = async (params, sort, filter) => {
        const { current, pageSize, ...rest } = params;

        let sortParams = {};
        if (sort && Object.keys(sort).length > 0) {
            const field = Object.keys(sort)[0];
            sortParams.sort_field = field;
            sortParams.sort_direction = sort[field] === 'ascend' ? 'asc' : 'desc';
        }

        const requestParams = {
            page: current,
            per_page: pageSize,
            ...rest,
            ...filter,
            ...sortParams,
        };

        lastParamsRef.current = requestParams;

        if (props.onParamsChange) {
            props.onParamsChange(requestParams);
        }

        try {
            const response = await axios.get(endpoint, {
                params: requestParams,
                headers: {
                    Accept: 'application/json',
                },
            });

            // Compatible con paginador de Laravel o con arreglo simple
            const responseData = response.data.data !== undefined ? response.data.data : response.data;
            const responseTotal = response.data.total !== undefined ? response.data.total : responseData.length;

            return {
                data: responseData,
                success: true,
                total: responseTotal,
            };
        } catch (error) {
            console.error('Error fetching table data:', error);
            return { success: false, data: [], total: 0 };
        }
    };

    // Determinar si los datos vienen con el formato de paginación de Laravel (solo si no es async)
    const isPaginated = !isAsync && data && typeof data === 'object' && 'current_page' in data;

    const dataSource = isAsync ? undefined : isPaginated ? data.data : Array.isArray(data) ? data : [];
    const current = isPaginated ? data.current_page : 1;
    const pageSize = isPaginated ? data.per_page : 10;
    const total = isPaginated ? data.total : dataSource ? dataSource.length : 0;

    const fetchPage = (params) => {
        if (isAsync) return;
        const fetchUrl = url || window.location.pathname;
        const currentParams = Object.fromEntries(new URLSearchParams(window.location.search));

        router.get(
            fetchUrl,
            { ...currentParams, ...params },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            }
        );
    };

    const handleTableChange = (pagination, filters, sorter) => {
        if (isAsync || !isPaginated) return;

        const params = {
            page: pagination.current,
            per_page: pagination.pageSize,
        };

        const sortObj = Array.isArray(sorter) ? sorter[0] : sorter;
        if (sortObj && sortObj.field) {
            params.sort_field = sortObj.field;
            params.sort_direction = sortObj.order === 'ascend' ? 'asc' : 'desc';
        } else {
            params.sort_field = null;
            params.sort_direction = null;
        }

        if (filters && Object.keys(filters).length > 0) {
            Object.assign(params, filters);
        }

        fetchPage(params);
    };

    const handleSearchSubmit = (params) => {
        if (isAsync) return;
        fetchPage({ ...params, page: 1 });
    };

    const handleSearchReset = () => {
        if (isAsync) return;
        router.get(url || window.location.pathname, {}, { preserveState: true, preserveScroll: true, replace: true });
    };

    // 1. Resolver columna de acciones automática
    const hasManualActionsColumn =
        Array.isArray(columns) &&
        columns.some(
            (col) =>
                col?.key === 'actions' ||
                col?.key === 'acciones' ||
                col?.dataIndex === 'actions' ||
                col?.dataIndex === 'acciones'
        );

    const hasActionHandlers = Boolean(
        onEdit || onDelete || onRestore || onImpersonate || extraActions || renderActions
    );

    const shouldInjectActions = actions !== false && !hasManualActionsColumn && hasActionHandlers;

    const renderActionsForRecord = (record, size = 'middle') =>
        RecordActions({
            record,
            onEdit,
            onDelete,
            onRestore,
            onImpersonate,
            extraActions,
            renderActions,
            auth,
            size,
            editTitle,
            deleteTitle,
            restoreTitle,
            impersonateTitle,
            editIconClass,
        });

    let effectiveColumns = [...(columns || [])];

    if (shouldInjectActions) {
        effectiveColumns.push({
            title: 'ACCIONES',
            key: 'acciones',
            width: actionsColumnProps?.width || (extraActions ? 150 : 120),
            align: 'center',
            search: false,
            hideInSearch: true,
            render: (_, record) => renderActionsForRecord(record, 'middle'),
            ...actionsColumnProps,
        });
    }

    // 2. Lógica para renderizado condicional en móviles
    let finalColumns = effectiveColumns;
    let showHeader = true;

    // Si la pantalla es pequeña (menor a md) y existe la propiedad, cambiamos la vista
    if (mobileCardRender && screens.md === false) {
        // En lugar de eliminar las columnas (lo cual rompe el buscador),
        // las mantenemos pero las ocultamos de la tabla
        finalColumns = effectiveColumns.map((col) => ({
            ...col,
            hideInTable: true,
        }));

        // Agregamos nuestra única columna para la tarjeta móvil, pero la ocultamos del buscador
        finalColumns.push({
            title: '',
            dataIndex: 'mobile_card_renderer',
            hideInSearch: true,
            render: (_, record) => {
                const actionsNode = renderActionsForRecord(record, 'middle');
                return mobileCardRender(record, actionsNode);
            },
        });

        showHeader = false;
    }

    // Props comunes para ambos modos
    const baseProps = {
        actionRef: internalActionRef,
        columns: finalColumns,
        showHeader,
        rowKey,
        loading,
        formRef,
        form: {
            onValuesChange: () => {
                debouncedSubmit();
            },
        },
        search: search
            ? {
                  layout: 'vertical',
                  defaultCollapsed: false,
                  ...search,
              }
            : false,
        headerTitle,
        toolBarRender,
        size: 'small',
        scroll: showHeader ? { x: 'max-content' } : undefined,
        ...restProps,
    };

    const containerClass = `table-crud-container ${!showHeader ? 'mobile-card-table' : ''}`;

    // Modo 1: Asíncrono puro interno (delegado a ProTable mediante la prop 'request')
    if (isAsync) {
        return (
            <div className={containerClass}>
                {!showHeader && (
                    <style>{`
                        .mobile-card-table {
                            width: 100% !important;
                            max-width: 100% !important;
                            overflow: hidden !important;
                            box-sizing: border-box !important;
                        }
                        .mobile-card-table .ant-table-wrapper,
                        .mobile-card-table .ant-spin-nested-loading,
                        .mobile-card-table .ant-spin-container,
                        .mobile-card-table .ant-table,
                        .mobile-card-table .ant-table-container,
                        .mobile-card-table .ant-table-content,
                        .mobile-card-table .ant-table-tbody {
                            display: block !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            box-sizing: border-box !important;
                            background: transparent !important;
                        }
                        .mobile-card-table .ant-table-cell {
                            padding: 0 0 16px 0 !important;
                            border: none !important;
                            width: 100% !important;
                            display: block !important;
                            box-sizing: border-box !important;
                        }
                        .mobile-card-table .ant-table-tbody > tr:hover > td {
                            background: transparent !important;
                        }
                        .mobile-card-table table,
                        .mobile-card-table tbody,
                        .mobile-card-table tr,
                        .mobile-card-table .ant-table-row {
                            display: block !important;
                            width: 100% !important;
                            box-sizing: border-box !important;
                        }
                        .mobile-card-table table {
                            table-layout: fixed !important;
                        }
                        /* Quitar margin bottom del card porque ya le pusimos padding a la celda */
                        .mobile-card-table .ant-card {
                            margin-bottom: 0 !important;
                            width: 100% !important;
                            box-sizing: border-box !important;
                        }
                        /* Fix flex truncation overflow in card contents */
                        .mobile-card-table .ant-card .flex {
                            min-width: 0 !important;
                        }
                        .mobile-card-table .ant-card .flex-1,
                        .mobile-card-table .ant-card .truncate {
                            min-width: 0 !important;
                        }
                        /* Remover paddings internos de ProTable en mobile */
                        .mobile-card-table .ant-pro-card-body {
                            padding-inline: 0 !important;
                        }
                        .mobile-card-table .ant-pro-table-search {
                            padding-inline: 0 !important;
                            margin-bottom: 16px !important;
                        }
                        .mobile-card-table .ant-pro-table-list-toolbar {
                            padding-inline: 0 !important;
                        }
                    `}</style>
                )}
                <ProTable
                    {...baseProps}
                    request={internalRequest}
                    options={false}
                    pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
                        ...(props.pagination || {}),
                    }}
                />
            </div>
        );
    }

    // Modo 2: Inertia (Sincrónico/Por Props con router.get)
    return (
        <div className={containerClass}>
            {!showHeader && (
                <style>{`
                    .mobile-card-table {
                        width: 100% !important;
                        max-width: 100% !important;
                        overflow: hidden !important;
                        box-sizing: border-box !important;
                    }
                    .mobile-card-table .ant-table-wrapper,
                    .mobile-card-table .ant-spin-nested-loading,
                    .mobile-card-table .ant-spin-container,
                    .mobile-card-table .ant-table,
                    .mobile-card-table .ant-table-container,
                    .mobile-card-table .ant-table-content,
                    .mobile-card-table .ant-table-tbody {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        box-sizing: border-box !important;
                        background: transparent !important;
                    }
                    .mobile-card-table .ant-table-cell {
                        padding: 0 0 16px 0 !important;
                        border: none !important;
                        width: 100% !important;
                        display: block !important;
                        box-sizing: border-box !important;
                    }
                    .mobile-card-table .ant-table-tbody > tr:hover > td {
                        background: transparent !important;
                    }
                    .mobile-card-table table,
                    .mobile-card-table tbody,
                    .mobile-card-table tr,
                    .mobile-card-table .ant-table-row {
                        display: block !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    .mobile-card-table table {
                        table-layout: fixed !important;
                    }
                    /* Quitar margin bottom del card porque ya le pusimos padding a la celda */
                    .mobile-card-table .ant-card {
                        margin-bottom: 0 !important;
                        width: 100% !important;
                        box-sizing: border-box !important;
                    }
                    /* Fix flex truncation overflow in card contents */
                    .mobile-card-table .ant-card .flex {
                        min-width: 0 !important;
                    }
                    .mobile-card-table .ant-card .flex-1,
                    .mobile-card-table .ant-card .truncate {
                        min-width: 0 !important;
                    }
                    /* Remover paddings internos de ProTable en mobile */
                    .mobile-card-table .ant-pro-card-body {
                        padding-inline: 0 !important;
                    }
                    .mobile-card-table .ant-pro-table-search {
                        padding-inline: 0 !important;
                        margin-bottom: 16px !important;
                    }
                    .mobile-card-table .ant-pro-table-list-toolbar {
                        padding-inline: 0 !important;
                    }
                `}</style>
            )}
            <ProTable
                {...baseProps}
                dataSource={dataSource}
                onSubmit={handleSearchSubmit}
                onReset={handleSearchReset}
                onChange={handleTableChange}
                options={false}
                pagination={
                    isPaginated
                        ? {
                              current,
                              pageSize,
                              total,
                              defaultPageSize: 10,
                              showSizeChanger: true,
                              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
                          }
                        : {
                              defaultPageSize: 10,
                              showSizeChanger: true,
                              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
                          }
                }
            />
        </div>
    );
}

TableCrud.Actions = RecordActions;
TableCrud.ExportButton = ExportButton;
TableCrud.export = triggerTableExport;
