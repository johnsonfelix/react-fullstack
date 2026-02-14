'use client';

import { useState, useEffect } from 'react';
import {
    Search,
    Filter,
    Package,
    Tag,
    DollarSign,
    Box,
    Building2
} from 'lucide-react';
import Image from 'next/image';

export default function CataloguesAdministration() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCatalog();
    }, []);

    const fetchCatalog = async () => {
        try {
            const res = await fetch('/api/administration/catalog');
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (error) {
            console.error('Failed to fetch catalog', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading catalog...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Catalogues Management</h1>
                    <p className="text-sm text-gray-500 mt-1">View and manage supplier catalogues</p>
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search catalogues..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <Package className="w-10 h-10 text-gray-300 mb-2" />
                                        <p>No catalog items found.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {item.imageUrl ? (
                                                <div className="h-10 w-10 relative rounded overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <Image
                                                        src={item.imageUrl}
                                                        alt={item.description}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                    <Box size={20} />
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.description}</p>
                                                <p className="text-xs text-gray-500">{item.itemType}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Tag className="w-3.5 h-3.5 text-gray-400" />
                                            {item.category?.name || 'Uncategorized'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                            {item.supplier?.companyName || 'Unknown Supplier'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-sm font-medium text-gray-900">
                                            <span className="text-gray-500 text-xs">{item.currency?.name}</span>
                                            {item.price?.toFixed(2)}
                                            <span className="text-gray-400 text-xs font-normal ml-1">/ {item.uom?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {item.quantity}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
