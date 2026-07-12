"use client"

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getStoredUser, authAPI, setStoredUser, removeAuthToken } from '@/lib/api';
import { canAccessDashboard, getRoleBasedDashboardPath, isDashboardPath } from '@/lib/role-routing';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

export function RoleProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
}: RoleProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    const checkAccess = async () => {
      const user = getStoredUser();

      if (!user) {
        if (active) {
          router.push('/login');
        }
        return;
      }

      if (isDashboardPath(pathname)) {
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
        const userCanAccess = canAccessDashboard(userRoles, pathname);

        if (!userCanAccess) {
          const correctDashboard = getRoleBasedDashboardPath(userRoles);
          if (active) {
            router.push(correctDashboard);
          }
          return;
        }
      }

      if (allowedRoles && allowedRoles.length > 0) {
        const userRoles = user.roles && user.roles.length > 0 ? user.roles : [user.role];
        const hasRequiredRole = userRoles.some(role => allowedRoles.includes(role));

        if (!hasRequiredRole) {
          const redirectPath = redirectTo || getRoleBasedDashboardPath(userRoles);
          if (active) {
            router.push(redirectPath);
          }
          return;
        }
      }

      if (active) {
        setIsAuthorized(true);
        setIsLoading(false);
      }

      try {
        const serverUser = await authAPI.getCurrentUser();
        if (!active) return;

        const normalizeRoles = (roles: string[] = []) => [...new Set(roles.map(role => role.toLowerCase()).filter(Boolean))].sort();
        const stripCustomer = (roles: string[] = []) => normalizeRoles(roles).filter(role => role !== 'customer');
        const storedRoles = stripCustomer(user.roles && user.roles.length > 0 ? user.roles : [user.role]);
        const serverRoles = stripCustomer(serverUser.roles && serverUser.roles.length > 0 ? serverUser.roles : [serverUser.role]);
        const rolesChanged = JSON.stringify(storedRoles) !== JSON.stringify(serverRoles);
        const roleChanged = user.role !== serverUser.role;
        const approvedChanged = user.is_approved !== serverUser.is_approved;
        const emailChanged = user.email !== serverUser.email;
        const nameChanged = user.name !== serverUser.name;
        const idChanged = user.id !== serverUser.id;

        if (roleChanged || rolesChanged || approvedChanged || emailChanged || nameChanged || idChanged) {
          removeAuthToken();
          try {
            await authAPI.logout();
          } catch {
            // Ignore logout errors.
          }
          if (active) {
            window.location.href = '/login?changed=true';
          }
          return;
        }

        setStoredUser(serverUser);
      } catch (error) {
        console.error('Session validation error:', error);
        removeAuthToken();
        if (active) {
          window.location.href = '/login?expired=true';
        }
      }
    };

    checkAccess();

    const intervalId = setInterval(() => {
      if (getStoredUser()) {
        checkAccess();
      }
    }, 45000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [pathname, router, allowedRoles, redirectTo]);

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

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

export function useUserRole() {
  const user = getStoredUser();
  const userRole = user?.role || null;

  return { user, userRole };
}

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
    canAccessPath,
  };
}

