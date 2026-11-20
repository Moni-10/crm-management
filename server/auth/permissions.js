// Single source of truth for what can be permitted. Roles store permission codes ("parties.edit");
// adding a module here needs no database migration. Admin always has every permission.
export const ACTION_LABELS = {
    view: 'View', create: 'Add', edit: 'Edit', delete: 'Delete', import: 'Import', export: 'Export', manage: 'Manage'
};

export const MODULES = [
    { key: 'parties', label: 'Parties', actions: ['view', 'create', 'edit', 'delete', 'import', 'export'] },
    { key: 'salespersons', label: 'Salespersons', actions: ['view', 'create', 'edit', 'delete', 'import', 'export'] },
    { key: 'machines', label: 'Machines', actions: ['view', 'create', 'edit', 'delete', 'import', 'export'] },
    { key: 'quotations', label: 'Quotations', actions: ['view', 'create', 'edit', 'delete', 'import', 'export'] },
    { key: 'calendar', label: 'Calendar & events', actions: ['view', 'create', 'edit', 'delete'] },
    { key: 'leads', label: 'Leads (Excel records)', actions: ['view', 'export'] },
    { key: 'calls', label: 'Calling Data', actions: ['view', 'create', 'edit', 'delete', 'import', 'export'] },
    { key: 'followups', label: 'Follow-ups', actions: ['view'] },
    { key: 'reports', label: 'Reports', actions: ['view', 'export'] },
    { key: 'company', label: 'Company profile & team', actions: ['view', 'edit'] },
    { key: 'backup', label: 'Backup & restore', actions: ['view', 'import'] },
    { key: 'users', label: 'Users', actions: ['manage'] },
    { key: 'roles', label: 'Roles & permissions', actions: ['manage'] }
];

export const ALL_PERMISSIONS = MODULES.flatMap((m) => m.actions.map((a) => `${m.key}.${a}`));
export const isValidPermission = (code) => ALL_PERMISSIONS.includes(code);

// REST resource name -> permission module (they differ for events).
export const RESOURCE_MODULE = { events: 'calendar' };
export const moduleOfResource = (name) => RESOURCE_MODULE[name] || name;
