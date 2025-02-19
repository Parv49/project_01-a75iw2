// Image asset interfaces
interface GameImages {
  logo: string;
  background: string;
  timer: string;
  score: string;
  hint: string;
  skip: string;
}

interface AchievementBadges {
  beginner: string;
  intermediate: string;
  advanced: string;
  expert: string;
  dailyChallenge: string;
  wordMaster: string;
}

interface UiIcons {
  success: string;
  error: string;
  info: string;
  warning: string;
  close: string;
  settings: string;
  help: string;
  share: string;
}

interface ProfileImages {
  defaultAvatar: string;
  progressChart: string;
  levelBadge: string;
  statistics: string;
  achievements: string;
}

// Game interface assets
export const gameImages: GameImages = {
  logo: require('./game/logo.png'),
  background: require('./game/background.png'),
  timer: require('./game/timer.png'),
  score: require('./game/score.png'),
  hint: require('./game/hint.png'),
  skip: require('./game/skip.png'),
};

// Achievement badge assets
export const achievementBadges: AchievementBadges = {
  beginner: require('./badges/beginner.png'),
  intermediate: require('./badges/intermediate.png'),
  advanced: require('./badges/advanced.png'),
  expert: require('./badges/expert.png'),
  dailyChallenge: require('./badges/daily-challenge.png'),
  wordMaster: require('./badges/word-master.png'),
};

// UI icon assets
export const uiIcons: UiIcons = {
  success: require('./icons/success.png'),
  error: require('./icons/error.png'),
  info: require('./icons/info.png'),
  warning: require('./icons/warning.png'),
  close: require('./icons/close.png'),
  settings: require('./icons/settings.png'),
  help: require('./icons/help.png'),
  share: require('./icons/share.png'),
};

// Profile and statistics assets
export const profileImages: ProfileImages = {
  defaultAvatar: require('./profile/default-avatar.png'),
  progressChart: require('./profile/progress-chart.png'),
  levelBadge: require('./profile/level-badge.png'),
  statistics: require('./profile/statistics.png'),
  achievements: require('./profile/achievements.png'),
};

// Re-export all image assets
export {
  GameImages,
  AchievementBadges,
  UiIcons,
  ProfileImages,
};