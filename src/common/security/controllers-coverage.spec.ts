jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class { } }));

import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import * as fs from 'fs';
import * as path from 'path';
import { ALL_PERMISSIONS } from './permissions';
import { IS_PUBLIC_KEY, PERMISSIONS_KEY } from './decorators';

function controllerFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) return controllerFiles(full);
        return e.name.endsWith('.controller.ts') ? [full] : [];
    });
}

describe('every route is protected', () => {
    const files = controllerFiles(path.join(__dirname, '..', '..'));
    const controllers = files.flatMap(f => Object.values(require(f)).filter((v: any) => typeof v === 'function' && Reflect.hasMetadata(PATH_METADATA, v))) as Function[];

    it('finds the controllers', () => {
        expect(controllers.length).toBeGreaterThanOrEqual(20);
    });

    it('requires a permission, or is explicitly @Public, or is a deliberate "any logged-in user" route', () => {
        // Routes where being authenticated is the whole requirement.
        const authenticatedOnly = new Set(['AuthController.logout', 'AuthController.me']);
        const offenders: string[] = [];

        for (const controller of controllers) {
            const classPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller);
            const classPerms = Reflect.getMetadata(PERMISSIONS_KEY, controller);
            for (const name of Object.getOwnPropertyNames(controller.prototype)) {
                const handler = controller.prototype[name];
                if (name === 'constructor' || Reflect.getMetadata(METHOD_METADATA, handler) === undefined) continue;
                const isPublic = classPublic || Reflect.getMetadata(IS_PUBLIC_KEY, handler);
                const perms = Reflect.getMetadata(PERMISSIONS_KEY, handler) ?? classPerms;
                const id = `${controller.name}.${name}`;
                if (!isPublic && !(perms?.length) && !authenticatedOnly.has(id)) offenders.push(id);
            }
        }
        expect(offenders).toEqual([]);
    });

    it('only names permissions that exist', () => {
        const unknown: string[] = [];
        for (const controller of controllers) {
            const all = [Reflect.getMetadata(PERMISSIONS_KEY, controller) ?? [], ...Object.getOwnPropertyNames(controller.prototype)
                .map(n => Reflect.getMetadata(PERMISSIONS_KEY, controller.prototype[n]) ?? [])].flat() as string[];
            for (const code of all) if (!ALL_PERMISSIONS.includes(code)) unknown.push(`${controller.name}: ${code}`);
        }
        expect(unknown).toEqual([]);
    });

    it('uses write permissions for mutating verbs and read for GET', () => {
        const wrong: string[] = [];
        for (const controller of controllers) {
            for (const name of Object.getOwnPropertyNames(controller.prototype)) {
                const handler = controller.prototype[name];
                const method = Reflect.getMetadata(METHOD_METADATA, handler);
                const perms: string[] | undefined = Reflect.getMetadata(PERMISSIONS_KEY, handler);
                if (method === undefined || !perms) continue;
                const isGet = method === RequestMethod.GET;
                if (isGet && perms.some(p => /\.(write|delete|run|confirm|manage)$/.test(p))) wrong.push(`${controller.name}.${name}`);
                if (!isGet && perms.every(p => p.endsWith('.read'))) wrong.push(`${controller.name}.${name}`);
            }
        }
        expect(wrong).toEqual([]);
    });
});
