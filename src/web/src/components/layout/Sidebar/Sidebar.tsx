import React, { useCallback, useMemo } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  useMediaQuery,
  useTheme,
  styled
} from '@mui/material';
import {
  HomeIcon,
  SportsEsportsIcon,
  PersonIcon,
  DashboardIcon,
  ChevronLeftIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES, isProtectedRoute } from '../../constants/routes';
import useAuth from '../../hooks/useAuth';

// Styled components for enhanced accessibility and responsiveness
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: 240,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

// Interface definitions
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactElement;
  route: string;
  requiresAuth: boolean;
}

/**
 * Enhanced Sidebar component with security features and responsive design
 */
export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { 
    isAuthenticated, 
    user, 
    lastActivity, 
    mfaEnabled 
  } = useAuth();

  /**
   * Validates user session status and security requirements
   */
  const validateSession = useCallback((): boolean => {
    if (!isAuthenticated) return false;

    const sessionTimeout = 30 * 60 * 1000; // 30 minutes
    const now = new Date().getTime();
    const lastActivityTime = lastActivity?.getTime() || 0;

    return (now - lastActivityTime) < sessionTimeout;
  }, [isAuthenticated, lastActivity]);

  /**
   * Handles secure navigation with authentication and session validation
   */
  const handleNavigate = useCallback((route: string) => {
    if (isProtectedRoute(route)) {
      if (!isAuthenticated) {
        navigate(ROUTES.LOGIN, { state: { returnTo: route } });
        return;
      }

      if (!validateSession()) {
        navigate(ROUTES.LOGIN, { state: { sessionExpired: true } });
        return;
      }

      if (mfaEnabled && user?.emailVerified === false) {
        navigate(ROUTES.LOGIN, { state: { requiresMFA: true } });
        return;
      }
    }

    navigate(route);
    if (isMobile) {
      onClose();
    }
  }, [isAuthenticated, mfaEnabled, user, navigate, onClose, isMobile, validateSession]);

  /**
   * Returns authentication-aware navigation items with security validation
   */
  const navigationItems = useMemo((): NavigationItem[] => {
    const items: NavigationItem[] = [
      {
        id: 'home',
        label: 'Home',
        icon: <HomeIcon />,
        route: ROUTES.HOME,
        requiresAuth: false
      },
      {
        id: 'game',
        label: 'Word Game',
        icon: <SportsEsportsIcon />,
        route: ROUTES.GAME,
        requiresAuth: false
      }
    ];

    if (isAuthenticated && validateSession()) {
      items.push(
        {
          id: 'profile',
          label: 'Profile',
          icon: <PersonIcon />,
          route: ROUTES.PROFILE,
          requiresAuth: true
        },
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <DashboardIcon />,
          route: ROUTES.DASHBOARD,
          requiresAuth: true
        }
      );
    }

    return items;
  }, [isAuthenticated, validateSession]);

  return (
    <StyledDrawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="left"
      open={isOpen}
      onClose={onClose}
      ModalProps={{
        keepMounted: true // Better mobile performance
      }}
    >
      <DrawerHeader>
        <IconButton onClick={onClose} aria-label="Close navigation">
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>

      <List component="nav" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <ListItem
            button
            key={item.id}
            onClick={() => handleNavigate(item.route)}
            selected={location.pathname === item.route}
            sx={{
              '&.Mui-selected': {
                backgroundColor: theme.palette.action.selected,
              },
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                variant: 'body1',
                color: location.pathname === item.route ? 'primary' : 'textPrimary',
              }}
            />
          </ListItem>
        ))}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar;