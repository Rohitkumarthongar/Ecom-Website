import React, { createContext, useContext, useState, useCallback } from 'react';
import { MessagePopup } from '../components/ui/message-popup';

const PopupContext = createContext(null);

export const usePopup = () => {
    const context = useContext(PopupContext);
    if (!context) {
        throw new Error('usePopup must be used within a PopupProvider');
    }
    return context;
};

export const PopupProvider = ({ children }) => {
    const [popupState, setPopupState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'default', // 'default', 'success', 'error', 'warning', 'info'
        confirmText: 'Yes, Proceed',
        cancelText: 'Cancel',
        onConfirm: () => { },
        onCancel: () => { },
        showCancel: true,
    });

    const showPopup = useCallback(({
        title,
        message,
        type = 'default',
        confirmText = 'Yes, Proceed',
        cancelText = 'Cancel',
        onConfirm = () => { },
        onCancel = () => { },
        showCancel = true
    }) => {
        setPopupState({
            isOpen: true,
            title,
            message,
            type,
            confirmText,
            cancelText,
            onConfirm,
            onCancel,
            showCancel,
        });
    }, []);

    const closePopup = useCallback(() => {
        setPopupState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = useCallback(() => {
        if (popupState.onConfirm) {
            popupState.onConfirm();
        }
        closePopup();
    }, [popupState, closePopup]);

    const handleCancel = useCallback(() => {
        if (popupState.onCancel) {
            popupState.onCancel();
        }
        closePopup();
    }, [popupState, closePopup]);

    return (
        <PopupContext.Provider value={{ showPopup, closePopup }}>
            {children}
            <MessagePopup
                isOpen={popupState.isOpen}
                onClose={handleCancel}
                title={popupState.title}
                message={popupState.message}
                type={popupState.type}
                confirmText={popupState.confirmText}
                cancelText={popupState.cancelText}
                onConfirm={handleConfirm}
                showCancel={popupState.showCancel}
            />
        </PopupContext.Provider>
    );
};
