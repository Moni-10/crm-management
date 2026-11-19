import { useState } from 'react';
import { Building2, CheckCircle2, Crown, Edit2, Factory, Handshake, Mail, MapPin, Phone, Plus, Settings, Trash2, TrendingUp, Users, X } from 'lucide-react';

const makeMember = (id, name, designation, department, phone, email) => ({ id, name, designation, department, phone, email, location: 'New Delhi, India' });
const INITIAL = {
    Owners: [{ ...makeMember(1, 'S. Mohinder Singh', 'Founder', 'Owners', '+91 99884 40777', 'mohinder@mohindraroto.com'), photo: '/founder.png' }, { ...makeMember(2, 'Azadvinder Singh', 'Co-Founder', 'Owners', '+91 98100 11001', 'azad@mohindraroto.com'), photo: '/co-founder.png' }],
    Technical: [makeMember(101, 'Vedant Tripathi', 'Digital Marketing Expert', 'Technical', '+91 98100 11010', 'vedant@mmw.in'), makeMember(102, 'Nishu Kashyap', 'Full Stack Developer', 'Technical', '+91 98100 11011', 'nishu@mmw.in'), makeMember(103, 'Laxmi Singh', 'WordPress Developer', 'Technical', '+91 98100 11012', 'laxmi@mmw.in'), makeMember(104, 'Bhupender Singh', 'SEO Intern', 'Technical', '+91 98100 11013', 'bhupender@mmw.in')],
    Sales: ['Jaspal', 'Pooja', 'Aman', 'Neha Khan', 'Neha Mishra', 'Muskan', 'Rajwant', 'Renu', 'Satish', 'Swati', 'Uma'].map((name, index) => makeMember(201 + index, name, index ? 'Sales Executive' : 'Sales Manager', 'Sales', `+91 98100 110${20 + index}`, `${name.toLowerCase().replace(' ', '.')}@mmw.in`))
};
const EMPTY = { name: '', designation: '', phone: '', email: '', location: 'New Delhi, India', photo: '' };

function Actions({ person, onEdit, onDelete }) {
    return <div className="team-actions"><button onClick={() => onEdit(person)} title="Edit member"><Edit2 /></button><button className="delete" onClick={() => onDelete(person)} title="Delete member"><Trash2 /></button></div>;
}

export default function CompanyTeam() {
    const [teams, setTeams] = useState(INITIAL);
    const [dialog, setDialog] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const total = Object.values(teams).reduce((sum, list) => sum + list.length, 0);
    const add = (department) => { setForm(EMPTY); setDialog({ department, mode: 'add' }); };
    const edit = (person) => { setForm({ name: person.name, designation: person.designation, phone: person.phone, email: person.email, location: person.location, photo: person.photo || '' }); setDialog({ department: person.department, mode: 'edit', id: person.id }); };
    const choosePhoto = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setForm(current => ({ ...current, photo: reader.result }));
        reader.readAsDataURL(file);
    };
    const remove = (person) => setTeams(current => ({ ...current, [person.department]: current[person.department].filter(item => item.id !== person.id) }));
    const save = (event) => {
        event.preventDefault();
        setTeams(current => ({ ...current, [dialog.department]: dialog.mode === 'edit' ? current[dialog.department].map(item => item.id === dialog.id ? { ...item, ...form } : item) : [...current[dialog.department], { ...form, id: Date.now(), department: dialog.department }] }));
        setDialog(null);
    };

    return <div className="team-page">
        <section className="team-banner"><div><span>Our people • Our strength • Our success</span><h1>Mohindra Mechanical Works</h1><p>One team building reliable machinery and lasting customer relationships.</p></div></section>
        <section className="team-kpis">
            <div><i><Users /></i><strong>{total}</strong><span>Total Employees</span></div><div><i><Building2 /></i><strong>{teams.Owners.length}</strong><span>Company Owners</span></div><div><i><Settings /></i><strong>{teams.Technical.length}</strong><span>Technical Staff</span></div><div><i><Handshake /></i><strong>{teams.Sales.length}</strong><span>Sales Team</span></div>
        </section>
        <div className="team-board">
            <section className="team-panel owner-panel"><header><div><Crown /><h2>Company Owners</h2></div></header><div className="owner-list">
                {teams.Owners.map(person => <article key={person.id}><img src={person.photo || '/founder.png'} alt={`${person.name} profile`} /><div><h3>{person.name}</h3><b>{person.designation}</b><a href={`mailto:${person.email}`}><Mail />{person.email}</a><a href={`tel:${person.phone}`}><Phone />{person.phone}</a><span><MapPin />{person.location}</span></div><Actions person={person} onEdit={edit} onDelete={remove} /></article>)}
            </div></section>
            {['Technical', 'Sales'].map(department => <section className="team-panel department-panel" key={department}><header><div>{department === 'Technical' ? <Settings /> : <TrendingUp />}<h2>{department} Department</h2></div><button onClick={() => add(department)}><Plus /> Add</button></header><div className="team-table-wrap"><table><thead><tr><th>S. No.</th><th>Profile</th><th>Employee</th><th>Designation</th><th>Contact details</th><th>Actions</th></tr></thead><tbody>{teams[department].map((person, index) => <tr key={person.id}><td>{index + 1}</td><td><div className="table-avatar">{person.photo ? <img src={person.photo} alt="" /> : person.name.split(' ').map(part => part[0]).slice(0, 2).join('')}</div></td><td><strong>{person.name}</strong><small><MapPin />{person.location}</small></td><td>{person.designation}</td><td><a href={`mailto:${person.email}`}><Mail />{person.email}</a><a href={`tel:${person.phone}`}><Phone />{person.phone}</a></td><td><Actions person={person} onEdit={edit} onDelete={remove} /></td></tr>)}</tbody></table></div></section>)}
            <section className="team-highlights"><div><Users /><strong>A Strong Team</strong><span>Builds a Stronger Future</span></div><div><h3><Factory /> Company Highlights</h3><p><CheckCircle2 /> Skilled & dedicated team</p><p><CheckCircle2 /> Excellence in manufacturing</p><p><CheckCircle2 /> Innovation & growth</p></div></section>
        </div>
        {dialog && <div className="team-dialog-backdrop" onMouseDown={e => e.target === e.currentTarget && setDialog(null)}><div className="team-dialog"><header><div><span>{dialog.department} department</span><h2>{dialog.mode === 'edit' ? 'Edit member details' : 'Add new member'}</h2></div><button onClick={() => setDialog(null)}><X /></button></header><form onSubmit={save}><div className="team-photo-field"><div className="team-photo-preview">{form.photo ? <img src={form.photo} alt="Preview" /> : <Users />}</div><label>Profile photo<input type="file" accept="image/*" onChange={choosePhoto} /><span>Choose image</span></label></div><div className="team-form-grid"><label>Full name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Designation<input required value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} /></label><label>Email address<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label><label>Phone number<input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label><label className="wide">Location<input required value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></label></div><footer><button type="button" className="btn" onClick={() => setDialog(null)}>Cancel</button><button className="btn btn-primary">{dialog.mode === 'edit' ? 'Save changes' : 'Add member'}</button></footer></form></div></div>}
    </div>;
}
