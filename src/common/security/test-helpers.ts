import { ExecutionContext } from '@nestjs/common';

export function makeHttpContext(
    req: Record<string, any>,
    res: Record<string, any> = {},
    handler: Function = function handler() { },
    cls: Function = class TestController { },
): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
        getHandler: () => handler,
        getClass: () => cls,
    } as unknown as ExecutionContext;
}
