import { Package, Building2, CheckCircle2, Factory, Truck, ShieldCheck, Leaf, ExternalLink, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CatalogItem {
    id: string;
    description: string;
    itemType: string;
    price: number;
    imageUrl?: string;
    supplier: {
        companyName: string;
        supplierType?: string;
    };
    currency: {
        name: string;
    };
    uom: {
        name: string;
    };
}

interface CatalogSuggestionsProps {
    items: CatalogItem[];
    onSelect: (item: CatalogItem) => void;
}

export default function CatalogSuggestions({ items, onSelect }: CatalogSuggestionsProps) {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (items.length === 0) return null;

    return (
        <div className="mt-2">
            <div className="flex gap-3 overflow-x-auto pb-4 pt-5 px-1 snap-x scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {items.map((item) => {
                    const isSME = item.supplier?.supplierType === "SME";
                    const isExpanded = expandedIds.has(item.id);

                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "relative flex flex-col bg-white rounded-lg border transition-all duration-200 overflow-visible group w-[280px] min-w-[280px] flex-shrink-0 snap-center",
                                isSME ? "border-emerald-500/30 shadow-sm" : "border-gray-100 shadow-sm hover:border-blue-200"
                            )}
                        >
                            {/* SME Tag - Compact */}
                            {isSME && (
                                <div className="absolute -top-2.5 left-3 bg-emerald-500 text-white px-2 py-0.5 rounded shadow-sm flex items-center gap-1 z-10">
                                    <CheckCircle2 className="w-3 h-3" />
                                    <span className="text-[10px] font-bold tracking-wide">SME CERTIFIED</span>
                                </div>
                            )}

                            <div className="p-3 pt-4 flex flex-col h-full">
                                {/* Supplier Header */}
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className={cn("p-1 rounded", isSME ? "bg-emerald-100/50" : "bg-gray-100")}>
                                            <Building2 className={cn("w-3 h-3", isSME ? "text-emerald-700" : "text-gray-500")} />
                                        </div>
                                        <span className="font-semibold text-gray-700 text-xs uppercase tracking-tight">
                                            {item.supplier?.companyName}
                                        </span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-gray-400 hover:text-blue-600 cursor-pointer" />
                                </div>

                                {/* Main Content Row */}
                                <div className="flex gap-3 mb-3">
                                    {/* Product Image */}
                                    <div className="w-16 h-16 bg-gray-50 rounded border border-gray-100 relative overflow-hidden flex-shrink-0">
                                        {item.imageUrl ? (
                                            <Image
                                                src={item.imageUrl}
                                                alt={item.description}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-300">
                                                <Package className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Title & Price */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-medium text-gray-900 text-sm leading-tight mb-1 truncate">
                                            {item.description}
                                        </h3>
                                        <div className="flex items-baseline gap-1.5 mb-1.5">
                                            <span className={cn("text-base font-bold", isSME ? "text-emerald-700" : "text-gray-900")}>
                                                {item.price.toLocaleString()} {item.currency?.name}
                                            </span>
                                            <span className="text-[10px] text-gray-400">/ {item.uom?.name}</span>
                                        </div>

                                        {/* Market badge */}
                                        <div className={cn(
                                            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                            isSME ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
                                        )}>
                                            <div className="w-1 h-1 rounded-full bg-current" />
                                            {isSME ? "8%" : "5%"} Below Market
                                        </div>
                                    </div>
                                </div>

                                {/* Metrics - Compact Grid */}
                                <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-gray-500 mb-3 bg-gray-50/50 p-2 rounded">
                                    <div className="flex items-center gap-1.5">
                                        <Truck className="w-3 h-3 text-gray-400" />
                                        <span>Delivery: <span className="font-medium text-gray-900">2d</span></span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <ShieldCheck className={cn("w-3 h-3", isSME ? "text-emerald-500" : "text-amber-500")} />
                                        <span>Risk: <span className="font-medium text-gray-900">{isSME ? "Low" : "Med"}</span></span>
                                    </div>

                                    {/* Expandable details */}
                                    {isExpanded && (
                                        <>
                                            <div className="flex items-center gap-1.5">
                                                <Leaf className="w-3 h-3 text-green-500" />
                                                <span>ESG: <span className="font-medium text-gray-900">Low</span></span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Leaf className="w-3 h-3 text-green-500" />
                                                <span>Score: <span className="font-medium text-gray-900">{isSME ? "82" : "75"}</span></span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* AI Insight - Collapsible */}
                                {isExpanded && (
                                    <div className="bg-blue-50/50 rounded p-2 mb-3 border border-blue-100/50 text-[10px]">
                                        <div className="font-bold text-blue-800 mb-0.5">AI Insight:</div>
                                        <p className="text-blue-600/80 leading-snug">
                                            {isSME
                                                ? "Best total cost & performance choice."
                                                : "Good price, slightly slower delivery."
                                            }
                                        </p>
                                    </div>
                                )}

                                {/* Actions - Compact */}
                                <div className="flex gap-1.5 mt-auto">
                                    <button
                                        onClick={() => onSelect(item)}
                                        className={cn(
                                            "flex-1 py-1.5 px-3 rounded text-xs font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-1.5",
                                            isSME
                                                ? "bg-emerald-500 hover:bg-emerald-600"
                                                : "bg-blue-600 hover:bg-blue-700"
                                        )}
                                    >
                                        Select
                                    </button>
                                    <button
                                        onClick={(e) => toggleExpand(item.id, e)}
                                        className="px-2 py-1.5 rounded border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 flex items-center"
                                        title={isExpanded ? "Show Less" : "Show More"}
                                    >
                                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
