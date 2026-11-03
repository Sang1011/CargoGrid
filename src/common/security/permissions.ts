// No imports on purpose: the seed script (ts-node) loads this file directly.

export const RESOURCES = [
    'cargo-items',
    'inbound-shipments',
    'location-nodes',
    'movements',
    'outbound-order-items',
    'outbound-orders',
    'products',
    'road-edges',
    'scenarios',
    'shipment-items',
    'storage-slots',
    'transfer-order-items',
    'transfer-orders',
    'vehicles',
    'warehouse-incidents',
    'warehouses',
    'zones',
] as const;

export type PermissionAction = 'read' | 'write' | 'delete';
const ACTIONS: PermissionAction[] = ['read', 'write', 'delete'];

export const perm = (resource: string, action: PermissionAction): string => `${resource}.${action}`;

export const SPECIAL_PERMISSIONS = [
    'allocation.read',
    'allocation.run',
    // Kept separate from `allocation.run`: whoever proposes a plan is not automatically allowed to apply it.
    'allocation.confirm',
    // Start and complete a movement: the people physically moving cargo, as opposed to those who plan it.
    'movements.execute',
    'audit.read',
    'users.manage',
] as const;

export const ALL_PERMISSIONS: string[] = [
    ...RESOURCES.flatMap(r => ACTIONS.map(a => perm(r, a))),
    ...SPECIAL_PERMISSIONS,
];

const readAll = RESOURCES.map(r => perm(r, 'read'));
const writeOn = (...resources: string[]) => resources.map(r => perm(r, 'write'));

export const ROLE_DESCRIPTIONS: Record<string, string> = {
    admin: 'Full access, including user management',
    ops_manager: 'Runs and confirms allocation, manages all operational data',
    warehouse_operator: 'Receives and moves cargo inside warehouses',
    gate_operator: 'Handles gate and outbound documents',
    dispatcher: 'Plans transfers and outbound orders, can propose allocations',
    accountant: 'Read-only access for billing and reporting',
};

export const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: ALL_PERMISSIONS,
    ops_manager: [
        ...readAll,
        ...RESOURCES.flatMap(r => [perm(r, 'write'), perm(r, 'delete')]),
        'allocation.read',
        'allocation.run',
        'allocation.confirm',
        'movements.execute',
        'audit.read',
    ],
    warehouse_operator: [
        ...readAll,
        ...writeOn('cargo-items', 'inbound-shipments', 'shipment-items', 'transfer-orders', 'transfer-order-items'),
        'movements.execute',
        'allocation.read',
    ],
    gate_operator: [
        ...readAll,
        ...writeOn('outbound-orders', 'outbound-order-items', 'inbound-shipments'),
        'movements.execute',
    ],
    dispatcher: [
        ...readAll,
        ...writeOn('transfer-orders', 'transfer-order-items', 'outbound-orders', 'outbound-order-items', 'vehicles', 'movements'),
        'allocation.read',
        'allocation.run',
    ],
    accountant: [...readAll, 'allocation.read', 'audit.read'],
};
