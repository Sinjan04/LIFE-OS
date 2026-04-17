"use client";

import { useState, useEffect, useRef } from "react";

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
  "Other",
] as const;

type Category = (typeof categories)[number];

const productivityMap: Record<Category, number> = {
  Study: 10,
  Work: 10,
  Gym: 8,
  Sports: 7,
  Social: 0,
  Rest: 0,
  Sleep: 0,
  "Personal Hobby": 0,
  Gaming: 0,
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
  Study: 0,
  Work: 0,
  Other: 0,
};

const blockStyles: Record<Category, string> = {
  Study: "bg-gradient-to-r from-blue-900/30 to-blue-800/30 border-blue-400/40",
  Work: "bg-gradient-to-r from-indigo-900/30 to-indigo-800/30 border-indigo-400/40",
  Gym: "bg-gradient-to-r from-orange-900/30 to-red-800/30 border-orange-400/40",
  Sports: "bg-gradient-to-r from-red-900/30 to-orange-800/30 border-red-400/40",
  Social: "bg-gradient-to-r from-green-900/30 to-lime-800/30 border-green-400/40",
  Rest: "bg-gradient-to-r from-yellow-900/30 to-amber-800/30 border-yellow-400/40",
  Sleep: "bg-gradient-to-r from-purple-900/30 to-indigo-800/30 border-purple-400/40",
  "Personal Hobby": "bg-gradient-to-r from-pink-900/30 to-rose-800/30 border-pink-400/40",
  Gaming: "bg-gradient-to-r from-cyan-900/30 to-teal-800/30 border-cyan-400/40",
  Other: "bg-gradient-to-r from-gray-800/30 to-gray-700/30 border-gray-400/40",
};

const defaultBlockStyle = "bg-white/5 border-white/10";

