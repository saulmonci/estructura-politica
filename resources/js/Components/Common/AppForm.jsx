import React, {
    useState,
    useEffect,
    forwardRef,
    useImperativeHandle,
    createContext,
    useContext,
    useCallback,
} from 'react';
import { Form, message } from 'antd';

export const AppFormContext = createContext(null);

export const useAppFormContext = () => {
    const context = useContext(AppFormContext);
    if (!context) {
        throw new Error('useAppFormContext debe usarse dentro de un <AppForm>');
    }
    return context;
};

/**
 * Normaliza errores devueltos por Laravel (HTTP 422) o Inertia hacia el formato de Ant Design Form
 */
export const normalizeLaravelErrors = (errors) => {
    if (!errors) return { fieldErrors: [], firstKey: null };

    // Si viene como respuesta Axios (error.response.data.errors)
    const rawErrors = errors.response?.data?.errors || errors.errors || errors;

    if (typeof rawErrors !== 'object' || rawErrors === null) {
        return { fieldErrors: [], firstKey: null };
    }

    const keys = Object.keys(rawErrors);
    const firstKey = keys[0] || null;

    const fieldErrors = keys.map((key) => {
        const val = rawErrors[key];
        return {
            name: key,
            errors: Array.isArray(val) ? val : [val],
        };
    });

    return { fieldErrors, firstKey };
};

/**
 * AppForm - Componente Wrapper para Formularios
 *
 * Características:
 * 1. Control imperativo vía `ref` (useImperativeHandle): `formRef.current.submit()`, `reset()`, `setValues()`.
 * 2. Soporta Render Props: `children` puede ser una función `({ form, loading, submit, reset, setErrors }) => JSX`.
 * 3. Provee `AppFormContext` y el hook `useAppFormContext()` para evitar prop drilling en inputs hijos complejos.
 * 4. Mapeo y captura automática de errores de validación de Laravel (422) con auto-scroll al primer campo con error.
 * 5. Gestión autónoma de estados de carga (loading) durante envíos asíncronos.
 */
const AppForm = forwardRef(
    (
        {
            form: externalForm,
            initialValues,
            onSubmit,
            onSuccess,
            onError,
            children,
            layout = 'vertical',
            autoScrollToError = true,
            errorMessage = 'Por favor revisa los campos en rojo',
            successMessage,
            ...formProps
        },
        ref
    ) => {
        const [internalForm] = Form.useForm();
        const form = externalForm || internalForm;
        const [loading, setLoading] = useState(false);

        // Actualizar initialValues si cambian
        useEffect(() => {
            if (initialValues) {
                form.setFieldsValue(initialValues);
            }
        }, [initialValues, form]);

        // Manejador centralizado para establecer errores de backend
        const setErrors = useCallback(
            (errors, customToastMsg) => {
                const { fieldErrors, firstKey } = normalizeLaravelErrors(errors);

                if (fieldErrors.length > 0) {
                    form.setFields(fieldErrors);
                }

                const toastText =
                    customToastMsg ||
                    errors?.response?.data?.message ||
                    (typeof errors === 'string' ? errors : errorMessage);

                message.error(toastText);

                if (autoScrollToError && firstKey) {
                    try {
                        form.scrollToField(firstKey, { behavior: 'smooth', block: 'center' });
                    } catch {
                        // ignore scroll error if element unmounted
                    }
                }
            },
            [form, autoScrollToError, errorMessage]
        );

        const submit = useCallback(() => {
            form.submit();
        }, [form]);

        const reset = useCallback(() => {
            form.resetFields();
        }, [form]);

        useImperativeHandle(
            ref,
            () => ({
                submit,
                reset,
                setValues: (values) => form.setFieldsValue(values),
                getValues: (nameList) => form.getFieldsValue(nameList),
                validate: (nameList) => form.validateFields(nameList),
                setErrors,
                setLoading,
                scrollToField: (name, options) => form.scrollToField(name, options),
                getForm: () => form,
                isLoading: () => loading,
            }),
            [form, submit, reset, setErrors, loading]
        );

        const handleFinish = async (values) => {
            if (!onSubmit) return;

            setLoading(true);
            try {
                const result = await onSubmit(values, {
                    form,
                    setErrors,
                    reset,
                    setLoading,
                });

                if (successMessage) {
                    message.success(successMessage);
                }

                if (onSuccess) {
                    onSuccess(result, { form, reset });
                }
            } catch (err) {
                console.error('AppForm onSubmit error:', err);
                setErrors(err);
                if (onError) {
                    onError(err, { form });
                }
            } finally {
                setLoading(false);
            }
        };

        const contextValue = {
            form,
            loading,
            setLoading,
            submit,
            reset,
            setErrors,
        };

        const renderedContent = typeof children === 'function' ? children(contextValue) : children;

        return (
            <AppFormContext.Provider value={contextValue}>
                <Form
                    form={form}
                    layout={layout}
                    initialValues={initialValues}
                    onFinish={handleFinish}
                    onFinishFailed={({ errorFields }) => {
                        if (autoScrollToError && errorFields.length > 0) {
                            form.scrollToField(errorFields[0].name, { behavior: 'smooth', block: 'center' });
                        }
                    }}
                    {...formProps}
                >
                    {renderedContent}
                </Form>
            </AppFormContext.Provider>
        );
    }
);

AppForm.displayName = 'AppForm';
AppForm.Item = Form.Item;
AppForm.List = Form.List;
AppForm.useForm = Form.useForm;
AppForm.useWatch = Form.useWatch;

export default AppForm;
