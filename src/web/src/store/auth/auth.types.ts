import { PayloadAction } from '@reduxjs/toolkit'; // ^1.9.0
import { User } from '../../types/auth.types';

/**
 * Interface defining the authentication state structure in Redux store
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
  token: string | null;
}

/**
 * Interface for login success action payload containing user data and JWT token
 */
export interface LoginPayload {
  user: User;
  token: string;
}

/**
 * Enum of available authentication action types for type-safe action creation
 */
export enum AuthActionTypes {
  LOGIN_REQUEST = 'auth/loginRequest',
  LOGIN_SUCCESS = 'auth/loginSuccess',
  LOGIN_FAILURE = 'auth/loginFailure',
  LOGOUT = 'auth/logout',
  SET_USER = 'auth/setUser'
}

/**
 * Type for login request action
 */
export type LoginRequestAction = {
  type: AuthActionTypes.LOGIN_REQUEST;
}

/**
 * Type for login success action with payload containing user data and token
 */
export type LoginSuccessAction = {
  type: AuthActionTypes.LOGIN_SUCCESS;
  payload: LoginPayload;
}

/**
 * Type for login failure action with error message payload
 */
export type LoginFailureAction = {
  type: AuthActionTypes.LOGIN_FAILURE;
  payload: string;
}

/**
 * Type for logout action
 */
export type LogoutAction = {
  type: AuthActionTypes.LOGOUT;
}

/**
 * Type for setting user data action with User payload
 */
export type SetUserAction = {
  type: AuthActionTypes.SET_USER;
  payload: User;
}

/**
 * Union type of all possible authentication actions for exhaustive type checking
 */
export type AuthAction =
  | LoginRequestAction
  | LoginSuccessAction
  | LoginFailureAction
  | LogoutAction
  | SetUserAction;