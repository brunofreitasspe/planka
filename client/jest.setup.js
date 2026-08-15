// Force test environment so React renders in development mode even when the
// parent shell exports NODE_ENV=production (breaks act()/dev-mode rendering).
process.env.NODE_ENV = 'test';
