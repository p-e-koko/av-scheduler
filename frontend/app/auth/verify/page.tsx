'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const verifyUrl = searchParams.get('url');
  const isRegistered = searchParams.get('registered') === 'true';
  const reason = searchParams.get('reason');
  const email = searchParams.get('email');
  
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (verifyUrl) {
      verifyEmail(verifyUrl);
    }
  }, [verifyUrl]);

  const verifyEmail = async (url: string) => {
    setStatus('verifying');
    try {
      await auth.verifyEmail(url);
      setStatus('success');
      setMessage('Your email has been verified successfully.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Failed to verify email.');
    }
  };

  const handleResend = async () => {
    if (!email) {
      setMessage('Email address not found. Please try logging in again.');
      return;
    }
    setResending(true);
    try {
      await auth.resendVerificationEmail(email);
      setMessage('Verification link has been resent to your email.');
    } catch (error: any) {
      setMessage(error.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  // 1. Verifying State (Clicking Link)
  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle className="text-xl">Verifying Email</CardTitle>
            <CardDescription>Please wait while we verify your email address...</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-progress origin-left"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Success State (Verified)
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-green-200 dark:border-green-900">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl text-green-700 dark:text-green-400">Email Verified!</CardTitle>
            <CardDescription>Thank you for verifying your email.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 text-sm text-center text-green-800 rounded-lg bg-green-50 dark:bg-green-900/20 dark:text-green-300">
              {message}
            </div>
            <p className="text-center text-sm text-muted-foreground">Redirecting to dashboard...</p>
            <Button className="w-full" onClick={() => router.push('/dashboard')}>
              Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Error State
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md shadow-lg border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl text-destructive">Verification Failed</CardTitle>
            <CardDescription>We couldn't verify your email address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 text-sm text-center text-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 dark:text-red-300">
              {message}
            </div>
            <Button variant="outline" className="w-full" onClick={handleResend} disabled={resending}>
              {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Resend Verification Email
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 4. Default View: Instructions (Check Email)
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your inbox</CardTitle>
          <CardDescription>
            We've sent a verification link to your email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Banner for New Registration */}
          {isRegistered && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-green-800 dark:text-green-300">Account created successfully!</p>
                <p className="text-green-700 dark:text-green-400 mt-1">Please verify your email to continue.</p>
              </div>
            </div>
          )}

          {/* Warning Banner for Unverified Login */}
          {reason === 'unverified' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3">
              <XCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300">Verification Required</p>
                <p className="text-amber-700 dark:text-amber-400 mt-1">You need to verify your email before accessing the dashboard.</p>
              </div>
            </div>
          )}

          <div className="text-center text-sm text-muted-foreground">
            <p>Click on the link we sent to verify your account.</p>
            <p className="mt-2">If you don't see it, check your spam folder.</p>
          </div>
          
          {message && (
            <div className="p-3 text-sm text-center text-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300">
              {message}
            </div>
          )}

          <div className="pt-2">
            <Button className="w-full" variant="outline" onClick={handleResend} disabled={resending}>
              {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Resend Verification Email'}
            </Button>
          </div>
          
          <div className="text-center">
             <Button variant="link" className="text-xs text-muted-foreground" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
