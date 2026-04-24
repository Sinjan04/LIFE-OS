"use client";

import { useState, useEffect, useCallback } from "react";

const categories = [
  "Study",
  "Work",
  "Gym",
  "Sports",
  "Social",
  "Rest",
  "Sleep",
  "Personal Hobby",
  "Gaming",
  "Meals",
  "Other",
] as const;

type Category = (typeof categories)[number];

const productivityMap: Record<Category, number> = {
  Study: 12,       // increased from 10
  Work: 12,        // increased from 10
  Gym: 8,
  Sports: 7,
  Social: 0,
  Rest: 0,
  Sleep: 0,
  "Personal Hobby": 0,
  Gaming: 0,
  Meals: 2,        // small productivity boost from proper meals
  Other: 0,
};

const happinessMap: Record<Category, number> = {
  Social: 10,
  Sports: 9,
  Sleep: 8,
  Gym: 7,
  "Personal Hobby": 8,
  Gaming: 7,
  Rest: 5,
  Meals: 6,        // good food = happy
  Study: 0,
  Work: 0,
  Other: 0,
};

const tokenEarnMap: Record<Category, number> = {
  Study: 10,
  Work: 10,
  Gym: 10,
  Sports: 0,
  Social: 0,
  Rest: 0,
  Sleep: 0,
  "Personal Hobby": 0,
  Gaming: -5,
  Meals: 0,        // meals don't cost tokens
  Other: 0,
};

// NEW: Additional stat impacts for Meals
// Meals contribute to VIT (vitality) and recovery
const statMap: Record<Category, "INT" | "STR" | "CHA" | "VIT" | "SPR" | null> = {
  Study: "INT",
  Work: "INT",
  Gym: "STR",
  Sports: "STR",
  Social: "CHA",
  Rest: "VIT",
  Sleep: "VIT",
  "Personal Hobby": "SPR",
  Gaming: null,
  Meals: "VIT",    // nutrition = vitality
  Other: null,
};
const blockStyles: Record<Category, string> = {
  Study: "bg-blue-900/20 border-blue-400/40",
  Work: "bg-indigo-900/20 border-indigo-400/40",
  Gym: "bg-orange-900/20 border-orange-400/40",
  Sports: "bg-red-900/20 border-red-400/40",
  Social: "bg-green-900/20 border-green-400/40",
  Rest: "bg-yellow-900/20 border-yellow-400/40",
  Sleep: "bg-purple-900/20 border-purple-400/40",
  "Personal Hobby": "bg-pink-900/20 border-pink-400/40",
  Gaming: "bg-cyan-900/20 border-cyan-400/40",
  Meals: "bg-amber-900/20 border-amber-400/40",
  Other: "bg-gray-800/20 border-gray-400/40",
};

const defaultBlockStyle = "bg-white/5 border-white/10";

const tabs = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "log", label: "Log", emoji: "📝" },
  { id: "goals", label: "Goals", emoji: "🎯" },
  { id: "insights", label: "Insights", emoji: "📊" },
  { id: "profile", label: "Profile", emoji: "👤" },
  { id: "guide", label: "Guide", emoji: "📖" }, // NEW
] as const;

type TabId = (typeof tabs)[number]["id"];

// NEW: Daily Modifier Type
type ModifierType = "monk" | "social" | "recovery" | null;
interface DailyModifier {
  type: ModifierType;
  name: string;
  prodMultiplier: number;
  happyMultiplier: number;
  emoji: string;
}

// NEW: Get daily modifier based on date (deterministic)
const getDailyModifier = (): DailyModifier => {
  if (typeof window === "undefined") return { type: null, name: "", prodMultiplier: 1, happyMultiplier: 1, emoji: "" };
  const today = getTodayDate();
  const seed = today.split("-").join(""); // simple hash
  const hash = parseInt(seed) % 3;
  const modifiers: DailyModifier[] = [
    { type: "monk", name: "Monk Mode", prodMultiplier: 1.5, happyMultiplier: 1.0, emoji: "🧘" },
    { type: "social", name: "Social Boost", prodMultiplier: 1.0, happyMultiplier: 1.5, emoji: "🎉" },
    { type: "recovery", name: "Recovery Day", prodMultiplier: 0.8, happyMultiplier: 1.2, emoji: "🛌" },
  ];
  return modifiers[hash];
};

// Updated calculateScores to include daily modifier and token penalty
const calculateScores = (
  timelineData: { [hour: number]: Category },
  activityLogs: Array<{ category: Category; hours: number }>,
  modifier: DailyModifier,
  tokenBalance: number
) => {
  let productivity = 0;
  let happiness = 0;
  Object.values(timelineData).forEach((cat) => {
    productivity += productivityMap[cat] || 0;
    happiness += happinessMap[cat] || 0;
  });
  activityLogs.forEach(({ category, hours }) => {
    let prodGain = (productivityMap[category] || 0) * hours;
    let happyGain = (happinessMap[category] || 0) * hours;
    
    // Apply token penalty for activities that cost tokens (Gaming/Rest)
    const tokenCost = tokenEarnMap[category] || 0;
    if (tokenCost < 0 && tokenBalance + tokenCost < 0) {
      // Insufficient tokens: halve happiness gain
      happyGain *= 0.5;
    }
    
    productivity += prodGain;
    happiness += happyGain;
  });
  
  // Apply daily modifier multipliers
  productivity *= modifier.prodMultiplier;
  happiness *= modifier.happyMultiplier;
  
  return {
    productivity: Math.min(100, Math.round(productivity)),
    happiness: Math.min(100, Math.round(happiness)),
  };
};

const getBreakdown = (
  timelineData: { [hour: number]: Category },
  activityLogs: Array<{ category: Category; hours: number }>
) => {
  const hoursMap: Record<Category, number> = {
    Study: 0,
    Work: 0,
    Gym: 0,
    Sports: 0,
    Social: 0,
    Rest: 0,
    Sleep: 0,
    "Personal Hobby": 0,
    Gaming: 0,
    Meals: 0,
    Other: 0,
  };
  Object.values(timelineData).forEach((cat) => hoursMap[cat]++);
  activityLogs.forEach(({ category, hours }) => (hoursMap[category] += hours));
  const breakdown: Array<{ category: Category; hours: number; prod: number; happy: number }> = [];
  categories.forEach((cat) => {
    const hours = hoursMap[cat];
    if (hours > 0) {
      breakdown.push({
        category: cat,
        hours,
        prod: hours * productivityMap[cat],
        happy: hours * happinessMap[cat],
      });
    }
  });
  return { breakdown, hoursMap };
};

const getTodayDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const computeStreaks = (history: Array<{ date: string; productivity: number; happiness: number }>) => {
  if (history.length === 0) return { currentStreak: 0, highPerfStreak: 0 };
  const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date));
  let currentStreak = 0;
  let expectedDate = new Date();
  expectedDate.setHours(0, 0, 0, 0);
  for (const entry of sorted) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((expectedDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) {
      currentStreak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (diffDays === 1 && currentStreak === 0) {
      currentStreak++;
      expectedDate.setDate(expectedDate.getDate() - 2);
    } else break;
  }
  let highPerfStreak = 0;
  for (const entry of sorted) {
    if (entry.productivity >= 60) highPerfStreak++;
    else break;
  }
  return { currentStreak, highPerfStreak };
};

const getPersona = (history: Array<{ date: string; productivity: number; happiness: number }>) => {
  if (history.length === 0) return { title: "The Beginner", emoji: "🌱", description: "Start logging to discover your persona" };
  const last7Days = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
  const avgProd = last7Days.reduce((sum, d) => sum + d.productivity, 0) / last7Days.length;
  const avgHappy = last7Days.reduce((sum, d) => sum + d.happiness, 0) / last7Days.length;
  if (avgProd >= 70 && avgHappy >= 70) return { title: "The Balanced One", emoji: "⚖️", description: "You've mastered work-life harmony" };
  if (avgProd >= 70 && avgHappy < 50) return { title: "The Architect", emoji: "🏗️", description: "Building empires, don't forget to live" };
  if (avgProd < 50 && avgHappy >= 70) return { title: "The Socialite", emoji: "🦋", description: "Life of the party, time to grind?" };
  if (avgProd >= 50 && avgHappy >= 50) return { title: "The Steady", emoji: "🌲", description: "Consistent progress, keep going" };
  return { title: "The Explorer", emoji: "🗺️", description: "Finding your rhythm. Stay curious" };
};

const getSmartSuggestion = (
  scores: { productivity: number; happiness: number },
  hoursMap: Record<Category, number>,
  history: Array<{ date: string; productivity: number; happiness: number }>
) => {
  if (hoursMap["Gym"] === 0 && scores.productivity < 70) return { text: "Gym would boost your productivity by ~8 points", emoji: "💪" };
  if (hoursMap["Social"] === 0 && scores.happiness < 60) return { text: "Schedule 1h of Social time — happiness needs it", emoji: "🫂" };
  if (hoursMap["Sleep"] < 7) return { text: "Aim for 7-8h sleep tonight. Recovery = performance", emoji: "😴" };
  if (scores.productivity > 80 && scores.happiness < 50) return { text: "You're crushing work. Add 30min of Rest or Hobby", emoji: "🎮" };
  if (scores.happiness > 80 && scores.productivity < 50) return { text: "Joy is high! Channel some into focused work", emoji: "🎯" };
  return { text: "You're on track. Keep the momentum going", emoji: "✨" };
};

const triggerConfetti = () => {
  if (typeof window !== "undefined" && (window as any).confetti) {
    const confetti = (window as any).confetti;
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.6, x: 0.3 } });
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.6, x: 0.7 } });
  }
};

