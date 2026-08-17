import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ProFormSelect } from '@ant-design/pro-components';
import axios from 'axios';
import { message } from 'antd';

const AppSelect = forwardRef(({ fetchUrl, valueKey = 'id', labelKey = 'nombre', fieldProps, onDataLoaded, ...restProps }, ref) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        if (!fetchUrl) {
            setOptions([]);
            if (onDataLoaded) onDataLoaded([]);
            return;
        }
        
        setLoading(true);
        try {
            const res = await axios.get(fetchUrl);
            const data = res.data || [];
            
            const mappedOptions = data.map(item => {
                const label = typeof labelKey === 'function' ? labelKey(item) : item[labelKey];
                const value = item[valueKey]; 
                return { label, value };
            });
            
            setOptions(mappedOptions);
            if (onDataLoaded) onDataLoaded(data);
        } catch (error) {
            console.error(`Error fetching data for ${fetchUrl}:`, error);
            message.error('Error al cargar la información');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [fetchUrl]);

    useImperativeHandle(ref, () => ({
        fetchData
    }));

    return (
        <ProFormSelect
            options={options}
            disabled={!fetchUrl || restProps.disabled}
            fieldProps={{
                loading,
                ...fieldProps
            }}
            {...restProps}
        />
    );
});

export default AppSelect;
