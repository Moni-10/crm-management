import { mapsLink } from './maps';

// WhatsApp-ready messages about a party. *text* is bold in WhatsApp.

export const SHARE_FIELDS = [
    { key: 'company', label: 'Company' },
    { key: 'contact', label: 'Contact person' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'whatsapp', label: 'WhatsApp number' },
    { key: 'email', label: 'Email' },
    { key: 'salesperson', label: 'Salesperson' },
    { key: 'address', label: 'Address' },
    { key: 'maps', label: 'Maps link' },
    { key: 'machines', label: 'Machines' }
];

const FOOTER = '\n\n_Sent from MMW Sales CRM_';

const lines = (list) => list.filter(Boolean).join('\n');
const machineLines = (party) => (party.machines || []).map((m) => `• ${m.name}${m.model ? ` (${m.model})` : ''} x ${m.quantity}`).join('\n');

export const SHARE_TYPES = [
    { id: 'complete', label: 'Complete details', description: 'Contact, address, machines and map link' },
    { id: 'location', label: 'Location only', description: 'Address and directions link' },
    { id: 'contact', label: 'Contact only', description: 'Name and phone numbers' },
    { id: 'custom', label: 'Choose what to include', description: 'Tick the fields you want' }
];

export function buildShareMessage(party, type, fields = SHARE_FIELDS.map((f) => f.key)) {
    const link = mapsLink(party);

    if (type === 'location') {
        return lines([
            `*${party.companyName}*`,
            party.locationName && `Landmark: ${party.locationName}`,
            party.fullAddress && `Address: ${party.fullAddress}`,
            link && `\nDirections:\n${link}`
        ]) + FOOTER;
    }

    if (type === 'contact') {
        return lines([
            `*${party.companyName}*`,
            party.partyName && `Contact: ${party.partyName}`,
            party.primaryMobile && `Phone: ${party.primaryMobile}`,
            party.whatsappNumber && `WhatsApp: ${party.whatsappNumber}`
        ]) + FOOTER;
    }

    const wanted = type === 'complete' ? SHARE_FIELDS.map((f) => f.key) : fields;
    const has = (key) => wanted.includes(key);
    return lines([
        has('company') && `*${party.companyName}*`,
        has('contact') && party.partyName && `Contact: ${party.partyName}`,
        has('mobile') && party.primaryMobile && `Mobile: ${party.primaryMobile}`,
        has('whatsapp') && party.whatsappNumber && `WhatsApp: ${party.whatsappNumber}`,
        has('email') && party.email && `Email: ${party.email}`,
        has('salesperson') && party.salespersonName && `Salesperson: ${party.salespersonName}`,
        has('address') && party.fullAddress && `\nAddress: ${party.fullAddress}`,
        has('maps') && link && `Maps: ${link}`,
        has('machines') && party.machines?.length > 0 && `\n*Machines*\n${machineLines(party)}`
    ]) + FOOTER;
}
