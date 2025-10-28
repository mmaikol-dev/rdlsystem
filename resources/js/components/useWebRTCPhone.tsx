import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';

// Africa's Talking WebRTC SDK types
interface ATClient {
  connect: (token: string) => void;
  disconnect: () => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  makeCall: (phoneNumber: string) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  hangup: () => void;
  sendDigits: (digits: string) => void;
}

declare global {
  interface Window {
    AfricasTalkingWebRTC?: {
      Client: new () => ATClient;
    };
  }
}

export type CallStatus = 'Idle' | 'Connecting' | 'Ringing' | 'InCall' | 'Ending';

interface IncomingCall {
  from: string;
  timestamp: Date;
}

export function useWebRTCPhone() {
  const [callStatus, setCallStatus] = useState<CallStatus>('Idle');
  const [currentNumber, setCurrentNumber] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incomingCalls, setIncomingCalls] = useState<IncomingCall[]>([]);
  const [currentIncomingCall, setCurrentIncomingCall] = useState<string | null>(null);

  const clientRef = useRef<ATClient | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCallRef = useRef<string | null>(null);

  // Initialize WebRTC client
  const initializeClient = useCallback(async () => {
    try {
      // Fetch WebRTC token from backend
      const response = await fetch('/api/webrtc-token', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch WebRTC token');
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received');
      }

      // Check if WebRTC SDK is loaded
      if (!window.AfricasTalkingWebRTC) {
        throw new Error('Africa\'s Talking WebRTC SDK not loaded');
      }

      // Create and connect client
      const client = new window.AfricasTalkingWebRTC.Client();
      clientRef.current = client;

      // Set up event listeners
      client.on('connected', () => {
        console.log('WebRTC connected');
        setIsConnected(true);
        setError(null);
      });

      client.on('disconnected', () => {
        console.log('WebRTC disconnected');
        setIsConnected(false);
        setCallStatus('Idle');
      });

      client.on('incomingCall', (call: any) => {
        console.log('Incoming call from:', call.from);
        setCurrentIncomingCall(call.from);
        setIncomingCalls(prev => [...prev, { from: call.from, timestamp: new Date() }]);
        setCallStatus('Ringing');
        
        // Play ringtone or show notification
        playRingtone();
      });

      client.on('callConnected', () => {
        console.log('Call connected');
        setCallStatus('InCall');
        startTimer();
      });

      client.on('callEnded', () => {
        console.log('Call ended');
        stopTimer();
        setCallStatus('Idle');
        setCurrentNumber('');
        currentCallRef.current = null;
        
        // Log call
        logCall('ended');
      });

      client.on('error', (err: any) => {
        console.error('WebRTC error:', err);
        setError(err.message || 'An error occurred');
        setCallStatus('Idle');
      });

      // Connect with token
      client.connect(data.token);

    } catch (err: any) {
      console.error('Failed to initialize WebRTC:', err);
      setError(err.message);
      setIsConnected(false);
    }
  }, []);

  // Start call timer
  const startTimer = () => {
    setCallDuration(0);
    timerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // Stop call timer
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Play ringtone
  const playRingtone = () => {
    // You can add custom ringtone audio here
    const audio = new Audio('/sounds/ringtone.mp3');
    audio.loop = true;
    audio.play().catch(console.error);
    
    // Stop ringtone after 30 seconds or when call is answered
    setTimeout(() => audio.pause(), 30000);
  };

  // Make outgoing call
  const makeCall = useCallback((phoneNumber: string) => {
    if (!clientRef.current || !isConnected) {
      setError('Not connected to call service');
      return;
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Please enter a phone number');
      return;
    }

    try {
      console.log('Making call to:', phoneNumber);
      setCurrentNumber(phoneNumber);
      setCallStatus('Connecting');
      currentCallRef.current = phoneNumber;
      
      clientRef.current.makeCall(phoneNumber);
      
      // Log call attempt
      logCall('outgoing', phoneNumber);
    } catch (err: any) {
      console.error('Failed to make call:', err);
      setError(err.message);
      setCallStatus('Idle');
    }
  }, [isConnected]);

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (!clientRef.current || !currentIncomingCall) return;

    try {
      console.log('Accepting call from:', currentIncomingCall);
      setCurrentNumber(currentIncomingCall);
      clientRef.current.acceptCall();
      
      // Log call
      logCall('incoming', currentIncomingCall);
    } catch (err: any) {
      console.error('Failed to accept call:', err);
      setError(err.message);
    }
  }, [currentIncomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!clientRef.current || !currentIncomingCall) return;

    try {
      console.log('Rejecting call from:', currentIncomingCall);
      clientRef.current.rejectCall();
      setCurrentIncomingCall(null);
      setCallStatus('Idle');
    } catch (err: any) {
      console.error('Failed to reject call:', err);
      setError(err.message);
    }
  }, [currentIncomingCall]);

  // End active call
  const endCall = useCallback(() => {
    if (!clientRef.current) return;

    try {
      console.log('Ending call');
      setCallStatus('Ending');
      clientRef.current.hangup();
    } catch (err: any) {
      console.error('Failed to end call:', err);
      setError(err.message);
      setCallStatus('Idle');
    }
  }, []);

  // Send DTMF tones
  const sendDigits = useCallback((digits: string) => {
    if (!clientRef.current || callStatus !== 'InCall') return;

    try {
      clientRef.current.sendDigits(digits);
    } catch (err: any) {
      console.error('Failed to send digits:', err);
    }
  }, [callStatus]);

  // Log call to backend
  const logCall = async (type: 'outgoing' | 'incoming' | 'ended', phoneNumber?: string) => {
    try {
      await fetch('/api/log-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber || currentNumber,
          call_type: type === 'outgoing' ? 'outgoing' : 'incoming',
          call_status: type === 'ended' ? 'ended' : 'connected',
          duration: callDuration,
        }),
      });
    } catch (err) {
      console.error('Failed to log call:', err);
    }
  };

  // Format call duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize on mount
  useEffect(() => {
    initializeClient();

    return () => {
      stopTimer();
      if (clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [initializeClient]);

  return {
    callStatus,
    currentNumber,
    setCurrentNumber,
    callDuration: formatDuration(callDuration),
    isConnected,
    error,
    incomingCalls,
    currentIncomingCall,
    makeCall,
    acceptCall,
    rejectCall,
    endCall,
    sendDigits,
    reconnect: initializeClient,
  };
}