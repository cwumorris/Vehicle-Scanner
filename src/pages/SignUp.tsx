import React from "react";

const SignUp = () => {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground mt-1">Get started with Squard24</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <form className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Full name</label>
              <input type="text" className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" placeholder="Jane Doe" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <input type="email" className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" placeholder="you@example.com" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <input type="password" className="w-full h-11 rounded-md border border-border bg-input px-3 text-sm focus:outline-none focus:ring-4 focus:ring-ring" placeholder="••••••••" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                <a href="/signin" className="hover:underline">Have an account? Sign in</a>
              </div>
              <button type="button" className="inline-flex items-center justify-center h-11 px-5 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-500 active:bg-blue-700">Create account</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
