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
  if (roles.includes('student')) return '/dashboard/student';
  if (roles.includes('customer')) return '/dashboard/customer';
  // Marketing roles
  if (roles.includes('marketing_supervisor')) return '/dashboard/marketing-supervisor';
  if (roles.includes('marketing_coordinator')) return '/dashboard/marketing-coordinator';
  if (roles.includes('student_ambassador')) return '/dashboard/student-ambassador';

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
  const rolePathMap: Record<string, string[]> = {
    'coordinator': ['/dashboard/coordinator', '/dashboard/inventory', '/dashboard/keys'],
    'student': ['/dashboard/student', '/dashboard/inventory', '/dashboard/keys'],
    'supervisor': ['/dashboard/supervisor', '/dashboard/inventory', '/dashboard/keys'],
    'customer': ['/dashboard/customer'],
    // Marketing roles — isolated from AV-IT paths
    'marketing_supervisor': ['/dashboard/marketing-supervisor'],
    'marketing_coordinator': ['/dashboard/marketing-coordinator'],
    'student_ambassador': ['/dashboard/student-ambassador'],
  };

  return roles.some(role => {
    const allowedPaths = rolePathMap[role] || [];
    return allowedPaths.some(allowedPath =>
      allowedPath === dashboardPath || dashboardPath.startsWith(allowedPath + '/')
    );
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
      '/dashboard/supervisor',
      '/dashboard/inventory',
      '/dashboard/customer',
      '/dashboard/keys',
      '/dashboard/marketing-supervisor',
      '/dashboard/marketing-coordinator',
      '/dashboard/student-ambassador',
    ];
  }

  const rolePathMap: Record<string, string[]> = {
    'coordinator': ['/dashboard/coordinator', '/dashboard/inventory', '/dashboard/keys'],
    'student': ['/dashboard/student', '/dashboard/inventory', '/dashboard/keys'],
    'supervisor': ['/dashboard/supervisor', '/dashboard/inventory', '/dashboard/keys'],
    'customer': ['/dashboard/customer'],
    // Marketing roles
    'marketing_supervisor': ['/dashboard/marketing-supervisor'],
    'marketing_coordinator': ['/dashboard/marketing-coordinator'],
    'student_ambassador': ['/dashboard/student-ambassador'],
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

// Helper to determine which department a role belongs to
export const getRoleDepartment = (role: string): 'av_it' | 'marketing' | 'admin' | null => {
  const marketingRoles = ['marketing_supervisor', 'marketing_coordinator', 'student_ambassador'];
  const avItRoles = ['supervisor', 'coordinator', 'student'];
  if (role === 'admin') return 'admin';
  if (marketingRoles.includes(role)) return 'marketing';
  if (avItRoles.includes(role)) return 'av_it';
  return null;
};
