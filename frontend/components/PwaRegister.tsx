"use client"

import { useEffect } from 'react'
import { notificationAPI } from '@/lib/api'

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

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered successfully with scope:', reg.scope)
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err)
        })
    }
  }, [])

  return null
}
