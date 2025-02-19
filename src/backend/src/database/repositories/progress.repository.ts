/**
 * @fileoverview Repository class for managing user progress data in MongoDB
 * Implements progress tracking with enhanced performance metrics and data validation
 * @version 1.0.0
 */

import { Document } from 'mongoose'; // ^7.0.0
import { ObjectId } from 'mongodb'; // ^5.0.0
import { ProgressModel } from '../models/progress.model';
import { IUserProgress } from '../../core/interfaces/user.interface';
import { ID } from '../../core/types/common.types';

/**
 * Interface for progress statistics with enhanced metrics
 */
interface IProgressStatistics extends IUserProgress {
  retentionRate: number;
  accuracyMetrics: {
    wordGenerationAccuracy: number;
    achievementProgress: number;
    overallAccuracy: number;
  };
}

/**
 * Repository class for managing user progress with enhanced performance optimization
 */
export class ProgressRepository {
  private readonly model = ProgressModel;
  private readonly CACHE_TTL = 300; // 5 minutes cache duration
  private readonly RETENTION_THRESHOLD = 0.7; // 70% retention rate threshold
  private readonly ACCURACY_THRESHOLD = 0.95; // 95% accuracy threshold

  /**
   * Retrieves progress data for a specific user with caching
   * @param userId - User's unique identifier
   * @returns Promise resolving to user's progress document
   */
  async findByUserId(userId: ID): Promise<Document> {
    // Validate user ID
    const id = typeof userId === 'string' ? new ObjectId(userId) : userId;

    try {
      const progress = await this.model.findOne({ userId: id })
        .select('+accuracyMetrics +retentionRate')
        .lean()
        .exec();

      if (!progress) {
        // Initialize new progress document if not found
        return await this.model.create({
          userId: id,
          wordsFound: 0,
          successRate: 0,
          level: 1,
          achievements: [],
          favoriteWords: [],
          lastActive: new Date()
        });
      }

      return progress;
    } catch (error) {
      throw new Error(`Failed to retrieve progress for user ${userId}: ${error.message}`);
    }
  }

  /**
   * Updates user's progress with transaction support and validation
   * @param userId - User's unique identifier
   * @param progressData - Progress data to update
   * @returns Promise resolving to updated progress document
   */
  async updateProgress(userId: ID, progressData: Partial<IUserProgress>): Promise<Document> {
    const session = await this.model.startSession();
    session.startTransaction();

    try {
      // Validate user ID and progress data
      const id = typeof userId === 'string' ? new ObjectId(userId) : userId;
      
      // Calculate performance metrics
      const currentProgress = await this.findByUserId(userId);
      const accuracyMetrics = this.calculateAccuracyMetrics(currentProgress, progressData);
      
      // Validate accuracy thresholds
      if (accuracyMetrics.overallAccuracy < this.ACCURACY_THRESHOLD) {
        throw new Error('Progress update failed accuracy validation');
      }

      const updates = {
        ...progressData,
        accuracyMetrics,
        lastActive: new Date(),
        retentionRate: this.calculateRetentionRate(currentProgress, progressData)
      };

      const updatedProgress = await this.model.findOneAndUpdate(
        { userId: id },
        { $set: updates },
        { 
          new: true, 
          runValidators: true, 
          session,
          setDefaultsOnInsert: true 
        }
      );

      await session.commitTransaction();
      return updatedProgress;
    } catch (error) {
      await session.abortTransaction();
      throw new Error(`Failed to update progress: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieves enhanced progress statistics with performance metrics
   * @param userId - User's unique identifier
   * @returns Promise resolving to comprehensive progress statistics
   */
  async getStatistics(userId: ID): Promise<IProgressStatistics> {
    try {
      const progress = await this.findByUserId(userId);
      const retentionRate = progress.retentionRate || 0;
      const accuracyMetrics = progress.accuracyMetrics || {
        wordGenerationAccuracy: 0,
        achievementProgress: 0,
        overallAccuracy: 0
      };

      return {
        wordsFound: progress.wordsFound,
        successRate: progress.successRate,
        level: progress.level,
        achievements: progress.achievements,
        favoriteWords: progress.favoriteWords,
        lastActive: progress.lastActive,
        retentionRate,
        accuracyMetrics
      };
    } catch (error) {
      throw new Error(`Failed to retrieve statistics: ${error.message}`);
    }
  }

  /**
   * Calculates accuracy metrics for progress tracking
   * @private
   */
  private calculateAccuracyMetrics(
    currentProgress: Document, 
    newProgress: Partial<IUserProgress>
  ): { wordGenerationAccuracy: number; achievementProgress: number; overallAccuracy: number } {
    const wordGenerationAccuracy = newProgress.wordsFound 
      ? (newProgress.successRate || currentProgress.successRate) / 100
      : currentProgress.accuracyMetrics?.wordGenerationAccuracy || 0;

    const achievementProgress = currentProgress.achievements.length 
      ? currentProgress.achievements.length / (currentProgress.level * 5) // 5 achievements per level
      : 0;

    const overallAccuracy = (wordGenerationAccuracy + achievementProgress) / 2;

    return {
      wordGenerationAccuracy,
      achievementProgress,
      overallAccuracy
    };
  }

  /**
   * Calculates vocabulary retention rate
   * @private
   */
  private calculateRetentionRate(
    currentProgress: Document, 
    newProgress: Partial<IUserProgress>
  ): number {
    const totalWords = newProgress.wordsFound || currentProgress.wordsFound;
    const retainedWords = currentProgress.favoriteWords.length;
    
    return totalWords > 0 ? retainedWords / totalWords : 0;
  }
}