import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MovementService } from './movement.service';

/**
 * Releases slots held by reservations nobody started (BR-08). Runs every
 * MOVEMENT_EXPIRY_INTERVAL_SECONDS (default 60); 0 turns it off, and it is off under tests.
 */
@Injectable()
export class MovementExpiryScheduler implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(MovementExpiryScheduler.name);
    private timer?: NodeJS.Timeout;
    private running = false;

    constructor(private readonly movements: MovementService) { }

    onModuleInit(): void {
        const fallback = process.env.NODE_ENV === 'test' ? 0 : 60;
        const seconds = Number(process.env.MOVEMENT_EXPIRY_INTERVAL_SECONDS ?? fallback);
        if (!(seconds > 0)) return;
        this.timer = setInterval(() => void this.tick(), seconds * 1000);
        this.timer.unref();
    }

    onModuleDestroy(): void {
        if (this.timer) clearInterval(this.timer);
    }

    async tick(): Promise<number> {
        if (this.running) return 0; // never overlap with a run that is still going
        this.running = true;
        try {
            const expired = await this.movements.expireOverdue();
            if (expired > 0) this.logger.log(`Expired ${expired} unstarted reservation(s)`);
            return expired;
        } catch (err) {
            this.logger.error(`Reservation expiry failed: ${(err as Error).message}`);
            return 0;
        } finally {
            this.running = false;
        }
    }
}
