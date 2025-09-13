<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $users = User::orderBy('created_at', 'desc')->get(); // recent first
        return Inertia::render('users/index', [
            'users' => $users
        ]);
    }
    

    /**
     * Store a newly created user in storage.
     */


    public function store(Request $request)
{
    $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|string|email|max:255|unique:users,email',
        'username' => 'nullable|string|max:255|unique:users,username',
        'password' => ['required', 'confirmed', Rules\Password::defaults()],
        'store_name' => 'nullable|string|max:255',
        'store_address' => 'nullable|string|max:255',
        'store_phone' => 'nullable|string|max:50',
        'store_email' => 'nullable|string|email|max:255',
        'roles' => 'nullable|string', // store as string
        'email_verified_at' => 'nullable|date',
    ]);

    $user = User::create([
        'name' => $request->name,
        'email' => $request->email,
        'username' => $request->username,
        'password' => Hash::make($request->password),
        'store_name' => $request->store_name,
        'store_address' => $request->store_address,
        'store_phone' => $request->store_phone,
        'store_email' => $request->store_email,
        'roles' => $request->roles ?? 'user',
        'email_verified_at' => $request->email_verified_at,
    ]);

    // Send back the new user data for Inertia
    return redirect()->back()->with('success', 'user created successfully.');
}
    

    /**
     * Update the specified user.
     */
    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'username' => 'nullable|string|max:255|unique:users,username,' . $user->id,
            'store_name' => 'nullable|string|max:255',
            'store_address' => 'nullable|string|max:255',
            'store_phone' => 'nullable|string|max:50',
            'store_email' => 'nullable|string|email|max:255',
            'roles' => 'nullable|array',
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'username' => $request->username,
            'store_name' => $request->store_name,
            'store_address' => $request->store_address,
            'store_phone' => $request->store_phone,
            'store_email' => $request->store_email,
            'roles' => $request->roles ?? $user->roles,
        ]);

        return redirect()->back()->with('success', 'User updated successfully.');
    }

    /**
     * Remove the specified user.
     */
    public function destroy(User $user)
    {
        $user->delete();
        return Inertia::render('users/index', [ // send all users so your frontend updates
            'success' => 'User deleted successfully.',
        ]);
    }
}
