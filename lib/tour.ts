"use client";

import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

export const TOUR_KEYS = {
  welcome: "syndicate.tour.welcome.completed",
  addContact: "syndicate.tour.add_contact.completed",
  matchmaker: "syndicate.tour.matchmaker.completed",
} as const;

export type TourKey = keyof typeof TOUR_KEYS;

// Backwards-compat for the original Welcome tour helper name.
export const TOUR_STORAGE_KEY = TOUR_KEYS.welcome;

let activeDriver: Driver | null = null;

export function isTourCompleted(tour: TourKey = "welcome"): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(TOUR_KEYS[tour]) === "true";
}

export function markTourCompleted(tour: TourKey = "welcome") {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOUR_KEYS[tour], "true");
}

export function resetTour(tour: TourKey = "welcome") {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOUR_KEYS[tour]);
}

function teardown() {
  if (activeDriver) {
    try {
      activeDriver.destroy();
    } catch {
      /* ignore */
    }
    activeDriver = null;
  }
}

function commonOptions(tour: TourKey) {
  return {
    showProgress: true,
    overlayColor: "rgba(15, 23, 42, 0.55)",
    nextBtnText: "Next →",
    prevBtnText: "← Back",
    doneBtnText: "Done",
    onDestroyed: () => {
      markTourCompleted(tour);
      activeDriver = null;
    },
  };
}

export function startWelcomeTour() {
  teardown();
  const d = driver({
    ...commonOptions("welcome"),
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

export function startAddContactTour() {
  teardown();
  const d = driver({
    ...commonOptions("addContact"),
    steps: [
      {
        element: '[data-tour="add-contact-name"]',
        popover: {
          title: "Name & role",
          description:
            "Start with the person's name and role — these are what you'll search and scan in the table view.",
          side: "right",
        },
      },
      {
        element: '[data-tour="add-contact-network"]',
        popover: {
          title: "Company & channel",
          description:
            "Company name auto-suggests from your existing 91 networks. Channel tells you how you reach them (LinkedIn, Telegram, Email…).",
          side: "right",
        },
      },
      {
        element: '[data-tour="add-contact-brands"]',
        popover: {
          title: "The three brand statuses",
          description:
            "Each contact has three parallel statuses — one for Nomi, one for StarTech, one for Luminarix. They're independent. You can be 'LD' with someone for Nomi and 'Pending' for StarTech.",
          side: "left",
        },
      },
      {
        element: '[data-tour="add-contact-submit"]',
        popover: {
          title: "Save",
          description:
            "Click Save and you're back on the contacts list with the new row at the top.",
          side: "top",
        },
      },
    ],
  });
  activeDriver = d;
  d.drive();
  return d;
}

export function startMatchMakerTour() {
  teardown();
  const d = driver({
    ...commonOptions("matchmaker"),
    steps: [
      {
        popover: {
          title: "MatchMaker — pair publishers with offers",
          description:
            "Two modes, one goal: find the right offer for a publisher who's asked you to source something, or find publishers for an offer you've just acquired.",
        },
      },
      {
        element: '[data-tour="mm-tab-publisher"]',
        popover: {
          title: "By publisher",
          description:
            "Pick a publisher, see their open wishlists, and the top 5 active offers that match each request — ranked by score.",
          side: "bottom",
        },
      },
      {
        element: '[data-tour="mm-tab-offer"]',
        popover: {
          title: "By offer",
          description:
            "Pick an offer, see all open publisher wishlists that overlap with it on vertical or name tokens.",
          side: "bottom",
        },
      },
      {
        popover: {
          title: "Match score",
          description:
            "Exact vertical match = +50. Partial vertical = +25. Each shared name token = +10. Threshold ≥ 20 surfaces a match. ≥ 50 is strong, ≥ 30 is good, < 30 is a stretch.",
        },
      },
      {
        popover: {
          title: "Mark matched",
          description:
            "When you've actually paired a publisher with an offer, click Mark matched — the wishlist flips to 'matched' and the activity log records it.",
        },
      },
    ],
  });
  activeDriver = d;
  d.drive();
  return d;
}
