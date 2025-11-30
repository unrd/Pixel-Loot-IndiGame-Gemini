
export enum Rarity {
  COMMON = 'Common',
  RARE = 'Rare',
  EPIC = 'Epic',
  LEGENDARY = 'Legendary'
}

export enum ItemType {
  WEAPON = 'Weapon',
  ACCESSORY = 'Accessory',
  ARMOR = 'Armor' 
}

export interface Item {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  type: ItemType; 
  itemLevel: number; // New field for scaling
  isEquipped: boolean;
  damageBonus: number; 
  defenseBonus?: number; 
  goldMultiplier: number; 
  imageIndex: number; 
}

export interface Monster {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  goldReward: number;
  isBoss?: boolean; 
  timeRemaining?: number; 
}

export interface PlayerStats {
  clickDamage: number;
  autoDps: number;
  gold: number;
  level: number;
  experience: number;
  maxExperience: number;
  
  // Combat Stats
  critChance: number; 
  critMultiplier: number; 

  // Prestige Stats
  souls: number; 
  prestigeDamageMult: number; 
  prestigeGoldMult: number; 

  // Loot Boxes
  lootBoxes: number;

  // Lifetime Stats
  totalMonstersKilled: number;
  totalGoldCollected: number;
  totalLegendariesFound: number;
  unlockedAchievements: string[]; 
  
  // Retention
  lastLoginTime?: number;
  loginStreak?: number;
  lastRewardClaimDate?: number;
}

export interface Buffs {
  damageBuffExpiry: number; 
  goldBuffExpiry: number; 
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export type AchievementType = 'kills' | 'gold' | 'legendaries';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  type: AchievementType;
  threshold: number;
  rewardDescription: string;
  rewardType: 'damage' | 'gold';
  rewardValue: number; 
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  currency?: 'gold' | 'souls'; 
  category: 'game' | '05ru'; 
  type: string;
  duration?: number;
  value?: number;
  costMultiplier?: number;
}

export interface StoryChoice {
  text: string;
  outcomeText: string;
  rewardType: 'gold' | 'buff_damage' | 'buff_gold';
  rewardValue: number; 
}

export interface Zone {
  id: string;
  name: string;
  description: string;
  mission: string;
  minLevel: number;
  maxLevel: number;
  bgGradient: string;
  textColor: string;
  choices?: StoryChoice[];
}

export enum NPCId {
  GUIDE = 'guide',
  MERCHANT = 'merchant'
}

export interface DialogOption {
  text: string;
  nextId?: string;
  action?: 'trade' | 'heal' | 'buff' | 'exit';
  reward?: { type: 'gold', value: number } | { type: 'buff_dmg', value: number };
}

export interface NPC {
  id: NPCId;
  name: string;
  title: string;
  dialogues: Record<string, { text: string, options: DialogOption[] }>;
}
