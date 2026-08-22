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

            <div className="text-center mb-8">
                {/* Mobile Logo Branding */}
                <div className="flex justify-center mb-6 md:hidden w-full">
                    <div className="p-2 bg-slate-950 rounded-xl shadow-xl border border-slate-800 w-full">
                        <img
                            src="/images/orion-legal-logo.png"
                            alt="ORION SISTEMAS - LEGAL SMART GOV"
                            className="w-full h-auto object-contain rounded-lg block"
                        />
                    </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Bienvenido</h2>
                <p className="text-gray-500 text-sm">
                    Inicia sesión para continuar<br />
                    en la Plataforma de Estructura Política
                </p>
            </div>

            <Form
                name="login"
                layout="vertical"
                onFinish={onFinish}
                initialValues={{ remember: false }}
                className="w-full max-w-sm mx-auto"
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

                <div className="flex items-center justify-between mb-6 mt-2">
                    <Checkbox
                        checked={data.remember}
                        onChange={(e) => setData('remember', e.target.checked)}
                        className="text-gray-600 text-sm"
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
                        className="w-full h-12 bg-blue-700 hover:bg-blue-800 text-base font-medium rounded-lg"
                        loading={processing}
                    >
                        Iniciar sesión
                    </Button>
                </Form.Item>

                <div className="flex items-center justify-center space-x-4 my-6">
                    <span className="h-px w-full bg-gray-200"></span>
                    <span className="text-gray-400 text-xs uppercase font-medium">O</span>
                    <span className="h-px w-full bg-gray-200"></span>
                </div>

                <Button
                    className="w-full h-12 border-gray-300 text-gray-700 text-base font-medium rounded-lg flex items-center justify-center"
                >
                    <span className="mr-2 text-blue-600">🛡️</span> Iniciar sesión con código
                </Button>

                <div className="text-center mt-8 text-sm">
                    <span className="text-gray-500">¿No tienes acceso? </span>
                    <a href="#" className="text-blue-600 hover:text-blue-800">Contacta al administrador</a>
                </div>
            </Form>
        </AuthLayout>
    );
}
