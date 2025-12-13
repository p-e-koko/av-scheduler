'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCSRFToken, APIError } from '@/lib/api';

// Use the same API_BASE_URL logic as api.ts (or import it if exported, but for now replicate logic to be safe)
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
let WEB_BASE_URL = 'http://localhost:8000';

if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  if (API_BASE_URL.startsWith('http:')) {
    try {
      const apiObj = new URL(API_BASE_URL);
      if (apiObj.hostname === window.location.hostname) {
        API_BASE_URL = '/api';
        WEB_BASE_URL = ''; // Relative root
      } else {
        API_BASE_URL = API_BASE_URL.replace('http:', 'https:');
        WEB_BASE_URL = API_BASE_URL.replace('/api', '');
      }
    } catch (e) {
      console.error('Error parsing API URL:', e);
    }
  }
}

export default function GoogleCalendarConnect() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: ''
  });

  const connectGoogle = () => {
    // Redirect to backend Web Route for Google OAuth
    window.location.href = `${WEB_BASE_URL}/google/login`;
  };

  const createGoogleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const csrfToken = await getCSRFToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      const response = await fetch(`${API_BASE_URL}/booking/google`, {
        method: 'POST',
        credentials: 'include', // Sanctum session
        headers: headers,
        body: JSON.stringify({
          title: formData.title,
          start: formData.start,
          end: formData.end,
        }),
      });

      if (response.ok) {
        alert('Event created successfully!');
        setFormData({ title: '', start: '', end: '' });
      } else {
        const data = await response.json();
        alert(`Failed to create event: ${data.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg shadow-sm space-y-6 bg-white">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Google Calendar Integration</h2>
          <p className="text-sm text-gray-500">Connect your calendar to sync events</p>
        </div>
        <Button onClick={connectGoogle} variant="outline" size="sm">
          Connect Account
        </Button>
      </div>

      <form onSubmit={createGoogleBooking} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-900" htmlFor="title">Event Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Project Meeting"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-gray-900" htmlFor="start">Start Time</Label>
            <Input
              id="start"
              type="datetime-local"
              value={formData.start}
              onChange={(e) => setFormData({ ...formData, start: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-gray-900" htmlFor="end">End Time</Label>
            <Input
              id="end"
              type="datetime-local"
              value={formData.end}
              onChange={(e) => setFormData({ ...formData, end: e.target.value })}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full md:w-auto">
          {loading ? 'Creating Event...' : 'Create Calendar Event'}
        </Button>
      </form>
    </div>
  );
}
