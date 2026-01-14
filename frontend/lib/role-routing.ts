import { User } from './api';

// Helper to normalize roles input
const normalizeRoles = (roleOrRoles: string | string[]): string[] => {
  const roles = Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
  return roles.map(r => r.toLowerCase());
};

// Role-based dashboard routing
export const getRoleBasedDashboardPath = (role: string | string[]): string => {
  const roles = normalizeRoles(role);

  if (roles.includes('admin')) return '/dashboard/admin';
  if (roles.includes('supervisor')) return '/dashboard/supervisor';
  if (roles.includes('coordinator')) return '/dashboard/coordinator';
  
  return '/dashboard/student';
};

// Check if user can access a specific dashboard
export const canAccessDashboard = (userRole: string | string[], dashboardPath: string): boolean => {
  const roles = normalizeRoles(userRole);
  
  // Admin can access all dashboards
  if (roles.includes('admin')) {
    return true;
  }
  
  // Check role-specific access
  const rolePathMap: Record<string, string> = {
    'coordinator': '/dashboard/coordinator',
    'student': '/dashboard/student',
    'supervisor': '/dashboard/supervisor'
  };
  
  // Allow access if any of the user's roles matches the dashboard path
  // Note: This checks for exact match or if the path starts with the dashboard path 
  // (to support sub-pages if any, though strict equality was used before)
  return roles.some(role => {
      const allowedPath = rolePathMap[role];
      return allowedPath === dashboardPath || (allowedPath && dashboardPath.startsWith(allowedPath + '/'));
  });
};

// Get allowed dashboard paths for a user
export const getAllowedDashboards = (userRole: string | string[]): string[] => {
  const roles = normalizeRoles(userRole);
  
  if (roles.includes('admin')) {
    return [
      '/dashboard/admin',
      '/dashboard/coordinator',
      '/dashboard/student',
      '/dashboard/supervisor'
    ];
  }
  
  const rolePathMap: Record<string, string[]> = {
    'coordinator': ['/dashboard/coordinator'],
    'student': ['/dashboard/student'],
    'supervisor': ['/dashboard/supervisor']
  };
  
  const allowed = new Set<string>();
  roles.forEach(role => {
      const paths = rolePathMap[role];
      if (paths) paths.forEach(p => allowed.add(p));
  });
  
  return Array.from(allowed);
};

// Check if current path is a dashboard path
export const isDashboardPath = (pathname: string): boolean => {
  return pathname.startsWith('/dashboard/');
};

// Get the specific dashboard type from path
export const getDashboardType = (pathname: string): string | null => {
  const match = pathname.match(/^\/dashboard\/(.+)$/);
  return match ? match[1] : null;
};