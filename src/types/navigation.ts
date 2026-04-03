// Web route parameter types (React Router equivalent of dooooApp's navigation.ts)

export interface GroupRouteParams {
  groupId: string;
}

export interface TargetRouteParams {
  targetId: string;
}

export interface PlanRouteParams {
  targetId: string;
  planId: string;
}

// User type shared across the app
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth response from the backend — { success, data: { user, token } }
export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  avatar?: string;
}
