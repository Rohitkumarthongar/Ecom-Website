import React from 'react';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "./alert-dialog";
import { Copy, Check, Info, AlertTriangle, XCircle, Globe } from "lucide-react";
import { cn } from "../../lib/utils";

const variantStyles = {
    success: {
        icon: Check,
        color: "text-emerald-500",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
        buttonColor: "bg-emerald-600 hover:bg-emerald-700",
    },
    error: {
        icon: XCircle,
        color: "text-red-500",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
        buttonColor: "bg-red-600 hover:bg-red-700",
    },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
        buttonColor: "bg-amber-600 hover:bg-amber-700",
    },
    info: {
        icon: Info,
        color: "text-blue-500",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
        buttonColor: "bg-blue-600 hover:bg-blue-700",
    },
    default: {
        icon: Globe,
        color: "text-white",
        bgColor: "bg-white/5",
        borderColor: "border-white/10",
        buttonColor: "bg-cyan-500 hover:bg-cyan-600",
    }
};

export function MessagePopup({
    isOpen,
    onClose,
    title,
    message,
    type = 'default',
    actions = [],
    showCancel = true,
    cancelText = "Cancel",
    onConfirm,
    confirmText = "OK"
}) {
    const style = variantStyles[type] || variantStyles.default;
    const Icon = style.icon;

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent className="max-w-[500px] p-0 overflow-hidden border-0 bg-transparent shadow-none">

                {/* Backdrop Blur Container */}
                <div className="bg-[#1e1f24]/95 backdrop-blur-md text-slate-200 border border-white/10 rounded-xl shadow-2xl overflow-hidden">

                    {/* Header Section */}
                    <div className="p-6 pb-2">
                        <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm font-medium">
                            <Globe className="w-4 h-4" />
                            <span>localhost:3000</span>
                        </div>
                    </div>

                    <div className="px-6 pb-6">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-normal text-slate-100 hidden">
                                {title}
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-base font-normal text-slate-100 leading-relaxed mt-2">
                                {message}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>

                    {/* Footer Actions */}
                    <AlertDialogFooter className="p-4 bg-white/5 border-t border-white/5 flex gap-3">
                        {showCancel && (
                            <AlertDialogCancel
                                onClick={onClose}
                                className="bg-white/5 hover:bg-white/10 text-slate-200 border-0 h-10 px-6 font-medium"
                            >
                                {cancelText}
                            </AlertDialogCancel>
                        )}

                        {actions.length > 0 ? (
                            actions.map((action, index) => (
                                <AlertDialogAction
                                    key={index}
                                    onClick={action.onClick}
                                    className={cn(
                                        "h-10 px-6 font-medium transition-colors",
                                        action.variant === 'destructive'
                                            ? "bg-red-600 hover:bg-red-700 text-white"
                                            : style.buttonColor
                                    )}
                                >
                                    {action.label}
                                </AlertDialogAction>
                            ))
                        ) : (
                            <AlertDialogAction
                                onClick={() => {
                                    onConfirm?.();
                                    onClose();
                                }}
                                className={cn("h-10 px-6 font-medium text-white", style.buttonColor)}
                            >
                                {confirmText}
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </div>

            </AlertDialogContent>
        </AlertDialog>
    );
}
