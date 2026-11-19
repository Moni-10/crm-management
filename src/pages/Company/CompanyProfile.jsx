import { Building2, ExternalLink, Factory, Globe2, Mail, MapPin, Pencil, Phone, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCompany } from '../../context/CompanyContext';

export default function CompanyProfile() {
    const { company } = useCompany();
    return <div className="company-profile-page">
        <section className="profile-cover"><div className="profile-cover-copy"><span>Company profile</span><h1>{company.name || 'Mohindra Mechanical Works'}</h1><p>{company.tagline || 'Paper conversion machines & printing machines'}</p><Link to="/settings?tab=company" className="btn company-profile-edit"><Pencil /> Edit company details</Link></div></section>
        <div className="company-profile-grid">
            <section className="company-profile-card company-about"><header><Building2 /><div><h2>Company details</h2><p>Business identity and contact information</p></div></header><dl>
                <div><dt>Company name</dt><dd>{company.name || 'Mohindra Mechanical Works'}</dd></div><div><dt>Short name</dt><dd>{company.shortName || 'MMW'}</dd></div><div><dt>GSTIN</dt><dd>{company.gstin || 'Not added'}</dd></div><div><dt>IEC</dt><dd>{company.iec || 'Not added'}</dd></div>
            </dl></section>
            <section className="company-profile-card"><header><Factory /><div><h2>Contact information</h2><p>Official company communication details</p></div></header><div className="profile-contact-list"><span><Phone />{company.phones || '+91 99884 40777'}</span><span><Mail />{company.email || 'info@mohindraroto.com'}</span><span><MapPin />{company.address || 'New Delhi, India 110018'}</span><span><Globe2 />{company.website || 'www.mohindraroto.com'} <ExternalLink /></span></div></section>
        </div>
        <section className="company-profile-card profile-capabilities"><header><ShieldCheck /><div><h2>Mohindra Mechanical Works</h2><p>Manufacturing excellence backed by an experienced technical and sales team.</p></div></header><div><span>Paper conversion machinery</span><span>Printing machinery</span><span>Technical support</span><span>Customer-focused sales</span></div></section>
    </div>;
}
