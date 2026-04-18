"use client";
import { createContext, useContext, useState, ReactNode } from "react";

const translations = {
  en: {
    appName: "Vocalytics",
    tagline: "Voice-powered interviews, instantly.",
    login: "Login",
    signup: "Sign Up",
    logout: "Logout",
    dashboard: "Dashboard",
    createInterview: "Create Interview",
    myInterviews: "My Interviews",
    title: "Title",
    description: "Description",
    questions: "Questions",
    addQuestion: "Add Question",
    save: "Save",
    delete: "Delete",
    shareLink: "Share Link",
    viewResponses: "View Responses",
    startInterview: "Start Interview",
    yourName: "Your Name",
    enterName: "Enter your name to begin",
    connecting: "Connecting...",
    interviewComplete: "Interview Complete",
    thankYou: "Thank you for your time!",
    noInterviews: "No interviews yet. Create one!",
    sessions: "Sessions",
    responses: "Responses",
    question: "Question",
    answer: "Answer",
    status: "Status",
    pending: "Pending",
    active: "Active",
    completed: "Completed",
    email: "Email",
    password: "Password",
    loading: "Loading...",
    copyLink: "Copy Link",
    copied: "Copied!",
    speakNow: "Speak now...",
    agentSpeaking: "Agent is speaking...",
    micOff: "Mic is off",
    questionOf: "Question",
    of: "of",
  },
  ur: {
    appName: "ووکالیٹکس",
    tagline: "آواز سے چلنے والے انٹرویوز، فوری طور پر۔",
    login: "لاگ ان",
    signup: "سائن اپ",
    logout: "لاگ آؤٹ",
    dashboard: "ڈیش بورڈ",
    createInterview: "انٹرویو بنائیں",
    myInterviews: "میرے انٹرویوز",
    title: "عنوان",
    description: "تفصیل",
    questions: "سوالات",
    addQuestion: "سوال شامل کریں",
    save: "محفوظ کریں",
    delete: "حذف کریں",
    shareLink: "لنک شیئر کریں",
    viewResponses: "جوابات دیکھیں",
    startInterview: "انٹرویو شروع کریں",
    yourName: "آپ کا نام",
    enterName: "شروع کرنے کے لیے اپنا نام درج کریں",
    connecting: "جڑ رہے ہیں...",
    interviewComplete: "انٹرویو مکمل",
    thankYou: "آپ کے وقت کا شکریہ!",
    noInterviews: "ابھی کوئی انٹرویو نہیں۔ ایک بنائیں!",
    sessions: "سیشن",
    responses: "جوابات",
    question: "سوال",
    answer: "جواب",
    status: "حیثیت",
    pending: "زیر التواء",
    active: "فعال",
    completed: "مکمل",
    email: "ای میل",
    password: "پاس ورڈ",
    loading: "لوڈ ہو رہا ہے...",
    copyLink: "لنک کاپی کریں",
    copied: "کاپی ہو گیا!",
    speakNow: "ابھی بولیں...",
    agentSpeaking: "ایجنٹ بول رہا ہے...",
    micOff: "مائیک بند ہے",
    questionOf: "سوال",
    of: "میں سے",
  },
};

type Language = "en" | "ur";
type Translations = typeof translations.en;

const LanguageContext = createContext<{
  lang: Language;
  t: Translations;
  toggleLang: () => void;
}>({ lang: "en", t: translations.en, toggleLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");
  const toggleLang = () => setLang((l) => (l === "en" ? "ur" : "en"));
  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      <div dir={lang === "ur" ? "rtl" : "ltr"}>{children}</div>
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
