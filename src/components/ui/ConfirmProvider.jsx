import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Modal from './Modal';

const ConfirmContext = createContext(null);

// const confirm = useConfirm();  if (await confirm({ title, message, confirmLabel, danger })) { ... }
export function ConfirmProvider({ children }) {
    const [dialog, setDialog] = useState(null);
    const resolver = useRef(null);

    const confirm = useCallback((options) => new Promise((resolve) => {
        resolver.current = resolve;
        setDialog(options);
    }), []);

    const finish = (answer) => {
        resolver.current?.(answer);
        resolver.current = null;
        setDialog(null);
    };

    const value = useMemo(() => confirm, [confirm]);

    return (
        <ConfirmContext.Provider value={value}>
            {children}
            {dialog && (
                <Modal
                    size="sm"
                    title={dialog.title || 'Are you sure?'}
                    onClose={() => finish(false)}
                    footer={(
                        <>
                            <button type="button" className="btn" onClick={() => finish(false)}>Cancel</button>
                            <button type="button" className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => finish(true)}>
                                {dialog.confirmLabel || 'Confirm'}
                            </button>
                        </>
                    )}
                >
                    <p>{dialog.message}</p>
                </Modal>
            )}
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) throw new Error('useConfirm must be used inside <ConfirmProvider>');
    return context;
};