const playSound = (type: "log" | "badge" | "complete") => {
  if (typeof window !== "undefined") {
    const audio = new Audio();
    if (type === "badge") audio.src = "data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoAAACAgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f38=";
    else if (type === "log") audio.src = "data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoAAACAgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f38=";
    else audio.src = "data:audio/wav;base64,UklGRlwAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVoAAACAgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f39/f39/f3+AgICAf39/f38=";
    audio.volume = 0.3;
    audio.play().catch(() => {});
    if (navigator.vibrate) navigator.vibrate(20);
  }
};

type BadgeCondition =
  | ((a: number) => boolean)
  | ((a: number, b: number) => boolean)
  | ((a: Record<Category, number>) => boolean);

const badgesList: Array<{
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: BadgeCondition;
}> = [
  { id: "first_log", name: "First Steps", description: "Logged your first activity", emoji: "🎯", condition: (totalLogs: number) => totalLogs >= 1 },
  { id: "prod_50", name: "Getting Things Done", description: "Reached 50 Productivity", emoji: "📋", condition: (prod: number) => prod >= 50 },
  { id: "prod_70", name: "Productivity Pro", description: "Reached 70+ Productivity", emoji: "📈", condition: (prod: number) => prod >= 70 },
  { id: "prod_90", name: "Unstoppable", description: "Reached 90+ Productivity", emoji: "🚀", condition: (prod: number) => prod >= 90 },
  { id: "happy_50", name: "Smile Seeker", description: "Reached 50 Happiness", emoji: "🙂", condition: (happy: number) => happy >= 50 },
  { id: "happy_70", name: "Joy Seeker", description: "Reached 70+ Happiness", emoji: "😊", condition: (happy: number) => happy >= 70 },
  { id: "happy_90", name: "Pure Bliss", description: "Reached 90+ Happiness", emoji: "😄", condition: (happy: number) => happy >= 90 },
  { id: "balance_80", name: "Perfect Balance", description: "Both scores 80+", emoji: "⚖️", condition: (prod: number, happy: number) => prod >= 80 && happy >= 80 },
  { id: "streak_3", name: "Consistency King", description: "3 day streak", emoji: "🔥", condition: (streak: number) => streak >= 3 },
  { id: "streak_7", name: "Weekly Warrior", description: "7 day streak", emoji: "📅", condition: (streak: number) => streak >= 7 },
  { id: "streak_14", name: "Fortnight Fortitude", description: "14 day streak", emoji: "🗓️", condition: (streak: number) => streak >= 14 },
  { id: "streak_30", name: "Monthly Master", description: "30 day streak", emoji: "🏆", condition: (streak: number) => streak >= 30 },
  { id: "gym_rat", name: "Gym Rat", description: "3+ hours at Gym", emoji: "💪", condition: (hours: Record<Category, number>) => (hours["Gym"] || 0) >= 3 },
  { id: "gym_elite", name: "Gym Elite", description: "10+ hours Gym total", emoji: "🏋️", condition: (hours: Record<Category, number>) => (hours["Gym"] || 0) >= 10 },
  { id: "social_butterfly", name: "Social Butterfly", description: "4+ hours Social", emoji: "🦋", condition: (hours: Record<Category, number>) => (hours["Social"] || 0) >= 4 },
  { id: "social_king", name: "Social King", description: "12+ hours Social total", emoji: "👑", condition: (hours: Record<Category, number>) => (hours["Social"] || 0) >= 12 },
  { id: "sleep_champion", name: "Sleep Champion", description: "8+ hours Sleep", emoji: "😴", condition: (hours: Record<Category, number>) => (hours["Sleep"] || 0) >= 8 },
  { id: "sleep_guardian", name: "Sleep Guardian", description: "50+ hours Sleep total", emoji: "🛌", condition: (hours: Record<Category, number>) => (hours["Sleep"] || 0) >= 50 },
  { id: "study_beast", name: "Study Beast", description: "5+ hours Study", emoji: "📚", condition: (hours: Record<Category, number>) => (hours["Study"] || 0) >= 5 },
  { id: "workaholic", name: "Workaholic", description: "6+ hours Work", emoji: "💼", condition: (hours: Record<Category, number>) => (hours["Work"] || 0) >= 6 },
  { id: "gamer", name: "Gamer", description: "3+ hours Gaming", emoji: "🎮", condition: (hours: Record<Category, number>) => (hours["Gaming"] || 0) >= 3 },
  { id: "hobbyist", name: "Hobbyist", description: "3+ hours Personal Hobby", emoji: "🎨", condition: (hours: Record<Category, number>) => (hours["Personal Hobby"] || 0) >= 3 },
  { id: "rest_day", name: "Rest Day Master", description: "Logged 4+ hours Rest", emoji: "🛀", condition: (hours: Record<Category, number>) => (hours["Rest"] || 0) >= 4 },
  { id: "sports_star", name: "Sports Star", description: "2+ hours Sports", emoji: "⚽", condition: (hours: Record<Category, number>) => (hours["Sports"] || 0) >= 2 },
  { id: "all_rounder", name: "All-Rounder", description: "Logged 5+ different categories in a day", emoji: "🌈", condition: (uniqueCategories: number) => uniqueCategories >= 5 },
  { id: "planner", name: "The Planner", description: "Set 5+ planned goals", emoji: "📝", condition: (plannedCount: number) => plannedCount >= 5 },
  { id: "overachiever", name: "Overachiever", description: "Beat your projected productivity by 20+", emoji: "🚀", condition: (diff: number) => diff >= 20 },
  { id: "recovery_guru", name: "Recovery Guru", description: "Recovery score 80+", emoji: "🧘", condition: (recovery: number) => recovery >= 80 },
  { id: "focus_master", name: "Focus Master", description: "Focus score 80+", emoji: "🎯", condition: (focus: number) => focus >= 80 },
  { id: "balance_guru", name: "Balance Guru", description: "Balance score 90+", emoji: "☯️", condition: (balance: number) => balance >= 90 },
];

const generateChallenges = (
  history: Array<{ date: string; productivity: number; happiness: number }>,
  hoursMap: Record<Category, number>,
  streaks: { currentStreak: number }
) => {
  const challenges = [];
  
  if (streaks.currentStreak < 3) {
    challenges.push({
      id: "streak_3_quest",
      title: "3-Day Streak",
      description: "Log activities for 3 consecutive days",
      target: 3,
      current: streaks.currentStreak,
      reward: "🔥 Consistency King Badge",
    });
  }
  
  const gymHours = hoursMap["Gym"] || 0;
  if (gymHours < 3) {
    challenges.push({
      id: "gym_quest",
      title: "Gym Session",
      description: "Log at least 3 hours at Gym this week",
      target: 3,
      current: gymHours,
      reward: "💪 Gym Rat Badge",
    });
  }
  
  const totalProd = history.reduce((sum, d) => sum + d.productivity, 0);
  if (history.length > 0 && totalProd / history.length < 70) {
    challenges.push({
      id: "avg_prod_70",
      title: "Productivity Boost",
      description: "Reach an average productivity of 70+",
      target: 70,
      current: Math.round(totalProd / history.length),
      reward: "📈 Productivity Pro Badge",
    });
  }
  
  return challenges.slice(0, 3);
};

// NEW: Rank function
const getRank = (level: number): { title: string; emoji: string } => {
  if (level <= 5) return { title: "Beginner", emoji: "🌱" };
  if (level <= 10) return { title: "Builder", emoji: "🏗️" };
  if (level <= 20) return { title: "Strategist", emoji: "🧠" };
  return { title: "Elite", emoji: "🚀" };
};

