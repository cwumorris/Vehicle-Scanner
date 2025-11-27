import React from "react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted text-foreground">
      <header className="container mx-auto px-6 py-8 flex items-center justify-between">
        <div className="text-xl font-bold tracking-tight">Squard24</div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground"></nav>
      </header>

      <main className="container mx-auto px-6">
        <section className="py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
              Secure, instant vehicle access control
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-prose">
              Squard24 streamlines visitor and resident vehicle entry with QR codes, real‑time verification, and guard‑friendly scanning. Fast, reliable, and privacy‑first.
            </p>
            <div className="mt-8">
              <a href="/signin" className="inline-flex h-12 items-center px-6 rounded-md bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-base">
                Access System
              </a>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-video rounded-xl bg-card border border-border shadow-lg flex items-center justify-center">
              <div className="text-center py-10">
                <div className="text-5xl font-black tracking-tight">S24</div>
                <div className="mt-2 text-muted-foreground">Gate Pass System</div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-12 grid md:grid-cols-3 gap-6">
          {[{t:"Fast QR Scanning",d:"Optimized for hardware scanners and mobile cameras."},{t:"Real‑time Checks",d:"Validates against your database instantly."},{t:"Privacy‑first",d:"QR stores only an ID; details remain server‑side."}].map((f, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6">
              <div className="text-lg font-semibold">{f.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </section>

        <section id="how" className="py-12">
          <div className="rounded-xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-2xl font-bold">How it works</h2>
            <ol className="mt-4 space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>Admin registers a vehicle and prints/downloads a QR code.</li>
              <li>Guard scans the QR using a hardware scanner or mobile.</li>
              <li>System verifies and shows APPROVED/DENIED instantly.</li>
            </ol>
          </div>
        </section>

        <section id="cta" className="py-16 text-center">
          <h3 className="text-2xl md:text-3xl font-bold">Ready to secure your gate?</h3>
          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <a href="/admin" className="inline-flex h-11 items-center px-5 rounded-md bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold">Add first vehicle</a>
            <a href="/scanner" className="inline-flex h-11 items-center px-5 rounded-md border border-border bg-card hover:bg-accent">Try the scanner</a>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Squard24. All rights reserved.
      </footer>
    </div>
  );
};

export default Landing;
