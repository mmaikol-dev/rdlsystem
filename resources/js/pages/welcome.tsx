import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Form, Head } from '@inertiajs/react';
import { LoaderCircle, Headset, Phone, Clock, Shield } from 'lucide-react';

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    return (
        <AuthLayout 
            title={
                <div className="flex items-center gap-3">
                    <Headset className="h-8 w-8 text-primary" />
                    <span>Realdeal Call Center</span>
                </div>
            } 
            description="Secure agent portal - Please enter your credentials to access the dashboard"
        >
            <Head title="Agent Login" />

            {/* Status Banner */}
            {status && (
                <div className="mb-6 rounded-lg bg-green-50 p-4 text-center text-sm font-medium text-green-700 border border-green-200">
                    <div className="flex items-center justify-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{status}</span>
                    </div>
                </div>
            )}

            {/* Live Agent Status Card */}
            <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Headset className="h-10 w-10 text-blue-600" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-blue-900">24/7 Support Available</p>
                        
                    </div>
                    <div className="ml-auto flex items-center gap-2 text-xs text-blue-700">
                        <Clock className="h-3 w-3" />
                        <span>Average response: 2min</span>
                    </div>
                </div>
            </div>

            <Form method="post" action={route('login')} resetOnSuccess={['password']} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            {/* Agent ID / Email Field */}
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    Agent ID / Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="agent@realdeal.com"
                                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <InputError message={errors.email} />
                            </div>

                            {/* Password Field */}
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password" className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink 
                                            href={route('password.request')} 
                                            className="ml-auto text-sm text-blue-600 hover:text-blue-800" 
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Enter your password"
                                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                                <InputError message={errors.password} />
                            </div>

                            {/* Remember Me & Extension Field (optional) */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Checkbox 
                                        id="remember" 
                                        name="remember" 
                                        tabIndex={3}
                                        className="border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="remember" className="text-sm text-gray-600">
                                        Remember me
                                    </Label>
                                </div>
                                
                                {/* Optional Extension Field - you can enable this if needed */}
                                {/* <div className="flex items-center gap-2">
                                    <Label htmlFor="extension" className="text-sm text-gray-600">
                                        Ext:
                                    </Label>
                                    <Input
                                        id="extension"
                                        type="text"
                                        name="extension"
                                        className="w-20 h-8 text-sm"
                                        placeholder="123"
                                        maxLength={4}
                                    />
                                </div> */}
                            </div>

                            {/* Login Button */}
                            <Button 
                                type="submit" 
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3" 
                                tabIndex={4} 
                                disabled={processing}
                            >
                                {processing ? (
                                    <>
                                        <LoaderCircle className="h-4 w-4 animate-spin mr-2" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        <Headset className="h-4 w-4 mr-2" />
                                        Access Dashboard
                                    </>
                                )}
                            </Button>

                            {/* Quick Stats */}
                            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Queue</p>
                                    <p className="text-sm font-semibold text-gray-700">12</p>
                                </div>
                                <div className="text-center border-x border-gray-200">
                                    <p className="text-xs text-gray-500">Available</p>
                                    <p className="text-sm font-semibold text-green-600">8</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-gray-500">On Calls</p>
                                    <p className="text-sm font-semibold text-blue-600">39</p>
                                </div>
                            </div>
                        </div>

                        {/* Agent Help Section */}
                        <div className="mt-4 text-center">
                            <p className="text-xs text-gray-500">
                                Having trouble logging in? Contact your supervisor or 
                                <TextLink href="#" className="text-blue-600 hover:text-blue-800 ml-1">
                                    IT Support
                                </TextLink>
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                                Secure connection • SSL Encrypted
                            </p>
                        </div>
                    </>
                )}
            </Form>
        </AuthLayout>
    );
}