import { User } from './api';

// Role-based dashboard routing
export const getRoleBasedDashboardPath = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'admin':
      return '/dashboard/admin';
    case 'coordinator':
      return '/dashboard/coordinator';
    case 'student':
      return '/dashboard/student';
    case 'supervisor':
      return '/dashboard/supervisor';
    default:
      return '/login'; // Fallback to login if role is unknown
  }
};

// Check if user can access a specific dashboard
export const canAccessDashboard = (userRole: string, dashboardPath: string): boolean => {
  const normalizedRole = userRole.toLowerCase();
  
  // Admin can access all dashboards
  if (normalizedRole === 'admin') {
    return true;
  }
  
  // Check role-specific access
  const rolePathMap: Record<string, string> = {
    'coordinator': '/dashboard/coordinator',
    'student': '/dashboard/student',
    'supervisor': '/dashboard/supervisor'
  };
  
  return rolePathMap[normalizedRole] === dashboardPath;
};

// Get allowed dashboard paths for a user
export const getAllowedDashboards = (userRole: string): string[] => {
  const normalizedRole = userRole.toLowerCase();
  
  if (normalizedRole === 'admin') {
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
  
  return rolePathMap[normalizedRole] || [];
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