export default function Home() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<{ [hour: number]: Category }>({});
  const [activityLogs, setActivityLogs] = useState<Array<{ category: Category; hours: number }>>([]);
  const [plannedLogs, setPlannedLogs] = useState<Array<{ category: Category; hours: number }>>([]);
  const [activeTab, setActiveTab] = useState<"hourly" | "activity">("hourly");
  const [selectedCategory, setSelectedCategory] = useState<Category>("Study");
  const [hoursInput, setHoursInput] = useState<string>("1");
  const [plannedCategory, setPlannedCategory] = useState<Category>("Study");
  const [plannedHours, setPlannedHours] = useState<string>("1");
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabId>("home");
  const [pulseEnergy, setPulseEnergy] = useState<"low" | "mid" | "high" | "drained" | null>(null);
  const [pulseMood, setPulseMood] = useState<"😊" | "😐" | "😤" | "😢" | "🤩" | "😴" | null>(null);
  const [pulseIntention, setPulseIntention] = useState<"Work" | "Rest" | "Balance" | "Survive" | "Create" | null>(null);
  const [history, setHistory] = useState<Array<{ date: string; productivity: number; happiness: number; reflection?: string }>>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [newBadge, setNewBadge] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [reflectionInput, setReflectionInput] = useState("");
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // NEW: Identity & Onboarding states
  const [userName, setUserName] = useState<string>("");
  const [showNameModal, setShowNameModal] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [prevLevel, setPrevLevel] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showRpgInfo, setShowRpgInfo] = useState(false);
  
  const dailyModifier = getDailyModifier();
  const level = Math.floor(totalXP / 100);
  const rank = getRank(level);

  // Load all data
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedTimeline = localStorage.getItem("lifeos_timeline");
        if (savedTimeline) setTimelineData(JSON.parse(savedTimeline));
        const savedActivity = localStorage.getItem("lifeos_activity");
        if (savedActivity) setActivityLogs(JSON.parse(savedActivity));
        const savedPlanned = localStorage.getItem("lifeos_planned");
        if (savedPlanned) setPlannedLogs(JSON.parse(savedPlanned));
        const savedHistory = localStorage.getItem("lifeos_history");
        if (savedHistory) setHistory(JSON.parse(savedHistory));
        const savedBadges = localStorage.getItem("lifeos_badges");
        if (savedBadges) setUnlockedBadges(JSON.parse(savedBadges));
        const savedPulse = localStorage.getItem("lifeos_pulse");
        if (savedPulse) {
          const pulse = JSON.parse(savedPulse);
          if (pulse.date === getTodayDate()) {
            setPulseEnergy(pulse.energy);
            setPulseMood(pulse.mood);
            setPulseIntention(pulse.intention);
          }
        }
        const savedPartner = localStorage.getItem("lifeos_partner");
        if (savedPartner) setPartnerName(savedPartner);
        const savedSound = localStorage.getItem("lifeos_sound");
        if (savedSound !== null) setSoundEnabled(JSON.parse(savedSound));
        
        // NEW: Load identity data
        const savedName = localStorage.getItem("lifeos_username");
        if (savedName) {
          setUserName(savedName);
        } else {
          setShowNameModal(true);
        }
        const savedXP = localStorage.getItem("lifeos_xp");
        if (savedXP) setTotalXP(JSON.parse(savedXP));
        const savedTokens = localStorage.getItem("lifeos_tokens");
        if (savedTokens) setTokenBalance(JSON.parse(savedTokens));
        const onboarded = localStorage.getItem("lifeos_onboarded");
        if (!onboarded && savedName) {
          setShowOnboarding(true);
        }
      } catch {}
      setIsLoaded(true);
    }
  }, []);

  // Confetti script
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).confetti) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Persist data
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_timeline", JSON.stringify(timelineData));
    }
  }, [timelineData, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_activity", JSON.stringify(activityLogs));
    }
  }, [activityLogs, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_planned", JSON.stringify(plannedLogs));
    }
  }, [plannedLogs, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_history", JSON.stringify(history));
    }
  }, [history, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_badges", JSON.stringify(unlockedBadges));
    }
  }, [unlockedBadges, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_partner", partnerName);
    }
  }, [partnerName, isLoaded]);

  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_sound", JSON.stringify(soundEnabled));
    }
  }, [soundEnabled, isLoaded]);
  
  // NEW: Persist XP and tokens
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_xp", JSON.stringify(totalXP));
    }
  }, [totalXP, isLoaded]);
  
  useEffect(() => {
    if (isLoaded && typeof window !== "undefined") {
      localStorage.setItem("lifeos_tokens", JSON.stringify(tokenBalance));
    }
  }, [tokenBalance, isLoaded]);
  
  // NEW: Check for level up
  useEffect(() => {
    if (level > prevLevel && prevLevel > 0) {
      setShowLevelUp(true);
      triggerConfetti();
      if (soundEnabled) playSound("badge");
      setTimeout(() => setShowLevelUp(false), 4000);
    }
    setPrevLevel(level);
  }, [level, prevLevel, soundEnabled]);

  const savePulse = () => {
    if (typeof window !== "undefined" && pulseEnergy && pulseMood && pulseIntention) {
      localStorage.setItem("lifeos_pulse", JSON.stringify({
        date: getTodayDate(),
        energy: pulseEnergy,
        mood: pulseMood,
        intention: pulseIntention,
      }));
    }
  };

  // Compute XP from current logs (used for updates)
  const computeXPFromLogs = useCallback(() => {
    let xp = 0;
    Object.values(timelineData).forEach(cat => {
      if (statMap[cat]) xp += 10;
    });
    activityLogs.forEach(({ category, hours }) => {
      if (statMap[category]) xp += hours * 10;
    });
    return xp;
  }, [timelineData, activityLogs]);
  
  // Compute token delta from current logs
  const computeTokenDelta = useCallback(() => {
    let delta = 0;
    Object.values(timelineData).forEach(cat => {
      delta += tokenEarnMap[cat] || 0;
    });
    activityLogs.forEach(({ category, hours }) => {
      delta += (tokenEarnMap[category] || 0) * hours;
    });
    return delta;
  }, [timelineData, activityLogs]);

  const actualScores = calculateScores(timelineData, activityLogs, dailyModifier, tokenBalance);
  const projectedScores = calculateScores({}, plannedLogs, dailyModifier, tokenBalance);
  const { breakdown, hoursMap } = getBreakdown(timelineData, activityLogs);
  const streaks = computeStreaks(history);
  const totalLogs = Object.keys(timelineData).length + activityLogs.length;
  const persona = getPersona(history);
  const suggestion = getSmartSuggestion(actualScores, hoursMap, history);
  const uniqueCategories = Object.values(hoursMap).filter(h => h > 0).length;

  const totalHours = Object.values(hoursMap).reduce((a, b) => a + b, 0);
  const balanceScore = Math.max(0, 100 - Math.abs(actualScores.productivity - actualScores.happiness));
  const deepWorkHours = (hoursMap["Study"] || 0) + (hoursMap["Work"] || 0);
  const leisureHours = (hoursMap["Gaming"] || 0) + (hoursMap["Social"] || 0);
  const focusScore = deepWorkHours + leisureHours > 0
    ? Math.min(100, Math.round((deepWorkHours / (deepWorkHours + leisureHours)) * 100))
    : 50;
  const recoveryHours = (hoursMap["Sleep"] || 0) + (hoursMap["Rest"] || 0);
  const recoveryScore = Math.min(100, Math.round((recoveryHours / 24) * 100));

  const topCategory = Object.entries(hoursMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  const bestDay = [...history].sort((a, b) => (b.productivity + b.happiness) - (a.productivity + a.happiness))[0];

  const prodDiff = actualScores.productivity - projectedScores.productivity;
  const happyDiff = actualScores.happiness - projectedScores.happiness;
  const comparisonStatus = prodDiff >= 5 ? "Overperformed 🚀" : prodDiff <= -5 ? "Underperformed ⚠️" : "On Track ✅";

  const challenges = generateChallenges(history, hoursMap, streaks);

  const checkBadges = useCallback(() => {
    const newlyUnlocked: string[] = [];
    badgesList.forEach((badge) => {
      if (unlockedBadges.includes(badge.id)) return;
      let conditionMet = false;
      if (badge.id === "first_log") conditionMet = (badge.condition as (n: number) => boolean)(totalLogs);
      else if (badge.id.includes("prod_")) conditionMet = (badge.condition as (n: number) => boolean)(actualScores.productivity);
      else if (badge.id.includes("happy_")) conditionMet = (badge.condition as (n: number) => boolean)(actualScores.happiness);
      else if (badge.id === "balance_80") conditionMet = (badge.condition as (p: number, h: number) => boolean)(actualScores.productivity, actualScores.happiness);
      else if (badge.id.includes("streak_")) conditionMet = (badge.condition as (n: number) => boolean)(streaks.currentStreak);
      else if (badge.id === "all_rounder") conditionMet = (badge.condition as (n: number) => boolean)(uniqueCategories);
      else if (badge.id === "planner") conditionMet = (badge.condition as (n: number) => boolean)(plannedLogs.length);
      else if (badge.id === "overachiever") conditionMet = (badge.condition as (n: number) => boolean)(prodDiff);
      else if (badge.id === "recovery_guru") conditionMet = (badge.condition as (n: number) => boolean)(recoveryScore);
      else if (badge.id === "focus_master") conditionMet = (badge.condition as (n: number) => boolean)(focusScore);
      else if (badge.id === "balance_guru") conditionMet = (badge.condition as (n: number) => boolean)(balanceScore);
      else conditionMet = (badge.condition as (h: Record<Category, number>) => boolean)(hoursMap);
      if (conditionMet) newlyUnlocked.push(badge.id);
    });
    if (newlyUnlocked.length > 0) {
      setUnlockedBadges((prev) => [...prev, ...newlyUnlocked]);
      setNewBadge(newlyUnlocked[0]);
      setShowCelebration(true);
      if (soundEnabled) playSound("badge");
      triggerConfetti();
      setTimeout(() => setShowCelebration(false), 5000);
      setTimeout(() => setNewBadge(null), 4000);
    }
  }, [
    actualScores,
    streaks,
    totalLogs,
    plannedLogs.length,
    prodDiff,
    recoveryScore,
    focusScore,
    balanceScore,
    uniqueCategories,
    hoursMap,
    soundEnabled,
    unlockedBadges,
  ]);

  useEffect(() => {
    if (isLoaded) checkBadges();
  }, [
    actualScores,
    streaks,
    totalLogs,
    isLoaded,
    plannedLogs.length,
    prodDiff,
    recoveryScore,
    focusScore,
    balanceScore,
    uniqueCategories,
    hoursMap,
    checkBadges,
  ]);

  const getProductivityColor = (score: number) => {
    if (score < 40) return "from-red-400 to-red-600";
    if (score < 70) return "from-yellow-400 to-yellow-600";
    return "from-green-400 to-green-600";
  };

  const getHappinessColor = (score: number) => {
    if (score < 40) return "from-red-400 to-red-600";
    if (score < 70) return "from-yellow-400 to-yellow-600";
    return "from-lime-400 to-green-500";
  };

  const getFeedbackMessage = (p: number, h: number) => {
    const avg = (p + h) / 2;
    if (p >= 80 && h >= 80) return "Elite Balance 🔥";
    if (avg >= 70) return "Strong Day 💪";
    if (p >= 75 && h < 50) return "Grinding Hard ⚠️";
    if (h >= 75 && p < 50) return "Life's Good 😌";
    if (avg >= 50) return "Decent Day 👍";
    return "Keep Going";
  };

  const getDailyInsight = () => {
    if (actualScores.productivity >= 80) return "You're in the zone! 🚀";
    if (actualScores.happiness >= 80) return "Joy radiates from your day! ✨";
    if (hoursMap["Gym"] > 0) return "You moved your body! 💪";
    if (hoursMap["Social"] > 2) return "Connection fuels you 🫂";
    if (hoursMap["Sleep"] >= 7) return "Well rested = unstoppable 😴➡️⚡";
    return "Every log is a step forward 🌱";
  };
  const getPulseFeedback = (
  energy: typeof pulseEnergy,
  mood: typeof pulseMood,
  intention: typeof pulseIntention
): { emoji: string; text: string } => {
  if (!energy || !mood || !intention) return { emoji: "⚡", text: "Complete your pulse!" };
  
  const combos: Record<string, { emoji: string; text: string }> = {
    "high_😊_Work": { emoji: "🚀", text: "Unstoppable! Today you're a productivity god." },
    "high_😤_Work": { emoji: "😈", text: "Angry productivity. Channel that fire!" },
    "high_😢_Work": { emoji: "😭💼", text: "Crying in the conference room. Power through." },
    "mid_😐_Work": { emoji: "☕", text: "Just another day at the grind. Coffee helps." },
    "low_😴_Work": { emoji: "🥱💻", text: "Wants to work but body says no. Fake it." },
    "low_😢_Work": { emoji: "😩", text: "Wants to work but not willingly. We've all been there." },
    "high_🤩_Create": { emoji: "🎨✨", text: "Creative explosion! Make something beautiful." },
    "mid_😊_Balance": { emoji: "⚖️😌", text: "Perfect equilibrium. You're a zen master." },
    "drained_😴_Survive": { emoji: "🧟", text: "Survival mode activated. Just get through it." },
    "drained_😢_Rest": { emoji: "🛌😭", text: "You need a hug and a nap. Order doesn't matter." },
    "high_🤩_Rest": { emoji: "🎉🛋️", text: "Excited to do nothing! Enjoy the laziness." },
    "low_😤_Rest": { emoji: "😠🛌", text: "Forced rest. You're angry about relaxing." },
  };
  
  const key = `${energy}_${mood}_${intention}`;
  return combos[key] || { emoji: "✨", text: "Today is yours. Make it count." };
};

  const handleHourSelect = (category: Category) => {
    if (selectedHour !== null) {
      setTimelineData({ ...timelineData, [selectedHour]: category });
      setSelectedHour(null);
      if (soundEnabled) playSound("log");
      
      // Onboarding step: after first log, move to reward step
      if (showOnboarding && onboardingStep === 2) {
        setOnboardingStep(3);
      }
    }
  };

  const addActivityLog = () => {
    const hours = parseInt(hoursInput);
    if (!isNaN(hours) && hours > 0 && hours <= 12) {
      setActivityLogs([...activityLogs, { category: selectedCategory, hours }]);
      setHoursInput("1");
      if (soundEnabled) playSound("log");
      
      if (showOnboarding && onboardingStep === 2) {
        setOnboardingStep(3);
      }
    }
  };

  const removeActivityLog = (index: number) => {
    setActivityLogs(activityLogs.filter((_, i) => i !== index));
  };

  const addPlannedLog = () => {
    const hours = parseInt(plannedHours);
    if (!isNaN(hours) && hours > 0 && hours <= 12) {
      setPlannedLogs([...plannedLogs, { category: plannedCategory, hours }]);
      setPlannedHours("1");
    }
  };

  const removePlannedLog = (index: number) => {
    setPlannedLogs(plannedLogs.filter((_, i) => i !== index));
  };

  const handleClearToday = () => {
    setTimelineData({});
    setActivityLogs([]);
  };

  const handleClearPlanned = () => {
    setPlannedLogs([]);
  };

  const saveTodayScore = (reflection?: string) => {
    const today = getTodayDate();
    const newEntry = { date: today, productivity: actualScores.productivity, happiness: actualScores.happiness, reflection };
    setHistory((prev) => {
      const existingIndex = prev.findIndex((e) => e.date === today);
      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = newEntry;
        return updated;
      }
      return [...prev, newEntry];
    });
  };

  const handleDoneClick = () => {
    if (Object.keys(timelineData).length === 0 && activityLogs.length === 0) {
      alert("Please log at least one activity or hourly block before finishing.");
      return;
    }
    
    // Update XP and Tokens
    const newXP = totalXP + computeXPFromLogs();
    setTotalXP(newXP);
    const tokenDelta = computeTokenDelta();
    setTokenBalance(prev => prev + tokenDelta);
    
    saveTodayScore();
    checkBadges();
    setShowScoreModal(true);
    if (soundEnabled) playSound("complete");
  };

  const handleScoreModalClose = () => {
    setShowScoreModal(false);
    setTimeout(() => setShowReflectionModal(true), 300);
  };

  const handleReflectionSubmit = () => {
    if (reflectionInput.trim()) {
      const today = getTodayDate();
      setHistory(prev => prev.map(entry => 
        entry.date === today ? { ...entry, reflection: reflectionInput } : entry
      ));
    }
    setReflectionInput("");
    setShowReflectionModal(false);
  };

  const handlePulseSubmit = () => {
    savePulse();
    if (showOnboarding && onboardingStep === 1) {
      setOnboardingStep(2);
    }
  };

  const exportData = () => {
    const data = {
      timelineData,
      activityLogs,
      plannedLogs,
      history,
      unlockedBadges,
      partnerName,
      pulse: { energy: pulseEnergy, mood: pulseMood, intention: pulseIntention },
      userName,
      totalXP,
      tokenBalance,
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos_backup_${getTodayDate()}.json`;
    a.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.timelineData) setTimelineData(data.timelineData);
        if (data.activityLogs) setActivityLogs(data.activityLogs);
        if (data.plannedLogs) setPlannedLogs(data.plannedLogs);
        if (data.history) setHistory(data.history);
        if (data.unlockedBadges) setUnlockedBadges(data.unlockedBadges);
        if (data.partnerName) setPartnerName(data.partnerName);
        if (data.pulse) {
          setPulseEnergy(data.pulse.energy);
          setPulseMood(data.pulse.mood);
          setPulseIntention(data.pulse.intention);
        }
        if (data.userName) setUserName(data.userName);
        if (data.totalXP) setTotalXP(data.totalXP);
        if (data.tokenBalance) setTokenBalance(data.tokenBalance);
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleHoursInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*$/.test(val)) {
      setHoursInput(val);
    }
  };

  const handlePlannedHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "" || /^\d*$/.test(val)) {
      setPlannedHours(val);
    }
  };
  
  // NEW: Handle name save
  const handleNameSave = () => {
    if (userName.trim()) {
      if (typeof window !== "undefined") {
        localStorage.setItem("lifeos_username", userName);
      }
      setShowNameModal(false);
      setShowOnboarding(true);
      setOnboardingStep(0);
    }
  };
  
  // NEW: Complete onboarding
  const completeOnboarding = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lifeos_onboarded", "true");
    }
    setShowOnboarding(false);
    setOnboardingStep(0);
  };

  const currentBadge = badgesList.find((b) => b.id === newBadge);
  const pulseCompleted = pulseEnergy && pulseMood && pulseIntention;
  const last7DaysData = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).reverse();
  
  // NEW: RPG stats calculation
  const rpgStats = {
    INT: (hoursMap["Study"] || 0) + (hoursMap["Work"] || 0),
    STR: (hoursMap["Gym"] || 0) + (hoursMap["Sports"] || 0),
    CHA: hoursMap["Social"] || 0,
    VIT: (hoursMap["Sleep"] || 0) + (hoursMap["Rest"] || 0),
    SPR: hoursMap["Personal Hobby"] || 0,
  };
  const maxStat = Math.max(...Object.values(rpgStats), 1);
    return (
    <>
      {/* Solid black background — premium minimal like How We Feel */}
      <div className="fixed inset-0 -z-10 bg-black" />

      <div className="relative text-white min-h-screen px-5 py-8 sm:px-6 sm:py-10 font-sans antialiased max-w-2xl mx-auto">
        {/* Level Up Celebration */}
        {showLevelUp && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-3">
              <span className="text-4xl">⬆️</span>
              <div>
                <p className="font-medium text-white">Level Up!</p>
                <p className="text-sm text-white/60">You are now Level {level}</p>
              </div>
            </div>
          </div>
        )}
        
        {showCelebration && currentBadge && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
            <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl px-6 py-4 flex items-center gap-3">
              <span className="text-4xl">{currentBadge.emoji}</span>
              <div>
                <p className="font-medium text-white">Badge Unlocked!</p>
                <p className="text-sm text-white/60">{currentBadge.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Daily Modifier Banner */}
        {dailyModifier.type && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2 text-sm">
              <span>{dailyModifier.emoji}</span>
              <span className="font-medium">{dailyModifier.name}</span>
              <span className="text-white/30">·</span>
              <span className="text-white/60">Prod {dailyModifier.prodMultiplier}x · Happy {dailyModifier.happyMultiplier}x</span>
            </div>
          </div>
        )}

        {/* Minimal Hero */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight text-white/90">Life OS</h1>
          <p className="text-sm text-white/40 mt-2 max-w-md mx-auto leading-relaxed">
            your mindful daily tracker
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-0.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-full p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex flex-col items-center px-4 py-2 rounded-full transition-all duration-200 ${
                  currentTab === tab.id
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:text-white/80"
                }`}
                style={{ touchAction: "manipulation" }}
              >
                <span className="text-lg">{tab.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {currentTab === "home" && (
          <div className="space-y-5">
            {/* Identity Panel — softer, minimal */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">
                    {userName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-medium text-white/90">{userName || "Traveler"}</p>
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <span>Lv.{level}</span>
                      <span>·</span>
                      <span>{rank.emoji} {rank.title}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-white/80">
                    <span className="text-yellow-400">✨</span>
                    <span className="font-medium">{totalXP} XP</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-white/60">
                    <span className="text-amber-400">🪙</span>
                    <span>{tokenBalance}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 w-full h-1 bg-white/10 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-400 rounded-full transition-all"
                  style={{ width: `${(totalXP % 100)}%` }}
                />
              </div>
            </div>

            {/* Today's Scores — clean cards */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Today&apos;s Scores</h2>
              <div className="grid grid-cols-5 gap-3 text-center">
                <div>
                  <p className="text-xs text-white/40 mb-1">Prod</p>
                  <p className="text-2xl font-light text-blue-300">{actualScores.productivity}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Happy</p>
                  <p className="text-2xl font-light text-green-300">{actualScores.happiness}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Balance</p>
                  <p className="text-2xl font-light text-purple-300">{balanceScore}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Focus</p>
                  <p className="text-2xl font-light text-amber-300">{focusScore}</p>
                </div>
                <div>
                  <p className="text-xs text-white/40 mb-1">Recovery</p>
                  <p className="text-2xl font-light text-teal-300">{recoveryScore}</p>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] w-10 text-white/40">Prod</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${actualScores.productivity}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] w-10 text-white/40">Happy</span>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full">
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${actualScores.happiness}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Pulse Check-in */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-medium uppercase tracking-widest text-white/50 flex items-center gap-2">
                  <span>⚡ Pulse</span>
                  {pulseCompleted && <span className="text-green-400">✓</span>}
                </h3>
                {pulseCompleted && (
                  <button
                    onClick={() => {
                      setPulseEnergy(null);
                      setPulseMood(null);
                      setPulseIntention(null);
                      if (typeof window !== "undefined") localStorage.removeItem("lifeos_pulse");
                    }}
                    className="text-xs text-white/50 hover:text-white bg-white/10 px-3 py-1 rounded-full transition-colors"
                  >
                    Redo
                  </button>
                )}
              </div>
              {!pulseCompleted ? (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs text-white/40 mb-2">Energy</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { value: "low", label: "🥱 Low" },
                        { value: "mid", label: "😐 Mid" },
                        { value: "high", label: "⚡ High" },
                        { value: "drained", label: "🪫 Drained" },
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setPulseEnergy(value as any)}
                          className={`py-2.5 rounded-xl border text-sm transition-all ${
                            pulseEnergy === value
                              ? "bg-white/10 border-white/30"
                              : "bg-white/5 border-white/10"
                          }`}
                          style={{ touchAction: "manipulation" }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-2">Mood</p>
                    <div className="grid grid-cols-3 gap-2">
                      {["😊", "😐", "😤", "😢", "🤩", "😴"].map((mood) => (
                        <button
                          key={mood}
                          onClick={() => setPulseMood(mood as any)}
                          className={`py-2.5 rounded-xl border text-xl ${
                            pulseMood === mood
                              ? "bg-white/10 border-white/30"
                              : "bg-white/5 border-white/10"
                          }`}
                          style={{ touchAction: "manipulation" }}
                        >
                          {mood}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-white/40 mb-2">Intention</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "Work", emoji: "💼" },
                        { value: "Rest", emoji: "🛋️" },
                        { value: "Balance", emoji: "⚖️" },
                        { value: "Survive", emoji: "🧟" },
                        { value: "Create", emoji: "🎨" },
                      ].map(({ value, emoji }) => (
                        <button
                          key={value}
                          onClick={() => setPulseIntention(value as any)}
                          className={`py-2.5 rounded-xl border text-sm ${
                            pulseIntention === value
                              ? "bg-white/10 border-white/30"
                              : "bg-white/5 border-white/10"
                          }`}
                          style={{ touchAction: "manipulation" }}
                        >
                          {emoji} {value}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handlePulseSubmit}
                    disabled={!pulseEnergy || !pulseMood || !pulseIntention}
                    className="w-full bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-medium disabled:opacity-30 hover:bg-white/15 transition-all"
                    style={{ touchAction: "manipulation" }}
                  >
                    Save Pulse
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <div className="flex justify-around mb-4">
                    <div className="text-center">
                      <span className="text-3xl">
                        {pulseEnergy === "low" ? "🥱" : pulseEnergy === "mid" ? "😐" : pulseEnergy === "high" ? "⚡" : "🪫"}
                      </span>
                      <p className="text-xs text-white/40 mt-1 capitalize">{pulseEnergy}</p>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl">{pulseMood}</span>
                      <p className="text-xs text-white/40 mt-1">Mood</p>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl">
                        {pulseIntention === "Work" ? "💼" : pulseIntention === "Rest" ? "🛋️" : pulseIntention === "Balance" ? "⚖️" : pulseIntention === "Survive" ? "🧟" : "🎨"}
                      </span>
                      <p className="text-xs text-white/40 mt-1">{pulseIntention}</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                    <p className="text-lg mb-1">{getPulseFeedback(pulseEnergy, pulseMood, pulseIntention).emoji}</p>
                    <p className="text-sm text-white/70 italic">
                      &ldquo;{getPulseFeedback(pulseEnergy, pulseMood, pulseIntention).text}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Smart Suggestion */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-3">
              <span className="text-xl">{suggestion.emoji}</span>
              <p className="text-sm text-white/70">{suggestion.text}</p>
            </div>

            {/* Expandable Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-4 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl hover:bg-white/5 transition-colors"
            >
              <span className="font-medium text-white/70">View Details</span>
              <span className={`transition-transform ${showDetails ? 'rotate-90' : ''}`}>▶</span>
            </button>
            {showDetails && (
              <div className="space-y-4">
                {challenges.length > 0 && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-3">Challenges</h3>
                    {challenges.map((ch) => (
                      <div key={ch.id} className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{ch.title}</span>
                          <span>{ch.current}/{ch.target}</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full">
                          <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(100, (ch.current / ch.target) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {breakdown.length > 0 && (
                  <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
                    <h3 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-3">Point Sources</h3>
                    {breakdown.slice(0, 5).map((item) => (
                      <div key={item.category} className="flex justify-between text-sm py-1">
                        <span>{item.category} ({item.hours}h)</span>
                        <div className="flex gap-2">
                          {item.prod > 0 && <span className="text-blue-300">+{item.prod}P</span>}
                          {item.happy > 0 && <span className="text-green-300">+{item.happy}H</span>}
                        </div>
                      </div>
                    ))}
                    {breakdown.length > 5 && <p className="text-xs text-white/40 mt-2">+{breakdown.length - 5} more</p>}
                  </div>
                )}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex items-center gap-3">
                  <span className="text-3xl">{persona.emoji}</span>
                  <div>
                    <p className="font-medium">{persona.title}</p>
                    <p className="text-xs text-white/50">{persona.description}</p>
                  </div>
                </div>
                <div className="flex gap-6 justify-center py-2 text-sm text-white/60">
                  <div className="text-center">
                    <span className="text-xl">🔥</span>
                    <p>{streaks.currentStreak} day streak</p>
                  </div>
                  <div className="text-center">
                    <span className="text-xl">💪</span>
                    <p>{streaks.highPerfStreak} high perf</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
                {currentTab === "log" && (
          <div className="space-y-5">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-light text-white/80">Today&apos;s Log</h2>
                <button onClick={handleClearToday} className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors">
                  Clear
                </button>
              </div>

              <div className="mb-5 p-3 bg-white/5 border border-white/10 rounded-xl">
                <p className="text-xs text-white/60 text-center">
                  Use <strong>Hourly</strong> for time blocks or <strong>Activity</strong> for bulk logging.
                </p>
              </div>

              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-6">
                <button
                  onClick={() => setActiveTab("hourly")}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === "hourly"
                      ? "bg-white/15 text-white"
                      : "text-white/50"
                  }`}
                  style={{ touchAction: "manipulation" }}
                >
                  ⏰ Hourly
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === "activity"
                      ? "bg-white/15 text-white"
                      : "text-white/50"
                  }`}
                  style={{ touchAction: "manipulation" }}
                >
                  📋 Activity
                </button>
              </div>

              {activeTab === "hourly" ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scroll">
                  <p className="text-xs text-white/40 mb-2">Tap any hour to assign a category</p>
                  {hours.map((hour) => {
                    const category = timelineData[hour];
                    return (
                      <div
                        key={hour}
                        onClick={() => setSelectedHour(hour)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all hover:border-white/30 ${
                          category ? blockStyles[category] : defaultBlockStyle
                        }`}
                        style={{ touchAction: "manipulation" }}
                      >
                        <div className="flex justify-between">
                          <span>{hour.toString().padStart(2, "0")}:00 — {(hour + 1).toString().padStart(2, "0")}:00</span>
                          {category && <span className="text-xs px-2 py-1 rounded-full bg-black/40 border border-white/20">{category}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value as Category)}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/40 block mb-1">Hours (1-12)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\d*"
                          value={hoursInput}
                          onChange={handleHoursInputChange}
                          onBlur={() => {
                            let val = parseInt(hoursInput);
                            if (isNaN(val) || val < 1) setHoursInput("1");
                            else if (val > 12) setHoursInput("12");
                            else setHoursInput(val.toString());
                          }}
                          className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                        />
                      </div>
                    </div>
                    <button
                      onClick={addActivityLog}
                      className="w-full bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-medium hover:bg-white/15 transition-all"
                      style={{ touchAction: "manipulation" }}
                    >
                      + Add Entry
                    </button>
                  </div>

                  {activityLogs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/40 font-medium">Today&apos;s Activities</p>
                      {activityLogs.map((log, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full ${
                              log.category === "Study" ? "bg-blue-400" :
                              log.category === "Work" ? "bg-indigo-400" :
                              log.category === "Gym" ? "bg-orange-400" :
                              log.category === "Sports" ? "bg-red-400" :
                              log.category === "Social" ? "bg-green-400" :
                              log.category === "Rest" ? "bg-yellow-400" :
                              log.category === "Sleep" ? "bg-purple-400" :
                              log.category === "Personal Hobby" ? "bg-pink-400" :
                              log.category === "Gaming" ? "bg-cyan-400" : "bg-gray-400"
                            }`} />
                            <span className="font-medium">{log.category}</span>
                            <span className="text-sm text-white/40">{log.hours}h</span>
                          </div>
                          <button onClick={() => removeActivityLog(index)} className="text-white/40 hover:text-red-400 transition-colors p-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mt-4 flex gap-2 justify-center">
                {["Study", "Work", "Gym"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActivityLogs([...activityLogs, { category: cat as Category, hours: 1 }])}
                    className="bg-white/10 border border-white/10 rounded-full px-4 py-2 text-sm hover:bg-white/15 transition-all"
                    style={{ touchAction: "manipulation" }}
                  >
                    +1h {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={handleDoneClick}
                className="w-full mt-6 bg-white/10 border border-white/10 rounded-xl py-3 font-medium hover:bg-white/15 transition-all"
                style={{ touchAction: "manipulation" }}
              >
                ✅ Done
              </button>
            </div>
          </div>
        )}

        {currentTab === "goals" && (
          <div className="space-y-5">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-light text-white/80">Daily Goals</h2>
                <button onClick={handleClearPlanned} className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors">
                  Clear
                </button>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-5">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Category</label>
                    <select
                      value={plannedCategory}
                      onChange={(e) => setPlannedCategory(e.target.value as Category)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 block mb-1">Hours (1-12)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      value={plannedHours}
                      onChange={handlePlannedHoursChange}
                      onBlur={() => {
                        let val = parseInt(plannedHours);
                        if (isNaN(val) || val < 1) setPlannedHours("1");
                        else if (val > 12) setPlannedHours("12");
                        else setPlannedHours(val.toString());
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded-xl p-2.5 text-sm text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={addPlannedLog}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-medium hover:bg-white/15 transition-all"
                  style={{ touchAction: "manipulation" }}
                >
                  + Add Goal
                </button>
              </div>

              {plannedLogs.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-xs text-white/40 font-medium">Planned Activities</p>
                  {plannedLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{log.category}</span>
                        <span className="text-sm text-white/40">{log.hours}h</span>
                      </div>
                      <button onClick={() => removePlannedLog(index)} className="text-white/40 hover:text-red-400 transition-colors p-1">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-white/40">Projected Productivity</p>
                  <p className="text-3xl font-light text-blue-300">{projectedScores.productivity}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-white/40">Projected Happiness</p>
                  <p className="text-3xl font-light text-green-300">{projectedScores.happiness}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === "insights" && (
          <div className="space-y-5">
            {/* Planned vs Actual */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Planned vs Actual</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Productivity</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300">{projectedScores.productivity}</span>
                    <span>→</span>
                    <span className="text-blue-300 font-medium">{actualScores.productivity}</span>
                    <span className={`text-sm ${prodDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ({prodDiff >= 0 ? "+" : ""}{prodDiff})
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Happiness</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-300">{projectedScores.happiness}</span>
                    <span>→</span>
                    <span className="text-green-300 font-medium">{actualScores.happiness}</span>
                    <span className={`text-sm ${happyDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ({happyDiff >= 0 ? "+" : ""}{happyDiff})
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-center font-medium">{comparisonStatus}</p>
                </div>
              </div>
            </div>

            {/* Smart Insights */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                <span>Smart Insights</span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full">7 days</span>
              </h2>
              {history.length >= 3 ? (
                <div className="space-y-3">
                  {(() => {
                    const last7 = [...history].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7);
                    const avgProd = last7.reduce((s,d)=>s+d.productivity,0)/last7.length;
                    const avgHappy = last7.reduce((s,d)=>s+d.happiness,0)/last7.length;
                    const insights = [];
                    if (hoursMap["Gym"] > 0 && actualScores.productivity > avgProd) {
                      insights.push({ emoji: "💪", text: "Gym days boost your productivity by ~15%" });
                    }
                    if (hoursMap["Sleep"] >= 7 && actualScores.happiness > avgHappy) {
                      insights.push({ emoji: "😴", text: "Sleep >7h correlates with higher happiness" });
                    }
                    if (hoursMap["Social"] > 2 && actualScores.happiness > 70) {
                      insights.push({ emoji: "🫂", text: "Social time lifts your mood significantly" });
                    }
                    if (insights.length === 0) {
                      insights.push({ emoji: "📊", text: "Log more days to unlock personalized insights" });
                    }
                    return insights.slice(0,2).map((insight, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                        <span className="text-xl">{insight.emoji}</span>
                        <p className="text-sm text-white/70">{insight.text}</p>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <p className="text-white/40 text-center py-4">Log at least 3 days for smart insights</p>
              )}
            </div>

            {/* Points Reference */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Points Per Hour</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2 text-white/40">Category</th>
                      <th className="text-center py-2 text-blue-300">Prod</th>
                      <th className="text-center py-2 text-green-300">Happy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat} className="border-b border-white/5">
                        <td className="py-2 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            cat === "Study" ? "bg-blue-400" :
                            cat === "Work" ? "bg-indigo-400" :
                            cat === "Gym" ? "bg-orange-400" :
                            cat === "Sports" ? "bg-red-400" :
                            cat === "Social" ? "bg-green-400" :
                            cat === "Rest" ? "bg-yellow-400" :
                            cat === "Sleep" ? "bg-purple-400" :
                            cat === "Personal Hobby" ? "bg-pink-400" :
                            cat === "Gaming" ? "bg-cyan-400" :
                            cat === "Meals" ? "bg-amber-400" : "bg-gray-400"
                          }`} />
                          {cat}
                        </td>
                        <td className="text-center text-blue-300">+{productivityMap[cat]}</td>
                        <td className="text-center text-green-300">+{happinessMap[cat]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mood-Energy Correlation */}
            {pulseEnergy && pulseMood && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
                <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Mood & Energy Impact</h2>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-sm">Energy:</span>
                    <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${pulseEnergy === "high" ? "bg-green-500" : pulseEnergy === "mid" ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: pulseEnergy === "high" ? "90%" : pulseEnergy === "mid" ? "60%" : "30%" }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-sm">Mood:</span>
                    <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${pulseMood === "😊" ? "bg-green-500" : pulseMood === "😐" ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: pulseMood === "😊" ? "90%" : pulseMood === "😐" ? "60%" : "30%" }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Breakdown */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Daily Breakdown</h2>
              {breakdown.length > 0 ? (
                <div className="space-y-2">
                  {breakdown.map((item) => (
                    <div key={item.category} className="flex flex-wrap items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          item.category === "Study" ? "bg-blue-400" :
                          item.category === "Work" ? "bg-indigo-400" :
                          item.category === "Gym" ? "bg-orange-400" :
                          item.category === "Sports" ? "bg-red-400" :
                          item.category === "Social" ? "bg-green-400" :
                          item.category === "Rest" ? "bg-yellow-400" :
                          item.category === "Sleep" ? "bg-purple-400" :
                          item.category === "Personal Hobby" ? "bg-pink-400" :
                          item.category === "Gaming" ? "bg-cyan-400" : "bg-gray-400"
                        }`} />
                        <span className="font-medium">{item.category}</span>
                        <span className="text-sm text-white/40">{item.hours}h</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        {item.prod > 0 && <span className="text-blue-300">+{item.prod} Prod</span>}
                        {item.happy > 0 && <span className="text-green-300">+{item.happy} Happy</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-center py-4">No data yet.</p>
              )}
            </div>

            {/* History Last 7 Days */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">History (Last 7 Days)</h2>
              {history.length > 0 ? (
                <div className="space-y-2">
                  {[...history].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).map((entry) => (
                    <div key={entry.date} className="flex justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                      <span>{entry.date}</span>
                      <div className="flex gap-4">
                        <span className="text-blue-300">P: {entry.productivity}</span>
                        <span className="text-green-300">H: {entry.happiness}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-center py-4">No history yet.</p>
              )}
            </div>
          </div>
        )}

        {currentTab === "profile" && (
          <div className="space-y-5">
            {/* RPG Character Stats */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 flex items-center gap-2">
                  <span>Character Stats</span>
                  <span className="text-[10px] bg-purple-500/20 px-2 py-0.5 rounded-full">RPG</span>
                </h2>
                <button
                  onClick={() => setShowRpgInfo(true)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-sm hover:bg-white/15 transition-colors"
                >
                  ?
                </button>
              </div>
              <div className="space-y-3">
                {Object.entries(rpgStats).map(([stat, value]) => (
                  <div key={stat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        {stat === "INT" && "🧠"} {stat === "STR" && "💪"} {stat === "CHA" && "🫂"} {stat === "VIT" && "❤️"} {stat === "SPR" && "✨"}
                        {stat}
                      </span>
                      <span>{value}</span>
                    </div>
                    <div className="w-full h-2 bg-white/10 rounded-full">
                      <div 
                        className={`h-full rounded-full ${
                          stat === "INT" ? "bg-blue-400" :
                          stat === "STR" ? "bg-red-400" :
                          stat === "CHA" ? "bg-green-400" :
                          stat === "VIT" ? "bg-purple-400" : "bg-pink-400"
                        }`}
                        style={{ width: `${Math.min(100, (value / maxStat) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Hours", value: `${totalHours}h` },
                { label: "Top Category", value: topCategory },
                { label: "Current Streak", value: `${streaks.currentStreak} 🔥` },
                { label: "Badges Earned", value: `${unlockedBadges.length}/${badgesList.length}` },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                  <p className="text-xs text-white/40">{stat.label}</p>
                  <p className="text-2xl font-light">{stat.value}</p>
                </div>
              ))}
            </div>

            {bestDay && (
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-white/40">Best Day</p>
                <p className="font-medium">{bestDay.date} — P: {bestDay.productivity} H: {bestDay.happiness}</p>
              </div>
            )}

            {/* Partner Setup */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Accountability Partner</h2>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Partner's name (optional)"
                className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white mb-2"
              />
              <p className="text-xs text-white/40">Share your streak with a friend (local only).</p>
            </div>

            {/* Badges */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Badges ({unlockedBadges.length}/{badgesList.length})</h2>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 custom-scroll">
                {badgesList.map((badge) => {
                  const unlocked = unlockedBadges.includes(badge.id);
                  return (
                    <div key={badge.id} className={`p-3 rounded-xl border ${unlocked ? "bg-white/5 border-white/20" : "bg-white/[0.02] border-white/5 opacity-50"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{badge.emoji}</span>
                        <div>
                          <p className="font-medium text-sm">{badge.name}</p>
                          <p className="text-xs text-white/40">{badge.description}</p>
                        </div>
                        {unlocked && <span className="ml-auto text-green-400">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-4">Settings</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sound Effects</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${soundEnabled ? "bg-white/10" : "bg-white/5"}`}
                  >
                    {soundEnabled ? "On" : "Off"}
                  </button>
                </div>
                <button onClick={exportData} className="w-full bg-blue-500/10 border border-blue-400/20 rounded-xl py-3 text-sm text-blue-300 hover:bg-blue-500/20 transition-colors">
                  Export Data
                </button>
                <label className="w-full bg-green-500/10 border border-green-400/20 rounded-xl py-3 text-sm text-green-300 text-center block cursor-pointer hover:bg-green-500/20 transition-colors">
                  Import Data
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
                <button
                  onClick={() => {
                    if (confirm("Clear all data? This cannot be undone.")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-red-500/10 border border-red-400/20 rounded-xl py-4 text-sm text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {currentTab === "guide" && (
          <div className="space-y-4">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5">
              <h2 className="text-lg font-light text-white/80 mb-4">Life OS Guide</h2>
              <div className="space-y-3">
                {[
                  { title: "🏠 Home Tab", content: "Your dashboard. See daily scores, identity panel, pulse check-in, smart suggestions, and expandable details." },
                  { title: "📝 Log Tab", content: "Track activities two ways: Hourly (assign each hour a category) or Activity (bulk log hours). This builds your daily scores." },
                  { title: "🎯 Goals Tab", content: "Plan your ideal day. Compare projected vs actual scores to see how well you executed." },
                  { title: "📊 Insights Tab", content: "View planned vs actual, smart correlations, mood-energy impact, daily breakdown, and points reference table." },
                  { title: "👤 Profile Tab", content: "RPG character stats, badges earned, accountability partner, and data management." },
                  { title: "🎮 RPG System", content: "Every logged hour = 10 XP. 100 XP = 1 Level. Stats grow based on categories. Purely for role-play and insight." },
                  { title: "🪙 Tokens", content: "Earn tokens from Study/Work/Gym. Spend on Gaming/Rest. Low tokens reduce happiness gain." },
                  { title: "🧘 Daily Modifier", content: "Each day has a random modifier that multiplies productivity or happiness." },
                  { title: "⚡ Pulse", content: "Quick daily check-in: Energy, Mood, Intention. Get witty feedback based on your combination." },
                  { title: "🏅 Badges & Challenges", content: "Unlock badges for milestones. Weekly challenges appear on Home to guide your focus." },
                ].map((item, idx) => (
                  <details key={idx} className="group bg-white/5 border border-white/10 rounded-xl">
                    <summary className="p-4 font-medium cursor-pointer list-none flex items-center justify-between">
                      <span>{item.title}</span>
                      <span className="text-white/50 group-open:rotate-90 transition-transform">▶</span>
                    </summary>
                    <div className="px-4 pb-4 text-sm text-white/70 border-t border-white/10 pt-3">
                      {item.content}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating Coach Button */}
        <div className="fixed bottom-8 right-8 z-40 flex flex-col items-center gap-1">
          <button
            onClick={() => {
              if (typeof window !== "undefined" && sessionStorage.getItem("onboarding_logging") === "true") {
                sessionStorage.removeItem("onboarding_logging");
                setShowOnboarding(true);
                setOnboardingStep(3);
              } else {
                setCurrentTab("guide");
              }
            }}
            className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center text-2xl hover:bg-white/15 transition-all"
            style={{ touchAction: "manipulation" }}
          >
            ✨
          </button>
          <span className="text-xs bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full text-white/70 border border-white/10">
            Guide
          </span>
        </div>
                {/* Coach Guide Modal */}
        {showCoachModal && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setShowCoachModal(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto custom-scroll">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg font-light">✨ Life OS Guide</h3>
                  <button onClick={() => setShowCoachModal(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15">✕</button>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "🏠 Home Tab", content: "Your dashboard. See scores, daily modifier, pulse, challenges, persona, and week view." },
                    { title: "⚡ Pulse Check-in", content: "Log your energy, mood, and intention each day. Get a witty, personalized feedback message." },
                    { title: "📝 Log Tab", content: "Track activities two ways: Hourly (time-block each hour) or Activity (bulk log hours)." },
                    { title: "🎯 Goals Tab", content: "Plan your ideal day. Compare projected vs actual scores." },
                    { title: "📊 Insights Tab", content: "Smart analysis of your last 7 days. See correlations and a breakdown of scores." },
                    { title: "👤 Profile Tab", content: "RPG stats, badges, accountability partner, and data management." },
                    { title: "🎮 RPG & Leveling", content: "Every logged hour gives 10 XP. Level up every 100 XP. Stats increase based on category." },
                    { title: "🪙 Token Economy", content: "Earn tokens from Study/Work/Gym. Spend on Gaming or Rest. Out of tokens? Happiness gain halved." },
                    { title: "🧘 Daily Modifier", content: "Each day has a random modifier that multiplies productivity or happiness gains." },
                    { title: "🏅 Badges & Challenges", content: "Unlock badges for milestones. Weekly challenges appear on Home." },
                  ].map((item, idx) => (
                    <details key={idx} className="group bg-white/5 border border-white/10 rounded-xl">
                      <summary className="p-4 font-medium cursor-pointer list-none flex items-center justify-between">
                        <span>{item.title}</span>
                        <span className="text-white/50 group-open:rotate-90 transition-transform">▶</span>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-white/70 border-t border-white/10 pt-3">
                        {item.content}
                      </div>
                    </details>
                  ))}
                </div>
                {totalLogs === 0 && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-400/20 rounded-xl">
                    <p className="text-sm text-yellow-200">💡 Start by logging an activity in the Log tab!</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Name Input Modal */}
        {showNameModal && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-light mb-2">Welcome to Life OS</h3>
                <p className="text-sm text-white/50 mb-4">What should we call you?</p>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white mb-4"
                  autoFocus
                />
                <button
                  onClick={handleNameSave}
                  disabled={!userName.trim()}
                  className="w-full bg-white/10 border border-white/10 rounded-xl py-3 font-medium disabled:opacity-30"
                >
                  Let&apos;s Go
                </button>
              </div>
            </div>
          </>
        )}

        {/* Onboarding Walkthrough */}
        {showOnboarding && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 w-full max-w-sm">
                {onboardingStep === 0 && (
                  <>
                    <h3 className="text-xl font-light mb-2">Welcome, {userName}! 🌱</h3>
                    <p className="text-white/50 mb-6">Let&apos;s set up your journey. This will take 1 minute.</p>
                    <button
                      onClick={() => setOnboardingStep(1)}
                      className="w-full bg-white/10 border border-white/10 py-3 rounded-xl"
                    >
                      Get Started
                    </button>
                  </>
                )}
                {onboardingStep === 1 && (
                  <>
                    <h3 className="text-lg font-light mb-2">Step 1: Check-in ⚡</h3>
                    <p className="text-white/50 mb-4">How are you feeling today?</p>
                    {/* Energy */}
                    <div className="mb-4">
                      <p className="text-xs text-white/40 mb-2">Energy</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { value: "low", label: "🥱 Low" },
                          { value: "mid", label: "😐 Mid" },
                          { value: "high", label: "⚡ High" },
                          { value: "drained", label: "🪫 Drained" },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            onClick={() => setPulseEnergy(value as any)}
                            className={`py-2.5 rounded-xl border text-sm transition-all ${
                              pulseEnergy === value ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Mood */}
                    <div className="mb-4">
                      <p className="text-xs text-white/40 mb-2">Mood</p>
                      <div className="grid grid-cols-3 gap-2">
                        {["😊", "😐", "😤", "😢", "🤩", "😴"].map((mood) => (
                          <button
                            key={mood}
                            onClick={() => setPulseMood(mood as any)}
                            className={`py-2.5 rounded-xl border text-xl ${
                              pulseMood === mood ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
                            }`}
                          >
                            {mood}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Intention */}
                    <div className="mb-6">
                      <p className="text-xs text-white/40 mb-2">Intention</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "Work", emoji: "💼" },
                          { value: "Rest", emoji: "🛋️" },
                          { value: "Balance", emoji: "⚖️" },
                          { value: "Survive", emoji: "🧟" },
                          { value: "Create", emoji: "🎨" },
                        ].map(({ value, emoji }) => (
                          <button
                            key={value}
                            onClick={() => setPulseIntention(value as any)}
                            className={`py-2.5 rounded-xl border text-sm ${
                              pulseIntention === value ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10"
                            }`}
                          >
                            {emoji} {value}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setOnboardingStep(0)} className="flex-1 bg-white/5 py-3 rounded-xl">Back</button>
                      <button
                        onClick={() => {
                          handlePulseSubmit();
                          setOnboardingStep(2);
                        }}
                        disabled={!pulseEnergy || !pulseMood || !pulseIntention}
                        className={`flex-1 bg-white/10 py-3 rounded-xl ${!pulseEnergy || !pulseMood || !pulseIntention ? "opacity-50" : ""}`}
                      >
                        Save & Continue
                      </button>
                    </div>
                  </>
                )}
                {onboardingStep === 2 && (
                  <>
                    <h3 className="text-lg font-light mb-2">Step 2: Log Activity 📝</h3>
                    <p className="text-white/50 mb-4">Go to the Log tab and add at least one activity.</p>
                    <button
                      onClick={() => {
                        setShowOnboarding(false);
                        setCurrentTab("log");
                        if (typeof window !== "undefined") sessionStorage.setItem("onboarding_logging", "true");
                      }}
                      className="w-full bg-white/10 py-3 rounded-xl mb-4"
                    >
                      Go to Log Tab
                    </button>
                    <p className="text-xs text-white/40 mb-4 text-center">After logging, tap the ✨ coach button to resume.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setOnboardingStep(1)} className="flex-1 bg-white/5 py-3 rounded-xl">Back</button>
                      <button onClick={() => setOnboardingStep(3)} className="flex-1 bg-white/10 py-3 rounded-xl">I&apos;ve Logged It</button>
                    </div>
                  </>
                )}
                {onboardingStep === 3 && (
                  <>
                    <h3 className="text-lg font-light mb-2">🎉 Reward Unlocked!</h3>
                    <p className="text-white/50 mb-4">You earned the &quot;First Steps&quot; badge!</p>
                    <div className="text-center text-6xl mb-4">🎯</div>
                    <button onClick={() => setOnboardingStep(4)} className="w-full bg-white/10 py-3 rounded-xl">Next</button>
                  </>
                )}
                {onboardingStep === 4 && (
                  <>
                    <h3 className="text-lg font-light mb-2">Meet Your Coach ✨</h3>
                    <p className="text-white/50 mb-4">Tap the ✨ button anytime for guidance.</p>
                    <div className="flex justify-center mb-6">
                      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-3xl">
                        ✨
                      </div>
                    </div>
                    <button onClick={completeOnboarding} className="w-full bg-white/10 py-3 rounded-xl">Start Your Journey</button>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Reflection Modal */}
        {showReflectionModal && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" onClick={() => setShowReflectionModal(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 w-full max-w-md">
                <h3 className="text-lg font-light mb-4">Daily Reflection</h3>
                <p className="text-sm text-white/50 mb-3">What went well today? What could improve?</p>
                <textarea
                  value={reflectionInput}
                  onChange={(e) => setReflectionInput(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white h-24 resize-none"
                  placeholder="Write your thoughts..."
                />
                <div className="flex gap-3 mt-4">
                  <button onClick={handleReflectionSubmit} className="flex-1 bg-white/10 py-3 rounded-xl">Save</button>
                  <button onClick={() => setShowReflectionModal(false)} className="flex-1 bg-white/5 py-3 rounded-xl">Skip</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Score Modal (Daily Verdict) */}
        {showScoreModal && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-fade-in" onClick={handleScoreModalClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-up">
              <div className="w-full max-w-lg">
                <button onClick={handleScoreModalClose} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:bg-white/15 transition-all z-50">✕</button>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-light">
                    {actualScores.productivity >= 70 && actualScores.happiness >= 70 ? "⚖️ Balanced" :
                     actualScores.productivity >= 70 ? "🏗️ Overworked" :
                     actualScores.happiness >= 70 ? "🦋 Joyful" : "🌱 Light Day"}
                  </h2>
                  <p className="text-white/50 mt-1 text-sm">
                    {actualScores.productivity >= 70 && actualScores.happiness >= 70 ? "You're in harmony. Keep this rhythm." :
                     actualScores.productivity >= 70 ? "Crushing work, but watch your happiness." :
                     actualScores.happiness >= 70 ? "Great mood! Maybe channel some into productivity." :
                     "Today was light. Tomorrow is a fresh start."}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 text-center">
                    <p className="text-xs uppercase tracking-widest text-blue-200/80 mb-2">Productivity</p>
                    <p className="text-6xl font-light text-blue-200">{actualScores.productivity}</p>
                    <div className="mt-4 w-full h-1.5 bg-white/10 rounded-full">
                      <div className={`h-full bg-gradient-to-r ${getProductivityColor(actualScores.productivity)} rounded-full`} style={{ width: `${actualScores.productivity}%` }} />
                    </div>
                  </div>
                  <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 text-center">
                    <p className="text-xs uppercase tracking-widest text-lime-200/80 mb-2">Happiness</p>
                    <p className="text-6xl font-light text-lime-200">{actualScores.happiness}</p>
                    <div className="mt-4 w-full h-1.5 bg-white/10 rounded-full">
                      <div className={`h-full bg-gradient-to-r ${getHappinessColor(actualScores.happiness)} rounded-full`} style={{ width: `${actualScores.happiness}%` }} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xs text-white/40">Balance</p>
                    <p className="text-xl font-light text-purple-300">{balanceScore}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xs text-white/40">Focus</p>
                    <p className="text-xl font-light text-amber-300">{focusScore}</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <p className="text-xs text-white/40">Recovery</p>
                    <p className="text-xl font-light text-teal-300">{recoveryScore}</p>
                  </div>
                </div>
                {plannedLogs.length > 0 && (
                  <div className="mt-5 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-sm font-medium mb-2">Goals vs Actual</p>
                    <div className="flex justify-between text-sm">
                      <span>Productivity: {projectedScores.productivity} → {actualScores.productivity}</span>
                      <span className={prodDiff >= 0 ? "text-green-400" : "text-red-400"}>{prodDiff >= 0 ? "+" : ""}{prodDiff}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span>Happiness: {projectedScores.happiness} → {actualScores.happiness}</span>
                      <span className={happyDiff >= 0 ? "text-green-400" : "text-red-400"}>{happyDiff >= 0 ? "+" : ""}{happyDiff}</span>
                    </div>
                  </div>
                )}
                <div className="mt-6 text-center">
                  <p className="text-lg font-medium">{getFeedbackMessage(actualScores.productivity, actualScores.happiness)}</p>
                  <p className="text-sm text-white/50 mt-2">{getDailyInsight()}</p>
                  <button onClick={handleScoreModalClose} className="mt-4 px-6 py-2 bg-white/10 rounded-full hover:bg-white/15 transition-colors">
                    Continue
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* RPG Info Modal */}
        {showRpgInfo && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setShowRpgInfo(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-6 w-full max-w-md">
                <h3 className="text-lg font-light mb-4">RPG System Guide</h3>
                <div className="space-y-3 text-sm">
                  <p><span className="font-medium text-blue-300">🧠 INT:</span> Grows with Study & Work. Mental focus.</p>
                  <p><span className="font-medium text-red-300">💪 STR:</span> Grows with Gym & Sports. Physical power.</p>
                  <p><span className="font-medium text-green-300">🫂 CHA:</span> Grows with Social time. Connection skill.</p>
                  <p><span className="font-medium text-purple-300">❤️ VIT:</span> Grows with Sleep, Rest, and Meals. Recovery.</p>
                  <p><span className="font-medium text-pink-300">✨ SPR:</span> Grows with Personal Hobby. Creative energy.</p>
                  <div className="border-t border-white/10 pt-3 mt-3">
                    <p className="font-medium">XP: 1 hour = 10 XP, 100 XP = 1 Level. Stats are for role‑play only.</p>
                  </div>
                </div>
                <button onClick={() => setShowRpgInfo(false)} className="w-full mt-4 bg-white/10 py-3 rounded-xl">Got it</button>
              </div>
            </div>
          </>
        )}

        {/* Category Selector Modal */}
        {selectedHour !== null && (
          <>
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 animate-fade-in" onClick={() => setSelectedHour(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] border-t border-white/10 rounded-t-[2rem] p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <p className="text-lg font-light">Select category for {selectedHour}:00</p>
                <button onClick={() => setSelectedHour(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15">✕</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleHourSelect(cat)}
                    className="bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-medium hover:bg-white/10 transition-all"
                    style={{ touchAction: "manipulation" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-center"><div className="w-12 h-1.5 bg-white/10 rounded-full" /></div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        @keyframes scale-up { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.3s ease-out; }
        @keyframes bounce-in { 0% { opacity: 0; transform: translate(-50%, -20px) scale(0.9); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
      `}</style>
    </>
  );
}
