import React from 'react';

export default function AuthLayout({ children }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="flex min-h-[600px] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Left Side - Branding */}
                <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-blue-900 p-12 text-white md:flex">
                    <div className="absolute inset-0 opacity-20">
                        {/* Background pattern placeholder */}
                        <div className="absolute top-0 -left-1/4 h-full w-full rounded-full bg-blue-600 mix-blend-multiply blur-3xl"></div>
                        <div className="absolute -right-1/4 bottom-0 h-full w-full rounded-full bg-indigo-500 mix-blend-multiply blur-3xl"></div>
                    </div>

                    <div className="relative z-10 mb-8 w-full overflow-hidden rounded-xl border border-white/20 bg-slate-950/80 p-2 shadow-2xl">
                        <img
                            src="/images/orion-legal-logo.png"
                            alt="ORION SISTEMAS - LEGAL SMART GOV"
                            className="block h-auto max-h-48 w-full rounded-lg object-contain"
                        />
                    </div>

                    <div className="relative z-10 mt-auto mb-auto">
                        <h2 className="mb-4 text-4xl leading-tight font-bold">
                            Plataforma de
                            <br />
                            Estructura Política
                        </h2>
                        <p className="mb-8 text-lg text-blue-200">Organiza. Conecta. Transforma.</p>
                        <hr className="mb-8 w-16 border-t-2 border-blue-700" />
                        <p className="mb-8 max-w-md text-sm leading-relaxed text-blue-100">
                            Sistema integral para la gestión de demarcaciones, operadores, promotores y ciudadanía.
                            Información estratégica para decisiones que generan resultados.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-start">
                                <div className="mr-4 rounded bg-blue-800/50 p-2">👥</div>
                                <div>
                                    <h4 className="text-sm font-semibold">Control de estructura</h4>
                                    <p className="text-xs text-blue-200">RD, Operadores, Promotores y Promovidos</p>
                                </div>
                            </div>
                            <div className="flex items-start">
                                <div className="mr-4 rounded bg-blue-800/50 p-2">📍</div>
                                <div>
                                    <h4 className="text-sm font-semibold">Gestión territorial</h4>
                                    <p className="text-xs text-blue-200">Demarcaciones, colonias y zonas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="relative flex w-full flex-col justify-center p-8 sm:p-12 md:w-1/2 lg:p-16">
                    {children}

                    <div className="absolute bottom-6 left-0 w-full text-center">
                        <p className="flex items-center justify-center gap-1 text-xs text-gray-400">
                            <span className="inline-block h-3 w-3 rounded-sm border border-gray-300"></span>
                            Plataforma segura y confidencial
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
