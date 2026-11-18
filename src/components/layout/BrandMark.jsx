import { useCompany } from '../../context/CompanyContext';

// Sidebar / login brand: the uploaded logo exactly as uploaded, or the company's short name on a white tile.
export default function BrandMark() {
    const { company } = useCompany();
    if (company.logo) {
        return <img className="brand-logo" src={company.logo} alt={`${company.name} logo`} />;
    }
    return <span className="brand-mark" aria-hidden="true">{company.shortName || company.name.slice(0, 3).toUpperCase()}</span>;
}
