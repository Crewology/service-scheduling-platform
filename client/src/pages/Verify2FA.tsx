import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { NavHeader } from "../components/shared/NavHeader";

export default function Verify2FA() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [trustDevice, setTrustDevice] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get userId and redirect from URL params or sessionStorage
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId") || sessionStorage.getItem("2fa_userId");
  const email = params.get("email") || sessionStorage.getItem("2fa_email") || "";
  const redirectPath = params.get("redirect") || "/";

  useEffect(() => {
    if (!userId) {
      navigate("/login");
    }
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [userId, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only digits
    const newCode = [...code];
    newCode[index] = value.slice(-1); // Only last digit
    setCode(newCode);
    setError("");

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newCode.every(d => d !== "")) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeStr?: string) => {
    const fullCode = codeStr || code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: parseInt(userId!),
          code: fullCode,
          trustDevice,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Clear session storage
        sessionStorage.removeItem("2fa_userId");
        sessionStorage.removeItem("2fa_email");
        // Redirect to intended destination
        window.location.href = redirectPath;
      } else {
        setError(data.error || "Invalid code");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: parseInt(userId!) }),
      });

      const data = await res.json();
      if (data.success) {
        setResendCooldown(60); // 60 second cooldown
        setError("");
      } else {
        setError(data.error || "Failed to resend");
      }
    } catch {
      setError("Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    : "your email";

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      <div className="flex items-center justify-center px-4 pt-20 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            {/* Logo */}
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Verify your identity</h1>
              <p className="text-gray-500 mt-2 text-sm">
                We sent a 6-digit code to <span className="font-medium text-gray-700">{maskedEmail}</span>
              </p>
            </div>

            {/* Code inputs */}
            <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleInputChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:border-blue-500 transition-colors ${
                    error ? "border-red-300" : "border-gray-200"
                  }`}
                  disabled={loading}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}

            {/* Trust device checkbox */}
            <label className="flex items-center justify-center gap-2 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={e => setTrustDevice(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Trust this device for 30 days</span>
            </label>

            {/* Verify button */}
            <button
              onClick={() => handleVerify()}
              disabled={loading || code.some(d => d === "")}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Verifying..." : "Verify"}
            </button>

            {/* Resend */}
            <div className="mt-4">
              <button
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : resending
                    ? "Sending..."
                    : "Didn't receive a code? Resend"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
