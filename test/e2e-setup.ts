// Runs before each e2e file; AppModule refuses to start without a JWT secret.
import 'dotenv/config';

process.env.JWT_SECRET ??= 'e2e-test-secret-0123456789abcdef';
