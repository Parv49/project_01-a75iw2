/**
 * @fileoverview Database migration script for creating the initial users table
 * Implements comprehensive user profile management with multi-language support
 * and high-precision progress tracking
 * @version 1.0.0
 */

import { Knex } from 'knex'; // ^2.5.0
import { IUser, IUserPreferences, IUserProgress } from '../../core/interfaces/user.interface';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

const TABLE_NAME = 'users';

/**
 * Migration to create the users table with comprehensive schema
 */
export async function up(knex: Knex): Promise<void> {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await knex.schema.createTable(TABLE_NAME, (table) => {
        // Primary key and identification
        table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
        table.string('username', 50).unique().notNullable();
        table.string('email', 255).unique().notNullable();

        // User preferences as JSONB for flexible schema evolution
        table.jsonb('preferences').notNullable().defaultTo(JSON.stringify({
            language: SUPPORTED_LANGUAGES.ENGLISH,
            defaultWordLength: 5,
            showDefinitions: true,
            advancedMode: false
        }));

        // Progress tracking with high precision
        table.jsonb('progress').notNullable().defaultTo(JSON.stringify({
            wordsFound: 0,
            successRate: 0,
            level: 1,
            achievements: [],
            favoriteWords: [],
            lastActive: new Date().toISOString()
        }));

        // Timestamps
        table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
        table.timestamp('last_active').notNullable().defaultTo(knex.fn.now());

        // Soft delete flag
        table.boolean('is_active').notNullable().defaultTo(true);
    });

    // Create indexes for optimized queries
    await knex.raw(`
        CREATE INDEX idx_users_username ON ${TABLE_NAME} USING btree (username);
        CREATE INDEX idx_users_email ON ${TABLE_NAME} USING btree (email);
        CREATE INDEX idx_users_last_active ON ${TABLE_NAME} USING btree (last_active) WHERE is_active = true;
        CREATE INDEX idx_users_language ON ${TABLE_NAME} USING gin ((preferences->>'language'));
    `);

    // Add check constraints for data integrity
    await knex.raw(`
        ALTER TABLE ${TABLE_NAME}
        ADD CONSTRAINT chk_users_language 
        CHECK (
            preferences->>'language' IN (
                '${SUPPORTED_LANGUAGES.ENGLISH}',
                '${SUPPORTED_LANGUAGES.SPANISH}',
                '${SUPPORTED_LANGUAGES.FRENCH}',
                '${SUPPORTED_LANGUAGES.GERMAN}'
            )
        );
    `);

    // Create trigger for updating updated_at timestamp
    await knex.raw(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON ${TABLE_NAME}
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    `);

    // Add JSON schema validation
    await knex.raw(`
        ALTER TABLE ${TABLE_NAME}
        ADD CONSTRAINT chk_users_preferences_schema
        CHECK (
            jsonb_typeof(preferences) = 'object'
            AND preferences ? 'language'
            AND preferences ? 'defaultWordLength'
            AND preferences ? 'showDefinitions'
            AND preferences ? 'advancedMode'
        );

        ALTER TABLE ${TABLE_NAME}
        ADD CONSTRAINT chk_users_progress_schema
        CHECK (
            jsonb_typeof(progress) = 'object'
            AND progress ? 'wordsFound'
            AND progress ? 'successRate'
            AND progress ? 'level'
            AND progress ? 'achievements'
            AND progress ? 'favoriteWords'
            AND progress ? 'lastActive'
        );
    `);
}

/**
 * Rollback migration for the users table
 */
export async function down(knex: Knex): Promise<void> {
    // Drop triggers first
    await knex.raw(`
        DROP TRIGGER IF EXISTS update_users_updated_at ON ${TABLE_NAME};
        DROP FUNCTION IF EXISTS update_updated_at_column();
    `);

    // Drop indexes
    await knex.raw(`
        DROP INDEX IF EXISTS idx_users_username;
        DROP INDEX IF EXISTS idx_users_email;
        DROP INDEX IF EXISTS idx_users_last_active;
        DROP INDEX IF EXISTS idx_users_language;
    `);

    // Drop the table
    await knex.schema.dropTableIfExists(TABLE_NAME);
}

export default { up, down };