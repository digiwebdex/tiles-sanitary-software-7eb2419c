import type { Knex } from 'knex';

/**
 * Phase 1 — VPS auth hardening.
 *
 * Adds:
 *   - login_attempts: tracks failed logins per email/ip for lockout
 *   - password_reset_tokens: one-time hashed tokens for password reset
 *   - revoked_at column on refresh_tokens (explicit revocation audit)
 *
 * Safe to run on existing databases — only adds new tables/columns.
 */
export async function up(knex: Knex): Promise<void> {
  const hasLoginAttempts = await knex.schema.hasTable('login_attempts');
  if (!hasLoginAttempts) {
    await knex.schema.createTable('login_attempts', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('email', 255).notNullable();
      t.string('ip_address', 64);
      t.boolean('is_locked').notNullable().defaultTo(false);
      t.timestamp('locked_until', { useTz: true });
      t.timestamp('attempted_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.index('email');
      t.index(['email', 'attempted_at']);
    });
  }

  const hasResetTokens = await knex.schema.hasTable('password_reset_tokens');
  if (!hasResetTokens) {
    await knex.schema.createTable('password_reset_tokens', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('token_hash', 255).notNullable().unique();
      t.timestamp('expires_at', { useTz: true }).notNullable();
      t.timestamp('used_at', { useTz: true });
      t.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      t.index('user_id');
    });
  }

  const hasRevokedAt = await knex.schema.hasColumn('refresh_tokens', 'revoked_at');
  if (!hasRevokedAt) {
    await knex.schema.alterTable('refresh_tokens', (t) => {
      t.timestamp('revoked_at', { useTz: true });
      t.uuid('replaced_by'); // id of the token issued in rotation
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_reset_tokens');
  await knex.schema.dropTableIfExists('login_attempts');
  const hasRevokedAt = await knex.schema.hasColumn('refresh_tokens', 'revoked_at');
  if (hasRevokedAt) {
    await knex.schema.alterTable('refresh_tokens', (t) => {
      t.dropColumn('revoked_at');
      t.dropColumn('replaced_by');
    });
  }
}
