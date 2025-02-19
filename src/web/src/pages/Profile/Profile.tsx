/**
 * @fileoverview Profile page component displaying user progress, statistics, and achievements
 * Implements user progress tracking with >95% accuracy and educational metrics
 * Version: 1.0.0
 */

import React, { useMemo, useCallback, useEffect } from 'react'; // ^18.2.0
import { Navigate } from 'react-router-dom'; // ^6.14.0
import StatisticsPanel from '../../components/profile/StatisticsPanel/StatisticsPanel';
import ProgressChart from '../../components/profile/ProgressChart/ProgressChart';
import AchievementCard from '../../components/profile/AchievementCard/AchievementCard';
import { useAuth } from '../../hooks/useAuth';
import styles from './Profile.module.css';

/**
 * Profile page component displaying comprehensive user progress and achievements
 * Implements progress tracking with >95% accuracy requirement
 */
const Profile: React.FC = React.memo(() => {
  const { 
    user, 
    isAuthenticated, 
    isLoading,
    error 
  } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated && !isLoading) {
    return <Navigate to="/login" replace />;
  }

  // Memoized achievement data transformation
  const achievementsList = useMemo(() => {
    if (!user) return [];
    
    return user.achievements?.map(achievement => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      requirement: achievement.requirement,
      unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : null
    })) || [];
  }, [user]);

  // Handle error states with user feedback
  const handleError = useCallback((error: Error) => {
    console.error('Profile Error:', error);
    // Implement error reporting/tracking here
  }, []);

  // Update page title with user context
  useEffect(() => {
    document.title = user ? `${user.name}'s Profile - Word Generator` : 'Profile - Word Generator';
  }, [user]);

  if (isLoading) {
    return (
      <div className={styles['profile-loading']} aria-busy="true">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded dark:bg-gray-700" />
          <div className="h-64 bg-gray-200 rounded dark:bg-gray-700" />
          <div className="h-48 bg-gray-200 rounded dark:bg-gray-700" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['profile-error']} role="alert">
        <h2>Error Loading Profile</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles['profile-container']}>
      {/* Profile Header */}
      <header className={styles['profile-header']}>
        <div className="flex items-center gap-4">
          {user?.picture && (
            <img
              src={user.picture}
              alt={`${user.name}'s avatar`}
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{user?.name}</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Member since {new Date(user?.lastLogin || Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles['profile-content']}>
        {/* Statistics Section */}
        <section 
          className={styles['profile-section']}
          aria-labelledby="statistics-heading"
        >
          <h2 id="statistics-heading" className="text-xl font-semibold mb-4">
            Statistics
          </h2>
          <StatisticsPanel
            userId={user?.id || ''}
            refreshInterval={30000}
            onError={handleError}
            showRetentionRate={true}
          />
        </section>

        {/* Progress Chart Section */}
        <section 
          className={styles['profile-section']}
          aria-labelledby="progress-heading"
        >
          <h2 id="progress-heading" className="text-xl font-semibold mb-4">
            Learning Progress
          </h2>
          <ProgressChart
            userId={user?.id || ''}
            options={{
              showRetention: true,
              showAccuracy: true,
              timeRange: 'month',
              theme: 'light'
            }}
          />
        </section>

        {/* Achievements Section */}
        <section 
          className={styles['profile-section']}
          aria-labelledby="achievements-heading"
        >
          <h2 id="achievements-heading" className="text-xl font-semibold mb-4">
            Achievements
          </h2>
          <div className={styles['profile-achievements']}>
            {achievementsList.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
                currentProgress={user?.progress?.score || 0}
                onError={handleError}
              />
            ))}
            {achievementsList.length === 0 && (
              <p className="text-gray-600 dark:text-gray-300">
                No achievements unlocked yet. Keep playing to earn achievements!
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
});

// Display name for debugging
Profile.displayName = 'Profile';

export default Profile;