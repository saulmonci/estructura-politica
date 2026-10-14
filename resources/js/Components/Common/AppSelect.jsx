import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Select, Form } from 'antd';
import axios from 'axios';
import { useAppFormContext } from './AppForm';

// Cache en memoria para evitar peticiones redundantes a catálogos estáticos
const catalogCache = new Map();

/**
 * AppSelect - Componente Wrapper para Selects y Catálogos Asíncronos
 *
 * Características:
 * 1. Carga automática de opciones desde un endpoint (`/catalogos/estados`, `/catalogos/municipios`, etc.).
 * 2. Soporte nativo para dependencias en cascada (`dependsOn="state_id"`):
 *    - Observa el valor de otro campo en el formulario automáticamente.
 *    - Si la dependencia está vacía, se deshabilita automáticamente.
 *    - Cuando la dependencia cambia, limpia el valor actual y vuelve a solicitar las opciones.
 *    - Soporta interpolación de URL: `/catalogos/demarcaciones/{demarcacion_id}/secciones`
 * 3. Normalización inteligente de etiquetas y valores (`label` / `value`).
 * 4. Control imperativo vía `ref` (`ref.current.reload()`, `setOptions()`, `getOptions()`).
 * 5. Búsqueda y filtrado local insensible a mayúsculas/minúsculas activo por defecto.
 */
