import { Knex } from 'knex'; // ^2.5.0
import { ID } from '../../core/types/common.types';

/**
 * Creates the progress table with optimized schema for tracking user achievements,
 * statistics, and word learning progress with high-performance considerations
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('progress', (table) => {
    // Primary key using UUID for better distribution and scalability
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // User relationship with cascading delete
    table.uuid('user_id')
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE')
      .index(); // Index for efficient relationship lookups

    // Core statistics with appropriate constraints
    table.integer('words_found')
      .notNullable()
      .defaultTo(0)
      .comment('Total number of words discovered by user');

    table.decimal('success_rate', 5, 2)
      .notNullable()
      .defaultTo(0)
      .comment('Word discovery success rate (0-100%)');

    table.integer('level')
      .notNullable()
      .defaultTo(1)
      .comment('User progression level');

    // Flexible JSON storage for achievements and favorites
    table.jsonb('achievements')
      .notNullable()
      .defaultTo('{}')
      .comment('User achievement data in flexible JSON format');

    table.jsonb('favorite_words')
      .notNullable()
      .defaultTo('[]')
      .comment('Array of favorite words with metadata');

    // Timestamps with timezone for accurate tracking
    table.timestamp('last_active', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now())
      .index() // Index for engagement queries
      .comment('Last user activity timestamp');

    table.timestamp('created_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.timestamp('updated_at', { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    // Create index on level for performance metrics queries
    table.index(['level'], 'idx_progress_level');

    // Add check constraints for data integrity
    table.check('?? >= 0 AND ?? <= 100', ['success_rate', 'success_rate'], 'chk_success_rate_range');
    table.check('?? >= 1', ['level'], 'chk_level_minimum');
  });

  // Create trigger for automatic updated_at timestamp
  await knex.raw(`
    CREATE TRIGGER set_progress_timestamp
    BEFORE UPDATE ON progress
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();
  `);
}

/**
 * Rolls back the progress table creation by dropping the table and its dependencies
 */
export async function down(knex: Knex): Promise<void> {
  // Drop trigger first
  await knex.raw('DROP TRIGGER IF EXISTS set_progress_timestamp ON progress');
  
  // Drop table with cascading constraints
  await knex.schema.dropTableIfExists('progress');
}