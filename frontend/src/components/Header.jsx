import React, { useState, useEffect } from 'react';
import { Activity, MapPin } from 'lucide-react';
import { checkBackendHealth } from '../services/api';

export default function Header({ isConnected }) {
  const [internalConnected, setInternalConnected] = useState(false);
  const [checking, setChecking] = useState(isConnected === undefined);

  useEffect(() => {
    if (isConnected !== undefined) {
      setChecking(false);
      return;
    }

    let isMounted = true;

    const verifyConnection = async () => {
      try {
        const healthy = await checkBackendHealth();
        if (isMounted) {
          setInternalConnected(healthy);
          setChecking(false);
        }
      } catch {
        if (isMounted) {
          setInternalConnected(false);
          setChecking(false);
        }
      }
    };

    verifyConnection();
    const intervalId = setInterval(verifyConnection, 15000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isConnected]);

  const connected = isConnected !== undefined ? isConnected : internalConnected;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Title & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <Activity className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 leading-none">
                IHRS Mindanao
              </h1>
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <MapPin className="w-3 h-3 text-slate-500" />
                Davao Region Pilot Node
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 font-normal">
              Intelligent Healthcare Referral &amp; Routing System
            </p>
          </div>
        </div>

        {/* Right Side: Mobile Node Badge + Dynamic Backend Status Indicator */}
        <div className="flex items-center gap-3">
          <span className="inline-flex md:hidden items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <MapPin className="w-3 h-3 text-slate-500" />
            Davao Region Pilot Node
          </span>

          {checking ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
              <span>Checking API...</span>
            </div>
          ) : connected ? (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
              role="status"
              aria-live="polite"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>API Connected</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200"
              role="status"
              aria-live="polite"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Backend Offline</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
