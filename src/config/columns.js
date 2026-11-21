// Column definitions shared by Bulk Upload (import) and Export to Excel.
//   key       - field name sent to the API when importing
//   label     - header shown in the template / exported file
//   exportKey - field read from the record when exporting, if it differs from `key`
//               (e.g. the "Salesperson" column is imported by name but exported from salespersonName)

export const SALESPERSON_COLUMNS = [
    { key: 'fullName', label: 'Full Name', required: true, example: 'Rahul Sharma' },
    { key: 'mobile', label: 'Mobile', required: true, example: '9876543210' },
    { key: 'whatsapp', label: 'WhatsApp Number', example: '9876543210' },
    { key: 'nickname', label: 'Nickname', example: 'Rahul' },
    { key: 'email', label: 'Email', example: 'rahul@mmw.com' },
    { key: 'department', label: 'Department', example: 'Sales' },
    { key: 'employeeId', label: 'Employee ID', example: 'EMP001' }
];

export const PARTY_COLUMNS = [
    { key: 'companyName', label: 'Company Name', required: true, example: 'ABC Industries' },
    { key: 'partyName', label: 'Party Name', required: true, example: 'Ramesh Kumar' },
    { key: 'primaryMobile', label: 'Primary Mobile', required: true, example: '9876543210' },
    { key: 'partyNickname', label: 'Nickname', example: 'Ramesh' },
    { key: 'alternativeNames', label: 'Alternative Names', example: 'ABC Inds, A.B.C.' },
    { key: 'alternativeMobile', label: 'Alternative Mobile', example: '' },
    { key: 'whatsappNumber', label: 'WhatsApp Number', example: '9876543210' },
    { key: 'email', label: 'Email', example: 'ramesh@abc.com' },
    { key: 'partyType', label: 'Party Type', example: 'Customer' },
    { key: 'salesperson', exportKey: 'salespersonName', label: 'Salesperson', example: 'Rahul Sharma' },
    { key: 'partyStatus', label: 'Status', example: 'Active' },
    { key: 'followUpDate', label: 'Follow Up Date', example: '2026-11-15' },
    { key: 'fullAddress', label: 'Full Address', example: 'Plot 5, Industrial Area' },
    { key: 'area', label: 'Area', example: 'Phase 2' },
    { key: 'city', label: 'City', example: 'Ludhiana' },
    { key: 'district', label: 'District', example: 'Ludhiana' },
    { key: 'state', label: 'State', example: 'Punjab' },
    { key: 'pincode', label: 'Pincode', example: '141003' },
    { key: 'locationName', label: 'Location Name', example: '' },
    { key: 'mapsUrl', label: 'Maps URL', example: '' },
    { key: 'clientRequirements', label: 'Client Requirements', example: '' },
    { key: 'remarks', label: 'Remarks', example: '' }
];

export const MACHINE_COLUMNS = [
    { key: 'name', label: 'Machine Name', required: true, example: 'Hydraulic Press' },
    { key: 'category', label: 'Category', example: 'Press' },
    { key: 'model', label: 'Model', example: 'HP-200' },
    { key: 'quantity', label: 'Quantity', example: '1' },
    { key: 'purchaseDate', label: 'Purchase Date', example: '2026-01-15' },
    { key: 'party', exportKey: 'partyName', label: 'Party', example: 'ABC Industries' }
];

// Export only (quotations are created through the quotation form).
export const QUOTATION_COLUMNS = [
    { key: 'quotationNumber', label: 'Quotation No' },
    { key: 'quotationDate', label: 'Date' },
    { key: 'companyName', label: 'Company' },
    { key: 'partyName', label: 'Party Name' },
    { key: 'mobile', label: 'Mobile' },
    { key: 'address', label: 'Address' },
    { key: 'salespersonName', label: 'Salesperson' },
    { key: 'status', label: 'Status' },
    { key: 'gstTax', label: 'GST %', type: 'number' },
    { key: 'discount', label: 'Discount', type: 'number' },
    { key: 'validityDate', label: 'Valid Until' },
    { key: 'totalAmount', label: 'Total Amount', type: 'number' },
    { key: 'paymentTerms', label: 'Payment Terms' },
    { key: 'deliveryTerms', label: 'Delivery Terms' },
    { key: 'notes', label: 'Notes' }
];

export const QUOTATION_ITEM_COLUMNS = [
    { key: 'quotationNumber', label: 'Quotation No' },
    { key: 'machineName', label: 'Machine' },
    { key: 'machineModel', label: 'Model' },
    { key: 'specifications', label: 'Specifications' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'unitPrice', label: 'Unit Price', type: 'number' },
    { key: 'amount', label: 'Amount', type: 'number' }
];

export const LEAD_COLUMNS = [
    { key: 'companyName', label: 'Company / Lead', required: true, example: 'ABC Packaging' },
    { key: 'contactPerson', label: 'Contact Person', example: 'Ramesh Kumar' },
    { key: 'mobile', label: 'Mobile', example: '9876543210' },
    { key: 'email', label: 'Email', example: 'ramesh@abc.com' },
    { key: 'machineInterest', label: 'Machine Interest', example: 'Paper bag making machine' },
    { key: 'city', label: 'City', example: 'Delhi' },
    { key: 'state', label: 'State', example: 'Delhi' },
    { key: 'source', label: 'Source', example: 'Manual' },
    { key: 'status', label: 'Status', example: 'New' },
    { key: 'followUpDate', label: 'Follow Up Date', example: '2026-11-25' },
    { key: 'salesperson', exportKey: 'salespersonName', label: 'Assigned To', example: 'Pooja' },
    { key: 'notes', label: 'Notes', example: '' }
];
