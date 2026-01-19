import React from 'react';
import { Minus, Plus, Video, User, Trash2 } from 'lucide-react';

export const NumberInput = ({ value, onChange, ...props }) => {
    const currentValue = Number(value) || 0;

    const handleIncrement = () => {
        const newValue = currentValue + 1;
        onChange({ target: { value: String(newValue) } });
    };

    const handleDecrement = () => {
        const newValue = Math.max(0, currentValue - 1);
        onChange({ target: { value: String(newValue) } });
    };

    const handleChange = (e) => {
        const typedValue = e.target.value;
        if (typedValue === '' || (!isNaN(typedValue) && Number(typedValue) >= 0)) {
            onChange(e);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <button type="button" onClick={handleDecrement} className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50" disabled={currentValue <= 0}>
                <Minus className="h-4 w-4" />
            </button>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={handleChange}
                className="w-16 p-1 border border-gray-300 rounded-md text-center text-sm focus:ring-indigo-500 focus:border-indigo-500 transition"
                {...props}
            />
            <button type="button" onClick={handleIncrement} className="p-2 rounded-full bg-gray-200 text-gray-700 hover:bg-gray-300 transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Plus className="h-4 w-4" />
            </button>
        </div>
    );
};

export const CheckboxInput = (props) => (
    <input type="checkbox" className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 transition" {...props} />
);

export const PresentationTracker = ({ value = [], onChange }) => {
    const options = { 'P': 'In Person', 'V': 'Virtual' };

    // Legacy support: Map old types to new ones for display
    const getDisplayType = (type) => {
        if (type === 'P') return 'In Person';
        if (['Z', 'V', 'D'].includes(type)) return 'Virtual'; // Old virtual types
        return options[type] || 'Unknown'; // New 'V' type and fallback
    };

    const handleAdd = (type) => {
        const newValue = [...value, type];
        onChange(newValue);
    };
    const handleRemove = (indexToRemove) => {
        const newValue = value.filter((_, index) => index !== indexToRemove);
        onChange(newValue);
    };

    const totalPresentations = (value.length || 0);

    return (
        <div className="pt-2">
            <label className="font-medium text-gray-700">Presentations ({totalPresentations})</label>
            <div className="mt-2 flex items-center justify-center space-x-2">
                <button onClick={() => handleAdd('P')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <User className="h-4 w-4 mr-1.5" /> Add In Person
                </button>
                <button onClick={() => handleAdd('V')} className="flex-1 flex items-center justify-center p-2 text-sm rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <Video className="h-4 w-4 mr-1.5" /> Add Virtual
                </button>
            </div>
            <div className="mt-2 space-y-2">
                {value.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
                        <span className="text-sm">{getDisplayType(item)}</span>
                        <button onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};
