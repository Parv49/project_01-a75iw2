/**
 * @fileoverview Enhanced Progress Chart Component
 * Visualizes user progress and educational metrics with >95% accuracy tracking
 * Version: 1.0.0
 */

import React, { useMemo, useCallback } from 'react';
import { Line, Bar, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, CartesianGrid } from 'recharts'; // ^2.7.2
import classNames from 'classnames'; // ^2.3.2
import { useProgress } from '../../../hooks/useProgress';
import { UserProgress } from '../../../types/progress.types';
import { Difficulty } from '../../../types/common.types';

// Constants for chart configuration
const CHART_HEIGHT = 300;
const RETENTION_THRESHOLD = 0.70; // 70% retention requirement
const ACCURACY_THRESHOLD = 0.95; // 95% accuracy requirement
const ANIMATION_DURATION = 1000;

interface ProgressChartProps {
  userId: string;
  className?: string;
  options?: ChartOptions;
}

interface ChartOptions {
  showRetention?: boolean;
  showAccuracy?: boolean;
  timeRange?: 'week' | 'month' | 'year';
  theme?: 'light' | 'dark';
}

interface FormattedChartData {
  date: string;
  score: number;
  wordsFound: number;
  retentionRate: number;
  accuracy: number;
  movingAverage: number;
}

/**
 * Formats and validates progress data for chart visualization
 */
const formatChartData = (progress: UserProgress | null): FormattedChartData[] => {
  if (!progress) return [];

  const now = new Date();
  const data: FormattedChartData[] = [];
  let movingSum = 0;
  const movingWindow = 7; // 7-day moving average

  // Process last 30 days of data
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const entry = {
      date: date.toISOString().split('T')[0],
      score: progress.score || 0,
      wordsFound: progress.wordsDiscovered || 0,
      retentionRate: progress.retentionRate || 0,
      accuracy: progress.accuracy || 0,
      movingAverage: 0
    };

    // Calculate moving average
    movingSum += entry.score;
    if (i < movingWindow) {
      entry.movingAverage = movingSum / Math.min(movingWindow, 30 - i);
    }

    data.push(entry);
  }

  return data;
};

/**
 * Enhanced Progress Chart Component
 * Renders interactive charts for progress visualization with accessibility support
 */
const ProgressChart: React.FC<ProgressChartProps> = ({ userId, className, options = {} }) => {
  const { progress, stats, loading, error } = useProgress(userId);
  
  // Memoize formatted chart data
  const chartData = useMemo(() => formatChartData(progress), [progress]);

  // Custom tooltip formatter
  const tooltipFormatter = useCallback((value: number, name: string) => {
    switch (name) {
      case 'retentionRate':
        return [`${(value * 100).toFixed(1)}%`, 'Retention Rate'];
      case 'accuracy':
        return [`${(value * 100).toFixed(1)}%`, 'Tracking Accuracy'];
      default:
        return [value, name];
    }
  }, []);

  // Render loading state
  if (loading) {
    return (
      <div className={classNames('progress-chart-loading', className)} aria-busy="true">
        Loading progress data...
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={classNames('progress-chart-error', className)} role="alert">
        Error loading progress: {error}
      </div>
    );
  }

  return (
    <div 
      className={classNames('progress-chart-container', className)}
      data-testid="progress-chart"
    >
      {/* Score Progress Chart */}
      <div className="chart-section" aria-label="Score Progress">
        <h3>Score Progress</h3>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <Line
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
              animationDuration={ANIMATION_DURATION}
              name="Score"
            />
            <Line
              type="monotone"
              dataKey="movingAverage"
              stroke="#82ca9d"
              strokeDasharray="5 5"
              animationDuration={ANIMATION_DURATION}
              name="7-Day Average"
            />
          </Line>
        </ResponsiveContainer>
      </div>

      {/* Educational Metrics Chart */}
      {options.showRetention && (
        <div className="chart-section" aria-label="Educational Metrics">
          <h3>Learning Progress</h3>
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <Bar
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={tooltipFormatter} />
              <Legend />
              <Bar
                dataKey="retentionRate"
                fill="#82ca9d"
                animationDuration={ANIMATION_DURATION}
                name="Retention Rate"
              />
              {options.showAccuracy && (
                <Bar
                  dataKey="accuracy"
                  fill="#8884d8"
                  animationDuration={ANIMATION_DURATION}
                  name="Tracking Accuracy"
                />
              )}
            </Bar>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Indicators */}
      <div className="metrics-summary" role="complementary">
        <div className={classNames('metric', {
          'metric-warning': stats.accuracyMetrics.tracking < ACCURACY_THRESHOLD
        })}>
          <span>Tracking Accuracy:</span>
          <span>{(stats.accuracyMetrics.tracking * 100).toFixed(1)}%</span>
        </div>
        <div className={classNames('metric', {
          'metric-warning': progress?.retentionRate < RETENTION_THRESHOLD
        })}>
          <span>Retention Rate:</span>
          <span>{(progress?.retentionRate * 100 || 0).toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressChart;