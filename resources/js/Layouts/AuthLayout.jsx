import React from 'react';

export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="flex w-full max-w-5xl bg-white shadow-2xl rounded-2xl overflow-hidden min-h-[600px]">
                {/* Left Side - Branding */}
                <div className="hidden md:flex flex-col w-1/2 bg-blue-900 text-white p-12 justify-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                        {/* Background pattern placeholder */}
                        <div className="absolute top-0 -left-1/4 w-full h-full bg-blue-600 rounded-full blur-3xl mix-blend-multiply"></div>
                        <div className="absolute bottom-0 -right-1/4 w-full h-full bg-indigo-500 rounded-full blur-3xl mix-blend-multiply"></div>
                    </div>
                    
                    <div className="relative z-10 mb-8 bg-white p-4 rounded-xl inline-block shadow-lg">
                        <img src="/images/orion-logo.png" alt="ORION SISTEMAS" className="h-16 object-contain" />
                    </div>

                    <div className="relative z-10 mt-auto mb-auto">
                        <h2 className="text-4xl font-bold mb-4 leading-tight">
                            Plataforma de<br />Estructura Política
                        </h2>
                        <p className="text-blue-200 text-lg mb-8">
                            Organiza. Conecta. Transforma.
                        </p>
                        <hr className="border-blue-700 w-16 mb-8 border-t-2" />
                        <p className="text-sm text-blue-100 mb-8 max-w-md leading-relaxed">
                            Sistema integral para la gestión de demarcaciones, operadores, promotores y ciudadanía.
                            Información estratégica para decisiones que generan resultados.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="bg-blue-800/50 p-2 rounded mr-4">👥</div>
                                <div>
                                    <h4 className="font-semibold text-sm">Control de estructura</h4>
                                    <p className="text-xs text-blue-200">RD, Operadores, Promotores y Promovidos</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="bg-blue-800/50 p-2 rounded mr-4">📍</div>
                                <div>
                                    <h4 className="font-semibold text-sm">Gestión territorial</h4>
                                    <p className="text-xs text-blue-200">Demarcaciones, colonias y zonas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="w-full md:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center relative">
                    {children}
                    
                    <div className="absolute bottom-6 left-0 w-full text-center">
                        <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                            <span className="inline-block w-3 h-3 border border-gray-300 rounded-sm"></span>
                            Plataforma segura y confidencial
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
