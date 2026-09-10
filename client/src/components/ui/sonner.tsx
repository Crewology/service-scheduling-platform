import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          title: "!text-slate-950 dark:!text-slate-50",
          description: "!text-slate-700 dark:!text-slate-200",
          closeButton:
            "group-[.toast]:border-slate-300 group-[.toast]:bg-white group-[.toast]:text-slate-900 dark:group-[.toast]:border-slate-600 dark:group-[.toast]:bg-slate-900 dark:group-[.toast]:text-slate-100",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-900 dark:group-[.toast]:bg-slate-800 dark:group-[.toast]:text-slate-100",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
