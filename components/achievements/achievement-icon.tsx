import { Sprout, Flame, Code, CheckCircle2, Brain, Compass, BookOpen, Flag, Layers, Medal, Zap, Crown, Search, Briefcase, Rocket, Gem, Star, Mountain, Trophy } from "lucide-react";
import { ACHIEVEMENTS } from "@/lib/achievements";
const icons = [Sprout, Flame, Code, CheckCircle2, Brain, Compass, BookOpen, Flag, Layers, Medal, Zap, Crown, Search, Briefcase, Rocket, Gem, Star, Mountain, Trophy];
export function AchievementIcon({ tag, className }: { tag: string; className?: string }) {
  const Icon = icons[ACHIEVEMENTS.findIndex((m) => m.tag === tag)] ?? Trophy;
  return <Icon className={className} aria-hidden />;
}
