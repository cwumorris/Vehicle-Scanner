import React, { useEffect, useState, useCallback, useRef } from "react";
import { api, type CheckResponse, type Vehicle } from "@/lib/api";
import { Check, Copy, X } from "lucide-react";

function Scanner() {
  const [input, setInput] = useState<string>("");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const resetTimerRef = useRef<NodeJS.Timeout>();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetScanner = useCallback(() => {
    setResult(null);
    setShowPopup(false);
    inputRef.current?.focus();
  }, []);

  const scheduleReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(resetScanner, 6000);
  }, [resetScanner]);

  const extractCode = (raw: string): string => {
    const val = raw.trim();
    try {
      // Try parse as URL and read ?code=
      const url = new URL(val);
      const qp = url.searchParams.get("code");
      if (qp && (url.host === window.location.host)) return qp.trim();
    } catch {}
    // Fallback: if it contains code= in a query string without valid URL object
    const matchParam = val.match(/(?:^|[?&])code=([^&\s]+)/i);
    if (matchParam) return decodeURIComponent(matchParam[1]);
    // Fallback: match VEH- style IDs at token boundaries
    const matchVeh = val.match(/(?:^|\b)(VEH-[A-Z0-9]+)(?:\b|$)/i);
    if (matchVeh) return matchVeh[1].toUpperCase();
    return val;
  };

  const doCheck = useCallback(async (id: string) => {
    const code = extractCode(id);
    const data = await api.check(code);
    setResult(data);
    setShowPopup(true);
    
    // Play sound
    const localSrc = data.approved ? "/sounds/approved.mp3" : "/sounds/denied.mp3";
    const fallbackSrc = data.approved
      ? "https://assets.mixkit.co/sfx/preview/mixkit-unlock-game-notification-253.mp3"
      : "https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3";
    try {
      await new Audio(localSrc).play();
    } catch {
      try { await new Audio(fallbackSrc).play(); } catch {}
    }
    
    // Schedule reset after 6 seconds
    scheduleReset();
  }, []);

  useEffect(() => {
    if (input && input.includes("\n")) {
      doCheck(extractCode(input));
      setInput("");
    }
  }, [input, doCheck]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  // Auto-read ?code= from URL (e.g., /scanner?code=VEH-XXXX) and run the check once
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        setInput(code);
        doCheck(extractCode(code));
      }
    } catch {}
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full bg-background text-foreground flex items-stretch">
      {/* Hidden input for hardware scanners (kept for QR/Barcode keyboard emulation) */}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="sr-only"
        placeholder="Scan QR..."
        ref={inputRef}
      />

      <div className="flex-1 flex flex-col justify-center px-4 md:px-8">
        <div className="w-full max-w-2xl mx-auto bg-card border border-border rounded-xl p-4 md:p-6 shadow-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim()) {
                doCheck(input);
                setInput("");
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter or scan Vehicle ID (e.g. VEH-XXXX)"
              className="flex-1 h-14 md:h-16 px-5 md:px-6 rounded-lg bg-background text-foreground placeholder-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 text-lg md:text-xl"
              ref={inputRef}
            />
            <button
              type="submit"
              className="h-14 md:h-16 px-5 md:px-7 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 font-semibold"
            >
              Check
            </button>
          </form>
          <div className="mt-3 text-xs md:text-sm text-white/80">Tip: Type the Vehicle ID and press Enter, or use a scanner.</div>
        </div>

        {/* Screen reader announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {result ? (result.approved ? "Access approved" : "Access denied") : "Awaiting scan"}
        </div>

        {!result && (
          <div className="mt-10 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">SCAN VEHICLE QR</h1>
            <p className="mt-2 text-white/80">Ensure the input above is focused. Most scanners press Enter after scanning.</p>
          </div>
        )}

        {showPopup && result && (
          <div className="fixed inset-0 flex items-center justify-center p-4 bg-background/80 z-50" onClick={resetScanner}>
            <div className="bg-card text-foreground border border-border rounded-xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {result.approved ? 'Access Granted' : 'Access Denied'}
                </h2>
                <button 
                  onClick={resetScanner}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="space-y-4">
                {result.approved && result.vehicle ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Vehicle ID</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-lg">{result.vehicle.id}</p>
                        <button 
                          onClick={() => copyToClipboard(result.vehicle?.id || '')}
                          className="p-1 text-gray-500 hover:text-blue-600"
                          aria-label="Copy ID"
                        >
                          {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-foreground">Owner</p>
                      <p className="text-lg">{result.vehicle.owner_name}</p>
                    </div>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-sm text-foreground">Plate</p>
                        <p className="text-lg">{result.vehicle.plate}</p>
                      </div>
                      {result.vehicle.owner_unit && (
                        <div>
                          <p className="text-sm text-foreground">Unit</p>
                          <p className="text-lg">{result.vehicle.owner_unit}</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-lg">{result.message || 'Invalid or expired vehicle pass'}</p>
                )}
                
                <div className="pt-4 flex justify-between">
                  <button
                    onClick={() => {
                      if (result.approved && result.vehicle) {
                        window.open(`/scanner?code=${result.vehicle.id}`, '_blank');
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={!result.approved || !result.vehicle}
                  >
                    Open Scanner with Code
                  </button>
                  <button
                    onClick={resetScanner}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Scanner;
