"use client";

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Info,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Radio,
  RotateCcw,
  Volume2,
  VolumeX,
  XCircle,
} from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';

// Type definitions for Africa's Talking
declare global {
  interface Window {
    Africastalking: {
      Client: new (token: string, options?: any) => any;
    };
  }
}

interface ClientInstance {
  call: (phoneNumber: string) => void;
  answer: () => void;
  hangup: () => void;
  logout?: () => void;
  muteAudio: () => void;
  unmuteAudio: () => void;
  isAudioMuted: () => boolean;
  getCounterpartNum: () => string;
  on: (event: string, callback: (data?: any) => void) => void;
  off?: (event: string, callback: (data?: any) => void) => void;
}

type VoicePanelVariant = 'compact' | 'full';

interface VoicePanelProps {
  variant?: VoicePanelVariant;
}

const API_BASE_URL = '/api';
const PHONE_PREFIX = '+254';
const MAX_CALL_DURATION_SECONDS = 180;
const AGENT_STATUSES = ['available', 'busy', 'away', 'offline', 'on_call'] as const;
type AgentStatus = (typeof AGENT_STATUSES)[number];

interface MissedCall {
  id: number;
  from_number: string | null;
  to_number: string | null;
  status: string;
  updated_at: string;
  handling_status?: 'handled' | 'not_handled';
  agent?: { id: number; name: string } | null;
}

// Persist client across unmounts (e.g., closing drawer / navigating)
let globalVoiceClient: ClientInstance | null = null;
let globalClientToken: string | null = null;
let globalClientName: string | null = null;

