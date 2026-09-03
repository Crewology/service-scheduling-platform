import { useViewMode } from "@/contexts/ViewModeContext";
import * as React from "react";

type RoleView = "provider" | "customer";

export function MobileRoleViewToggle({ active }: { active: RoleView }) {
  const { canSwitch, setViewMode } = useViewMode();

  if (!canSwitch) return null;

  const buttonClass = (role: RoleView) =>
    `min-w-[118px] rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
      active === role
        ? "bg-[#174a73] text-white shadow-sm"
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
    }`;

  return (
    <div className="mb-4 flex justify-center sm:hidden">
      <div
        className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm"
        role="group"
        aria-label="Choose provider or customer view"
      >
        <button
          type="button"
          aria-pressed={active === "provider"}
          onClick={() => setViewMode("provider")}
          className={buttonClass("provider")}
        >
          Provider
        </button>
        <button
          type="button"
          aria-pressed={active === "customer"}
          onClick={() => setViewMode("customer")}
          className={buttonClass("customer")}
        >
          Customer
        </button>
      </div>
    </div>
  );
}