const AppSelect = forwardRef(
    (
        {
            endpoint,
            options: staticOptions,
            params,
            dependsOn,
            dependencyParam,
            dependencyValue: propDependencyValue,
            resetOnDependencyChange = true,
            labelField,
            valueField,
            transform,
            allOption = false,
            cache = true,
            autoFetch = true,
            placeholder = 'Seleccionar...',
            placeholderWhenDisabled,
            disabled = false,
            showSearch = true,
            allowClear = true,
            value,
            onChange,
            name,
            id,
            form: propForm,
            ...selectProps
        },
        ref
    ) => {
        // Intentar obtener la instancia del formulario
        const internalAntForm = Form.useFormInstance();
        let appFormContext = null;
        try {
            appFormContext = useAppFormContext();
        } catch {
            // Fuera de AppForm, se usa propForm o internalAntForm
        }
        const form = propForm || internalAntForm || appFormContext?.form;

        // Si dependsOn está configurado, observamos ese campo en el form
        const watchedValue = Form.useWatch(dependsOn || '__none__', form);
        const resolvedDependencyValue =
            propDependencyValue !== undefined ? propDependencyValue : dependsOn ? watchedValue : undefined;

        const [options, setOptions] = useState(staticOptions || []);
        const [loading, setLoading] = useState(false);
        const isMountedRef = useRef(true);
        const previousDependencyRef = useRef(resolvedDependencyValue);
        const selectRef = useRef();

        useEffect(() => {
            isMountedRef.current = true;
            return () => {
                isMountedRef.current = false;
            };
        }, []);

        // Función para resolver la etiqueta visible
        const resolveLabel = useCallback(
            (item) => {
                if (labelField && item[labelField] !== undefined) return item[labelField];
                if (item.label !== undefined) return item.label;
                if (item.nombre !== undefined) return item.nombre;
                if (item.name !== undefined) return item.name;
                if (item.numero !== undefined) return `Sección ${item.numero}`;
                if (item.titulo !== undefined) return item.titulo;
                if (item.title !== undefined) return item.title;
                if (item.descripcion !== undefined) return item.descripcion;
                return String(item.id ?? item.value ?? '');
            },
            [labelField]
        );

        // Función para resolver el valor seleccionado
        const resolveValue = useCallback(
            (item) => {
                if (valueField && item[valueField] !== undefined) return item[valueField];
                if (item.value !== undefined) return item.value;
                if (item.id !== undefined) return item.id;
                if (item.key !== undefined) return item.key;
                return item;
            },
            [valueField]
        );

        // Construir la URL y parámetros finales
        const buildRequestConfig = useCallback(() => {
            if (!endpoint) return null;

            if (typeof endpoint === 'function') {
                const dynamicEndpoint = endpoint(resolvedDependencyValue, params);
                if (!dynamicEndpoint) return null;
                return typeof dynamicEndpoint === 'string'
                    ? { url: dynamicEndpoint, queryParams: params }
                    : dynamicEndpoint;
            }

            let url = endpoint;
            const queryParams = { ...params };

            if (dependsOn) {
                // Verificar si la URL tiene un placeholder estilo {demarcacion_id} o {id}
                const placeholderMatch = url.match(/\{([^}]+)\}/);
                if (placeholderMatch) {
                    url = url.replace(placeholderMatch[0], encodeURIComponent(resolvedDependencyValue));
                } else {
                    const paramKey = dependencyParam || dependsOn;
                    queryParams[paramKey] = resolvedDependencyValue;
                }
            }

            return { url, queryParams };
        }, [endpoint, resolvedDependencyValue, dependsOn, dependencyParam, params]);

        // Cargar datos desde el endpoint
        const fetchOptions = useCallback(
            async (forceBypassCache = false) => {
                if (staticOptions && !endpoint) {
                    setOptions(staticOptions);
                    return;
                }

                if (!endpoint) return;

                // Si depende de un campo y este no tiene valor aún, limpiamos y salimos
                if (
                    dependsOn &&
                    (resolvedDependencyValue === undefined ||
                        resolvedDependencyValue === null ||
                        resolvedDependencyValue === '')
                ) {
                    setOptions([]);
                    return;
                }

                const requestConfig = buildRequestConfig();
                if (!requestConfig) {
                    setOptions([]);
                    return;
                }

                const { url, queryParams } = requestConfig;
                const cacheKey = `${url}?${JSON.stringify(queryParams)}`;

                // Verificar caché si está habilitado
                if (cache && !forceBypassCache && catalogCache.has(cacheKey)) {
                    setOptions(catalogCache.get(cacheKey));
                    return;
                }

                setLoading(true);
                try {
                    const response = await axios.get(url, {
                        params: queryParams,
                        headers: { Accept: 'application/json' },
                    });

                    // Soportar array directo o envuelto en data/items
                    const rawData = response.data?.data || response.data || [];
                    const items = Array.isArray(rawData) ? rawData : [];

                    let formatted = items.map((item) => {
                        const opt = transform
                            ? transform(item)
                            : {
                                  label: resolveLabel(item),
                                  value: resolveValue(item),
                                  raw: item,
                              };
                        if (opt && opt.value === null) {
                            opt.value = '';
                        }
                        return opt;
                    });

                    if (allOption) {
                        const allLabel = typeof allOption === 'string' ? allOption : allOption.label || 'Todos';
                        const allVal = allOption.value !== undefined && allOption.value !== null ? allOption.value : '';
                        formatted = [{ label: allLabel, value: allVal }, ...formatted];
                    }

                    if (cache) {
                        catalogCache.set(cacheKey, formatted);
                    }

                    if (isMountedRef.current) {
                        setOptions(formatted);
                    }
                } catch (error) {
                    console.error(`AppSelect error al cargar datos desde [${url}]:`, error);
                    if (isMountedRef.current) {
                        setOptions([]);
                    }
                } finally {
                    if (isMountedRef.current) {
                        setLoading(false);
                    }
                }
            },
            [
                staticOptions,
                endpoint,
                dependsOn,
                resolvedDependencyValue,
                buildRequestConfig,
                cache,
                transform,
                resolveLabel,
                resolveValue,
                allOption,
            ]
        );

        // Disparar carga cuando cambia la dependencia o al montar
        useEffect(() => {
            const hasDependencyChanged = previousDependencyRef.current !== resolvedDependencyValue;

            if (dependsOn && hasDependencyChanged) {
                // Si la dependencia cambió y no es el primer render con el mismo valor
                if (resetOnDependencyChange && previousDependencyRef.current !== undefined) {
                    if (onChange) {
                        onChange(undefined);
                    }
                    if (form && (name || id)) {
                        form.setFieldValue(name || id, undefined);
                    }
                }
                previousDependencyRef.current = resolvedDependencyValue;
            }

            if (autoFetch) {
                fetchOptions();
            }
        }, [
            resolvedDependencyValue,
            autoFetch,
            fetchOptions,
            dependsOn,
            resetOnDependencyChange,
            onChange,
            form,
            name,
            id,
        ]);

        // Métodos imperativos
        useImperativeHandle(
            ref,
            () => ({
                reload: () => fetchOptions(true),
                setOptions: (opts) => setOptions(opts),
                getOptions: () => options,
                focus: () => selectRef.current?.focus(),
                blur: () => selectRef.current?.blur(),
                isLoading: () => loading,
            }),
            [fetchOptions, options, loading]
        );

        // Deshabilitar automáticamente si depende de otro campo y está vacío
        const isDependencyMissing =
            Boolean(dependsOn) &&
            (resolvedDependencyValue === undefined ||
                resolvedDependencyValue === null ||
                resolvedDependencyValue === '');
        const isSelectDisabled = disabled || isDependencyMissing;

        const resolvedPlaceholder =
            isDependencyMissing && placeholderWhenDisabled ? placeholderWhenDisabled : placeholder;

        const defaultFilterOption = useCallback((input, option) => {
            const labelText = typeof option?.label === 'string' ? option.label : String(option?.label ?? '');
            return labelText.toLowerCase().includes(input.toLowerCase());
        }, []);

        return (
            <Select
                ref={selectRef}
                options={options}
                loading={loading}
                disabled={isSelectDisabled}
                placeholder={resolvedPlaceholder}
                showSearch={showSearch}
                allowClear={allowClear}
                filterOption={defaultFilterOption}
                value={value}
                onChange={onChange}
                {...selectProps}
            />
        );
    }
);

AppSelect.displayName = 'AppSelect';
AppSelect.Option = Select.Option;

export default AppSelect;
export { catalogCache };
