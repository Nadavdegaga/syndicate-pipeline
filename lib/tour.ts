"use client";

import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

export const TOUR_STORAGE_KEY = "syndicate.tour.welcome.completed";

let activeDriver: Driver | null = null;

export function isTourCompleted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}

export function markTourCompleted() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOUR_STORAGE_KEY, "true");
}

export function resetTour() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOUR_STORAGE_KEY);
}

export function startWelcomeTour() {
  if (activeDriver) {
    try {
      activeDriver.destroy();
    } catch {
      /* ignore */
    }
    activeDriver = null;
  }

  const d = driver({
    showProgress: true,
    overlayColor: "rgba(15, 23, 42, 0.55)",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Done",
    onDestroyed: () => {
      markTourCompleted();
      activeDriver = null;
    },
    steps: [
      {
        popover: {
          title: "Welcome to Syndicate Pipeline 👋",
          description:
            "Let me show you around in 60 seconds. You can quit any time with Esc, and replay this tour from the ? icon in the top bar.",
        },
      },
      {
        element: '[data-tour="brand-switcher"]',
        popover: {
          title: "Brand Switcher",
          description:
            "Choose which brand you're working under — Nomi, StarTech, or Luminarix. The data filters automatically; statuses and KPIs scope to that brand.",
          side: "bottom",
        },
      },
      {
        element: '[data-tour="nav-insights"]',
        popover: {
          title: "Insights — your home",
          description:
            "KPIs and charts about your pipeline: active conversations, status breakdown, vertical distribution, top networks, recent activity.",
          side: "right",
        },
      },
      {
        element: '[data-tour="nav-ask"]',
        popover: {
          title: "Ask the AI",
          description:
            "Stuck? Type a question — 'who haven't I talked to in 3 weeks?' — and Claude runs the right query and answers with real data.",
          side: "right",
        },
      },
      {
        element: '[data-tour="nav-contacts"]',
        popover: {
          title: "Contacts",
          description:
            "All 1,044 contacts live here. Click a row to open the detail drawer where every field is editable inline.",
          side: "right",
        },
      },
      {
        element: '[data-tour="nav-contacts"]',
        popover: {
          title: "Try it!",
          description:
            "Click 'Contacts' in the sidebar, then click any row to open the detail drawer. The tour will continue once it opens.",
          side: "right",
        },
      },
      {
        element: '[data-tour="nav-today"]',
        popover: {
          title: "Today's Actions",
          description:
            "Hot follow-ups, cold leads, untouched A-tier networks, new offers, and publisher asks — your to-do list every morning.",
          side: "right",
        },
      },
      {
        popover: {
          title: "That's it! 🚀",
          description:
            "Click the ? icon in the top bar any time to redo this tour. Happy syndicating.",
        },
      },
    ],
  });

  activeDriver = d;
  d.drive();
  return d;
}
