import { MovementStatus } from 'src/common/enums';

/**
 * The only place that says which status changes are legal (BR-02).
 *
 *   created ──► reserved ──► in_transit ──► completed
 *      │           │             │
 *      └───────────┴─────────────┴──► cancelled
 *
 * `completed` and `cancelled` are final.
 */
export const MOVEMENT_TRANSITIONS: Readonly<Record<MovementStatus, readonly MovementStatus[]>> = {
    [MovementStatus.CREATED]: [MovementStatus.RESERVED, MovementStatus.CANCELLED],
    [MovementStatus.RESERVED]: [MovementStatus.IN_TRANSIT, MovementStatus.CANCELLED],
    [MovementStatus.IN_TRANSIT]: [MovementStatus.COMPLETED, MovementStatus.CANCELLED],
    [MovementStatus.COMPLETED]: [],
    [MovementStatus.CANCELLED]: [],
};

/** Statuses in which a movement still holds (or may hold) the cargo and a destination slot. */
export const OPEN_MOVEMENT_STATUSES: readonly MovementStatus[] = [
    MovementStatus.CREATED,
    MovementStatus.RESERVED,
    MovementStatus.IN_TRANSIT,
];

export class InvalidMovementTransitionError extends Error {
    constructor(
        readonly from: MovementStatus,
        readonly to: MovementStatus,
    ) {
        super(`Movement cannot go from '${from}' to '${to}'`);
        this.name = 'InvalidMovementTransitionError';
    }
}

export function canTransition(from: MovementStatus, to: MovementStatus): boolean {
    return MOVEMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: MovementStatus, to: MovementStatus): void {
    if (!canTransition(from, to)) throw new InvalidMovementTransitionError(from, to);
}

export function isOpen(status: MovementStatus): boolean {
    return OPEN_MOVEMENT_STATUSES.includes(status);
}
