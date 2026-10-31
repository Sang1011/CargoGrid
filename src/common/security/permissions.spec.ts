import { ALL_PERMISSIONS, RESOURCES, ROLE_PERMISSIONS, perm } from './permissions';

describe('permission matrix', () => {
    it('only grants permissions that exist', () => {
        for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
            for (const code of codes) {
                expect({ role, code, known: ALL_PERMISSIONS.includes(code) }).toEqual({ role, code, known: true });
            }
        }
    });

    it('gives admin every permission', () => {
        expect(new Set(ROLE_PERMISSIONS.admin)).toEqual(new Set(ALL_PERMISSIONS));
    });

    it('separates running an allocation from confirming it', () => {
        expect(ROLE_PERMISSIONS.dispatcher).toContain('allocation.run');
        expect(ROLE_PERMISSIONS.dispatcher).not.toContain('allocation.confirm');
        expect(ROLE_PERMISSIONS.ops_manager).toContain('allocation.confirm');
    });

    it('keeps user management and deletes away from non-managers', () => {
        for (const role of ['warehouse_operator', 'gate_operator', 'dispatcher', 'accountant']) {
            expect(ROLE_PERMISSIONS[role]).not.toContain('users.manage');
            expect(ROLE_PERMISSIONS[role].some(c => c.endsWith('.delete'))).toBe(false);
        }
        expect(ROLE_PERMISSIONS.ops_manager).not.toContain('users.manage');
    });

    it('makes accountant strictly read-only', () => {
        expect(ROLE_PERMISSIONS.accountant.some(c => c.endsWith('.write') || c.endsWith('.delete'))).toBe(false);
        expect(ROLE_PERMISSIONS.accountant).toContain(perm(RESOURCES[0], 'read'));
    });
});
