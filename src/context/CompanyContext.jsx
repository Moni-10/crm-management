import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { companyApi } from '../api';
import { DEFAULT_COMPANY } from '../config/company';

const CompanyContext = createContext(null);

// The company's own details (name, logo, address...). Public, so the login screen can use it too.
export function CompanyProvider({ children }) {
    const [company, setCompany] = useState(DEFAULT_COMPANY);

    const refresh = useCallback(async () => {
        try {
            setCompany({ ...DEFAULT_COMPANY, ...(await companyApi.get()) });
        } catch {
            // keep whatever we have; the app still works with the defaults
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    useEffect(() => {
        document.title = `${company.name} | Sales CRM`;
    }, [company.name]);

    const save = useCallback(async (details) => {
        setCompany({ ...DEFAULT_COMPANY, ...(await companyApi.update(details)) });
    }, []);

    const value = useMemo(() => ({ company, refresh, save }), [company, refresh, save]);
    return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export const useCompany = () => {
    const context = useContext(CompanyContext);
    if (!context) throw new Error('useCompany must be used inside <CompanyProvider>');
    return context;
};
