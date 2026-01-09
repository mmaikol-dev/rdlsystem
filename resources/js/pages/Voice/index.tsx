"use client";

import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Phone,
    PhoneOff,
    PhoneIncoming,
    Mic,
    MicOff,
    Loader2,
    CheckCircle2,
    XCircle,
    Radio,
    Clock,
    User,
    Hash,
    AlertCircle,
    Info,
    Volume2,
    VolumeX,
    Play,
    Pause
} from 'lucide-react';
import * as React from 'react';

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
    muteAudio: () => void;
    unmuteAudio: () => void;
    isAudioMuted: () => boolean;
    getCounterpartNum: () => string;
    on: (event: string, callback: (data?: any) => void) => void;
    off?: (event: string, callback: (data?: any) => void) => void;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Call Center', href: '/voice' },
];

// API Base URL - automatically uses current domain
const API_BASE_URL = typeof window !== 'undefined' ? window.location.origin + '/api' : '';

export default function VoiceIndex() {
    const [phoneNumber, setPhoneNumber] = React.useState('');
    const [callStatus, setCallStatus] = React.useState<'idle' | 'connecting' | 'ringing' | 'active' | 'ended'>('idle');
    const [clientToken, setClientToken] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);
    const [isMuted, setIsMuted] = React.useState(false);
    const [clientName, setClientName] = React.useState('');
    const [callDuration, setCallDuration] = React.useState(0);
    const [showInitDialog, setShowInitDialog] = React.useState(false);
    const [libraryLoadError, setLibraryLoadError] = React.useState(false);
    const [incomingCallInfo, setIncomingCallInfo] = React.useState<{ from: string, time: Date } | null>(null);
    const [activeCallNumber, setActiveCallNumber] = React.useState<string>('');

    const clientRef = React.useRef<ClientInstance | null>(null);
    const callTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const [isLibraryLoaded, setIsLibraryLoaded] = React.useState(false);
    const [showIncomingCallAlert, setShowIncomingCallAlert] = React.useState(false);

    // Load Africa's Talking library dynamically
    React.useEffect(() => {
        const scriptId = 'africastalking-script';

        const loadLibrary = () => {
            // Check if script already exists
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
                    console.log('Africa\'s Talking library loaded');
                    setIsLibraryLoaded(true);
                    setLibraryLoadError(false);
                };
                script.onerror = () => {
                    console.error('Failed to load Africa\'s Talking library');
                    setLibraryLoadError(true);
                    setError('Failed to load voice calling library. Please refresh the page.');
                };
                document.body.appendChild(script);
            } else if (window.Africastalking) {
                setIsLibraryLoaded(true);
            }
        };

        loadLibrary();

        // Cleanup function
        return () => {
            cleanupCall();
        };
    }, []);

    // Clean up call resources
    const cleanupCall = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }

        setIsMuted(false);
        setCallDuration(0);
        setActiveCallNumber('');
    };

    // Call timer effect
    React.useEffect(() => {
        if (callStatus === 'active') {
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
            if (callStatus === 'idle') {
                setCallDuration(0);
            }
        }

        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
        };
    }, [callStatus]);

    // Format call duration
    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Validate phone number
    const validatePhoneNumber = (number: string): boolean => {
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(number);
    };

    // Initialize WebRTC client
    const initializeClient = async () => {
        try {
            setError(null);
            setShowInitDialog(true);

            // Get capability token from Laravel backend
            const response = await fetch(`${API_BASE_URL}/voice/capability-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    client_name: `agent_${Date.now()}`
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to get capability token');
            }

            if (!data.token) {
                throw new Error('No token received from server');
            }

            setClientToken(data.token);
            setClientName(data.clientName || `agent_${Date.now()}`);

            // Initialize Africa's Talking client
            if (window.Africastalking) {
                console.log('Initializing client with token');

                const client = new window.Africastalking.Client(data.token);

                // Set up event listeners
                const handleReady = () => {
                    console.log('WebRTC Client ready');
                    setCallStatus('idle');
                    setError(null);
                    setShowInitDialog(false);
                };

                const handleIncomingCall = (call: any) => {
                    console.log('Incoming call received:', call);

                    // Extract caller info
                    const from = call.from || 'Unknown';
                    setIncomingCallInfo({
                        from: from,
                        time: new Date()
                    });
                    setShowIncomingCallAlert(true);
                    setCallStatus('ringing');
                    setActiveCallNumber(from);

                    // Store the call in the client (the library handles this internally)
                    // Auto-answer after 15 seconds
                    setTimeout(() => {
                        if (callStatus === 'ringing' && showIncomingCallAlert) {
                            answerIncomingCall();
                        }
                    }, 15000);
                };

                const handleCallAccepted = () => {
                    console.log('Call accepted');
                    setCallStatus('active');
                    setShowIncomingCallAlert(false);
                    setIncomingCallInfo(null);
                };

                const handleCallEnded = () => {
                    console.log('Call ended');
                    setCallStatus('ended');
                    setIsMuted(false);
                    setShowIncomingCallAlert(false);
                    setIncomingCallInfo(null);
                    setTimeout(() => {
                        setCallStatus('idle');
                        setActiveCallNumber('');
                    }, 2000);
                };

                const handleCallFailed = (error: any) => {
                    console.error('Call failed:', error);
                    setError(`Call failed: ${error.message || 'Unknown error'}`);
                    setCallStatus('idle');
                    setShowIncomingCallAlert(false);
                    setIncomingCallInfo(null);
                    setActiveCallNumber('');
                };

                const handleHangup = () => {
                    console.log('Call hung up');
                    handleCallEnded();
                };

                const handleNotReady = () => {
                    console.error('Client not ready');
                    setError('Client connection lost. Please reinitialize.');
                    setCallStatus('idle');
                };

                const handleOffline = () => {
                    console.warn('Client offline - token may have expired');
                    setError('Connection lost. Please reinitialize the client.');
                    setCallStatus('idle');
                    setClientToken(null);
                };

                // Attach event listeners
                client.on('ready', handleReady);
                client.on('incomingcall', handleIncomingCall);
                client.on('callaccepted', handleCallAccepted);
                client.on('callended', handleCallEnded);
                client.on('callfailed', handleCallFailed);
                client.on('hangup', handleHangup);
                client.on('notready', handleNotReady);
                client.on('offline', handleOffline);

                // Store the client reference
                clientRef.current = {
                    call: (phoneNumber: string) => client.call(phoneNumber),
                    answer: () => client.answer(),
                    hangup: () => client.hangup(),
                    muteAudio: () => client.muteAudio(),
                    unmuteAudio: () => client.unmuteAudio(),
                    isAudioMuted: () => client.isAudioMuted(),
                    getCounterpartNum: () => client.getCounterpartNum(),
                    on: (event: string, callback: (data?: any) => void) => client.on(event, callback),
                    off: client.off ? (event: string, callback: (data?: any) => void) => client.off(event, callback) : undefined
                };

                console.log('Africa\'s Talking client initialized successfully');
            } else {
                throw new Error('Africa\'s Talking library not loaded');
            }
        } catch (err: any) {
            console.error('Initialization error:', err);
            setError(err.message || 'Failed to initialize call client');
            setShowInitDialog(false);
        }
    };

    // Answer incoming call
    const answerIncomingCall = () => {
        try {
            if (!clientRef.current) {
                setError('Client not initialized');
                return;
            }

            console.log('Answering incoming call');
            clientRef.current.answer();
            setCallStatus('active');
            setShowIncomingCallAlert(false);
            setIncomingCallInfo(null);

        } catch (err) {
            console.error('Failed to answer call:', err);
            setError('Failed to answer incoming call');
            setCallStatus('idle');
        }
    };

    // Reject incoming call
    const rejectIncomingCall = () => {
        try {
            if (clientRef.current) {
                clientRef.current.hangup();
            }
            setShowIncomingCallAlert(false);
            setIncomingCallInfo(null);
            setCallStatus('idle');
            console.log('Rejected incoming call');
        } catch (err) {
            console.error('Failed to reject call:', err);
        }
    };

    // Make a call - CORRECT VERSION
    // In your React component, replace makeCall function:
    const makeCall = async () => {
        if (!phoneNumber) {
            setError('Please enter a phone number');
            return;
        }

        if (!validatePhoneNumber(phoneNumber)) {
            setError('Please enter a valid phone number in international format');
            return;
        }

        try {
            setError(null);
            setCallStatus('connecting');
            setActiveCallNumber(phoneNumber);

            // Use Laravel API to make the call via Voice API
            const response = await fetch(`${API_BASE_URL}/voice/make-call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    client_name: clientName
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to make call');
            }

            console.log('Call initiated via Voice API:', data);
            setCallStatus('ringing');

        } catch (err: any) {
            console.error('Make call error:', err);
            setError(err.message || 'Failed to make call');
            setCallStatus('idle');
            setActiveCallNumber('');
        }
    };

    // Hang up call
    const hangUp = () => {
        try {
            if (clientRef.current) {
                clientRef.current.hangup();
            }
            setCallStatus('idle');
            setIsMuted(false);
            setShowIncomingCallAlert(false);
            setIncomingCallInfo(null);
            setActiveCallNumber('');
            console.log('Call hung up');
        } catch (err) {
            console.error('Error hanging up:', err);
            setError('Failed to hang up call');
        }
    };

    // Toggle mute
    const toggleMute = () => {
        try {
            if (clientRef.current) {
                if (isMuted) {
                    clientRef.current.unmuteAudio();
                    console.log('Microphone unmuted');
                } else {
                    clientRef.current.muteAudio();
                    console.log('Microphone muted');
                }
                setIsMuted(!isMuted);
            }
        } catch (err) {
            console.error('Error toggling mute:', err);
            setError('Failed to toggle mute');
        }
    };

    // Check if audio is muted
    const checkAudioMuted = () => {
        try {
            if (clientRef.current) {
                return clientRef.current.isAudioMuted();
            }
            return false;
        } catch (err) {
            console.error('Error checking mute status:', err);
            return false;
        }
    };

    // Get status color
    const getStatusColor = () => {
        switch (callStatus) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'connecting':
            case 'ringing': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'ended': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    // Get status text
    const getStatusText = () => {
        switch (callStatus) {
            case 'connecting': return 'Connecting...';
            case 'ringing': return 'Ringing...';
            case 'active': return 'Call Active';
            case 'ended': return 'Call Ended';
            default: return 'Ready';
        }
    };

    // Get status icon
    const getStatusIcon = () => {
        switch (callStatus) {
            case 'active': return <Radio className="h-4 w-4 animate-pulse" />;
            case 'connecting':
            case 'ringing': return <Loader2 className="h-4 w-4 animate-spin" />;
            case 'ended': return <PhoneOff className="h-4 w-4" />;
            default: return <Phone className="h-4 w-4" />;
        }
    };

    // Handle phone number input
    const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow only numbers and plus sign at the beginning
        if (value === '' || /^\+?[0-9]*$/.test(value)) {
            setPhoneNumber(value);
        }
    };

    // Reset the client
    const resetClient = () => {
        cleanupCall();
        if (clientRef.current) {
            try {
                clientRef.current.hangup();
            } catch (err) {
                console.error('Error during reset:', err);
            }
        }
        setClientToken(null);
        setClientName('');
        setPhoneNumber('');
        setError(null);
        setCallStatus('idle');
        setIncomingCallInfo(null);
        setShowIncomingCallAlert(false);
        setActiveCallNumber('');
        clientRef.current = null;
        console.log('Client reset');
    };

    // Test system connection
    const testSystem = async () => {
        try {
            setError(null);
            const response = await fetch(`${API_BASE_URL}/voice/test-system`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            const data = await response.json();

            if (data.success) {
                setError(null);
                alert('System test successful! Check console for details.');
                console.log('System test result:', data);
            } else {
                setError(`System test failed: ${data.error || 'Unknown error'}`);
            }
        } catch (err: any) {
            setError(`System test error: ${err.message}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Call Center - Voice Calling" />

            <div className="space-y-6 p-4">
                {/* Header Section */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                                <Phone className="h-8 w-8" />
                                Call Center System
                            </h1>
                            <p className="text-muted-foreground">Make and receive calls using Africa's Talking WebRTC</p>
                        </div>
                        <div className="flex gap-2">
                            {clientToken && (
                                <Button
                                    onClick={resetClient}
                                    variant="outline"
                                    size="sm"
                                >
                                    Reset Client
                                </Button>
                            )}
                            <Button
                                onClick={testSystem}
                                variant="outline"
                                size="sm"
                            >
                                Test System
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Library Load Error */}
                {libraryLoadError && (
                    <Alert variant="destructive" className="animate-in fade-in duration-300">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load voice calling library. Please refresh the page or check your internet connection.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Incoming Call Alert */}
                {showIncomingCallAlert && incomingCallInfo && (
                    <Alert className="border-blue-300 bg-blue-50 animate-in slide-in-from-top duration-300">
                        <PhoneIncoming className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                            <div className="flex flex-col gap-2">
                                <div className="font-semibold">Incoming Call!</div>
                                <div>From: {incomingCallInfo.from}</div>
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        onClick={answerIncomingCall}
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <Phone className="h-4 w-4 mr-2" />
                                        Answer
                                    </Button>
                                    <Button
                                        onClick={rejectIncomingCall}
                                        size="sm"
                                        variant="destructive"
                                    >
                                        <PhoneOff className="h-4 w-4 mr-2" />
                                        Reject
                                    </Button>
                                </div>
                                <div className="text-xs text-blue-600 mt-1">
                                    Auto-answering in 15 seconds...
                                </div>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Main Call Interface */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Call Control Panel */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl flex items-center gap-2">
                                            Call Interface
                                        </CardTitle>
                                        <CardDescription>Make outbound calls to clients</CardDescription>
                                    </div>
                                    <Badge variant="outline" className={`${getStatusColor()} border text-sm px-3 py-1`}>
                                        <span className="flex items-center gap-2">
                                            {getStatusIcon()}
                                            {getStatusText()}
                                        </span>
                                    </Badge>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-6">
                                {/* Client Status */}
                                {clientName && (
                                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                                            <span className="text-blue-700">
                                                <strong>Agent ID:</strong> {clientName}
                                            </span>
                                        </div>
                                        <div className="text-xs text-blue-600">
                                            {clientToken ? 'Connected' : 'Disconnected'}
                                        </div>
                                    </div>
                                )}

                                {/* Active Call Info */}
                                {activeCallNumber && (callStatus === 'connecting' || callStatus === 'ringing' || callStatus === 'active') && (
                                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4 text-indigo-600" />
                                                <span className="text-indigo-700 font-medium">
                                                    {callStatus === 'active' ? 'Connected to:' : 'Calling:'}
                                                </span>
                                            </div>
                                            <span className="text-indigo-900 font-semibold">
                                                {activeCallNumber}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Error Alert */}
                                {error && (
                                    <Alert variant="destructive" className="animate-in fade-in duration-300">
                                        <XCircle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {/* Info Alert for First Time */}
                                {!clientToken && !error && (
                                    <Alert className="border-blue-300 bg-blue-50">
                                        <Info className="h-4 w-4 text-blue-600" />
                                        <AlertDescription className="text-blue-800">
                                            Click "Initialize Call Client" to start. You'll need to allow microphone permissions when prompted.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Initialize Client Button */}
                                {!clientToken && (
                                    <Button
                                        onClick={initializeClient}
                                        disabled={!isLibraryLoaded || libraryLoadError}
                                        className="w-full"
                                        size="lg"
                                    >
                                        {isLibraryLoaded ? (
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

                                {/* Phone Input and Call Controls */}
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
                                                disabled={callStatus !== 'idle'}
                                                className="text-lg h-12"
                                                pattern="^\+[1-9]\d{1,14}$"
                                            />
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs text-muted-foreground">
                                                    Enter number in international format (e.g., +254712345678)
                                                </p>
                                                {phoneNumber && !validatePhoneNumber(phoneNumber) && (
                                                    <p className="text-xs text-red-500">
                                                        Invalid format
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Call Button */}
                                        {callStatus === 'idle' && (
                                            <Button
                                                onClick={makeCall}
                                                className="w-full bg-green-600 hover:bg-green-700"
                                                size="lg"
                                                disabled={!phoneNumber || !validatePhoneNumber(phoneNumber)}
                                            >
                                                <Phone className="mr-2 h-5 w-5" />
                                                Make Call
                                            </Button>
                                        )}

                                        {/* Active Call Controls */}
                                        {(callStatus === 'connecting' || callStatus === 'ringing' || callStatus === 'active') && (
                                            <div className="space-y-4">
                                                {/* Call Duration */}
                                                {callStatus === 'active' && (
                                                    <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200 animate-in fade-in duration-300">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-medium text-green-700">Connected - Live Call</p>
                                                                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-green-800">
                                                                    <Clock className="h-6 w-6" />
                                                                    {formatDuration(callDuration)}
                                                                </div>
                                                                <p className="text-xs text-green-600">You can now talk with the client</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Call Status Info */}
                                                {(callStatus === 'connecting' || callStatus === 'ringing') && (
                                                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
                                                            <p className="text-yellow-700 font-medium">
                                                                {callStatus === 'connecting' ? 'Connecting to server...' : 'Ringing...'}
                                                            </p>
                                                            <p className="text-sm text-yellow-600">
                                                                Calling: {activeCallNumber}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Control Buttons */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Hang Up Button */}
                                                    <Button
                                                        onClick={hangUp}
                                                        variant="destructive"
                                                        size="lg"
                                                        className="col-span-2"
                                                    >
                                                        <PhoneOff className="mr-2 h-5 w-5" />
                                                        {callStatus === 'active' ? 'End Call' : 'Cancel Call'}
                                                    </Button>

                                                    {/* Mute Button */}
                                                    {callStatus === 'active' && (
                                                        <Button
                                                            onClick={toggleMute}
                                                            variant={isMuted ? "destructive" : "outline"}
                                                            size="lg"
                                                            className="col-span-2"
                                                        >
                                                            {isMuted ? (
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

                    {/* Instructions Panel */}
                    <div className="space-y-6">
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    How It Works
                                </CardTitle>
                                <CardDescription>Follow these steps to make a call</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ol className="space-y-3 text-sm">
                                    {[
                                        'Click "Initialize Call Client" to set up WebRTC',
                                        'Allow microphone permissions when prompted',
                                        'Enter phone number in international format (+254...)',
                                        'Click "Make Call" - the client will receive the call',
                                        'When connected, both parties can hear each other',
                                        'Use "Mute" to mute your microphone during call',
                                        'Click "Hang Up" to end the call',
                                        'Receive incoming calls in the incoming call alert'
                                    ].map((step, index) => (
                                        <li key={index} className="flex gap-3">
                                            <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs">
                                                {index + 1}
                                            </span>
                                            <span className="text-muted-foreground">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg border-green-200 bg-green-50">
                            <CardHeader>
                                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    System Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-green-700">Library Loaded</span>
                                        <Badge variant={isLibraryLoaded ? "default" : "secondary"} className={
                                            isLibraryLoaded ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                        }>
                                            {isLibraryLoaded ? '✓ Yes' : '✗ No'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-green-700">Client Initialized</span>
                                        <Badge variant={clientToken ? "default" : "secondary"} className={
                                            clientToken ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                        }>
                                            {clientToken ? '✓ Yes' : '✗ No'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-green-700">Current Status</span>
                                        <Badge variant="outline" className={`${getStatusColor()} border`}>
                                            {getStatusText()}
                                        </Badge>
                                    </div>
                                    {clientName && (
                                        <div className="pt-2 border-t border-green-200">
                                            <p className="text-xs text-green-600">
                                                <strong>Agent ID:</strong> {clientName}
                                            </p>
                                            <p className="text-xs text-green-600 mt-1">
                                                <strong>Full ID:</strong> voiceapp1.{clientName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-lg border-orange-200 bg-orange-50">
                            <CardHeader>
                                <CardTitle className="text-lg text-orange-800 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" />
                                    Troubleshooting
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2 text-sm text-orange-700">
                                    {[
                                        'The call() method returns undefined - this is normal',
                                        'Events are handled at client level, not call object level',
                                        'Ensure microphone permissions are granted',
                                        'Verify phone number format is correct',
                                        'Check Africa\'s Talking dashboard for credits',
                                        'Reinitialize client if connection drops'
                                    ].map((tip, index) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <span className="text-orange-500 mt-0.5">•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Initialization Dialog */}
            <Dialog open={showInitDialog} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md">
                    <div className="flex flex-col items-center text-center space-y-4 py-6">
                        <div className="rounded-full bg-blue-100 p-4">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                        </div>
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Initializing Call Client</DialogTitle>
                            <DialogDescription className="text-base">
                                Setting up WebRTC connection with Africa's Talking...
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p>• Requesting capability token</p>
                            <p>• Establishing WebRTC connection</p>
                            <p>• Setting up event listeners</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}