const tabs = [
  { id: "home", label: "Home", emoji: "🏠" },
  { id: "log", label: "Log", emoji: "📝" },
  { id: "goals", label: "Goals", emoji: "🎯" },
  { id: "insights", label: "Insights", emoji: "📊" },
  { id: "profile", label: "Profile", emoji: "👤" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const calculateScores = (
  timelineData: { [hour: number]: Category },
  activityLogs: Array<{ category: Category; hours: number }>
) => {
  let productivity = 0;
  let happiness = 0;
  Object.values(timelineData).forEach((cat) => {
    productivity += productivityMap[cat] || 0;
    happiness += happinessMap[cat] || 0;
  });
  activityLogs.forEach(({ category, hours }) => {
    productivity += (productivityMap[category] || 0) * hours;
    happiness += (happinessMap[category] || 0) * hours;
  });
  return {
    productivity: Math.min(100, Math.round(productivity)),
    happiness: Math.min(100, Math.round(happiness)),
  };
};

const getBreakdown = (
  timelineData: { [hour: number]: Category },
  activityLogs: Array<{ category: Category; hours: number }>
) => {
  const hoursMap: Record<Category, number> = {} as any;
  categories.forEach((cat) => (hoursMap[cat] = 0));
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

// Badges (30)
const badgesList = [
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

// Weekly Challenges Generator
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

export default function Home() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<{ [hour: number]: Category }>({});
  const [activityLogs, setActivityLogs] = useState<Array<{ category: Category; hours: number }>>([]);
  const [plannedLogs, setPlannedLogs] = useState<Array<{ category: Category; hours: number }>>([]);
  const [activeTab, setActiveTab] = useState<"hourly" | "activity">("hourly");
  const [selectedCategory, setSelectedCategory] = useState<Category>("Study");
  const [hoursInput, setHoursInput] = useState<number>(1);
  const [plannedCategory, setPlannedCategory] = useState<Category>("Study");
  const [plannedHours, setPlannedHours] = useState<number>(1);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabId>("home");
  const [pulseEnergy, setPulseEnergy] = useState<"low" | "mid" | "high" | null>(null);
  const [pulseMood, setPulseMood] = useState<"😊" | "😐" | "😤" | null>(null);
  const [pulseIntention, setPulseIntention] = useState<"Work" | "Rest" | "Balance" | null>(null);
  const [history, setHistory] = useState<Array<{ date: string; productivity: number; happiness: number; reflection?: string }>>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);
  const [newBadge, setNewBadge] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [reflectionInput, setReflectionInput] = useState("");
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);

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

  const actualScores = calculateScores(timelineData, activityLogs);
  const projectedScores = calculateScores({}, plannedLogs);
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

  const checkBadges = () => {
    const newlyUnlocked: string[] = [];
    badgesList.forEach((badge) => {
      if (unlockedBadges.includes(badge.id)) return;
      let conditionMet = false;
      if (badge.id === "first_log") conditionMet = badge.condition(totalLogs);
      else if (badge.id.includes("prod_")) conditionMet = badge.condition(actualScores.productivity);
      else if (badge.id.includes("happy_")) conditionMet = badge.condition(actualScores.happiness);
      else if (badge.id === "balance_80") conditionMet = badge.condition(actualScores.productivity, actualScores.happiness);
      else if (badge.id.includes("streak_")) conditionMet = badge.condition(streaks.currentStreak);
      else if (badge.id === "all_rounder") conditionMet = badge.condition(uniqueCategories);
      else if (badge.id === "planner") conditionMet = badge.condition(plannedLogs.length);
      else if (badge.id === "overachiever") conditionMet = badge.condition(prodDiff);
      else if (badge.id === "recovery_guru") conditionMet = badge.condition(recoveryScore);
      else if (badge.id === "focus_master") conditionMet = badge.condition(focusScore);
      else if (badge.id === "balance_guru") conditionMet = badge.condition(balanceScore);
      else conditionMet = badge.condition(hoursMap);
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
  };

  useEffect(() => {
    if (isLoaded) checkBadges();
  }, [actualScores, streaks, totalLogs, isLoaded, plannedLogs.length, prodDiff, recoveryScore, focusScore, balanceScore]);

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

  const handleHourSelect = (category: Category) => {
    if (selectedHour !== null) {
      setTimelineData({ ...timelineData, [selectedHour]: category });
      setSelectedHour(null);
      if (soundEnabled) playSound("log");
    }
  };

  const addActivityLog = () => {
    if (hoursInput > 0 && hoursInput <= 12) {
      setActivityLogs([...activityLogs, { category: selectedCategory, hours: hoursInput }]);
      if (soundEnabled) playSound("log");
    }
  };

  const removeActivityLog = (index: number) => {
    setActivityLogs(activityLogs.filter((_, i) => i !== index));
  };

  const addPlannedLog = () => {
    if (plannedHours > 0 && plannedHours <= 12) {
      setPlannedLogs([...plannedLogs, { category: plannedCategory, hours: plannedHours }]);
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
    saveTodayScore();
    checkBadges();
    setShowScoreModal(true);
    if (soundEnabled) playSound("complete");
  };

  const handleScoreModalClose = () => {
    setShowScoreModal(false);
    // Show reflection modal after score modal closes
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
  };

  const startVoiceRecognition = () => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Speech recognition not supported in your browser.");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.onstart = () => setListening(true);
      recognition.onend = () => setListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const match = transcript.match(/(\w+)\s+(\d+)\s*(?:hours?|h)/i);
        if (match) {
          const cat = match[1].toLowerCase();
          const hrs = parseInt(match[2]);
          const category = categories.find(c => c.toLowerCase() === cat);
          if (category && hrs > 0 && hrs <= 12) {
            setActivityLogs(prev => [...prev, { category, hours: hrs }]);
            if (soundEnabled) playSound("log");
          }
        }
      };
      recognition.onerror = () => setListening(false);
      recognition.start();
      recognitionRef.current = recognition;
    }
  };

  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
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
      } catch (err) {
        alert("Invalid backup file.");
      }
    };
    reader.readAsText(file);
  };

  const currentBadge = badgesList.find((b) => b.id === newBadge);
  const pulseCompleted = pulseEnergy && pulseMood && pulseIntention;
  const last7DaysData = [...history].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).reverse();

  return (
    <>
      {/* Enhanced Abstract Background with Visuals */}
      <div className="fixed inset-0 -z-10 bg-black overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_30%,#0a1a2f,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_70%,#0a2a1a,transparent)]" />
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-lime-500/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] animate-float-slow" />
        <div className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-cyan-500/10 rounded-full blur-[80px] animate-float-slower" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white/5 rounded-full animate-spin-slow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-white/5 rounded-full animate-spin-slower" />
        <div className="absolute top-20 right-20 w-1 h-1 bg-white/20 rounded-full animate-ping" />
        <div className="absolute bottom-40 left-10 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse" />
        <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-green-400/20 rounded-full animate-bounce" />
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="h-full w-full" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        </div>
      </div>

      <div className="relative text-white min-h-screen px-4 py-6 sm:px-6 sm:py-8 font-sans antialiased pb-8">
        {showCelebration && currentBadge && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce-in">
            <div className="bg-gradient-to-r from-yellow-500/90 to-amber-500/90 backdrop-blur-xl border border-yellow-300 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-3">
              <span className="text-4xl">{currentBadge.emoji}</span>
              <div>
                <p className="font-bold text-black">Badge Unlocked!</p>
                <p className="text-sm text-black/80">{currentBadge.name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero Section with Tagline */}
        <div className="mb-6 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-green-400 to-lime-300 text-transparent bg-clip-text drop-shadow-[0_0_25px_rgba(34,197,94,0.4)] animate-fade-in-up">
            LIFE OS
          </h1>
          <p className="text-gray-300/80 mt-3 text-sm sm:text-base md:text-lg font-light tracking-wide max-w-2xl mx-auto leading-relaxed">
            Live every moment, track every activity, take full control of your life.<br />
            Build streaks, take on challenges, earn badges.<br />
            Just show up everyday and live your life like a simulation.
          </p>
        </div>

        {/* Top Navigation Bar with Labels */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-0.5 bg-white/5 backdrop-blur-sm border border-white/15 rounded-full p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex flex-col items-center px-4 py-2 rounded-full transition-all duration-200 hover:scale-105 ${
                  currentTab === tab.id
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white/80 hover:bg-white/10"
                }`}
                title={tab.label}
              >
                <span className="text-lg">{tab.emoji}</span>
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {currentTab === "home" && (
          <div className="max-w-2xl mx-auto space-y-5">
            {/* Streaks + Partner */}
            <div className="flex justify-center gap-6">
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/15 rounded-full px-5 py-2 hover:scale-105 transition-transform duration-200">
                <span className="text-xl">🔥</span>
                <span className="font-semibold">{streaks.currentStreak}</span>
                <span className="text-xs text-white/60">Day Streak</span>
              </div>
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/15 rounded-full px-5 py-2 hover:scale-105 transition-transform duration-200">
                <span className="text-xl">💪</span>
                <span className="font-semibold">{streaks.highPerfStreak}</span>
                <span className="text-xs text-white/60">High Perf</span>
              </div>
              {partnerName && (
                <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm border border-white/15 rounded-full px-5 py-2 hover:scale-105 transition-transform duration-200">
                  <span className="text-xl">🤝</span>
                  <span className="font-semibold">{partnerName}</span>
                </div>
              )}
            </div>

            {/* Today's Pulse */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
              <h2 className="text-lg font-semibold mb-4 text-white/80 flex items-center gap-2">
                <span>⚡ Today's Pulse</span>
                {pulseCompleted && <span className="text-green-400 text-sm">✓</span>}
              </h2>
              {!pulseCompleted ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-white/60 mb-2">Energy</p>
                    <div className="flex gap-2">
                      {["low", "mid", "high"].map((level) => (
                        <button
                          key={level}
                          onClick={() => setPulseEnergy(level as any)}
                          className={`flex-1 py-2.5 rounded-xl border transition-all hover:scale-105 ${
                            pulseEnergy === level
                              ? "bg-gradient-to-r from-blue-500/40 to-cyan-500/40 border-white/40"
                              : "bg-white/5 border-white/15"
                          }`}
                        >
                          {level === "low" ? "🥱" : level === "mid" ? "😐" : "⚡"} {level}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 mb-2">Mood</p>
                    <div className="flex gap-2">
                      {["😊", "😐", "😤"].map((mood) => (
                        <button
                          key={mood}
                          onClick={() => setPulseMood(mood as any)}
                          className={`flex-1 py-2.5 rounded-xl border text-xl hover:scale-105 transition-all ${
                            pulseMood === mood
                              ? "bg-gradient-to-r from-green-500/40 to-lime-500/40 border-white/40"
                              : "bg-white/5 border-white/15"
                          }`}
                        >
                          {mood}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-white/60 mb-2">Intention</p>
                    <div className="flex gap-2">
                      {["Work", "Rest", "Balance"].map((intent) => (
                        <button
                          key={intent}
                          onClick={() => setPulseIntention(intent as any)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm hover:scale-105 transition-all ${
                            pulseIntention === intent
                              ? "bg-gradient-to-r from-purple-500/40 to-pink-500/40 border-white/40"
                              : "bg-white/5 border-white/15"
                          }`}
                        >
                          {intent === "Work" ? "💼" : intent === "Rest" ? "🛋️" : "⚖️"} {intent}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handlePulseSubmit}
                    disabled={!pulseEnergy || !pulseMood || !pulseIntention}
                    className="w-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border border-white/30 rounded-xl py-3 font-medium disabled:opacity-30 hover:scale-[1.01] transition-all"
                  >
                    Save Pulse
                  </button>
                </div>
              ) : (
                <div className="flex justify-around py-4">
                  <div className="text-center">
                    <span className="text-3xl">{pulseEnergy === "low" ? "🥱" : pulseEnergy === "mid" ? "😐" : "⚡"}</span>
                    <p className="text-xs text-white/60 mt-1">Energy</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl">{pulseMood}</span>
                    <p className="text-xs text-white/60 mt-1">Mood</p>
                  </div>
                  <div className="text-center">
                    <span className="text-3xl">{pulseIntention === "Work" ? "💼" : pulseIntention === "Rest" ? "🛋️" : "⚖️"}</span>
                    <p className="text-xs text-white/60 mt-1">{pulseIntention}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Five Metrics Cards with restored colors */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-950/60 to-black/40 backdrop-blur-xl border border-blue-400/30 rounded-xl p-3 hover:scale-105 transition-transform duration-200">
                <p className="text-xs text-blue-200/80">Prod</p>
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">{actualScores.productivity}</p>
                <div className="mt-1 w-full h-1 bg-white/10 rounded-full">
                  <div className={`h-full bg-gradient-to-r ${getProductivityColor(actualScores.productivity)}`} style={{ width: `${actualScores.productivity}%` }} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-lime-950/60 to-black/40 backdrop-blur-xl border border-green-400/30 rounded-xl p-3 hover:scale-105 transition-transform duration-200">
                <p className="text-xs text-lime-200/80">Happy</p>
                <p className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-200 to-green-200">{actualScores.happiness}</p>
                <div className="mt-1 w-full h-1 bg-white/10 rounded-full">
                  <div className={`h-full bg-gradient-to-r ${getHappinessColor(actualScores.happiness)}`} style={{ width: `${actualScores.happiness}%` }} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-950/60 to-black/40 backdrop-blur-xl border border-purple-400/30 rounded-xl p-3 hover:scale-105 transition-transform duration-200">
                <p className="text-xs text-purple-200/80">Balance</p>
                <p className="text-2xl font-black text-purple-200">{balanceScore}</p>
                <div className="mt-1 w-full h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400" style={{ width: `${balanceScore}%` }} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-amber-950/60 to-black/40 backdrop-blur-xl border border-amber-400/30 rounded-xl p-3 hover:scale-105 transition-transform duration-200">
                <p className="text-xs text-amber-200/80">Focus</p>
                <p className="text-2xl font-black text-amber-200">{focusScore}</p>
                <div className="mt-1 w-full h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-400" style={{ width: `${focusScore}%` }} />
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-950/60 to-black/40 backdrop-blur-xl border border-teal-400/30 rounded-xl p-3 hover:scale-105 transition-transform duration-200">
                <p className="text-xs text-teal-200/80">Recovery</p>
                <p className="text-2xl font-black text-teal-200">{recoveryScore}</p>
                <div className="mt-1 w-full h-1 bg-white/10 rounded-full">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-400" style={{ width: `${recoveryScore}%` }} />
                </div>
              </div>
            </div>

            {/* Weekly Challenges */}
            {challenges.length > 0 && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
                <h2 className="text-lg font-semibold mb-3 text-white/80">🎯 Weekly Challenges</h2>
                <div className="space-y-3">
                  {challenges.map((ch) => (
                    <div key={ch.id} className="p-3 bg-white/5 rounded-xl border border-white/10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{ch.title}</span>
                        <span className="text-xs text-white/60">{ch.current}/{ch.target}</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all"
                          style={{ width: `${Math.min(100, (ch.current / ch.target) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/50 mt-1">{ch.reward}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Persona */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
              <h2 className="text-sm font-semibold mb-3 text-white/60 uppercase tracking-wider">Your Persona</h2>
              <div className="flex items-center gap-4">
                <span className="text-5xl">{persona.emoji}</span>
                <div>
                  <p className="text-2xl font-bold">{persona.title}</p>
                  <p className="text-sm text-white/60">{persona.description}</p>
                </div>
              </div>
            </div>

            {/* Smart Suggestion */}
            <div className="bg-gradient-to-r from-purple-950/40 to-pink-950/40 backdrop-blur-xl border border-purple-400/30 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{suggestion.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-purple-200/80 mb-1">Smart Suggestion</p>
                  <p className="text-white/90">{suggestion.text}</p>
                </div>
              </div>
            </div>

            {/* Week at a Glance */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
              <h2 className="text-sm font-semibold mb-4 text-white/60 uppercase tracking-wider">Week at a Glance</h2>
              <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex gap-3 min-w-max justify-center sm:justify-start">
                  {["Day1", "Day2", "Day3", "Day4", "Day5", "Day6", "Day7"].map((day, idx) => {
                    const dayData = last7DaysData[idx];
                    let color = "bg-gray-500/30";
                    let score = "";
                    if (dayData) {
                      if (dayData.productivity >= 70 && dayData.happiness >= 70) color = "bg-green-500/60";
                      else if (dayData.productivity >= 70) color = "bg-blue-500/60";
                      else if (dayData.happiness >= 70) color = "bg-lime-500/60";
                      else color = "bg-yellow-500/60";
                      score = `${dayData.productivity}/${dayData.happiness}`;
                    }
                    return (
                      <div key={idx} className="text-center w-16 flex-shrink-0">
                        <div className={`w-12 h-12 mx-auto rounded-full ${color} flex items-center justify-center text-sm border border-white/20`}>
                          {dayData ? "✓" : "·"}
                        </div>
                        <p className="text-xs text-white/50 mt-1">{day}</p>
                        {score && <p className="text-[10px] text-white/40">{score}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === "log" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white/90">Get Today's Score</h2>
                <button onClick={handleClearToday} className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 transition-all">
                  Clear
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-400/30 rounded-xl">
                <p className="text-xs text-blue-200/90 text-center">
                  💡 Use <strong>Hourly</strong> for time-block planning OR <strong>Activity</strong> for quick bulk logging.
                </p>
              </div>

              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-6">
                <button
                  onClick={() => setActiveTab("hourly")}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all hover:scale-105 ${
                    activeTab === "hourly"
                      ? "bg-gradient-to-r from-blue-500/30 to-cyan-500/30 text-white border border-white/20"
                      : "text-white/60"
                  }`}
                >
                  ⏰ Hourly Log
                </button>
                <button
                  onClick={() => setActiveTab("activity")}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all hover:scale-105 ${
                    activeTab === "activity"
                      ? "bg-gradient-to-r from-green-500/30 to-lime-500/30 text-white border border-white/20"
                      : "text-white/60"
                  }`}
                >
                  📋 Activity Log
                </button>
              </div>

              {activeTab === "hourly" ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scroll">
                  <p className="text-xs text-white/50 mb-2">Tap any hour to assign a category</p>
                  {hours.map((hour) => {
                    const category = timelineData[hour];
                    return (
                      <div
                        key={hour}
                        onClick={() => setSelectedHour(hour)}
                        className={`p-3 rounded-xl backdrop-blur-md cursor-pointer border hover:scale-[1.02] hover:border-white/40 transition-all ${
                          category ? blockStyles[category] : defaultBlockStyle
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{hour.toString().padStart(2, "0")}:00 — {(hour + 1).toString().padStart(2, "0")}:00</span>
                          {category && <span className="text-xs px-2 py-1 rounded-full bg-black/40 border border-white/30">{category}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    {!listening ? (
                      <button
                        onClick={startVoiceRecognition}
                        className="px-3 py-2 rounded-full transition-all hover:scale-105 bg-white/10 border border-white/20 text-sm"
                      >
                        🎤 Voice Log
                      </button>
                    ) : (
                      <button
                        onClick={stopVoiceRecognition}
                        className="px-3 py-2 rounded-full transition-all hover:scale-105 bg-red-500/30 border border-red-400/40 text-sm"
                      >
                        ⏹️ Stop Listening
                      </button>
                    )}
                    <span className="text-xs text-white/50">Say "Study 3 hours"</span>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div>
                        <label className="text-xs text-white/60 block mb-1">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value as Category)}
                          className="w-full bg-black/30 border border-white/20 rounded-xl p-2.5 text-sm text-white"
                        >
                          {categories.map((cat) => (
                            <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-white/60 block mb-1">Hours (1-12)</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={hoursInput}
                          onChange={(e) => setHoursInput(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                          className="w-full bg-black/30 border border-white/20 rounded-xl p-2.5 text-sm text-white"
                        />
                      </div>
                    </div>
                    <button
                      onClick={addActivityLog}
                      className="w-full bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border border-white/30 rounded-xl py-3 font-medium hover:scale-[1.01] transition-all"
                    >
                      + Add Entry
                    </button>
                  </div>

                  {activityLogs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-white/50 font-medium">Today's Activities</p>
                      {activityLogs.map((log, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/15 rounded-xl">
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
                            <span className="text-sm text-white/50">{log.hours}h</span>
                          </div>
                          <button onClick={() => removeActivityLog(index)} className="text-white/40 hover:text-red-400 hover:scale-110 transition-all p-1">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Quick Log Widget */}
              <div className="mt-4 flex gap-2 justify-center">
                {["Study", "Work", "Gym"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActivityLogs([...activityLogs, { category: cat as Category, hours: 1 }])}
                    className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm hover:scale-105 hover:bg-white/20 transition-all"
                  >
                    +1h {cat}
                  </button>
                ))}
              </div>

              <button
                onClick={handleDoneClick}
                className="w-full mt-6 bg-gradient-to-r from-green-500/30 to-lime-500/30 border border-white/30 rounded-xl py-3 font-semibold hover:scale-[1.01] transition-all"
              >
                ✅ Done
              </button>
            </div>
          </div>
        )}

        {currentTab === "goals" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white/90">🎯 Daily Goals</h2>
                <button onClick={handleClearPlanned} className="text-xs px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 hover:scale-105 transition-all">
                  Clear
                </button>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Category</label>
                    <select
                      value={plannedCategory}
                      onChange={(e) => setPlannedCategory(e.target.value as Category)}
                      className="w-full bg-black/30 border border-white/20 rounded-xl p-2.5 text-sm text-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/60 block mb-1">Hours (1-12)</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={plannedHours}
                      onChange={(e) => setPlannedHours(Math.min(12, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="w-full bg-black/30 border border-white/20 rounded-xl p-2.5 text-sm text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={addPlannedLog}
                  className="w-full bg-gradient-to-r from-purple-500/30 to-pink-500/30 border border-white/30 rounded-xl py-3 font-medium hover:scale-[1.01] transition-all"
                >
                  + Add Goal
                </button>
              </div>

              {plannedLogs.length > 0 && (
                <div className="space-y-2 mb-6">
                  <p className="text-xs text-white/50 font-medium">Planned Activities</p>
                  {plannedLogs.map((log, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/15 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{log.category}</span>
                        <span className="text-sm text-white/50">{log.hours}h</span>
                      </div>
                      <button onClick={() => removePlannedLog(index)} className="text-white/40 hover:text-red-400 hover:scale-110 transition-all p-1">✕</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:scale-105 transition-all">
                  <p className="text-xs text-white/60">Projected Productivity</p>
                  <p className="text-3xl font-bold text-blue-300">{projectedScores.productivity}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 hover:scale-105 transition-all">
                  <p className="text-xs text-white/60">Projected Happiness</p>
                  <p className="text-3xl font-bold text-green-300">{projectedScores.happiness}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentTab === "insights" && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
              <h2 className="text-lg font-semibold mb-4 text-white/80">📋 Planned vs Actual</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Productivity</span>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-300">{projectedScores.productivity}</span>
                    <span>→</span>
                    <span className="text-blue-300 font-bold">{actualScores.productivity}</span>
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
                    <span className="text-green-300 font-bold">{actualScores.happiness}</span>
                    <span className={`text-sm ${happyDiff >= 0 ? "text-green-400" : "text-red-400"}`}>
                      ({happyDiff >= 0 ? "+" : ""}{happyDiff})
                    </span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <p className="text-center font-medium">
                    Status: {comparisonStatus}
                  </p>
                  <p className="text-sm text-white/60 text-center mt-1">
                    {prodDiff >= 10 ? "You crushed your productivity goals! 🚀" :
                     prodDiff <= -10 ? "Productivity fell short. Review your plan. 📉" :
                     happyDiff <= -10 ? "Happiness took a hit. Prioritize joy tomorrow. 🌱" :
                     "Good execution. Keep aligning actions with intentions."}
                  </p>
                </div>
              </div>
            </div>

            {/* Mood-Energy Correlation */}
            {pulseEnergy && pulseMood && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
                <h2 className="text-lg font-semibold mb-4 text-white/80">📈 Mood & Energy Impact</h2>
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
                  <p className="text-xs text-white/50 mt-2">
                    {pulseEnergy === "high" && pulseMood === "😊" ? "Peak performance day! ⚡" :
                     pulseEnergy === "low" ? "Low energy – be kind to yourself. 🌱" :
                     "Moderate day – steady progress wins. 👍"}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
              <h2 className="text-lg font-semibold mb-4 text-white/80">📊 Daily Breakdown</h2>
              {breakdown.length > 0 ? (
                <div className="space-y-2">
                  {breakdown.map((item) => (
                    <div key={item.category} className="flex flex-wrap items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
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
                        <span className="text-sm text-white/50">{item.hours}h</span>
                      </div>
                      <div className="flex gap-4 text-sm">
                        {item.prod > 0 && <span className="text-blue-300">+{item.prod} Prod</span>}
                        {item.happy > 0 && <span className="text-green-300">+{item.happy} Happy</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">No data yet. Log some activities!</p>
              )}
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform duration-200">
              <h2 className="text-lg font-semibold mb-4 text-white/80">📈 History (Last 7 Days)</h2>
              {history.length > 0 ? (
                <div className="space-y-2">
                  {[...history].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7).map((entry) => (
                    <div key={entry.date} className="flex justify-between p-3 bg-white/5 rounded-xl">
                      <span>{entry.date}</span>
                      <div className="flex gap-4">
                        <span className="text-blue-300">P: {entry.productivity}</span>
                        <span className="text-green-300">H: {entry.happiness}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/50 text-center py-4">No history yet.</p>
              )}
            </div>
          </div>
        )}

        {currentTab === "profile" && (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Total Hours", value: `${totalHours}h` },
                { label: "Top Category", value: topCategory },
                { label: "Current Streak", value: `${streaks.currentStreak} 🔥` },
                { label: "Badges Earned", value: `${unlockedBadges.length}/${badgesList.length}` },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-4 hover:scale-105 transition-transform duration-200">
                  <p className="text-sm text-white/60">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
              ))}
            </div>

            {bestDay && (
              <div className="bg-gradient-to-r from-yellow-950/40 to-amber-950/40 backdrop-blur-xl border border-yellow-400/30 rounded-2xl p-4 hover:scale-[1.01] transition-transform">
                <p className="text-sm text-yellow-200/80">🏆 Best Day</p>
                <p className="text-lg font-semibold">{bestDay.date} — P: {bestDay.productivity} H: {bestDay.happiness}</p>
              </div>
            )}

            {/* Partner Setup */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5 hover:scale-[1.01] transition-transform">
              <h2 className="text-lg font-semibold mb-4 text-white/80">🤝 Accountability Partner</h2>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="Partner's name (optional)"
                className="w-full bg-black/30 border border-white/20 rounded-xl p-3 text-white mb-2"
              />
              <p className="text-xs text-white/50">Share your streak with a friend (local only).</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5">
              <h2 className="text-lg font-semibold mb-4 text-white/80">🏅 Badges ({unlockedBadges.length}/{badgesList.length})</h2>
              <div className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1 custom-scroll">
                {badgesList.map((badge) => {
                  const unlocked = unlockedBadges.includes(badge.id);
                  return (
                    <div key={badge.id} className={`p-3 rounded-xl border ${unlocked ? "bg-white/10 border-white/30" : "bg-white/5 border-white/10 opacity-50"}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{badge.emoji}</span>
                        <div>
                          <p className="font-medium text-sm">{badge.name}</p>
                          <p className="text-xs text-white/50">{badge.description}</p>
                        </div>
                        {unlocked && <span className="ml-auto text-green-400">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-3xl p-5">
              <h2 className="text-lg font-semibold mb-4 text-white/80">⚙️ Settings</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Sound Effects</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-3 py-1 rounded-full transition-all hover:scale-105 ${soundEnabled ? "bg-green-500/30" : "bg-white/10"}`}
                  >
                    {soundEnabled ? "On" : "Off"}
                  </button>
                </div>
                <button
                  onClick={exportData}
                  className="w-full bg-blue-500/20 border border-blue-400/30 rounded-xl py-3 text-blue-300 hover:scale-[1.01] transition-all"
                >
                  📤 Export Data
                </button>
                <label className="w-full bg-green-500/20 border border-green-400/30 rounded-xl py-3 text-green-300 text-center block cursor-pointer hover:scale-[1.01] transition-all">
                  📥 Import Data
                  <input type="file" accept=".json" onChange={importData} className="hidden" />
                </label>
                <button
                  onClick={() => {
                    if (confirm("Clear all data? This cannot be undone.")) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="w-full bg-red-500/20 border border-red-400/30 rounded-xl py-4 text-red-300 hover:scale-[1.01] transition-all"
                >
                  Reset All Data
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reflection Modal - appears after score modal */}
        {showReflectionModal && (
          <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-40" onClick={() => setShowReflectionModal(false)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-gray-900/90 backdrop-blur-xl border border-white/20 rounded-3xl p-6 w-full max-w-md">
                <h3 className="text-xl font-semibold mb-4">Daily Reflection</h3>
                <p className="text-sm text-white/60 mb-3">What went well today? What could improve?</p>
                <textarea
                  value={reflectionInput}
                  onChange={(e) => setReflectionInput(e.target.value)}
                  className="w-full bg-black/30 border border-white/20 rounded-xl p-3 text-white h-24 resize-none"
                  placeholder="Write your thoughts..."
                />
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleReflectionSubmit}
                    className="flex-1 bg-gradient-to-r from-green-500/30 to-lime-500/30 py-3 rounded-xl hover:scale-105 transition-all"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setShowReflectionModal(false)}
                    className="flex-1 bg-white/10 py-3 rounded-xl hover:scale-105 transition-all"
                  >
                    Skip
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Score Modal */}
        {showScoreModal && (
          <>
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-40 animate-fade-in" onClick={handleScoreModalClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-scale-up">
              <div className="w-full max-w-lg">
                <button onClick={handleScoreModalClose} className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/20 hover:scale-110 transition-all z-50">✕</button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-950/80 to-black/60 backdrop-blur-xl border border-blue-400/40 p-8 hover:scale-[1.02] transition-transform">
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-blue-500/40 rounded-full blur-3xl" />
                    <p className="text-lg font-semibold text-blue-200/90 uppercase mb-2">Productivity</p>
                    <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-cyan-200">{actualScores.productivity}</p>
                    <div className="mt-6 w-full h-3 bg-white/10 rounded-full">
                      <div className={`h-full bg-gradient-to-r ${getProductivityColor(actualScores.productivity)}`} style={{ width: `${actualScores.productivity}%` }} />
                    </div>
                    {projectedScores.productivity > 0 && (
                      <p className="text-sm text-blue-200/60 mt-2">Projected: {projectedScores.productivity}</p>
                    )}
                  </div>
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-lime-950/80 to-black/60 backdrop-blur-xl border border-green-400/40 p-8 hover:scale-[1.02] transition-transform">
                    <div className="absolute -top-16 -right-16 w-32 h-32 bg-lime-500/40 rounded-full blur-3xl" />
                    <p className="text-lg font-semibold text-lime-200/90 uppercase mb-2">Happiness</p>
                    <p className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-lime-200 to-green-200">{actualScores.happiness}</p>
                    <div className="mt-6 w-full h-3 bg-white/10 rounded-full">
                      <div className={`h-full bg-gradient-to-r ${getHappinessColor(actualScores.happiness)}`} style={{ width: `${actualScores.happiness}%` }} />
                    </div>
                    {projectedScores.happiness > 0 && (
                      <p className="text-sm text-lime-200/60 mt-2">Projected: {projectedScores.happiness}</p>
                    )}
                  </div>
                </div>
                <div className="mt-8 text-center">
                  <p className="text-xl font-medium text-white/90">{getFeedbackMessage(actualScores.productivity, actualScores.happiness)}</p>
                  <p className="text-sm text-white/50 mt-2">{getDailyInsight()}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Category Selector Modal */}
        {selectedHour !== null && (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 animate-fade-in" onClick={() => setSelectedHour(null)} />
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/95 backdrop-blur-2xl border-t border-white/20 rounded-t-[2rem] p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <p className="text-xl font-semibold">Select category for {selectedHour}:00</p>
                <button onClick={() => setSelectedHour(null)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all">✕</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleHourSelect(cat)}
                    className="bg-white/5 border border-white/20 p-4 rounded-2xl text-sm font-medium hover:bg-white/15 hover:scale-105 transition-all"
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-center"><div className="w-12 h-1.5 bg-white/20 rounded-full" /></div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
        @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        @keyframes scale-up { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
        .animate-scale-up { animation: scale-up 0.3s ease-out; }
        @keyframes bounce-in { 0% { opacity: 0; transform: translate(-50%, -20px) scale(0.9); } 100% { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
        @keyframes float-slow { 0%, 100% { transform: translateY(0) translateX(0); } 25% { transform: translateY(-20px) translateX(10px); } 50% { transform: translateY(0) translateX(20px); } 75% { transform: translateY(20px) translateX(10px); } }
        .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
        @keyframes float-slower { 0%, 100% { transform: translateY(0) translateX(0); } 33% { transform: translateY(-15px) translateX(-10px); } 66% { transform: translateY(15px) translateX(-20px); } }
        .animate-float-slower { animation: float-slower 18s ease-in-out infinite; }
        @keyframes spin-slow { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        @keyframes spin-slower { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(-360deg); } }
        .animate-spin-slower { animation: spin-slower 30s linear infinite; }
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.8s ease-out forwards; }
      `}</style>
    </>
  );
}