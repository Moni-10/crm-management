import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, SearchX } from 'lucide-react';
import { searchApi } from '../../api';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { countResults, SEARCH_GROUPS } from '../../utils/searchGroups';

// Full results for the header search (opened with Enter or "See all results").
export default function Search() {
    const [searchParams] = useSearchParams();
    const query = (searchParams.get('q') || '').trim();
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!query) {
            setResults(null);
            return undefined;
        }
        let cancelled = false;
        setLoading(true);
        setError('');
        searchApi.search(query, 50)
            .then((data) => !cancelled && setResults(data))
            .catch((err) => !cancelled && setError(err.message || 'Search failed'))
            .finally(() => !cancelled && setLoading(false));
        return () => { cancelled = true; };
    }, [query]);

    const total = countResults(results);

    return (
        <div>
            <PageHeader
                title={query ? `Results for “${query}”` : 'Search'}
                subtitle={results && !loading ? `${total} match${total === 1 ? '' : 'es'}` : undefined}
            />

            {!query && <p className="muted">Type in the search box at the top to find anything.</p>}
            {loading && <Loading label="Searching..." />}
            {error && <ErrorState message={error} />}
            {query && results && !loading && total === 0 && (
                <div className="card"><EmptyState icon={SearchX} title="Nothing found">Check the spelling, or try fewer words or part of a phone number.</EmptyState></div>
            )}

            {results && !loading && SEARCH_GROUPS.map((group) => {
                const items = results[group.key] || [];
                if (items.length === 0) return null;
                const Icon = group.icon;
                return (
                    <section key={group.key} className="results-section">
                        <h3 className="results-title">
                            <Icon size={18} aria-hidden="true" /> {group.label}
                            <span className="results-count">{items.length}</span>
                        </h3>
                        <div className="card results-list">
                            {items.map((item) => (
                                <Link key={item.id} to={group.link(item)} className="results-row">
                                    <span className="results-row-title">{group.title(item)}</span>
                                    <span className="results-row-sub truncate">{group.subtitle(item)}</span>
                                    <ChevronRight aria-hidden="true" />
                                </Link>
                            ))}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
