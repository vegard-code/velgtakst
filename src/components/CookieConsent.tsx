"use client";

import { useState, useEffect } from "react";
import GoogleAnalytics from "./GoogleAnalytics";

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function getConsentCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setConsentCookie(value: "granted" | "denied") {
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

interface Props {
  initialConsent: boolean | null;
}

export default function CookieConsent({ initialConsent }: Props) {
  const [consent, setConsent] = useState<"granted" | "denied" | null>(
    initialConsent === true ? "granted" : initialConsent === false ? null : null
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const cookie = getConsentCookie();
    if (cookie === "granted") {
      setConsent("granted");
    } else if (cookie === "denied") {
      setConsent("denied");
    } else {
      setVisible(true);
    }
  }, []);

  function handleAccept() {
    setConsentCookie("granted");
    setConsent("granted");
    setVisible(false);
  }

  function handleDecline() {
    setConsentCookie("denied");
    setConsent("denied");
    setVisible(false);
  }

  return (
    <>
      {consent === "granted" && <GoogleAnalytics />}

      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#1a2e3d] border-t border-[#2d4a5e] shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="flex-1 text-sm text-gray-300">
              Vi bruker informasjonskapsler (cookies) for å forbedre brukeropplevelsen og analysere trafikk via Google Analytics.
              Les mer i vår{" "}
              <a href="/personvern" className="underline text-blue-400 hover:text-blue-300">
                personvernerklæring
              </a>
              .
            </p>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={handleDecline}
                className="px-4 py-2 rounded-lg border border-gray-500 text-gray-300 hover:bg-gray-700 text-sm font-medium transition-colors"
              >
                Avslå
              </button>
              <button
                onClick={handleAccept}
                className="px-4 py-2 rounded-lg bg-[#285982] text-white hover:bg-[#1e4266] text-sm font-medium transition-colors"
              >
                Godta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
