import React from 'react';
import { useForm, Head } from '@inertiajs/react';
import AuthLayout from '@/Layouts/AuthLayout';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { Button, Input, Checkbox, Form } from 'antd';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const onFinish = (values) => {
        post('/login');
    };

    return (
        <AuthLayout>
            <Head title="Iniciar Sesión" />

            <div className="mb-8 text-center">
                {/* Mobile Logo Branding */}
                <div className="mb-6 flex w-full justify-center md:hidden">
                    <div className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-xl">
                        <img
                            src="/images/orion-legal-logo.png"
                            alt="ORION SISTEMAS - LEGAL SMART GOV"
                            className="block h-auto w-full rounded-lg object-contain"
                        />
                    </div>
                </div>

                <h2 className="mb-1 text-2xl font-bold text-gray-800 sm:text-3xl">Bienvenido</h2>
                <p className="text-sm text-gray-500">
                    Inicia sesión para continuar
                    <br />
                    en la Plataforma de Estructura Política
                </p>
            </div>

            <Form
                name="login"
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ remember: false }}
                className="mx-auto w-full max-w-sm"
            >
                <Form.Item
                    label={<span className="font-medium text-gray-700">Usuario</span>}
                    validateStatus={errors.email ? 'error' : ''}
                    help={errors.email}
                >
                    <Input
                        prefix={<UserOutlined className="text-gray-400" />}
                        placeholder="Ingresa tu correo"
                        size="large"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        className="py-2"
                    />
                </Form.Item>

                <Form.Item
                    label={<span className="font-medium text-gray-700">Contraseña</span>}
                    validateStatus={errors.password ? 'error' : ''}
                    help={errors.password}
                >
                    <Input.Password
                        prefix={<LockOutlined className="text-gray-400" />}
                        placeholder="Ingresa tu contraseña"
                        size="large"
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        className="py-2"
                    />
                </Form.Item>

                <div className="mt-2 mb-6 flex items-center justify-between">
                    <Checkbox
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="text-sm text-gray-600"
                    >
                        Recordarme
                    </Checkbox>
                    <a href="#" className="text-sm text-blue-600 hover:text-blue-800">
                        ¿Olvidaste tu contraseña?
                    </a>
                </div>

                <Form.Item>
                    <Button
                        type="primary"
                        htmlType="submit"
                        className="h-12 w-full rounded-lg bg-blue-700 text-base font-medium hover:bg-blue-800"
                        loading={processing}
                    >
                        Iniciar sesión
                    </Button>
                </Form.Item>

                <div className="my-6 flex items-center justify-center space-x-4">
                    <span className="h-px w-full bg-gray-200"></span>
                    <span className="text-xs font-medium text-gray-400 uppercase">O</span>
                    <span className="h-px w-full bg-gray-200"></span>
                </div>

                <Button className="flex h-12 w-full items-center justify-center rounded-lg border-gray-300 text-base font-medium text-gray-700">
                    <span className="mr-2 text-blue-600">🛡️</span> Iniciar sesión con código
                </Button>

                <div className="mt-8 text-center text-sm">
                    <span className="text-gray-500">¿No tienes acceso? </span>
                    <a href="#" className="text-blue-600 hover:text-blue-800">
                        Contacta al administrador
                    </a>
                </div>
            </Form>
        </AuthLayout>
    );
}
