import React from 'react';
import { Card, Button, Tag } from 'antd';
import { CompassOutlined, UnorderedListOutlined, EditOutlined } from '@ant-design/icons';

export default function DemarcacionCard({ record, actionsNode, handlers, onOpenSecciones }) {
    return (
        <Card
            styles={{ body: { padding: '16px' } }}
            className="mb-4 w-full rounded-lg border border-gray-200 shadow-sm"
        >
            <div className="mb-3 flex items-start justify-between">
                <div>
                    <div className="text-base font-bold text-gray-800">{record.nombre}</div>
                    <div className="mt-0.5 text-xs font-bold text-blue-600">Demarcación: {record.id}</div>
                </div>
                {record.is_custom_meta ? (
                    <Tag color="blue" className="text-xs">
                        Personalizada
                    </Tag>
                ) : (
                    <Tag color="default" className="text-xs text-gray-400">
                        Base
                    </Tag>
                )}
            </div>

            <div className="mb-4 space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <CompassOutlined className="shrink-0 text-gray-400" />
                    <span className="w-24 shrink-0 text-gray-400">Meta Votantes:</span>
                    <span className="font-semibold text-gray-800">{record.meta}</span>
                </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                <Button
                    type="primary"
                    icon={<UnorderedListOutlined />}
                    className="flex w-full items-center justify-center bg-[#0f172a] hover:bg-slate-800"
                    onClick={() => onOpenSecciones?.(record)}
                >
                    Ver Secciones
                </Button>
                <Button
                    type="default"
                    icon={<EditOutlined />}
                    className="flex w-full items-center justify-center border-blue-200 text-blue-600 hover:border-blue-400"
                    onClick={handlers?.edit}
                >
                    Editar
                </Button>
            </div>
        </Card>
    );
}
