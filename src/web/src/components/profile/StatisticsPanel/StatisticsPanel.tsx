/**
 * @fileoverview Statistics Panel Component with enhanced progress tracking
 * Implements user progress tracking with >95% accuracy and educational metrics
 * Version: 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import clsx from 'clsx'; // ^2.0.0
import Progress from '../../common/Progress/Progress';
import { useProgress } from '../../../hooks/useProgress';
import type { UserProgress, ProgressStats } from '../../../types/progress.types';
import { Difficulty } from '../../../types/common.types';

// Constants for progress thresholds and refresh rates
const ACCURACY_THRESHOLD = 0.95; // 95% accuracy requirement
const RETENTION_THRESHOLD = 0.70; // 70% retention requirement
const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

interface StatisticsPanelProps {
  className?: string;
  userId: string;
  refreshInterval?: number;
  onError?: (error: Error) => void;
  showRetentionRate?: boolean;
}

const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
  className,
  userId,
  refreshInterval = DEFAULT_REFRESH_INTERVAL,
  onError,
  showRetentionRate = true
}) => {
  // Enhanced progress hook with error handling
  const {
    progress,
    stats,
    loading,
    error,
    accuracyMetrics,
    refresh
  } = useProgress(userId);

  // Handle errors with callback
  useEffect(() => {
    if (error && onError) {
      onError(new Error(error));
    }
  }, [error, onError]);

  // Setup periodic refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const timer = setInterval(refresh, refreshInterval);
      return () => clearInterval(timer);
    }
  }, [refreshInterval, refresh]);

  // Memoized calculations for performance
  const progressMetrics = useMemo(() => {
    if (!progress) return null;

    return {
      successRate: Math.min((progress.score / (stats.totalGames || 1)) * 100, 100),
      retentionRate: accuracyMetrics.retention * 100,
      trackingAccuracy: accuracyMetrics.tracking * 100
    };
  }, [progress, stats, accuracyMetrics]);

  // Level progress calculation with validation
  const calculateLevelProgress = useCallback((level: Difficulty): number => {
    if (!progress) return 0;
    
    const levelThresholds = {
      [Difficulty.BEGINNER]: 100,
      [Difficulty.INTERMEDIATE]: 500,
      [Difficulty.ADVANCED]: 1000
    };

    return Math.min((progress.score / levelThresholds[level]) * 100, 100);
  }, [progress]);

  if (loading) {
    return (
      <div className={clsx('animate-pulse', className)} aria-busy="true">
        <div className="h-48 bg-gray-200 rounded-lg dark:bg-gray-700" />
      </div>
    );
  }

  if (!progress) {
    return (
      <div className={clsx('text-center p-4', className)} role="alert">
        <p className="text-gray-600 dark:text-gray-300">No statistics available</p>
      </div>
    );
  }

  return (
    <div 
      className={clsx('space-y-6 p-4', className)}
      aria-label="User Statistics Panel"
    >
      {/* Core Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="stat-card">
          <h3 className="text-lg font-semibold">Words Found</h3>
          <p className="text-3xl">{stats.totalWordsFound}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Total discovered words
          </p>
        </div>

        <div className="stat-card">
          <h3 className="text-lg font-semibold">Success Rate</h3>
          <p className="text-3xl">
            {progressMetrics?.successRate.toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Word generation accuracy
          </p>
        </div>

        {showRetentionRate && (
          <div className="stat-card">
            <h3 className="text-lg font-semibold">Retention Rate</h3>
            <p className="text-3xl">
              {progressMetrics?.retentionRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Vocabulary retention
            </p>
          </div>
        )}
      </div>

      {/* Level Progress */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Level Progress</h3>
        
        <div className="space-y-3">
          <div className="progress-section">
            <span className="text-sm font-medium">Beginner</span>
            <Progress
              value={calculateLevelProgress(Difficulty.BEGINNER)}
              max={100}
              variant="primary"
              size="md"
              showLabel
              ariaLabel="Beginner level progress"
            />
          </div>

          <div className="progress-section">
            <span className="text-sm font-medium">Intermediate</span>
            <Progress
              value={calculateLevelProgress(Difficulty.INTERMEDIATE)}
              max={100}
              variant="success"
              size="md"
              showLabel
              ariaLabel="Intermediate level progress"
            />
          </div>

          <div className="progress-section">
            <span className="text-sm font-medium">Advanced</span>
            <Progress
              value={calculateLevelProgress(Difficulty.ADVANCED)}
              max={100}
              variant="warning"
              size="md"
              showLabel
              ariaLabel="Advanced level progress"
            />
          </div>
        </div>
      </div>

      {/* Accuracy Metrics */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-3">Tracking Accuracy</h3>
        <Progress
          value={progressMetrics?.trackingAccuracy ?? 0}
          max={100}
          variant={progressMetrics?.trackingAccuracy >= ACCURACY_THRESHOLD * 100 ? 'success' : 'error'}
          size="lg"
          showLabel
          ariaLabel="Progress tracking accuracy"
        />
        {progressMetrics?.trackingAccuracy < ACCURACY_THRESHOLD * 100 && (
          <p className="text-sm text-red-600 mt-1" role="alert">
            Tracking accuracy below required threshold of {ACCURACY_THRESHOLD * 100}%
          </p>
        )}
      </div>
    </div>
  );
};

export default StatisticsPanel;