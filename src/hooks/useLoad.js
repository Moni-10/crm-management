import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Runs an async loader on mount and whenever `reload()` is called.
 *   const { data, loading, error, reload } = useLoad(() => partiesApi.list());
 * The loader can return anything (e.g. Promise.all of several API calls).
 * Results from a superseded request are ignored.
 */
export function useLoad(loader, initial = null) {
    const [data, setData] = useState(initial);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const loaderRef = useRef(loader);
    loaderRef.current = loader;
    const requestId = useRef(0);

    const reload = useCallback(async ({ silent = false } = {}) => {
        const id = ++requestId.current;
        if (!silent) setLoading(true);
        setError('');
        try {
            const result = await loaderRef.current();
            if (id === requestId.current) setData(result);
        } catch (err) {
            if (id === requestId.current) setError(err.message || 'Could not load data');
        } finally {
            if (id === requestId.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
        return () => { requestId.current += 1; };
    }, [reload]);

    return { data, loading, error, reload, setData };
}
