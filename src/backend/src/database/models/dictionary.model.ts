/**
 * @fileoverview TypeORM entity model for dictionary word entries with multi-language support
 * @version 1.0.0
 */

import { Entity, Column, Index, PrimaryGeneratedColumn } from 'typeorm'; // ^0.3.0
import { IDictionaryWord } from '../../core/interfaces/dictionary.interface';
import { SUPPORTED_LANGUAGES } from '../../constants/languages';

/**
 * Dictionary word entity with optimized database indexing
 * Implements comprehensive word storage with linguistic metadata
 */
@Entity('dictionary')
@Index(['word', 'language'], { unique: true })
@Index(['language'])
@Index(['frequency'])
export class DictionaryModel implements IDictionaryWord {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    word: string;

    @Column({
        type: 'enum',
        enum: SUPPORTED_LANGUAGES,
        default: SUPPORTED_LANGUAGES.ENGLISH
    })
    language: SUPPORTED_LANGUAGES;

    @Column({ type: 'text' })
    definition: string;

    @Column({ type: 'varchar', length: 50 })
    partOfSpeech: string;

    @Column({ type: 'float', default: 0 })
    frequency: number;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ 
        type: 'timestamp', 
        default: () => 'CURRENT_TIMESTAMP',
        onUpdate: 'CURRENT_TIMESTAMP'
    })
    updatedAt: Date;

    /**
     * Creates a new dictionary word entry
     * @param data - Optional initialization data
     */
    constructor(data?: Partial<IDictionaryWord>) {
        this.id = 0;
        this.word = '';
        this.language = SUPPORTED_LANGUAGES.ENGLISH;
        this.definition = '';
        this.partOfSpeech = '';
        this.frequency = 0;
        this.createdAt = new Date();
        this.updatedAt = new Date();

        if (data) {
            // Apply provided data while ensuring word is lowercase and trimmed
            this.word = data.word?.toLowerCase().trim() ?? '';
            this.language = data.language ?? SUPPORTED_LANGUAGES.ENGLISH;
            this.definition = data.definition ?? '';
            this.partOfSpeech = data.partOfSpeech ?? '';
            this.frequency = data.frequency ?? 0;
        }
    }

    /**
     * Converts entity to JSON with calculated complexity
     * @returns Formatted dictionary word object with metadata
     */
    toJSON(): IDictionaryWord & { complexity: number } {
        // Calculate word complexity based on length and frequency
        const lengthComplexity = Math.min(this.word.length / 15, 1); // Max length considered is 15
        const frequencyFactor = 1 - Math.min(this.frequency, 1); // Inverse of frequency
        const complexity = (lengthComplexity + frequencyFactor) / 2;

        return {
            word: this.word,
            language: this.language,
            definition: this.definition,
            partOfSpeech: this.partOfSpeech,
            frequency: this.frequency,
            complexity: Number(complexity.toFixed(2)),
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }
}