"use client"

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStoredUser } from '@/lib/api';
import { canAccessDashboard, getRoleBasedDashboardPath, isDashboardPath } from '@/lib/role-routing';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function RoleProtectedRoute({ 
  children, 
  allowedRoles,
  redirectTo 
}: RoleProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = () => {
      const user = getStoredUser();
      
      // If no user is stored, redirect to login
      if (!user) {
        router.push('/login');
        return;
      }

      // If this is a dashboard route, check role-based access
      if (isDashboardPath(pathname)) {
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
        const userCanAccess = canAccessDashboard(userRoles, pathname);
        
        if (!userCanAccess) {
          // Redirect to user's appropriate dashboard
          const correctDashboard = getRoleBasedDashboardPath(userRoles);
          router.push(correctDashboard);
          return;
        }
      }

      // If specific roles are required, check them
      if (allowedRoles && allowedRoles.length > 0) {
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
        const hasRequiredRole = userRoles.some(r => allowedRoles.includes(r as any));
        
        if (!hasRequiredRole) {
          // Redirect to specified path or user's dashboard
          const redirectPath = redirectTo || getRoleBasedDashboardPath(user.role);
          router.push(redirectPath);
          return;
        }
      }

      // User is authorized
      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAccess();
  }, [pathname, router, allowedRoles, redirectTo]);

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

// Hook to get current user role
export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [user, setUser] = useState(getStoredUser());

  useEffect(() => {
    const currentUser = getStoredUser();
    setUser(currentUser);
    setUserRole(currentUser?.role || null);
  }, []);

  return { user, userRole };
}

// Hook to check if user has specific permissions
export function usePermissions() {
  const { user, userRole } = useUserRole();

  const hasRole = (role: string): boolean => {
    return userRole === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return userRole ? roles.includes(userRole) : false;
  };

  const isAdmin = (): boolean => {
    return userRole === 'admin';
  };

  const canAccessPath = (path: string): boolean => {
    if (!userRole) return false;
    return canAccessDashboard(userRole, path);
  };

  return {
    user,
    userRole,
    hasRole,
    hasAnyRole,
    isAdmin,
    canAccessPath
  };
}