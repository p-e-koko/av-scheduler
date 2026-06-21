"use client"

import { useEffect, useState } from 'react'
import { notificationAPI } from '@/lib/api'
import { Download, X, Share, PlusSquare, Smartphone, Sparkles } from 'lucide-react'

// Helper to convert base64 VAPID public key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function isPushSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!(await isPushSupported())) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!(await isPushSupported())) return null
  
  // 1. Request permission
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  // 2. Fetch public VAPID key from backend
  const { vapid_public_key } = await notificationAPI.getVapidPublicKey()
  if (!vapid_public_key) {
    throw new Error('VAPID key not configured on backend')
  }

  // 3. Register push manager
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid_public_key)
  })

  // 4. Send subscription to backend
  await notificationAPI.subscribePush(subscription.toJSON())

  // Trigger custom event to notify components
  window.dispatchEvent(new CustomEvent('push-subscription-change', { detail: subscription }))

  return subscription
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!(await isPushSupported())) return false

  const subscription = await getPushSubscription()
  if (subscription) {
    // 1. Unsubscribe from push manager
    await subscription.unsubscribe()

    // 2. Delete subscription on backend
    await notificationAPI.unsubscribePush(subscription.endpoint)

    // Trigger custom event to notify components
    window.dispatchEvent(new CustomEvent('push-subscription-change', { detail: null }))
    return true
  }
  return false
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Register service worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully with scope:', reg.scope)
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err)
        })
    }

    // Check if running as standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;

    if (isStandalone) {
      return
    }

    // Check device type
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDetected = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(iosDetected)

    if (iosDetected) {
      // Check local storage dismissal (only for iOS popup guide)
      const dismissedTime = localStorage.getItem('pwa-prompt-dismissed')
      if (dismissedTime) {
        const parsedTime = parseInt(dismissedTime, 10)
        const now = Date.now()
        // Do not show again for 3 days if dismissed
        if (now - parsedTime < 3 * 24 * 60 * 60 * 1000) {
          return
        }
      }
      // Show iOS prompt guide automatically
      setShowPrompt(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User choice outcome: ${outcome}`)
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString())
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  // iOS Manual Installation Guide (Bottom Popup)
  if (isIOS) {
    return (
      <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 backdrop-blur-md p-5 shadow-2xl transition-all duration-300 hover:shadow-primary/5">
          {/* Sleek top ambient glow */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary/10 via-primary to-primary/10" />

          {/* Close Button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted/50"
            aria-label="Dismiss prompt"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-4 items-start">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Smartphone className="h-5 w-5" />
            </div>
            
            <div className="flex-1 pr-4">
              <h3 className="font-semibold text-sm leading-none flex items-center gap-1.5 text-foreground">
                Install AV Scheduler
                <Sparkles className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500 animate-pulse" />
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Install the app for quick offline access and direct mobile push notifications.
              </p>

              <div className="mt-3.5 bg-muted/30 rounded-lg p-2.5 border border-border/40 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-[11px] mb-1">To Install on iPhone/iPad:</p>
                <div className="flex items-center gap-1">
                  <span>1. Tap the Safari Share icon</span>
                  <Share className="h-3.5 w-3.5 text-primary inline mx-0.5" />
                </div>
                <div className="flex items-center gap-1">
                  <span>2. Select</span>
                  <span className="font-medium text-foreground flex items-center gap-0.5">
                    "Add to Home Screen" 
                    <PlusSquare className="h-3.5 w-3.5 text-primary inline" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Android / Desktop Action Button (Top Right Header Placement)
  if (!deferredPrompt) return null

  return (
    <div className="fixed top-[20px] right-16 md:right-[72px] z-40 animate-in fade-in duration-300">
      <button
        onClick={handleInstallClick}
        className="hover:bg-accent hover:text-accent-foreground text-foreground transition-all duration-200 rounded-lg flex items-center justify-center h-10 w-10 active:scale-95 border border-border/10 bg-background/50 backdrop-blur-sm shadow-sm"
        title="Install AV Scheduler App"
        aria-label="Install AV Scheduler App"
      >
        <Download className="h-5 w-5 text-primary" />
      </button>
    </div>
  )
}
