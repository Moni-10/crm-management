import { useCompany } from '../../context/CompanyContext';
import defaultLogo from '../../assets/logo-small.webp';

// Use the uploaded logo when available, otherwise use the bundled small logo directly.
export default function BrandMark() {
    const { company } = useCompany();
    if (company.logo) {
        return <img className="brand-logo" src={company.logo} alt={`${company.name} logo`} />;
    }
    return <img className="brand-logo" src={defaultLogo} alt={`${company.name} logo`} />;
}
