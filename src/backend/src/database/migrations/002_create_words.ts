import { Knex } from 'knex'; // ^2.5.0
import { Language } from '../../core/types/common.types';
import { INPUT_CONSTRAINTS, WORD_FILTERS } from '../../constants/wordRules';

/**
 * Migration to create the words table for storing dictionary words
 * Implements schema for F-003 Dictionary Validation and F-004 Word Definition Display
 * Supports multi-language functionality as per Implementation Boundaries
 */
export async function up(knex: Knex): Promise<void> {
  // Enable UUID generation
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

  // Create enum type for languages if not exists
  await knex.raw(`
    DO $$ 
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'language') THEN
        CREATE TYPE language AS ENUM ('en', 'es', 'fr', 'de');
      END IF;
    END $$;
  `);

  // Create words table
  await knex.schema.createTable('words', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));

    // Core word data
    table.string('word', 50).notNullable();
    table.specificType('language', 'language').notNullable();
    table.text('definition');

    // Word metrics
    table.decimal('complexity', 3, 1)
      .notNullable()
      .checkBetween([WORD_FILTERS.MIN_COMPLEXITY, WORD_FILTERS.MAX_COMPLEXITY]);
    
    table.integer('length')
      .notNullable()
      .checkBetween([INPUT_CONSTRAINTS.MIN_LENGTH, INPUT_CONSTRAINTS.MAX_LENGTH]);

    // Metadata
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Constraints
    table.unique(['word', 'language']);
  });

  // Create indexes for performance optimization
  await knex.schema.raw(`
    CREATE INDEX idx_words_length ON words USING btree (length);
    CREATE INDEX idx_words_complexity ON words USING btree (complexity);
    CREATE INDEX idx_words_language ON words USING btree (language);
  `);

  // Create trigger for automatic updated_at updates
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    CREATE TRIGGER update_words_updated_at
      BEFORE UPDATE ON words
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `);
}

/**
 * Rollback migration by dropping the words table and related objects
 */
export async function down(knex: Knex): Promise<void> {
  // Drop triggers
  await knex.raw(`
    DROP TRIGGER IF EXISTS update_words_updated_at ON words;
    DROP FUNCTION IF EXISTS update_updated_at_column();
  `);

  // Drop table
  await knex.schema.dropTableIfExists('words');

  // Drop custom types
  await knex.raw(`
    DROP TYPE IF EXISTS language;
  `);

  // Disable UUID extension if no other tables need it
  // Note: Comment out if other tables use UUID
  // await knex.raw('DROP EXTENSION IF EXISTS "uuid-ossp"');
}