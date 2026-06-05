import React from 'react';
import { ProTable } from '@ant-design/pro-components';
import { router } from '@inertiajs/react';
import axios from 'axios';
import debounce from 'lodash/debounce';

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
    ...props
}) {
    const isAsync = !!endpoint;
    const formRef = React.useRef();

    // Debounce de 500ms para enviar el formulario automáticamente
    const debouncedSubmit = React.useRef(
        debounce(() => {
            if (formRef.current) {
                formRef.current.submit();
            }
        }, 500)
    ).current;
    
    // Request interno asíncrono para delegarlo a ProTable
    const internalRequest = async (params, sort, filter) => {
        const { current, pageSize, ...rest } = params;
        
        let sortParams = {};
        if (sort && Object.keys(sort).length > 0) {
            const field = Object.keys(sort)[0];
            sortParams.sort_field = field;
            sortParams.sort_direction = sort[field] === 'ascend' ? 'asc' : 'desc';
        }

        try {
            const response = await axios.get(endpoint, {
                params: {
                    page: current,
                    per_page: pageSize,
                    ...rest,
                    ...filter,
                    ...sortParams
                },
                headers: {
                    'Accept': 'application/json'
                }
            });

            // Compatible con paginador de Laravel o con arreglo simple
            const responseData = response.data.data !== undefined ? response.data.data : response.data;
            const responseTotal = response.data.total !== undefined ? response.data.total : responseData.length;

            return {
                data: responseData,
                success: true,
                total: responseTotal
            };
        } catch (error) {
            console.error("Error fetching table data:", error);
            return { success: false, data: [], total: 0 };
        }
    };

    // Determinar si los datos vienen con el formato de paginación de Laravel (solo si no es async)
    const isPaginated = !isAsync && data && typeof data === 'object' && 'current_page' in data;
    
    const dataSource = isAsync ? undefined : (isPaginated ? data.data : (Array.isArray(data) ? data : []));
    const current = isPaginated ? data.current_page : 1;
    const pageSize = isPaginated ? data.per_page : 10;
    const total = isPaginated ? data.total : (dataSource ? dataSource.length : 0);

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
        router.get(
            url || window.location.pathname,
            {},
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    // Props comunes para ambos modos
    const baseProps = {
        columns,
        rowKey,
        loading,
        formRef,
        form: {
            onValuesChange: () => {
                debouncedSubmit();
            }
        },
        search: search ? { defaultCollapsed: false, labelWidth: 'auto', ...search } : false,
        headerTitle,
        toolBarRender,
        size: 'small',
        scroll: { x: 'max-content' },
        ...props
    };

    // Modo 1: Asíncrono puro interno (delegado a ProTable mediante la prop 'request')
    if (isAsync) {
        return (
            <div className="table-crud-container">
                <ProTable
                    {...baseProps}
                    request={internalRequest}
                    options={{
                        density: true,
                        fullScreen: true,
                        setting: true,
                    }}
                    pagination={{
                        defaultPageSize: 10,
                        showSizeChanger: true,
                        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
                        ...(props.pagination || {})
                    }}
                />
            </div>
        );
    }

    // Modo 2: Inertia (Sincrónico/Por Props con router.get)
    return (
        <div className="table-crud-container">
            <ProTable
                {...baseProps}
                dataSource={dataSource}
                onSubmit={handleSearchSubmit}
                onReset={handleSearchReset}
                onChange={handleTableChange}
                options={{
                    density: true,
                    fullScreen: true,
                    reload: () => router.reload(), // Recarga usando Inertia
                    setting: true,
                }}
                pagination={isPaginated ? {
                    current,
                    pageSize,
                    total,
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
                } : {
                    defaultPageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
                }}
            />
        </div>
    );
}
