import { useCompany } from '../../context/CompanyContext';
import defaultLogo from '../../assets/logo-small.webp';

// Sidebar brand: the logo uploaded in Settings exactly as uploaded, otherwise the bundled MMW logo on a white tile
// (the logo has dark lettering, so the tile keeps it readable on the dark sidebar theme).
export default function BrandMark() {
    const { company } = useCompany();
    if (company.logo) {
        return <img className="brand-logo" src={company.logo} alt={`${company.name} logo`} />;
    }
    return (
        <span className="brand-logo-tile">
            <img src={defaultLogo} alt={`${company.name} logo`} />
        </span>
    );
}
