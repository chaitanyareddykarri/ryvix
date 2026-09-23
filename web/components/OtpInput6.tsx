"use client";

import React, { useRef, useEffect } from "react";

interface OtpInput6Props {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function OtpInput6({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpInput6Props) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split current value into 6 characters
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && inputsRef.current[0] && !disabled) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Strip non-digits
    const cleanDigits = rawVal.replace(/\D/g, "");

    if (!cleanDigits) {
      // Cleared
      const newDigits = [...digits];
      newDigits[index] = "";
      const newVal = newDigits.join("");
      onChange(newVal);
      return;
    }

    if (cleanDigits.length > 1) {
      // Multiple digits entered (paste-like)
      handlePasteString(cleanDigits);
      return;
    }

    // Single digit
    const newDigits = [...digits];
    newDigits[index] = cleanDigits;
    const newVal = newDigits.join("");
    onChange(newVal);

    // Auto-advance to next box if available
    if (index < 5 && cleanDigits) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newVal.length === 6 && onComplete) {
      onComplete(newVal);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move to previous box if current is already empty
        inputsRef.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = "";
        onChange(newDigits.join(""));
      } else {
        const newDigits = [...digits];
        newDigits[index] = "";
        onChange(newDigits.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    handlePasteString(pasteData);
  };

  const handlePasteString = (pasted: string) => {
    const cleanDigits = pasted.replace(/\D/g, "").slice(0, 6);
    if (!cleanDigits) return;

    onChange(cleanDigits);

    // Focus appropriate box
    const focusIndex = Math.min(cleanDigits.length, 5);
    inputsRef.current[focusIndex]?.focus();

    if (cleanDigits.length === 6 && onComplete) {
      onComplete(cleanDigits);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "0.6rem",
        justifyContent: "center",
        alignItems: "center",
        margin: "1.5rem 0",
      }}
      onPaste={handlePaste}
    >
      {Array.from({ length: 6 }).map((_, index) => {
        const isFilled = Boolean(digits[index]);
        return (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            disabled={disabled}
            value={digits[index] || ""}
            onChange={(e) => handleInputChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            aria-label={`Digit ${index + 1} of 6`}
            style={{
              width: "48px",
              height: "56px",
              textAlign: "center",
              fontSize: "1.5rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono, monospace)",
              color: isFilled ? "#38bdf8" : "#f1f5f9",
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              border: isFilled
                ? "2px solid #06b6d4"
                : "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "10px",
              outline: "none",
              transition: "all 0.2s ease",
              boxShadow: isFilled
                ? "0 0 12px rgba(6, 182, 212, 0.25)"
                : "none",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#38bdf8";
              e.target.style.boxShadow = "0 0 16px rgba(56, 189, 248, 0.35)";
              e.target.select();
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isFilled
                ? "#06b6d4"
                : "rgba(255, 255, 255, 0.15)";
              e.target.style.boxShadow = isFilled
                ? "0 0 12px rgba(6, 182, 212, 0.25)"
                : "none";
            }}
          />
        );
      })}
    </div>
  );
}
