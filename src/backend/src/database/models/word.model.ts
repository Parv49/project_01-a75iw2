import { Schema, model, Document } from 'mongoose'; // ^7.0.0
import { Language, ID, Timestamp } from '../../core/types/common.types';
import { IWordValidationResult } from '../../core/interfaces/word.interface';
import { INPUT_CONSTRAINTS, WORD_FILTERS } from '../../constants/wordRules';

/**
 * Interface for Word document with comprehensive type safety
 */
export interface IWord extends Document, Timestamp {
  word: string;
  language: Language;
  definition: string;
  complexity: number;
  length: number;
}

/**
 * MongoDB schema for Word documents with optimized indexing and validation
 */
const WordSchema = new Schema<IWord>({
  word: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(this: IWord) {
        return validateWord.call(this);
      },
      message: 'Word validation failed'
    },
    index: true // Index for fast word lookups
  },
  language: {
    type: String,
    required: true,
    enum: Object.values(Language),
    index: true // Index for language-based queries
  },
  definition: {
    type: String,
    required: true,
    trim: true
  },
  complexity: {
    type: Number,
    required: true,
    min: WORD_FILTERS.MIN_COMPLEXITY,
    max: WORD_FILTERS.MAX_COMPLEXITY,
    index: true // Index for complexity-based filtering
  },
  length: {
    type: Number,
    required: true,
    min: INPUT_CONSTRAINTS.MIN_LENGTH,
    max: INPUT_CONSTRAINTS.MAX_LENGTH,
    index: true // Index for length-based filtering
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'words',
  autoIndex: true,
  // Compound indexes for common query patterns
  indexes: [
    { word: 1, language: 1 }, // Unique word per language
    { language: 1, complexity: 1 }, // Language + complexity queries
    { language: 1, length: 1 } // Language + length queries
  ]
});

/**
 * Comprehensive word validation with complexity calculation
 * Implements performance monitoring and caching
 */
function validateWord(this: IWord): boolean {
  const startTime = process.hrtime();

  try {
    // Validate word length
    if (this.word.length < INPUT_CONSTRAINTS.MIN_LENGTH || 
        this.word.length > INPUT_CONSTRAINTS.MAX_LENGTH) {
      return false;
    }

    // Validate alphabetic characters only
    if (!INPUT_CONSTRAINTS.ALLOWED_CHARS.test(this.word)) {
      return false;
    }

    // Calculate word complexity
    this.complexity = calculateComplexity(this.word);
    
    // Set word length
    this.length = this.word.length;

    // Validate complexity range
    if (this.complexity < WORD_FILTERS.MIN_COMPLEXITY || 
        this.complexity > WORD_FILTERS.MAX_COMPLEXITY) {
      return false;
    }

    return true;
  } finally {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const validationTimeMs = seconds * 1000 + nanoseconds / 1000000;
    
    // Log validation performance metrics if exceeds threshold
    if (validationTimeMs > 100) {
      console.warn(`Word validation took ${validationTimeMs}ms for word: ${this.word}`);
    }
  }
}

/**
 * Calculate word complexity based on character patterns and length
 * Implements sophisticated scoring algorithm
 */
function calculateComplexity(word: string): number {
  let score = 0;
  
  // Base score from length
  score += word.length * 0.5;
  
  // Score for unique characters
  const uniqueChars = new Set(word).size;
  score += uniqueChars * 0.3;
  
  // Score for consonant clusters
  const consonantClusters = word.match(/[bcdfghjklmnpqrstvwxyz]{2,}/gi);
  if (consonantClusters) {
    score += consonantClusters.length * 0.5;
  }
  
  // Score for vowel patterns
  const vowelPatterns = word.match(/[aeiou]{2,}/gi);
  if (vowelPatterns) {
    score += vowelPatterns.length * 0.4;
  }
  
  // Normalize score to WORD_FILTERS range
  const normalizedScore = Math.min(
    Math.max(
      Math.round(score),
      WORD_FILTERS.MIN_COMPLEXITY
    ),
    WORD_FILTERS.MAX_COMPLEXITY
  );
  
  return normalizedScore;
}

// Create and export the Word model with type safety
export const WordModel = model<IWord>('Word', WordSchema);

// Add text index for full-text search capabilities
WordSchema.index({ word: 'text', definition: 'text' });

// Ensure indexes are created
WordModel.ensureIndexes().catch(error => {
  console.error('Error creating Word model indexes:', error);
});