export default function VoicePanel({ variant = 'compact' }: VoicePanelProps) {
  const { auth } = usePage<SharedData>().props;
  const currentUserId = auth?.user?.id as number | undefined;
  const [phoneNumber, setPhoneNumber] = React.useState(PHONE_PREFIX);
  const [callStatus, setCallStatus] = React.useState<'idle' | 'connecting' | 'ringing' | 'connected' | 'ended'>('idle');
  const [clientToken, setClientToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isMuted, setIsMuted] = React.useState(false);
  const [clientName, setClientName] = React.useState('');
  const [callDuration, setCallDuration] = React.useState(0);
  const [libraryLoadError, setLibraryLoadError] = React.useState(false);
  const [incomingCallInfo, setIncomingCallInfo] = React.useState<{ from: string; time: Date } | null>(null);
  const [activeCallNumber, setActiveCallNumber] = React.useState('');
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [isDialing, setIsDialing] = React.useState(false);
  const [isEndingCall, setIsEndingCall] = React.useState(false);
  const [isTogglingMute, setIsTogglingMute] = React.useState(false);
  const [agentStatus, setAgentStatus] = React.useState<AgentStatus>(
    ((auth?.user?.status as AgentStatus) || 'offline'),
  );
  const [isStatusSaving, setIsStatusSaving] = React.useState(false);
  const [missedCalls, setMissedCalls] = React.useState<MissedCall[]>([]);
  const [isPlaybookOpen, setIsPlaybookOpen] = React.useState(false);
  const [missedCallsPage, setMissedCallsPage] = React.useState(1);
  const [missedCallsLastPage, setMissedCallsLastPage] = React.useState(1);
  const [missedCallsTotal, setMissedCallsTotal] = React.useState(0);
  const [missedCallsFilter, setMissedCallsFilter] = React.useState<'all' | 'handled' | 'not_handled'>('all');
  const [isLoadingMissedCalls, setIsLoadingMissedCalls] = React.useState(false);
  const [updatingMissedCallId, setUpdatingMissedCallId] = React.useState<number | null>(null);
  const [clientReady, setClientReady] = React.useState(false);
  const [lastHeartbeat, setLastHeartbeat] = React.useState<Date | null>(null);
  const [outboundSessionId, setOutboundSessionId] = React.useState<string | null>(null);

  const sdkClientRef = React.useRef<any | null>(null);
  const clientEventHandlersRef = React.useRef<Array<{ event: string; handler: (data?: any) => void }>>([]);
  const initTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const clientRef = React.useRef<ClientInstance | null>(null);
  const callTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const ringtoneIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const outboundRingbackIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const incomingNotificationRef = React.useRef<Notification | null>(null);
  const notificationPermissionRequestedRef = React.useRef(false);
  const initToastIdRef = React.useRef<string | number | null>(null);
  const heartbeatIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const outboundProgressStatusRef = React.useRef<string | null>(null);
  const [isLibraryLoaded, setIsLibraryLoaded] = React.useState(false);
  const [showIncomingCallAlert, setShowIncomingCallAlert] = React.useState(false);
  const callStatusRef = React.useRef(callStatus);
  const showIncomingCallAlertRef = React.useRef(showIncomingCallAlert);
  const autoEndTriggeredRef = React.useRef(false);

  const showDetails = variant === 'full';
  const refreshPage = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const showRefreshRequiredToast = React.useCallback((reason?: string) => {
    toast.error(
      reason || 'Your session expired. Refresh the page and initialize voice client again.',
      {
        duration: 15000,
        action: {
          label: 'Refresh page',
          onClick: refreshPage,
        },
      },
    );
  }, [refreshPage]);

  const shouldSuggestRefresh = React.useCallback((status: string, payload: any, message: string) => {
    const providerState = String(payload?.provider_state || '').toLowerCase();
    const lowerMessage = message.toLowerCase();
    const sessionHints = ['session', 'expired', 'token', 'unauthorized', 'forbidden', 'csrf', 'login'];
    const hasSessionHint = sessionHints.some((hint) => lowerMessage.includes(hint));
    const missingProviderReason = providerState === '' || providerState === 'null' || providerState === 'undefined';

    return hasSessionHint || (status === 'failed' && missingProviderReason);
  }, []);

  React.useEffect(() => {
    const scriptId = 'africastalking-script';

    const loadLibrary = () => {
      if (document.getElementById(scriptId)) {
        if (window.Africastalking) {
          setIsLibraryLoaded(true);
        }
        return;
      }

      if (typeof window !== 'undefined' && !window.Africastalking) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/africastalking-client@1.0.6/build/africastalking.js';
        script.async = true;
        script.onload = () => {
          setIsLibraryLoaded(true);
          setLibraryLoadError(false);
        };
        script.onerror = () => {
          setLibraryLoadError(true);
          setError('Failed to load voice calling library. Please refresh the page.');
        };
        document.body.appendChild(script);
      } else if (window.Africastalking) {
        setIsLibraryLoaded(true);
      }
    };

    loadLibrary();

    return () => {
      cleanupCall();
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, []);

  // Restore existing client if it was initialized before unmount
  React.useEffect(() => {
    if (globalVoiceClient && globalClientToken && globalClientName) {
      clientRef.current = globalVoiceClient;
      setClientToken(globalClientToken);
      setClientName(globalClientName);
      setClientReady(true);
      setCallStatus('idle');
      setError(null);
    }
  }, []);

  // Heartbeat to keep agent marked as active
  React.useEffect(() => {
    if (clientToken && clientReady && currentUserId && callStatus === 'idle') {
      const sendHeartbeat = async () => {
        try {
          const csrfToken = document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content');
          
          const response = await fetch('/voice/client-health', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-TOKEN': csrfToken || '',
            },
          });
          
          if (response.ok) {
            setLastHeartbeat(new Date());
          }
        } catch (err) {
          console.warn('Heartbeat failed:', err);
        }
      };

      // Send immediately
      sendHeartbeat();
      
      // Then every 30 seconds
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
      
      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [clientToken, clientReady, currentUserId, callStatus]);

  // Poll outbound session state so UI can stop ringing on busy/not-answered outcomes.
  React.useEffect(() => {
    if (!outboundSessionId) return;
    if (!['connecting', 'ringing'].includes(callStatus)) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/voice/calls/${encodeURIComponent(outboundSessionId)}/status`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 419 || response.status === 403) {
            showRefreshRequiredToast('Your session expired. Click Refresh page to reconnect voice calling.');
          }
          return;
        }

        const payload = await response.json();
        if (!payload?.success || !payload?.status) return;

        const nextStatus = String(payload.status).toLowerCase();
        if (outboundProgressStatusRef.current === nextStatus) return;
        outboundProgressStatusRef.current = nextStatus;

        if (nextStatus === 'connected') {
          setCallStatus('connected');
          toast.success('Customer answered. You are now connected.');
          return;
        }

        if (['failed', 'completed', 'missed'].includes(nextStatus)) {
          const message = payload.message || 'Call ended before connection.';
          setCallStatus('idle');
          setActiveCallNumber('');
          setOutboundSessionId(null);

          if (shouldSuggestRefresh(nextStatus, payload, message)) {
            showRefreshRequiredToast('Your time/session expired. You need to refresh. Click the button below.');
          } else {
            toast.error(message);
          }
        }
      } catch {
        // no-op
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2500);
    return () => clearInterval(interval);
  }, [outboundSessionId, callStatus, showRefreshRequiredToast, shouldSuggestRefresh]);

  React.useEffect(() => {
    if (!outboundSessionId) {
      outboundProgressStatusRef.current = null;
    }
  }, [outboundSessionId]);

  const cleanupCall = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    setIsMuted(false);
    setCallDuration(0);
    setActiveCallNumber('');
  };

  const clearInitTimeout = React.useCallback(() => {
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
  }, []);

  const teardownClient = React.useCallback(() => {
    if (sdkClientRef.current) {
      const rawClient = sdkClientRef.current;
      const hasLogout = typeof rawClient.logout === 'function';

      // Remove all event handlers we attached.
      if (typeof rawClient.off === 'function') {
        clientEventHandlersRef.current.forEach(({ event, handler }) => {
          try {
            rawClient.off(event, handler);
          } catch {
            // no-op
          }
        });
      }

      // Force an unregister so SDK internal state can emit `ready` on next init.
      if (typeof rawClient.logout === 'function') {
        try {
          rawClient.logout();
        } catch {
          // no-op
        }
      }

      const teardownMethods = hasLogout ? ['hangup'] : ['hangup', 'disconnect', 'destroy', 'close'];
      teardownMethods.forEach((fn) => {
        if (typeof rawClient[fn] === 'function') {
          try {
            rawClient[fn]();
          } catch {
            // no-op
          }
        }
      });
    }

    sdkClientRef.current = null;
    clientEventHandlersRef.current = [];
    clientRef.current = null;
    globalVoiceClient = null;
    globalClientToken = null;
    globalClientName = null;
    setClientReady(false);
  }, []);

  const startIncomingRingtone = React.useCallback(() => {
    if (ringtoneIntervalRef.current) return;

    const playTone = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new window.AudioContext();
        }

        const context = audioContextRef.current;
        if (context.state === 'suspended') {
          await context.resume();
        }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, context.currentTime);
        gainNode.gain.setValueAtTime(0.0001, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.06, context.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.36);
      } catch {
        // Browser may block autoplay audio; ignore silently.
      }
    };

    playTone();
    ringtoneIntervalRef.current = setInterval(playTone, 1200);
  }, []);

  const stopIncomingRingtone = React.useCallback(() => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  }, []);

  const startOutboundRingback = React.useCallback(() => {
    if (outboundRingbackIntervalRef.current) return;

    const playTone = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new window.AudioContext();
        }

        const context = audioContextRef.current;
        if (context.state === 'suspended') {
          await context.resume();
        }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(425, context.currentTime);
        gainNode.gain.setValueAtTime(0.0001, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.05, context.currentTime + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.85);
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.86);
      } catch {
        // Browser may block autoplay audio; ignore silently.
      }
    };

    playTone();
    outboundRingbackIntervalRef.current = setInterval(playTone, 1300);
  }, []);

  const stopOutboundRingback = React.useCallback(() => {
    if (outboundRingbackIntervalRef.current) {
      clearInterval(outboundRingbackIntervalRef.current);
      outboundRingbackIntervalRef.current = null;
    }
  }, []);

  const closeIncomingBrowserNotification = React.useCallback(() => {
    if (incomingNotificationRef.current) {
      incomingNotificationRef.current.close();
      incomingNotificationRef.current = null;
    }
  }, []);

  const requestNotificationPermission = React.useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (notificationPermissionRequestedRef.current) return;

    notificationPermissionRequestedRef.current = true;
    try {
      await Notification.requestPermission();
    } catch {
      // no-op
    }
  }, []);

  const showIncomingBrowserNotification = React.useCallback((from: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    closeIncomingBrowserNotification();
    const notification = new Notification('Incoming Call', {
      body: `From: ${from}`,
      tag: 'incoming-call',
      requireInteraction: true,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    incomingNotificationRef.current = notification;
  }, [closeIncomingBrowserNotification]);

  React.useEffect(() => {
    callStatusRef.current = callStatus;
    if (callStatus === 'connected') {
      autoEndTriggeredRef.current = false;
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      if (callStatus === 'idle') {
        setCallDuration(0);
      }
      autoEndTriggeredRef.current = false;
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
      stopIncomingRingtone();
      stopOutboundRingback();
      closeIncomingBrowserNotification();
      clearInitTimeout();
    };
  }, [callStatus, stopIncomingRingtone, stopOutboundRingback, closeIncomingBrowserNotification, clearInitTimeout]);

  React.useEffect(() => {
    if (callStatus !== 'connected') return;
    if (callDuration < MAX_CALL_DURATION_SECONDS) return;
    if (autoEndTriggeredRef.current) return;

    autoEndTriggeredRef.current = true;
    toast.info('Maximum call time (3 minutes) reached. Ending call.');
    void hangUp();
  }, [callStatus, callDuration]);

  React.useEffect(() => {
    if (callStatus === 'ringing' && outboundSessionId) {
      startOutboundRingback();
      return;
    }

    stopOutboundRingback();
  }, [callStatus, outboundSessionId, startOutboundRingback, stopOutboundRingback]);
  
  React.useEffect(() => {
    showIncomingCallAlertRef.current = showIncomingCallAlert;
  }, [showIncomingCallAlert]);

  React.useEffect(() => {
    return () => {
      stopIncomingRingtone();
      stopOutboundRingback();
      closeIncomingBrowserNotification();
      clearInitTimeout();
      teardownClient();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // no-op
        });
        audioContextRef.current = null;
      }
    };
  }, [stopIncomingRingtone, stopOutboundRingback, closeIncomingBrowserNotification, clearInitTimeout, teardownClient]);

  const syncAgentStatus = React.useCallback(async (status: AgentStatus, silent = true) => {
    if (!currentUserId) return;

    try {
      setIsStatusSaving(true);
      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');
      const response = await fetch('/voice/agent-status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken || '',
        },
        body: JSON.stringify({
          status,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update status');
      }
      if (!silent) {
        toast.success(`Status set to ${status.replace('_', ' ')}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update agent status');
      toast.error(err.message || 'Failed to update agent status');
    } finally {
      setIsStatusSaving(false);
    }
  }, [currentUserId]);

  const loadMissedCalls = React.useCallback(async (page = 1, filter = missedCallsFilter) => {
    try {
      setIsLoadingMissedCalls(true);
      const params = new URLSearchParams({
        page: String(page),
        per_page: '10',
      });
      if (filter !== 'all') {
        params.set('handling_status', filter);
      }

      const response = await fetch(`/voice/missed-calls?${params.toString()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) return;

      const payload = await response.json();
      if (payload.success) {
        setMissedCalls(payload.calls ?? []);
        setMissedCallsPage(payload.pagination?.current_page ?? 1);
        setMissedCallsLastPage(payload.pagination?.last_page ?? 1);
        setMissedCallsTotal(payload.pagination?.total ?? 0);
      }
    } catch {
      // no-op
    } finally {
      setIsLoadingMissedCalls(false);
    }
  }, [missedCallsFilter]);

  React.useEffect(() => {
    loadMissedCalls(missedCallsPage, missedCallsFilter);
    const interval = setInterval(() => loadMissedCalls(missedCallsPage, missedCallsFilter), 30000);
    return () => clearInterval(interval);
  }, [loadMissedCalls, missedCallsPage, missedCallsFilter]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingCallTime = formatDuration(Math.max(0, MAX_CALL_DURATION_SECONDS - callDuration));

  const validatePhoneNumber = (number: string): boolean => {
    const phoneRegex = /^\+254\d{9}$/;
    return phoneRegex.test(number);
  };

  const initializeClient = async (forceFreshClient = false) => {
    if (isInitializing) return;

    if (clientRef.current && clientToken && clientReady) {
      setCallStatus('idle');
      return;
    }

    try {
      setError(null);
      setIsInitializing(true);
      setClientReady(false);
      clearInitTimeout();
      teardownClient();
      
      // Allow previous client teardown/unregister to settle before creating a new one.
      await new Promise((resolve) => setTimeout(resolve, 350));
      requestNotificationPermission();
      
      initToastIdRef.current = toast.loading('Initializing call client...');
      initTimeoutRef.current = setTimeout(() => {
        setError('Initialization timed out. Please try again.');
        setIsInitializing(false);
        setClientReady(false);
        if (initToastIdRef.current !== null) {
          toast.error('Initialization timed out. Please try again.', { id: initToastIdRef.current });
          initToastIdRef.current = null;
        }
      }, 15000);

      // Get stored client name from localStorage
      const storedClientName = !forceFreshClient && currentUserId
        ? localStorage.getItem(`voice_client_${currentUserId}`)
        : null;
      
      console.info('[VoicePanel] Initializing with stored client:', storedClientName);

      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

      const response = await fetch('/voice/generate-webrtc-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken || '',
        },
        body: JSON.stringify({
          agent_user_id: currentUserId,
          client_name: storedClientName || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.info('[VoicePanel] token response', {
        success: data?.success,
        hasToken: Boolean(data?.token),
        clientName: data?.clientName,
      });

      if (!data.success) {
        throw new Error(data.error || 'Failed to get capability token');
      }

      if (!data.token) {
        throw new Error('No token received from server');
      }

      setClientToken(data.token);
      setClientName(data.clientName || `agent_${Date.now()}`);
      
      // Store client name for this agent
      if (data.clientName && currentUserId) {
        localStorage.setItem(`voice_client_${currentUserId}`, data.clientName);
      }

      if (window.Africastalking) {
        console.info('[VoicePanel] creating Africastalking client');
        const client = new window.Africastalking.Client(data.token);

        // Create a promise that resolves when client is ready
        await new Promise((resolve, reject) => {
          const readyTimeout = setTimeout(() => {
            reject(new Error('Client ready timeout'));
          }, 10000);

          const handleReady = () => {
            console.info('[VoicePanel] sdk event: ready');
            clearTimeout(readyTimeout);
            setClientReady(true);
            setCallStatus('idle');
            setError(null);
            setIsInitializing(false);
            clearInitTimeout();
            
            if (agentStatus !== 'available') {
              setAgentStatus('available');
              syncAgentStatus('available');
            }
            
            toast.success('Voice client initialized and ready', {
              id: initToastIdRef.current ?? undefined,
            });
            initToastIdRef.current = null;
            
            resolve(true);
          };

          // Set up other handlers
          const handleIncomingCall = (call: any) => {
            console.info('[VoicePanel] sdk event: incomingcall', { from: call?.from });
            const from = call.from || 'Unknown';
            const currentStatus = callStatusRef.current;

            // If this is the callback leg from an outbound call, auto-answer immediately
            if (currentStatus === 'connecting' || currentStatus === 'ringing' || currentStatus === 'connected') {
              setActiveCallNumber(from);
              setCallStatus('connected');
              setTimeout(() => {
                answerIncomingCall();
              }, 200);
              return;
            }

            setIncomingCallInfo({
              from,
              time: new Date(),
            });
            setShowIncomingCallAlert(true);
            setCallStatus('ringing');
            setActiveCallNumber(from);
            startIncomingRingtone();
            showIncomingBrowserNotification(from);
            toast.info(`Incoming call from ${from}`);

            // For true inbound calls, allow user to answer (auto-answer after 15s)
            setTimeout(() => {
              if (callStatusRef.current === 'ringing' && showIncomingCallAlertRef.current) {
                answerIncomingCall();
              }
            }, 15000);
          };

          const handleCallAccepted = () => {
            console.info('[VoicePanel] sdk event: callaccepted');
            stopIncomingRingtone();
            stopOutboundRingback();
            closeIncomingBrowserNotification();
            setCallStatus('connected');
            setShowIncomingCallAlert(false);
            setIncomingCallInfo(null);
            toast.success('Call connected');
          };

          const handleCallEnded = () => {
            console.info('[VoicePanel] sdk event: callended');
            stopIncomingRingtone();
            stopOutboundRingback();
            closeIncomingBrowserNotification();
            setCallStatus('ended');
            setIsMuted(false);
            setShowIncomingCallAlert(false);
            setIncomingCallInfo(null);
            setAgentStatus('available');
            syncAgentStatus('available');
            setTimeout(() => {
              setCallStatus('idle');
              setActiveCallNumber('');
            }, 2000);
            toast.info('Call ended');
          };

          const handleCallFailed = (err: any) => {
            console.warn('[VoicePanel] sdk event: callfailed', err);
            stopIncomingRingtone();
            stopOutboundRingback();
            closeIncomingBrowserNotification();
            setError(`Call failed: ${err.message || 'Unknown error'}`);
            toast.error(`Call failed: ${err.message || 'Unknown error'}`);
            setCallStatus('idle');
            setShowIncomingCallAlert(false);
            setIncomingCallInfo(null);
            setActiveCallNumber('');
            setAgentStatus('available');
            syncAgentStatus('available');
            clearInitTimeout();
            if (initToastIdRef.current !== null) {
              toast.error('Call setup failed', { id: initToastIdRef.current });
              initToastIdRef.current = null;
            }
          };

          const handleHangup = () => {
            handleCallEnded();
          };

          const handleNotReady = () => {
            console.warn('[VoicePanel] sdk event: notready');
            stopIncomingRingtone();
            stopOutboundRingback();
            closeIncomingBrowserNotification();
            setError('Client connection lost. Please reinitialize.');
            toast.error('Client connection lost. Please reinitialize.');
            setCallStatus('idle');
            setClientReady(false);
            clearInitTimeout();
            if (initToastIdRef.current !== null) {
              toast.error('Client connection lost. Please reinitialize.', { id: initToastIdRef.current });
              initToastIdRef.current = null;
            }
          };

          const handleOffline = () => {
            console.warn('[VoicePanel] sdk event: offline');
            stopIncomingRingtone();
            stopOutboundRingback();
            closeIncomingBrowserNotification();
            setError('Connection lost. Please reinitialize the client.');
            toast.error('Connection lost. Please reinitialize the client.');
            setCallStatus('idle');
            setClientToken(null);
            setClientReady(false);
            setAgentStatus('offline');
            syncAgentStatus('offline');
            clearInitTimeout();
            if (initToastIdRef.current !== null) {
              toast.error('Connection lost. Please reinitialize the client.', { id: initToastIdRef.current });
              initToastIdRef.current = null;
            }
          };

          const handlers: Array<{ event: string; handler: (data?: any) => void }> = [
            { event: 'ready', handler: handleReady },
            { event: 'incomingcall', handler: handleIncomingCall },
            { event: 'callaccepted', handler: handleCallAccepted },
            { event: 'callended', handler: handleCallEnded },
            { event: 'callfailed', handler: handleCallFailed },
            { event: 'hangup', handler: handleHangup },
            { event: 'notready', handler: handleNotReady },
            { event: 'offline', handler: handleOffline },
          ];
          
          handlers.forEach(({ event, handler }) => {
            client.on(event, handler);
          });
          
          clientEventHandlersRef.current = handlers;
          sdkClientRef.current = client;

          clientRef.current = {
            call: (number: string) => client.call(number),
            answer: () => client.answer(),
            hangup: () => client.hangup(),
            logout: client.logout ? () => client.logout() : undefined,
            muteAudio: () => client.muteAudio(),
            unmuteAudio: () => client.unmuteAudio(),
            isAudioMuted: () => client.isAudioMuted(),
            getCounterpartNum: () => client.getCounterpartNum(),
            on: (event: string, callback: (data?: any) => void) => client.on(event, callback),
            off: client.off ? (event: string, callback: (data?: any) => void) => client.off(event, callback) : undefined,
          };

          globalVoiceClient = clientRef.current;
          globalClientToken = data.token;
          globalClientName = data.clientName || `agent_${Date.now()}`;
        });
      } else {
        throw new Error('Africa\'s Talking library not loaded');
      }
    } catch (err: any) {
      const message = err?.message || 'Failed to initialize call client';
      clearInitTimeout();
      teardownClient();

      // Retry once with a fresh client identity if SDK reports stale session/ws state.
      const shouldRetryWithFreshClient =
        !forceFreshClient &&
        /session creation|ready timeout|websocket is already in closing or closed state|notready|offline/i.test(
          String(message),
        );

      if (shouldRetryWithFreshClient) {
        if (currentUserId) {
          localStorage.removeItem(`voice_client_${currentUserId}`);
        }
        toast.info('Session state was stale. Retrying with a fresh client session...');
        setIsInitializing(false);
        setClientReady(false);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return initializeClient(true);
      }

      setError(message);
      setIsInitializing(false);
      setClientReady(false);
      toast.error(message, {
        id: initToastIdRef.current ?? undefined,
      });
      initToastIdRef.current = null;
    }
  };

  const answerIncomingCall = () => {
    try {
      if (!clientRef.current) {
        setError('Client not initialized');
        return;
      }

      stopIncomingRingtone();
      stopOutboundRingback();
      closeIncomingBrowserNotification();
      clientRef.current.answer();
      setCallStatus('connected');
      setShowIncomingCallAlert(false);
      setIncomingCallInfo(null);
      setAgentStatus('on_call');
      syncAgentStatus('on_call');
      toast.success('Incoming call answered');
    } catch {
      setError('Failed to answer incoming call');
      toast.error('Failed to answer incoming call');
      setCallStatus('idle');
    }
  };

  const rejectIncomingCall = () => {
    try {
      stopIncomingRingtone();
      stopOutboundRingback();
      closeIncomingBrowserNotification();
      if (clientRef.current) {
        clientRef.current.hangup();
      }
      setShowIncomingCallAlert(false);
      setIncomingCallInfo(null);
      setCallStatus('idle');
      setAgentStatus('available');
      syncAgentStatus('available');
      toast('Incoming call rejected');
    } catch {
      // no-op
    }
  };

  const makeCall = async () => {
    if (!phoneNumber) {
      setError('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number in international format');
      return;
    }

    if (!clientReady) {
      setError('Client not ready. Please wait for initialization to complete.');
      return;
    }

    try {
      setError(null);
      setCallStatus('connecting');
      setActiveCallNumber(phoneNumber);
      setIsDialing(true);

      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

      const response = await fetch(`${API_BASE_URL}/voice/make-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken || '',
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          client_name: clientName,
          agent_user_id: currentUserId,
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to make call');
      }

      setOutboundSessionId(data.session_id || null);
      outboundProgressStatusRef.current = null;
      setCallStatus('ringing');
      setAgentStatus('on_call');
      syncAgentStatus('on_call');
      toast.info(`Calling ${phoneNumber}...`);
    } catch (err: any) {
      setError(err.message || 'Failed to make call');
      toast.error(err.message || 'Failed to make call');
      setCallStatus('idle');
      setActiveCallNumber('');
      setOutboundSessionId(null);
    } finally {
      setIsDialing(false);
    }
  };

  const hangUp = async () => {
    try {
      setIsEndingCall(true);
      stopIncomingRingtone();
      stopOutboundRingback();
      closeIncomingBrowserNotification();
      if (clientRef.current) {
        clientRef.current.hangup();
      }
      setCallStatus('idle');
      setIsMuted(false);
      setShowIncomingCallAlert(false);
      setIncomingCallInfo(null);
      setActiveCallNumber('');
      setOutboundSessionId(null);
      setAgentStatus('available');
      syncAgentStatus('available');
    } catch {
      setError('Failed to hang up call');
      toast.error('Failed to hang up call');
    } finally {
      setIsEndingCall(false);
    }
  };

  const toggleMute = async () => {
    try {
      setIsTogglingMute(true);
      if (clientRef.current) {
        if (isMuted) {
          clientRef.current.unmuteAudio();
          toast.info('Microphone unmuted');
        } else {
          clientRef.current.muteAudio();
          toast('Microphone muted');
        }
        setIsMuted(!isMuted);
      }
    } catch {
      setError('Failed to toggle mute');
      toast.error('Failed to toggle mute');
    } finally {
      setIsTogglingMute(false);
    }
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'connecting':
      case 'ringing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ended':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing Customer...';
      case 'connected':
        return 'Connected';
      case 'ended':
        return 'Call Ended';
      default:
        return clientReady ? 'Ready' : 'Not Ready';
    }
  };

  const getStatusIcon = () => {
    switch (callStatus) {
      case 'connected':
        return <Radio className="h-4 w-4 animate-pulse" />;
      case 'connecting':
      case 'ringing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'ended':
        return <PhoneOff className="h-4 w-4" />;
      default:
        return <Phone className="h-4 w-4" />;
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    let normalizedDigits = digits;

    while (normalizedDigits.startsWith('254')) {
      normalizedDigits = normalizedDigits.slice(3);
    }
    if (normalizedDigits.startsWith('0')) {
      normalizedDigits = normalizedDigits.slice(1);
    }

    normalizedDigits = normalizedDigits.slice(0, 9);
    setPhoneNumber(`${PHONE_PREFIX}${normalizedDigits}`);
  };

  const copyPhoneNumber = async (value: string | null) => {
    if (!value) {
      toast.error('No phone number to copy');
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast.success('Phone number copied');
    } catch {
      toast.error('Failed to copy phone number');
    }
  };

  const handleAgentStatusChange = (nextStatus: AgentStatus) => {
    setAgentStatus(nextStatus);
    syncAgentStatus(nextStatus, false);
  };

  const playbookSteps = [
    'Initialize your client once at the beginning of shift',
    'Set your availability so routing sends calls to the right agents',
    'Dial numbers in international format (+254...)',
    'Use mute controls for privacy without dropping the call',
    'Watch timer and live status to keep call handling consistent',
    'End call cleanly and return to Available',
  ];

  const updateMissedCallHandlingStatus = async (
    id: number,
    handlingStatus: 'handled' | 'not_handled',
  ) => {
    try {
      setUpdatingMissedCallId(id);
      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');
      const response = await fetch(`/voice/missed-calls/${id}/handling-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': csrfToken || '',
        },
        body: JSON.stringify({
          handling_status: handlingStatus,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to update handling status');
      }

      setMissedCalls((prev) =>
        prev.map((call) =>
          call.id === id ? { ...call, handling_status: handlingStatus } : call,
        ),
      );
      toast.success(`Call marked as ${handlingStatus === 'handled' ? 'Handled' : 'Not Handled'}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update handling status');
    } finally {
      setUpdatingMissedCallId(null);
    }
  };

  const resetClient = () => {
    cleanupCall();
    stopIncomingRingtone();
    stopOutboundRingback();
    closeIncomingBrowserNotification();
    clearInitTimeout();
    teardownClient();
    setClientToken(null);
    setClientName('');
    setClientReady(false);
    setPhoneNumber(PHONE_PREFIX);
    setError(null);
    setIsInitializing(false);
    setCallStatus('idle');
    setIncomingCallInfo(null);
    setShowIncomingCallAlert(false);
    setActiveCallNumber('');
    setOutboundSessionId(null);
    setAgentStatus('offline');
    syncAgentStatus('offline');
    
    // Clear stored client name
    if (currentUserId) {
      localStorage.removeItem(`voice_client_${currentUserId}`);
    }
    
    toast('Voice client reset');
  };

  return (
    <div className={showDetails ? 'space-y-6 p-4' : 'space-y-4'}>
      {libraryLoadError && (
        <Alert variant="destructive" className="animate-in fade-in duration-300">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load voice calling library. Please refresh the page or check your internet connection.
          </AlertDescription>
        </Alert>
      )}

      {showIncomingCallAlert && incomingCallInfo && (
        <Alert className="border-blue-300 bg-blue-50 animate-in slide-in-from-top duration-300">
          <PhoneIncoming className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="flex flex-col gap-2">
              <div className="font-semibold">Incoming Call!</div>
              <div>From: {incomingCallInfo.from}</div>
              <div className="flex gap-2 mt-2">
                <Button onClick={answerIncomingCall} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Phone className="h-4 w-4 mr-2" />
                  Answer
                </Button>
                <Button onClick={rejectIncomingCall} size="sm" variant="destructive">
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
              <div className="text-xs text-blue-600 mt-1">Auto-answering in 15 seconds...</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {showDetails && (
        <div className="grid gap-3 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System</CardDescription>
              <CardTitle className="text-sm">Library</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={isLibraryLoaded ? 'default' : 'secondary'}>
                {isLibraryLoaded ? '✓ Loaded' : '✗ Not Loaded'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System</CardDescription>
              <CardTitle className="text-sm">Client</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={clientToken ? 'default' : 'secondary'}>
                {clientToken ? '✓ Initialized' : '✗ Not Initialized'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System</CardDescription>
              <CardTitle className="text-sm">Ready State</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={clientReady ? 'default' : 'secondary'} className={clientReady ? 'bg-green-600' : ''}>
                {clientReady ? '✓ Ready' : '⏳ Waiting'}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>System</CardDescription>
              <CardTitle className="text-sm">Call Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className={`${getStatusColor()} border`}>
                {getStatusText()}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Agent</CardDescription>
              <CardTitle className="text-sm">Client Name</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-mono truncate" title={clientName}>
                {clientName ? clientName.substring(0, 15) + '...' : 'None'}
              </p>
              {lastHeartbeat && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last seen: {lastHeartbeat.toLocaleTimeString()}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className={showDetails ? 'grid gap-6 lg:grid-cols-3' : 'grid gap-4'}>
        <div className={showDetails ? 'lg:col-span-2' : ''}>
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">Live Call Workspace</CardTitle>
                  <CardDescription>Everything agents need to place, receive, and control calls quickly.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsPlaybookOpen(true)}>
                    Agent Playbook
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resetClient}
                    title="Reset Client"
                    disabled={!clientToken}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                  <Badge variant="outline" className={`${getStatusColor()} border text-sm px-3 py-1`}>
                    <span className="flex items-center gap-2">
                      {getStatusIcon()}
                      {getStatusText()}
                    </span>
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {clientName && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700">
                      <strong>Voice Agent:</strong> {clientName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${clientReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <div className="text-xs text-blue-600">{clientReady ? 'Ready' : 'Initializing...'}</div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label className="text-sm font-medium">Agent Availability</Label>
                <Select 
                  value={agentStatus} 
                  onValueChange={(value) => handleAgentStatusChange(value as AgentStatus)}
                  disabled={!clientReady}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Set your status" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {isStatusSaving ? 'Saving status...' : 'Incoming calls are routed only to agents marked as available.'}
                </p>
              </div>

              {activeCallNumber && (callStatus === 'connecting' || callStatus === 'ringing' || callStatus === 'connected') && (
                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-indigo-600" />
                      <span className="text-indigo-700 font-medium">
                        {callStatus === 'connected' ? 'Connected to:' : 'Calling:'}
                      </span>
                    </div>
                    <span className="text-indigo-900 font-semibold">{activeCallNumber}</span>
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="animate-in fade-in duration-300">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {!clientToken && !error && (
                <Alert className="border-blue-300 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    Click "Initialize Call Client" to start. You&apos;ll need to allow microphone permissions when prompted.
                  </AlertDescription>
                </Alert>
              )}

              {!clientToken && (
                <Button
                  onClick={() => initializeClient()}
                  disabled={!isLibraryLoaded || libraryLoadError || isInitializing}
                  className="w-full"
                  size="lg"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Initializing...
                    </>
                  ) : isLibraryLoaded ? (
                    <>
                      <Phone className="mr-2 h-5 w-5" />
                      Initialize Call Client
                    </>
                  ) : (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading Library...
                    </>
                  )}
                </Button>
              )}

              {clientToken && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+254712345678"
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      onFocus={() => {
                        if (!phoneNumber.startsWith(PHONE_PREFIX)) {
                          setPhoneNumber(PHONE_PREFIX);
                        }
                      }}
                      disabled={callStatus !== 'idle' || !clientReady}
                      className="text-lg h-12"
                      pattern="^\+254\d{9}$"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        Enter number in international format (e.g., +254712345678)
                      </p>
                      {phoneNumber && !validatePhoneNumber(phoneNumber) && (
                        <p className="text-xs text-red-500">Invalid format</p>
                      )}
                    </div>
                  </div>

                  {callStatus === 'idle' && (
                    <Button
                      onClick={makeCall}
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                      disabled={!phoneNumber || !validatePhoneNumber(phoneNumber) || isDialing || !clientReady}
                    >
                      {isDialing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Dialing...
                        </>
                      ) : (
                        <>
                          <Phone className="mr-2 h-5 w-5" />
                          Make Call
                        </>
                      )}
                    </Button>
                  )}

                  {(callStatus === 'connecting' || callStatus === 'ringing' || callStatus === 'connected') && (
                    <div className="space-y-4">
                      {callStatus === 'connected' && (
                        <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200 animate-in fade-in duration-300">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-green-700">Connected - Live Call</p>
                              <div className="flex items-center justify-center gap-2 text-2xl font-bold text-green-800">
                                <Clock className="h-6 w-6" />
                                {formatDuration(callDuration)}
                              </div>
                              <div className="flex justify-center">
                                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                                  Time Left: {remainingCallTime} / 03:00
                                </Badge>
                              </div>
                              <p className="text-xs text-green-600">You can now talk with the client</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {(callStatus === 'connecting' || callStatus === 'ringing') && (
                        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                            <p className="text-yellow-700 font-medium">
                              {callStatus === 'connecting' ? 'Connecting to server...' : 'Ringing...'}
                            </p>
                            <p className="text-sm text-yellow-600">Calling: {activeCallNumber}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          onClick={hangUp}
                          variant="destructive"
                          size="lg"
                          className="col-span-2"
                          disabled={isEndingCall}
                        >
                          {isEndingCall ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Ending...
                            </>
                          ) : (
                            <>
                              <PhoneOff className="mr-2 h-5 w-5" />
                              {callStatus === 'connected' ? 'End Call' : 'Cancel Call'}
                            </>
                          )}
                        </Button>

                        {callStatus === 'connected' && (
                          <Button
                            onClick={toggleMute}
                            variant={isMuted ? 'destructive' : 'outline'}
                            size="lg"
                            className="col-span-2"
                            disabled={isTogglingMute}
                          >
                            {isTogglingMute ? (
                              <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Updating audio...
                              </>
                            ) : isMuted ? (
                              <>
                                <VolumeX className="mr-2 h-5 w-5" />
                                Unmute Microphone
                              </>
                            ) : (
                              <>
                                <Volume2 className="mr-2 h-5 w-5" />
                                Mute Microphone
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {showDetails && (
          <div className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PhoneIncoming className="h-5 w-5" />
                  Missed Calls Queue
                </CardTitle>
                <CardDescription>
                  Newest calls first. Mark each call as handled or not handled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Select
                    value={missedCallsFilter}
                    onValueChange={(value: 'all' | 'handled' | 'not_handled') => {
                      setMissedCallsFilter(value);
                      setMissedCallsPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="not_handled">Not Handled</SelectItem>
                      <SelectItem value="handled">Handled</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Total: {missedCallsTotal}</p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingMissedCalls ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : missedCalls.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No missed calls found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      missedCalls.map((call) => (
                        <TableRow key={call.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span>{call.from_number || 'Unknown'}</span>
                              {call.from_number && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => copyPhoneNumber(call.from_number)}
                                  title="Copy phone number"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{call.agent?.name || 'Unassigned'}</TableCell>
                          <TableCell>{new Date(call.updated_at).toLocaleString()}</TableCell>
                          <TableCell>
                            <Select
                              value={call.handling_status ?? 'not_handled'}
                              onValueChange={(value: 'handled' | 'not_handled') =>
                                updateMissedCallHandlingStatus(call.id, value)
                              }
                              disabled={updatingMissedCallId === call.id}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_handled">Not Handled</SelectItem>
                                <SelectItem value="handled">Handled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Page {missedCallsPage} of {missedCallsLastPage}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={missedCallsPage <= 1}
                      onClick={() => setMissedCallsPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={missedCallsPage >= missedCallsLastPage}
                      onClick={() =>
                        setMissedCallsPage((prev) => Math.min(missedCallsLastPage, prev + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-orange-700">
            {[
              'If calls fail immediately, reinitialize the voice client',
              'If audio is missing, confirm browser microphone permission',
              'If dialing fails, verify number is in E.164 format (+countrycode)',
              'If routing is inconsistent, confirm your status is Available',
              'If provider errors persist, verify account credits and provider status'
            ].map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-orange-500 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Drawer open={isPlaybookOpen} onOpenChange={setIsPlaybookOpen}>
        <DrawerContent className="max-h-[80vh]">
          <DrawerHeader>
            <DrawerTitle className="text-xl font-semibold flex items-center gap-2">
              <Info className="h-5 w-5" />
              Agent Playbook
            </DrawerTitle>
            <DrawerDescription>
              A quick, repeatable flow for consistent high-quality calls.
            </DrawerDescription>
          </DrawerHeader>
          <ol className="space-y-3 px-4 pb-4 text-sm">
            {playbookSteps.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                  {index + 1}
                </span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
