// Google Maps links for a party. Prefers the saved maps link, then GPS coordinates, then the address.

const hasCoordinates = (party) => party.latitude !== '' && party.longitude !== '' && party.latitude != null && party.longitude != null;

export function mapsLink(party) {
    if (party.mapsUrl) return party.mapsUrl;
    if (hasCoordinates(party)) return `https://www.google.com/maps/search/?api=1&query=${party.latitude},${party.longitude}`;
    if (party.fullAddress) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(party.fullAddress)}`;
    return '';
}

export function directionsLink(party) {
    let destination = '';
    if (hasCoordinates(party)) destination = `${party.latitude},${party.longitude}`;
    else if (party.fullAddress) destination = encodeURIComponent(party.fullAddress);
    return destination ? `https://www.google.com/maps/dir/?api=1&destination=${destination}` : '';
}
