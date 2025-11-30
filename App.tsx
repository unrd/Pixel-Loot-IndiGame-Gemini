
import React, { useState, useEffect, useRef } from 'react';
import { Coins, Zap, Sword, Crown, Sparkles, Skull, Ghost, Repeat, Trophy, Lock, CheckCircle, Save, ShoppingBag, Clock, Shield, Gift, Shirt, HelpCircle, X, MapPin, Info, ArrowRight, AlertTriangle, Map as MapIcon, ArrowUpCircle, Trash2, Volume2, VolumeX, List, Grid, Menu, LayoutDashboard, Calendar, History, Box, Search, Settings, Dice5, Tent } from 'lucide-react';
import { Item, Rarity, Monster, PlayerStats, FloatingText, Achievement, ItemType, Buffs, Zone, StoryChoice, NPC, NPCId, DialogOption } from './types';
import { MONSTER_NAMES, BOSS_NAMES, BOSS_INFO, BASE_DROP_RATES, GACHA_COST_BASE, CLICK_UPGRADE_COST_BASE, AUTO_UPGRADE_COST_BASE, ACHIEVEMENTS, SHOP_ITEMS, BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER, ZONES, RARITY_LABELS, CHANGELOG, RANDOM_EVENTS, STATIC_ITEMS, STATIC_DESCRIPTIONS, LOOTBOX_COST, NPCS } from './constants';
import { generateItemDetails } from './services/geminiService';
import { InventoryItem } from './components/InventoryItem';
import { PixelMonster } from './components/PixelMonster';
import { playClickSound, playDeathSound, playGoldSound, playUpgradeSound, playGachaPullSound, playGachaRevealSound, playBackgroundMusic, stopBackgroundMusic, playZoneUnlockTheme, toggleMute } from './services/audioService';

// Utility for ID generation
const uid = () => Math.random().toString(36).substr(2, 9);
const SAVE_KEY = 'pixel_loot_lord_save_v11'; 
const TUTORIAL_KEY = 'pixel_loot_lord_tutorial_completed_v2';

const INITIAL_STATS: PlayerStats = {
  clickDamage: 1,
  autoDps: 0,
  gold: 0,
  level: 1,
  experience: 0,
  maxExperience: 100,
  souls: 0,
  prestigeDamageMult: 1,
  prestigeGoldMult: 1,
  totalMonstersKilled: 0,
  totalGoldCollected: 0,
  totalLegendariesFound: 0,
  unlockedAchievements: [],
  critChance: BASE_CRIT_CHANCE,
  critMultiplier: BASE_CRIT_MULTIPLIER,
  lastLoginTime: Date.now(),
  loginStreak: 1,
  lastRewardClaimDate: 0,
  lootBoxes: 0
};

type MobileTab = 'upgrades' | 'inventory' | 'shop' | 'info';

export default function App() {
  // --- Game State ---
  const [stats, setStats] = useState<PlayerStats>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_STATS, ...parsed.stats, lootBoxes: parsed.stats.lootBoxes || 0 };
      } catch (e) {
        console.error("Save file corrupted", e);
      }
    }
    return INITIAL_STATS;
  });

  const [inventory, setInventory] = useState<Item[]>(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return (parsed.inventory || []).map((item: any) => ({
             ...item,
             type: item.type !== undefined ? item.type : ItemType.WEAPON,
             isEquipped: item.isEquipped !== undefined ? item.isEquipped : true, 
             defenseBonus: item.defenseBonus || 0,
             itemLevel: item.itemLevel || 1 // Backwards compatibility
        }));
      } catch (e) {}
    }
    return [];
  });

  const [costs, setCosts] = useState(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            return parsed.costs || {
                click: CLICK_UPGRADE_COST_BASE,
                auto: AUTO_UPGRADE_COST_BASE
            };
        } catch(e) {}
    }
    return {
        click: CLICK_UPGRADE_COST_BASE,
        auto: AUTO_UPGRADE_COST_BASE
    };
  });

  const [monster, setMonster] = useState<Monster>({
    name: "Слизень",
    hp: 15,
    maxHp: 15,
    level: 1,
    goldReward: 3
  });

  const [buffs, setBuffs] = useState<Buffs>({
      damageBuffExpiry: 0,
      goldBuffExpiry: 0
  });

  const [activeEffects, setActiveEffects] = useState<{damageMult: number, goldMult: number}>({ damageMult: 1, goldMult: 1 });
  
  // --- UI State ---
  const [floatingTexts, setFloatingTexts] = useState<(FloatingText & { isCrit?: boolean })[]>([]);
  const [shake, setShake] = useState<'none' | 'normal' | 'hard'>('none');
  const [gachaProcessing, setGachaProcessing] = useState(false);
  
  const [pendingItem, setPendingItem] = useState<Item | null>(null);
  
  const [showPrestigeModal, setShowPrestigeModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [showOfflineProgressModal, setShowOfflineProgressModal] = useState<number | null>(null);
  const [itemToSell, setItemToSell] = useState<Item | null>(null);
  const [showGachaInfoModal, setShowGachaInfoModal] = useState(false);
  
  // Loot Box & NPC
  const [showLootBoxModal, setShowLootBoxModal] = useState(false);
  const [isLootBoxSpinning, setIsLootBoxSpinning] = useState(false);
  const [lootBoxReward, setLootBoxReward] = useState<string | null>(null);
  const [lootBoxSummary, setLootBoxSummary] = useState<string[] | null>(null);

  const [activeNPC, setActiveNPC] = useState<NPC | null>(null);
  const [npcDialogId, setNpcDialogId] = useState<string>('start');
  const [showNPCModal, setShowNPCModal] = useState(false);

  const [isGamePaused, setIsGamePaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const [shopTab, setShopTab] = useState<'game' | '05ru'>('game');
  const [inventoryTab, setInventoryTab] = useState<ItemType | 'ALL'>('ALL');
  const [mobileTab, setMobileTab] = useState<MobileTab>('upgrades');
  
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [autoSaveText, setAutoSaveText] = useState<string | null>(null);
  const [eventToast, setEventToast] = useState<{title: string, desc: string} | null>(null);

  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  const [currentZone, setCurrentZone] = useState<Zone>(ZONES[0]);
  const [seenZones, setSeenZones] = useState<string[]>(() => {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
          try { return JSON.parse(saved).seenZones || []; } catch(e) {}
      }
      return [];
  });

  // Dynamic Gacha Cost based on level to control economy
  const gachaCost = Math.floor(GACHA_COST_BASE * Math.pow(1.05, stats.level));

  // --- Initialization Effects ---

  const showToast = (message: string) => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setAchievementToast(message);
      toastTimeoutRef.current = setTimeout(() => {
          setAchievementToast(null);
      }, 3000);
  };

  const resumeAudio = () => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      // Dummy resume
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        const lastTime = parsed.timestamp || Date.now();
        const now = Date.now();
        const diffSeconds = Math.floor((now - lastTime) / 1000);

        // Offline Gold
        if (diffSeconds > 60 && stats.autoDps > 0) {
             const earned = Math.floor(stats.autoDps * diffSeconds * 0.5); // 50% efficiency
             if (earned > 0) {
                 setStats(prev => ({ ...prev, gold: prev.gold + earned, totalGoldCollected: prev.totalGoldCollected + earned }));
                 setShowOfflineProgressModal(earned);
             }
        }
    }
  }, []);

  useEffect(() => {
    const saveGame = () => {
        const gameState = {
            stats,
            inventory,
            costs,
            buffs,
            seenZones,
            timestamp: Date.now()
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
        setAutoSaveText("Сохранено");
        setTimeout(() => setAutoSaveText(null), 2000);
    };
    const interval = setInterval(saveGame, 30000);
    return () => clearInterval(interval);
  }, [stats, inventory, costs, buffs, seenZones]);

  useEffect(() => {
      const isCompleted = localStorage.getItem(TUTORIAL_KEY);
      if (!isCompleted) {
          setShowTutorial(true);
          setTutorialStep(1);
          setIsGamePaused(true);
      }
  }, []);

  const completeTutorial = () => {
      localStorage.setItem(TUTORIAL_KEY, 'true');
      setShowTutorial(false);
      setIsGamePaused(false);
      playBackgroundMusic(currentZone.id);
  };

  useEffect(() => {
      let active = ZONES[0];
      for (const zone of ZONES) {
          if (stats.level >= zone.minLevel) {
              active = zone;
          }
      }
      setCurrentZone(active);

      if (!seenZones.includes(active.id)) {
          setShowStoryModal(true);
          setIsGamePaused(true);
          setSeenZones(prev => [...prev, active.id]);
          playZoneUnlockTheme().then(() => {
             if (!showStoryModal) playBackgroundMusic(active.id); 
          });
      } else {
          // Check Boss status for music
          if (!isMuted && !showTutorial && !showStoryModal) {
              if (monster.isBoss) {
                  playBackgroundMusic('boss');
              } else {
                  playBackgroundMusic(active.id);
              }
          }
      }
  }, [stats.level, isMuted, monster.isBoss]);

  useEffect(() => {
    // Sync music if boss state changes while staying in same zone
    if (!showStoryModal && !showTutorial && !isMuted) {
        playBackgroundMusic(monster.isBoss ? 'boss' : currentZone.id);
    }
  }, [monster.isBoss]);

  const handleMuteToggle = () => {
      const newState = !isMuted;
      setIsMuted(newState);
      toggleMute(newState);
      if (!newState) {
          playBackgroundMusic(monster.isBoss ? 'boss' : currentZone.id);
      }
  };

  useEffect(() => {
      if (!monster.isBoss || isGamePaused) return;
      const timer = setInterval(() => {
          setMonster(prev => {
              if (!prev.isBoss) return prev;
              const newTime = (prev.timeRemaining || 0) - 1;
              return { ...prev, timeRemaining: Math.max(0, newTime) };
          });
      }, 1000);
      return () => clearInterval(timer);
  }, [monster.isBoss, isGamePaused]);

  useEffect(() => {
    if (monster.isBoss && monster.timeRemaining === 0 && !isGamePaused) {
      handleBossFail();
    }
  }, [monster.isBoss, monster.timeRemaining, isGamePaused]);

  const handleBossFail = () => {
      const newLevel = Math.max(1, stats.level - 1);
      setStats(prev => ({ ...prev, level: newLevel, experience: 0 }));
      spawnMonster(newLevel);
      showToast("ПОРАЖЕНИЕ! Уровень понижен.");
  };

  useEffect(() => {
    let itemDamage = 0;
    let gMultItem = 0;
    inventory.forEach(item => {
      itemDamage += item.damageBonus;
      if (item.defenseBonus) itemDamage += item.defenseBonus;
      gMultItem += item.goldMultiplier;
    });

    let achDamageMult = 0;
    let achGoldMult = 0;
    ACHIEVEMENTS.forEach(ach => {
      if (stats.unlockedAchievements.includes(ach.id)) {
        if (ach.rewardType === 'damage') achDamageMult += ach.rewardValue;
        if (ach.rewardType === 'gold') achGoldMult += ach.rewardValue;
      }
    });

    const now = Date.now();
    const buffDamageMult = now < buffs.damageBuffExpiry ? 1.0 : 0; 
    const buffGoldMult = now < buffs.goldBuffExpiry ? 1.0 : 0; 

    const finalDamageMult = stats.prestigeDamageMult * (1 + achDamageMult + buffDamageMult);
    const finalGoldMult = (1 + gMultItem) * stats.prestigeGoldMult * (1 + achGoldMult + buffGoldMult);
    
    setActiveEffects({ damageMult: finalDamageMult, goldMult: finalGoldMult });
  }, [inventory, stats.prestigeDamageMult, stats.prestigeGoldMult, stats.unlockedAchievements, buffs]);

  useEffect(() => {
    if (stats.autoDps === 0 || isGamePaused) return;
    const interval = setInterval(() => {
      dealDamage(stats.autoDps);
    }, 1000);
    return () => clearInterval(interval);
  }, [stats.autoDps, monster, activeEffects, inventory, stats.critChance, stats.critMultiplier, isGamePaused]); 

  // --- Logic ---

  const spawnMonster = (level: number) => {
    const isBoss = level % 10 === 0;
    let name = "";
    if (isBoss) {
        name = BOSS_NAMES[Math.min(Math.floor(level / 10) - 1, BOSS_NAMES.length - 1)] || "Древнее Зло";
    } else {
        name = MONSTER_NAMES[Math.min(Math.floor(level / 5), MONSTER_NAMES.length - 1)];
    }
    
    // Balanced HP and Gold Scaling
    // HP scales faster than linear to require upgrades
    // Gold scales slightly slower to require more grind
    
    const baseHp = 15;
    const baseGold = 3;
    
    // 1.25^Level means HP doubles roughly every 3-4 levels
    const hp = Math.floor(baseHp * Math.pow(1.25, level - 1) * (isBoss ? 10 : 1));
    
    // 1.20^Level means Gold doubles roughly every 4 levels
    const gold = Math.floor(baseGold * Math.pow(1.20, level - 1) * (isBoss ? 5 : 1));
    
    setMonster({
      name, hp, maxHp: hp, level, goldReward: gold, isBoss, timeRemaining: isBoss ? 30 : undefined
    });

    if (isBoss) {
      setIsGamePaused(true);
      setShowBossIntro(true);
    }
  };

  const startBossFight = () => {
    setShowBossIntro(false);
    setIsGamePaused(false);
    playBackgroundMusic('boss');
  };

  const buyLootBox = () => {
    if (stats.gold < LOOTBOX_COST) return;
    setStats(prev => ({ ...prev, gold: prev.gold - LOOTBOX_COST, lootBoxes: prev.lootBoxes + 1 }));
    playUpgradeSound();
  };

  const spinLootBox = () => {
    if (stats.lootBoxes <= 0 || isLootBoxSpinning) return;
    setStats(prev => ({ ...prev, lootBoxes: prev.lootBoxes - 1 }));
    setIsLootBoxSpinning(true);
    setLootBoxReward(null);
    playGachaPullSound();
  };

  const openMassLootBoxes = () => {
    const amount = Math.min(10, stats.lootBoxes);
    if (amount <= 0) return;
    
    setStats(prev => ({ ...prev, lootBoxes: prev.lootBoxes - amount }));
    
    const results: string[] = [];
    let totalGold = 0;
    let totalSouls = 0;
    
    for (let i = 0; i < amount; i++) {
        const roll = Math.random();
        if (roll < 0.5) {
            const gold = Math.floor(monster.goldReward * 20 * (1 + Math.random()));
            totalGold += gold;
            results.push(`${gold} Золота`);
        } else if (roll < 0.8) {
            totalSouls += 1;
            results.push(`1 Душа`);
        } else {
            pullGacha(true); // Triggers item modal independently, might stack
            results.push("ПРЕДМЕТ (В инвентаре)");
        }
    }
    
    if (totalGold > 0) setStats(prev => ({ ...prev, gold: prev.gold + totalGold }));
    if (totalSouls > 0) setStats(prev => ({ ...prev, souls: prev.souls + totalSouls }));
    
    setLootBoxSummary(results);
    playGachaRevealSound(false);
  };

  useEffect(() => {
    if (!isLootBoxSpinning) return;
    
    let ticks = 0;
    const maxTicks = 20; 
    const interval = setInterval(() => {
        ticks++;
        if (ticks >= maxTicks) {
            clearInterval(interval);
            finishLootBoxSpin();
        }
    }, 100);

    return () => clearInterval(interval);
  }, [isLootBoxSpinning]);

  const finishLootBoxSpin = () => {
      const roll = Math.random();
      let rewardText = "";
      if (roll < 0.5) {
          const gold = Math.floor(monster.goldReward * 20 * (1 + Math.random()));
          setStats(prev => ({ ...prev, gold: prev.gold + gold }));
          rewardText = `${gold} Золота`;
      } else if (roll < 0.8) {
           const souls = 1;
           setStats(prev => ({ ...prev, souls: prev.souls + souls }));
           rewardText = `${souls} Душа`;
      } else {
           pullGacha(true); 
           rewardText = "Случайный Предмет!";
           setShowLootBoxModal(false); 
      }
      
      if (roll < 0.8) {
         setLootBoxReward(rewardText);
         playGachaRevealSound(false);
      }
      setIsLootBoxSpinning(false);
  };

  const dealDamage = (amount: number, isClick = false) => {
    if (isClick) resumeAudio();
    let inventoryDamage = 0;
    inventory.forEach(item => {
        inventoryDamage += item.damageBonus;
        if (item.defenseBonus) inventoryDamage += item.defenseBonus; 
    });
    const effectiveInventoryDamage = isClick ? inventoryDamage : (inventoryDamage * 0.1);
    let rawDamage = amount + effectiveInventoryDamage;
    let isCrit = false;
    if (Math.random() < stats.critChance) {
        rawDamage *= stats.critMultiplier;
        isCrit = true;
    }
    const totalDamage = Math.floor(rawDamage * activeEffects.damageMult);

    if (totalDamage <= 0) return;

    if (isClick) {
      playClickSound();
      const newText: FloatingText & { isCrit?: boolean } = {
        id: Date.now() + Math.random(),
        x: 50 + (Math.random() * 20 - 10),
        y: 40 + (Math.random() * 20 - 10),
        text: isCrit ? `CRIT! ${totalDamage}` : `${totalDamage}`,
        color: isCrit ? 'text-red-500 font-bold text-2xl' : (totalDamage > stats.clickDamage * 5 ? 'text-yellow-400 font-bold text-xl' : 'text-white'),
        isCrit: isCrit
      };
      
      setFloatingTexts(prev => [...prev.slice(-14), newText]);
      setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== newText.id)), 750);
      
      setShake(isCrit ? 'hard' : 'normal');
      setTimeout(() => setShake('none'), isCrit ? 200 : 100);
    }

    setMonster(prev => {
      const newHp = prev.hp - totalDamage;
      if (newHp <= 0) {
        requestAnimationFrame(() => handleMonsterDeath(prev));
        return { ...prev, hp: 0 };
      }
      return { ...prev, hp: newHp };
    });
  };

  const handleMonsterDeath = (deadMonster: Monster) => {
    playDeathSound();
    playGoldSound();
    const goldEarned = Math.floor(deadMonster.goldReward * activeEffects.goldMult);
    
    // Random Events Trigger
    if (!deadMonster.isBoss && Math.random() < 0.05) { 
         const eventRoll = Math.random();
         let cumulative = 0;
         const event = RANDOM_EVENTS.find(e => {
             cumulative += e.weight;
             return eventRoll <= cumulative;
         }) || RANDOM_EVENTS[0];

         setEventToast({ title: event.name, desc: event.description });
         setTimeout(() => setEventToast(null), 4000);

         if (event.rewardType === 'gold_mult') {
             const bonus = goldEarned * event.value;
             setStats(prev => ({...prev, gold: prev.gold + bonus}));
         } else if (event.rewardType === 'buff_damage') {
             setBuffs(prev => ({...prev, damageBuffExpiry: Date.now() + event.value}));
         } else if (event.rewardType === 'gold_flat') {
             setStats(prev => ({...prev, gold: prev.gold + event.value}));
         } else if (event.rewardType === 'mystery_box') {
             setStats(prev => ({...prev, lootBoxes: prev.lootBoxes + 1}));
             showToast("Найдена Загадочная Коробка!");
         }
    }

    setStats(prev => {
      const newExp = prev.experience + 10;
      const levelUpByExp = newExp >= prev.maxExperience;
      const forceLevelUp = deadMonster.isBoss;
      const leveledUp = levelUpByExp || forceLevelUp;
      if (leveledUp) playUpgradeSound();
      return {
        ...prev,
        gold: prev.gold + goldEarned,
        totalGoldCollected: prev.totalGoldCollected + goldEarned,
        totalMonstersKilled: prev.totalMonstersKilled + 1,
        experience: leveledUp ? 0 : newExp,
        maxExperience: leveledUp ? Math.floor(prev.maxExperience * 1.2) : prev.maxExperience,
        level: leveledUp ? prev.level + 1 : prev.level
      };
    });
    
    const goldText: FloatingText = {
        id: Date.now() + 1, x: 50, y: 20, text: `+${goldEarned} G`, color: 'text-yellow-400'
    };
    setFloatingTexts(prev => [...prev.slice(-10), goldText]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(t => t.id !== goldText.id)), 800);
    
    // Spawn next monster
    const wasBoss = deadMonster.isBoss;
    const willLevelUp = (stats.experience + 10) >= stats.maxExperience;
    const nextLevel = (wasBoss || willLevelUp) ? stats.level + 1 : stats.level;
    spawnMonster(nextLevel);
  };

  const buyUpgrade = (type: 'click' | 'auto') => {
    // Smoother scaling for costs (1.15x instead of 1.5x)
    if (type === 'click') {
      if (stats.gold >= costs.click) {
        playUpgradeSound();
        setStats(prev => ({ ...prev, gold: prev.gold - costs.click, clickDamage: prev.clickDamage + 1 }));
        setCosts(prev => ({ ...prev, click: Math.floor(prev.click * 1.15) }));
      }
    } else {
      if (stats.gold >= costs.auto) {
        playUpgradeSound();
        setStats(prev => ({ ...prev, gold: prev.gold - costs.auto, autoDps: prev.autoDps + 1 }));
        setCosts(prev => ({ ...prev, auto: Math.floor(prev.auto * 1.15) }));
      }
    }
  };

  const openNPCInteraction = (npcId: NPCId) => {
      const npc = NPCS[npcId];
      if (npc) {
          setActiveNPC(npc);
          setNpcDialogId('start');
          setShowNPCModal(true);
      }
  };

  const handleNPCAction = (option: DialogOption) => {
      if (option.reward) {
          if (option.reward.type === 'gold') {
              setStats(prev => ({...prev, gold: prev.gold + (option.reward!.value || 0)}));
          } else if (option.reward.type === 'buff_dmg') {
              setBuffs(prev => ({...prev, damageBuffExpiry: Date.now() + (option.reward!.value || 0)}));
          }
      }
      
      if (option.action === 'trade') {
          // Handled via reward logic or specific function
          if (option.text.includes('1000g')) {
               if (stats.gold >= 1000) {
                   setStats(prev => ({...prev, gold: prev.gold - 1000}));
                   showToast("Приятно иметь с вами дело.");
               } else {
                   showToast("Недостаточно золота.");
                   return; // Don't proceed
               }
          }
      }

      if (option.nextId) {
          setNpcDialogId(option.nextId);
      } else if (option.action === 'exit') {
          setShowNPCModal(false);
          setActiveNPC(null);
      }
  };

  // ... (Keep existing item/shop logic) ...
  const buyShopItem = (itemId: string) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return;
      const cost = getShopItemCost(item.id);
      const currency = item.currency || 'gold';
      const userBalance = currency === 'gold' ? stats.gold : stats.souls;
      if (userBalance < cost) return;

      playUpgradeSound();
      setStats(prev => ({ ...prev, [currency]: userBalance - cost }));

      if (item.category === '05ru') {
          const fakeCode = "05" + Math.random().toString(36).substr(2, 6).toUpperCase();
          showToast(item.type === 'promo_code' ? `Промокод: ${fakeCode}` : `Получено: ${item.name}`);
          return;
      }

      if (item.type.startsWith('consumable')) {
          const now = Date.now();
          if (item.id === 'potion_damage') setBuffs(prev => ({...prev, damageBuffExpiry: Math.max(now, prev.damageBuffExpiry) + (item.duration || 0)}));
          else if (item.id === 'potion_gold') setBuffs(prev => ({...prev, goldBuffExpiry: Math.max(now, prev.goldBuffExpiry) + (item.duration || 0)}));
      } else if (item.type.startsWith('permanent')) {
          if (item.id === 'perm_crit_chance') setStats(prev => ({...prev, critChance: prev.critChance + (item.value || 0)}));
          else if (item.id === 'perm_crit_damage') setStats(prev => ({...prev, critMultiplier: prev.critMultiplier + (item.value || 0)}));
      }
  };

  const getShopItemCost = (itemId: string) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return 0;
      if (item.id === 'perm_crit_chance') {
           const boughtCount = Math.round((stats.critChance - BASE_CRIT_CHANCE) / 0.01);
           return Math.floor(item.cost * Math.pow(item.costMultiplier || 1.5, boughtCount));
      } else if (item.id === 'perm_crit_damage') {
           const boughtCount = Math.round((stats.critMultiplier - BASE_CRIT_MULTIPLIER) / 0.1);
           return Math.floor(item.cost * Math.pow(item.costMultiplier || 1.5, boughtCount));
      }
      return item.cost;
  };

  const calculateSellPrice = (item: Item) => {
      let sellPrice = 10 * (item.itemLevel || 1);
      if (item.rarity === Rarity.RARE) sellPrice *= 2;
      if (item.rarity === Rarity.EPIC) sellPrice *= 5;
      if (item.rarity === Rarity.LEGENDARY) sellPrice *= 20;
      return Math.floor(sellPrice);
  };

  const confirmSellItem = () => {
      if (!itemToSell) return;
      const price = calculateSellPrice(itemToSell);
      setStats(prev => ({...prev, gold: prev.gold + price}));
      setInventory(prev => prev.filter(i => i.id !== itemToSell.id));
      showToast(`Продано: +${price} G`);
      setItemToSell(null);
      playGoldSound();
  };
  
  const resolvePendingItem = (action: 'keep_old' | 'equip_new') => {
      if (!pendingItem) return;
      const currentItem = inventory.find(i => i.type === pendingItem.type);
      if (action === 'keep_old') {
          const price = calculateSellPrice(pendingItem);
          setStats(prev => ({...prev, gold: prev.gold + price}));
          showToast(`Продано: +${price} G`);
      } else {
          if (currentItem) {
              const price = calculateSellPrice(currentItem);
              setStats(prev => ({...prev, gold: prev.gold + price}));
              showToast(`Продано старое: +${price} G`);
          }
          setInventory(prev => {
              const others = prev.filter(i => i.type !== pendingItem.type);
              return [...others, { ...pendingItem, isEquipped: true }];
          });
      }
      setPendingItem(null);
      setIsGamePaused(false);
  };
  
  const calculatePotentialSouls = () => {
    const levelSouls = Math.floor(stats.level / 5);
    const goldSouls = Math.floor(stats.gold / 2000);
    return Math.max(0, levelSouls + goldSouls);
  };

  const performPrestige = () => {
    const soulsEarned = calculatePotentialSouls();
    if (soulsEarned === 0) return;
    playUpgradeSound();
    setStats(prev => ({
      ...INITIAL_STATS,
      souls: prev.souls + soulsEarned,
      prestigeDamageMult: prev.prestigeDamageMult,
      prestigeGoldMult: prev.prestigeGoldMult,
      totalMonstersKilled: prev.totalMonstersKilled,
      totalGoldCollected: prev.totalGoldCollected,
      totalLegendariesFound: prev.totalLegendariesFound,
      unlockedAchievements: prev.unlockedAchievements,
      critChance: prev.critChance, 
      critMultiplier: prev.critMultiplier
    }));
    setInventory([]);
    setCosts({ click: CLICK_UPGRADE_COST_BASE, auto: AUTO_UPGRADE_COST_BASE });
    setMonster({ name: "Слизень", hp: 15, maxHp: 15, level: 1, goldReward: 3 });
    setBuffs({ damageBuffExpiry: 0, goldBuffExpiry: 0 });
    setSeenZones([]); 
    setShowPrestigeModal(false);
  };

  const buyPrestigeUpgrade = (type: 'dmg' | 'gold') => {
      const cost = 10;
      if (stats.souls < cost) return;
      playUpgradeSound();
      setStats(prev => ({
          ...prev, souls: prev.souls - cost,
          prestigeDamageMult: type === 'dmg' ? prev.prestigeDamageMult + 0.5 : prev.prestigeDamageMult,
          prestigeGoldMult: type === 'gold' ? prev.prestigeGoldMult + 0.5 : prev.prestigeGoldMult
      }));
  };

  const handleStoryChoice = (choice: StoryChoice) => {
      if (choice.rewardType === 'gold') setStats(prev => ({ ...prev, gold: prev.gold + choice.rewardValue }));
      else if (choice.rewardType === 'buff_damage') setBuffs(prev => ({ ...prev, damageBuffExpiry: Date.now() + choice.rewardValue }));
      else if (choice.rewardType === 'buff_gold') setBuffs(prev => ({ ...prev, goldBuffExpiry: Date.now() + choice.rewardValue }));
      showToast(choice.outcomeText);
      setShowStoryModal(false);
      setIsGamePaused(false);
      playBackgroundMusic(currentZone.id);
  };

  const pullGacha = async (isFree = false) => {
    if (!isFree && (stats.gold < gachaCost || gachaProcessing)) return;

    if (!isFree) {
        playGachaPullSound();
        setStats(prev => ({ ...prev, gold: prev.gold - gachaCost }));
        // No longer increasing gacha cost persistently, it scales with player level
    }
    setGachaProcessing(true);
    
    await new Promise(r => setTimeout(r, 1000));

    const roll = Math.random();
    let rarity = Rarity.COMMON;
    if (roll < BASE_DROP_RATES.LEGENDARY) rarity = Rarity.LEGENDARY;
    else if (roll < BASE_DROP_RATES.LEGENDARY + BASE_DROP_RATES.EPIC) rarity = Rarity.EPIC;
    else if (roll < BASE_DROP_RATES.LEGENDARY + BASE_DROP_RATES.EPIC + BASE_DROP_RATES.RARE) rarity = Rarity.RARE;

    const typeRoll = Math.random();
    let itemType = ItemType.WEAPON;
    if (typeRoll > 0.66) itemType = ItemType.ARMOR;
    else if (typeRoll > 0.33) itemType = ItemType.ACCESSORY;

    // SCALING LOGIC
    const itemLevel = stats.level;
    const baseDamage = Math.max(1, itemLevel * 2); 
    const baseDefense = Math.max(1, itemLevel * 1.5);
    
    let multiplier = 1;
    if (rarity === Rarity.RARE) multiplier = 3;
    if (rarity === Rarity.EPIC) multiplier = 8;
    if (rarity === Rarity.LEGENDARY) multiplier = 20;

    let newItem: Item = {
      id: uid(),
      name: 'Опознание...',
      description: '...',
      rarity: rarity,
      type: itemType,
      itemLevel: itemLevel,
      isEquipped: false,
      damageBonus: 0,
      defenseBonus: 0,
      goldMultiplier: 0,
      imageIndex: Math.floor(Math.random() * 10)
    };

    if (itemType === ItemType.WEAPON) {
        newItem.damageBonus = Math.floor(baseDamage * multiplier);
    } else if (itemType === ItemType.ARMOR) {
        newItem.defenseBonus = Math.floor(baseDefense * multiplier);
    } else if (itemType === ItemType.ACCESSORY) {
        // Accessories scale gold drop
        newItem.goldMultiplier = 0.05 * multiplier; // Common: 5%, Rare: 15%, Epic: 40%, Leg: 100%
    }

    if (rarity === Rarity.LEGENDARY) {
      setStats(prev => ({...prev, totalLegendariesFound: prev.totalLegendariesFound + 1}));
    }

    // Static Name Generation for non-legendary
    if (rarity !== Rarity.LEGENDARY) {
        const names = STATIC_ITEMS[itemType][rarity];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomDesc = STATIC_DESCRIPTIONS[Math.floor(Math.random() * STATIC_DESCRIPTIONS.length)];
        newItem.name = randomName;
        newItem.description = randomDesc;
    }

    playGachaRevealSound(rarity === Rarity.LEGENDARY);
    setPendingItem(newItem);
    setIsGamePaused(true); 
    setGachaProcessing(false);

    // Call Gemini only for Legendary
    if (rarity === Rarity.LEGENDARY) {
        generateItemDetails(stats.level, itemType, rarity).then(details => {
            setPendingItem(prev => prev ? ({ ...prev, ...details }) : null);
        });
    }
  };

  const formatTime = (ms: number) => {
      const s = Math.ceil(ms / 1000);
      const m = Math.floor(s / 60);
      return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const now = Date.now();
  const damageBuffRemaining = Math.max(0, buffs.damageBuffExpiry - now);
  const goldBuffRemaining = Math.max(0, buffs.goldBuffExpiry - now);
  const totalBuffTime = 120000; // Assuming standard 2 min for bar scaling

  const StatRow = ({ label, value, tooltip, icon }: { label: string, value: string, tooltip: string, icon: React.ReactNode }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
      <div className="flex items-center gap-2 relative group cursor-help">
          <div className="text-slate-400">{icon}</div>
          <span className="font-bold text-slate-200 text-xs md:text-sm">{label}</span>
      </div>
      <span className="font-mono text-white text-xs md:text-sm">{value}</span>
    </div>
  );

  // --- COMPONENT SECTIONS ---

  const LeftPanel = () => (
      <div className="bg-slate-800 border-r-4 border-slate-700 p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-6 text-yellow-500 font-bold border-b border-slate-700 pb-2">
              <Crown size={20} />
              <span>ГЕРОЙ</span>
          </div>
          
          <div className="space-y-1 mb-6">
              <StatRow label="Уровень" value={stats.level.toString()} tooltip="" icon={<Crown size={14}/>} />
              <StatRow label="Души" value={`${stats.souls}`} tooltip="" icon={<Ghost size={14}/>} />
              <StatRow label="Золото" value={`${stats.gold}`} tooltip="" icon={<Coins size={14}/>} />
          </div>

          <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold border-b border-slate-700 pb-2">
               <History size={20} />
               <span>СИСТЕМА</span>
          </div>

          <div className="space-y-3">
              <button onClick={() => setShowAchievementsModal(true)} className="w-full bg-slate-700 hover:bg-slate-600 p-2 rounded text-xs text-left flex items-center gap-2 border border-slate-600 shadow-sm transition-transform active:scale-95">
                  <Trophy size={14} className="text-yellow-400"/> Достижения
              </button>
              <button onClick={() => setShowChangelogModal(true)} className="w-full bg-slate-700 hover:bg-slate-600 p-2 rounded text-xs text-left flex items-center gap-2">
                  <List size={14} /> Список Изменений
              </button>
          </div>
      </div>
  );

  const BattleArena = () => (
      <div className="h-full relative flex flex-col items-center p-6 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        
        {/* Active Effects Bar */}
        <div className="w-full max-w-md flex justify-center gap-4 mb-4 z-20 h-8">
            {damageBuffRemaining > 0 && (
                <div className="flex-1 bg-slate-900/80 border border-red-500 rounded p-1 flex items-center gap-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-900/30" style={{ width: `${(damageBuffRemaining / totalBuffTime) * 100}%` }}></div>
                    <Sword size={12} className="text-red-400 relative z-10" />
                    <span className="text-[10px] text-white relative z-10 font-mono flex-1 text-center">{formatTime(damageBuffRemaining)}</span>
                </div>
            )}
            {goldBuffRemaining > 0 && (
                <div className="flex-1 bg-slate-900/80 border border-yellow-500 rounded p-1 flex items-center gap-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-yellow-900/30" style={{ width: `${(goldBuffRemaining / totalBuffTime) * 100}%` }}></div>
                    <Coins size={12} className="text-yellow-400 relative z-10" />
                    <span className="text-[10px] text-white relative z-10 font-mono flex-1 text-center">{formatTime(goldBuffRemaining)}</span>
                </div>
            )}
        </div>

        {/* Boss Timer */}
        {monster.isBoss && (
           <div className="absolute top-20 w-1/2 h-3 bg-slate-800 rounded-full border border-red-900 overflow-hidden shadow-lg z-10">
               <div 
                  className={`h-full bg-yellow-500 transition-all duration-1000 linear ${isGamePaused ? 'opacity-50' : ''}`}
                  style={{ width: `${((monster.timeRemaining || 0) / 30) * 100}%` }}
               />
           </div>
        )}

        {/* Monster */}
        <div className="flex-1 flex flex-col items-center justify-center w-full">
            <div className="text-center mb-4 z-10 select-none">
            {monster.isBoss && <div className="text-red-500 font-bold animate-pulse text-xs tracking-widest mb-1">☠ БОСС ☠</div>}
            <h2 className={`text-2xl font-bold ${monster.isBoss ? 'text-red-400' : 'text-white'} drop-shadow-md`}>
                {monster.name}
            </h2>
            <div className="text-slate-400 text-xs font-mono">Lvl {monster.level}</div>
            </div>

            <div 
                className={`relative group cursor-pointer z-10 touch-manipulation select-none ${isGamePaused ? 'pointer-events-none opacity-80 grayscale' : ''}`} 
                onClick={() => !isGamePaused && dealDamage(stats.clickDamage, true)}
            >
                <div className="absolute -top-4 left-0 w-full h-3 bg-slate-800 border border-slate-600 rounded-full overflow-hidden">
                    <div 
                    className={`h-full transition-all duration-200 ${monster.isBoss ? 'bg-red-600' : 'bg-green-500'}`} 
                    style={{ width: `${(monster.hp / monster.maxHp) * 100}%` }} 
                    />
                </div>
                <div className="absolute -top-4 left-0 w-full text-center text-[8px] font-bold text-white drop-shadow-md leading-3">
                    {monster.hp} / {monster.maxHp}
                </div>

                <div className={`transition-transform duration-75 flex justify-center items-center ${shake === 'hard' ? 'shake-hard' : (shake === 'normal' ? 'shake' : 'group-hover:scale-105 active:scale-95')}`}>
                <PixelMonster 
                    name={monster.name}
                    isBoss={monster.isBoss}
                    className={`w-48 h-48 md:w-64 md:h-64 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] ${monster.isBoss ? 'scale-125' : ''}`}
                />
                </div>
            </div>
        </div>
        
        {/* Floating Texts Container */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {floatingTexts.map(ft => (
            <div 
              key={ft.id} 
              className={`absolute float-text ${ft.color} z-20 whitespace-nowrap ${ft.isCrit ? 'crit-text' : ''}`}
              style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
            >
              {ft.text}
            </div>
          ))}
        </div>
      </div>
  );

  const UpgradesPanel = () => (
    <div className="p-4 bg-slate-900 h-full flex flex-col">
         {/* Gacha Button */}
         <div className="flex gap-2 mb-3">
             <button 
                onClick={() => pullGacha(false)}
                disabled={stats.gold < gachaCost || gachaProcessing}
                className={`flex-1 py-3 px-4 rounded font-bold border-b-4 active:border-b-0 active:translate-y-1 transition-all flex justify-between items-center group relative overflow-hidden ${stats.gold >= gachaCost ? 'bg-purple-600 border-purple-800 hover:bg-purple-500 text-white' : 'bg-slate-700 border-slate-800 text-slate-500 cursor-not-allowed'}`}
             >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_2s_infinite]"></div>
                <div className="flex items-center gap-2 relative z-10">
                    <Sparkles size={20} className={gachaProcessing ? 'animate-spin' : ''} />
                    <span className="text-sm">Призыв</span>
                </div>
                <div className="flex items-center gap-1 bg-black/20 px-3 py-1 rounded relative z-10 text-xs">
                    <Coins size={12} className="text-yellow-400" /> {gachaCost}
                </div>
             </button>
             <button onClick={() => setShowGachaInfoModal(true)} className="px-3 bg-slate-700 border border-slate-600 rounded flex items-center justify-center hover:bg-slate-600">
                 <Info size={16} className="text-slate-300"/>
             </button>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0 space-y-2">
             <button 
                onClick={() => buyUpgrade('click')}
                disabled={stats.gold < costs.click}
                className={`p-3 rounded border-b-4 active:border-b-0 active:translate-y-1 transition-all text-left flex justify-between items-center w-full ${stats.gold >= costs.click ? 'bg-blue-600 border-blue-800 hover:bg-blue-500 text-white' : 'bg-slate-700 border-slate-800 text-slate-500 cursor-not-allowed'}`}
             >
                <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-1 flex items-center gap-1"><Sword size={12}/> Клик +1</div>
                    <div className="text-xs">Урон: {stats.clickDamage}</div>
                </div>
                <div className="flex items-center gap-1 text-xs bg-black/20 px-2 py-1 rounded">
                     <Coins size={12} className="text-yellow-400" /> {costs.click}
                </div>
             </button>

             <button 
                onClick={() => buyUpgrade('auto')}
                disabled={stats.gold < costs.auto}
                className={`p-3 rounded border-b-4 active:border-b-0 active:translate-y-1 transition-all text-left flex justify-between items-center w-full ${stats.gold >= costs.auto ? 'bg-green-600 border-green-800 hover:bg-green-500 text-white' : 'bg-slate-700 border-slate-800 text-slate-500 cursor-not-allowed'}`}
             >
                <div>
                    <div className="text-[10px] font-bold uppercase opacity-80 mb-1 flex items-center gap-1"><Zap size={12}/> Авто +1</div>
                    <div className="text-xs">DPS: {stats.autoDps}</div>
                </div>
                <div className="flex items-center gap-1 text-xs bg-black/20 px-2 py-1 rounded">
                     <Coins size={12} className="text-yellow-400" /> {costs.auto}
                </div>
             </button>

             {/* Loot Box Section */}
             <div className="bg-slate-800 p-2 rounded border border-slate-600 mt-4">
                 <div className="text-[10px] text-yellow-400 font-bold uppercase mb-2 flex justify-between items-center">
                     <span className="flex items-center gap-1"><Box size={12}/> Лутбоксы</span>
                     <span>В наличии: {stats.lootBoxes}</span>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={buyLootBox} disabled={stats.gold < LOOTBOX_COST} className={`flex-1 py-2 text-xs rounded font-bold ${stats.gold >= LOOTBOX_COST ? 'bg-yellow-700 text-yellow-100 hover:bg-yellow-600' : 'bg-slate-700 text-slate-500'}`}>
                         Купить ({LOOTBOX_COST}g)
                     </button>
                     <button onClick={() => setShowLootBoxModal(true)} disabled={stats.lootBoxes <= 0} className={`flex-1 py-2 text-xs rounded font-bold ${stats.lootBoxes > 0 ? 'bg-green-700 text-white hover:bg-green-600' : 'bg-slate-700 text-slate-500'}`}>
                         Открыть
                     </button>
                 </div>
             </div>

             {/* Action Grid (Shop, Prestige) */}
             <div className="grid grid-cols-2 gap-2 mt-2">
                 <button onClick={() => setShowShopModal(true)} className="p-3 bg-slate-800 border border-slate-600 rounded flex flex-col items-center justify-center hover:bg-slate-700">
                      <ShoppingBag size={20} className="text-blue-400 mb-1"/>
                      <span className="text-[10px] font-bold">Магазин</span>
                 </button>
                 <button onClick={() => setShowPrestigeModal(true)} className="p-3 bg-slate-800 border border-slate-600 rounded flex flex-col items-center justify-center hover:bg-slate-700">
                      <Ghost size={20} className="text-purple-400 mb-1"/>
                      <span className="text-[10px] font-bold">Престиж</span>
                 </button>
             </div>
             
             {/* System Grid */}
             <div className="grid grid-cols-3 gap-2 mt-2">
                  <button onClick={handleMuteToggle} className="p-2 bg-slate-800 border border-slate-600 rounded flex items-center justify-center hover:bg-slate-700">
                     {isMuted ? <VolumeX size={16} className="text-red-400" /> : <Volume2 size={16} className="text-green-400" />}
                  </button>
                  <button onClick={() => setShowStatsModal(true)} className="p-2 bg-slate-800 border border-slate-600 rounded flex items-center justify-center hover:bg-slate-700">
                     <Info size={16} className="text-slate-400" />
                  </button>
                   <button onClick={() => setShowMapModal(true)} className="p-2 bg-slate-800 border border-slate-600 rounded flex items-center justify-center hover:bg-slate-700">
                     <MapIcon size={16} className="text-slate-400" />
                  </button>
             </div>
         </div>
    </div>
  );

  const InventoryPanel = () => (
    <div className="flex flex-col h-full bg-slate-800">
        <div className="flex gap-1 p-2 border-b border-slate-700 bg-slate-900">
            <button onClick={() => setInventoryTab('ALL')} className={`flex-1 p-2 rounded text-[10px] md:text-xs font-bold uppercase ${inventoryTab === 'ALL' ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-500'}`}><Grid size={16} className="mx-auto mb-1"/>Все</button>
            <button onClick={() => setInventoryTab(ItemType.WEAPON)} className={`flex-1 p-2 rounded text-[10px] md:text-xs font-bold uppercase ${inventoryTab === ItemType.WEAPON ? 'bg-red-900/50 text-red-200' : 'bg-slate-800 text-slate-500'}`}><Sword size={16} className="mx-auto mb-1"/>Оружие</button>
            <button onClick={() => setInventoryTab(ItemType.ARMOR)} className={`flex-1 p-2 rounded text-[10px] md:text-xs font-bold uppercase ${inventoryTab === ItemType.ARMOR ? 'bg-blue-900/50 text-blue-200' : 'bg-slate-800 text-slate-500'}`}><Shirt size={16} className="mx-auto mb-1"/>Броня</button>
            <button onClick={() => setInventoryTab(ItemType.ACCESSORY)} className={`flex-1 p-2 rounded text-[10px] md:text-xs font-bold uppercase ${inventoryTab === ItemType.ACCESSORY ? 'bg-purple-900/50 text-purple-200' : 'bg-slate-800 text-slate-500'}`}><Sparkles size={16} className="mx-auto mb-1"/>Акс</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-800/50 pb-20 md:pb-0">
             {inventory.length === 0 ? (
                <div className="text-center text-slate-600 text-xs py-8 italic border-2 border-dashed border-slate-700 rounded">
                    Пусто... <br/> Испытай удачу в Ритуале!
                </div>
            ) : (
                <div className="space-y-2">
                    {inventory.filter(item => inventoryTab === 'ALL' || item.type === inventoryTab).map(item => (
                         <InventoryItem key={item.id} item={item} onSell={(i) => setItemToSell(i)} />
                    ))}
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div 
        className="h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row overflow-hidden relative select-none transition-colors duration-1000"
        style={{
             background: currentZone.bgGradient,
             backgroundSize: 'cover',
             backgroundPosition: 'center'
        }}
    >
      
      {/* Event/Story Toast */}
      {eventToast && (
          <div className="fixed top-20 md:top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top fade-in duration-300 w-11/12 md:w-auto pointer-events-none">
             <div className="bg-slate-800/90 backdrop-blur-md border-2 border-yellow-500 text-white px-6 py-4 rounded-lg shadow-2xl">
                 <h3 className="text-yellow-400 font-bold mb-1 flex items-center gap-2"><Sparkles size={16} /> {eventToast.title}</h3>
                 <p className="text-xs md:text-sm">{eventToast.desc}</p>
             </div>
          </div>
      )}

      {/* Achievement Toast */}
      {achievementToast && !eventToast && (
        <div className="fixed top-16 md:top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300 w-11/12 md:w-auto pointer-events-none">
           <div className="bg-yellow-600 text-white px-4 py-2 md:px-6 md:py-3 rounded-full shadow-lg flex items-center justify-center gap-2 border-2 border-yellow-300">
              <Gift size={16} className="text-yellow-200" />
              <span className="font-bold text-xs md:text-sm text-center">{achievementToast}</span>
           </div>
        </div>
      )}

      {/* Auto Save */}
      {autoSaveText && (
         <div className="fixed bottom-20 md:bottom-4 right-4 text-[10px] md:text-xs text-green-400 bg-slate-800 p-2 rounded border border-green-800 z-50 flex items-center gap-2 animate-pulse">
            <Save size={12} /> {autoSaveText}
         </div>
      )}

      {/* --- DESKTOP VIEW STRUCTURE (3-Column) --- */}
      <div className="flex-1 flex flex-col md:flex-row h-full">
          
          {/* COLUMN 1: Left Panel (Desktop Only) */}
          <div className="hidden md:block w-72 h-full z-30 shadow-xl">
             <LeftPanel />
          </div>

          {/* COLUMN 2: Battle Arena (Center) */}
          <div className="h-[40vh] md:h-full md:flex-1 relative border-x border-slate-700 z-10">
             <BattleArena />
          </div>

          {/* COLUMN 3: Right Panel (Desktop) / Bottom Sheet (Mobile) */}
          <div className="h-[60vh] md:h-full md:w-96 bg-slate-800 border-t-4 md:border-t-0 md:border-l-4 border-slate-700 flex flex-col shadow-2xl relative z-30">
              
              {/* Desktop Tabs Header */}
              <div className="hidden md:flex p-4 bg-slate-900 border-b border-slate-700 justify-between items-center">
                   <div>
                       <div className="flex items-center gap-2 font-bold"><span className="bg-blue-600 text-xs px-2 py-1 rounded">LVL {stats.level}</span> <span className="text-xs text-slate-400">{stats.experience}/{stats.maxExperience} XP</span></div>
                   </div>
              </div>

              {/* Mobile Content Switcher */}
              <div className="flex-1 overflow-hidden relative">
                  
                  {/* Mobile View */}
                  <div className="md:hidden h-full">
                      {mobileTab === 'upgrades' && <UpgradesPanel />}
                      {mobileTab === 'inventory' && <InventoryPanel />}
                      {mobileTab === 'info' && (
                          <div className="p-4 overflow-y-auto h-full space-y-4 pb-20">
                             <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => setShowMapModal(true)} className="bg-slate-700 p-3 rounded flex flex-col items-center justify-center gap-2"><MapIcon /> Карта Мира</button>
                                <button onClick={() => openNPCInteraction(NPCId.GUIDE)} className="bg-slate-700 p-3 rounded flex flex-col items-center justify-center gap-2"><Tent /> Лагерь</button>
                                <button onClick={() => setShowChangelogModal(true)} className="bg-slate-700 p-3 rounded flex flex-col items-center justify-center gap-2"><List /> Изменения</button>
                                <button onClick={() => setShowAchievementsModal(true)} className="bg-slate-700 p-3 rounded flex flex-col items-center justify-center gap-2"><Trophy /> Достижения</button>
                             </div>
                             <div className="border-t border-slate-700 pt-4">
                                <h3 className="text-xs uppercase font-bold text-slate-500 mb-2">Прогресс</h3>
                                <StatRow label="Уровень" value={stats.level.toString()} tooltip="" icon={<Crown size={14}/>} />
                                <StatRow label="Клик" value={(stats.clickDamage * activeEffects.damageMult).toFixed(0)} tooltip="" icon={<Sword size={14}/>} />
                                <StatRow label="DPS" value={(stats.autoDps * activeEffects.damageMult).toFixed(0)} tooltip="" icon={<Zap size={14}/>} />
                             </div>
                          </div>
                      )}
                      {mobileTab === 'shop' && (
                         <div className="p-4 h-full flex items-center justify-center pb-20">
                             <button onClick={() => setShowShopModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded font-bold flex items-center gap-2 shadow-lg animate-bounce">
                                <ShoppingBag /> Открыть Магазин
                             </button>
                         </div>
                      )}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:flex flex-col h-full">
                       <div className="h-1/2 overflow-y-auto border-b border-slate-700">
                          <InventoryPanel />
                       </div>
                       <div className="h-1/2 overflow-y-auto">
                          <UpgradesPanel />
                       </div>
                  </div>
              </div>

              {/* Mobile Bottom Navigation */}
              <div className="md:hidden h-16 bg-slate-900 border-t border-slate-700 flex justify-around items-center px-2 flex-shrink-0 z-50">
                  <button onClick={() => setMobileTab('upgrades')} className={`flex flex-col items-center gap-1 p-2 rounded w-16 ${mobileTab === 'upgrades' ? 'text-yellow-400' : 'text-slate-500'}`}>
                      <ArrowUpCircle size={20} />
                      <span className="text-[10px] font-bold">Апгрейд</span>
                  </button>
                  <button onClick={() => setMobileTab('inventory')} className={`flex flex-col items-center gap-1 p-2 rounded w-16 ${mobileTab === 'inventory' ? 'text-blue-400' : 'text-slate-500'}`}>
                      <ShoppingBag size={20} />
                      <span className="text-[10px] font-bold">Лут</span>
                  </button>
                  <button onClick={() => setMobileTab('info')} className={`flex flex-col items-center gap-1 p-2 rounded w-16 ${mobileTab === 'info' ? 'text-green-400' : 'text-slate-500'}`}>
                      <Menu size={20} />
                      <span className="text-[10px] font-bold">Меню</span>
                  </button>
              </div>
          </div>
      </div>

      {/* --- MODALS --- */}

      {/* Loot Box Roulette Modal */}
      {showLootBoxModal && (
          <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-4">
               <div className="bg-slate-800 border-4 border-yellow-500 rounded-lg max-w-sm w-full p-6 text-center relative overflow-hidden">
                   <button onClick={() => setShowLootBoxModal(false)} disabled={isLootBoxSpinning} className="absolute top-2 right-2 text-slate-500 hover:text-white"><X/></button>
                   <h2 className="text-xl font-bold mb-4 text-yellow-400 uppercase tracking-widest">Лутбокс</h2>
                   
                   {!lootBoxSummary && (
                       <div className="w-32 h-32 bg-slate-900 border-4 border-slate-700 rounded-full mx-auto mb-6 flex items-center justify-center relative shadow-[inset_0_0_20px_black]">
                           {isLootBoxSpinning ? (
                               <div className="animate-spin text-4xl">🎲</div> 
                           ) : (
                               <Box size={48} className="text-yellow-600 animate-pulse" />
                           )}
                           {lootBoxReward && !isLootBoxSpinning && (
                               <div className="absolute inset-0 bg-slate-800 flex items-center justify-center rounded-full border-4 border-green-500 animate-in zoom-in">
                                   <span className="font-bold text-sm text-green-400 px-2">{lootBoxReward}</span>
                               </div>
                           )}
                       </div>
                   )}

                   {/* Mass Loot Summary */}
                   {lootBoxSummary && (
                       <div className="mb-4 bg-slate-900 p-2 rounded max-h-40 overflow-y-auto text-left space-y-1 text-xs custom-scrollbar">
                           {lootBoxSummary.map((res, i) => (
                               <div key={i} className="text-green-400 border-b border-slate-800 pb-1">{res}</div>
                           ))}
                       </div>
                   )}

                   {!lootBoxReward && !isLootBoxSpinning && !lootBoxSummary && (
                       <div className="space-y-2">
                           <button onClick={spinLootBox} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded uppercase text-lg shadow-lg">
                               Открыть 1
                           </button>
                           {stats.lootBoxes >= 10 && (
                               <button onClick={openMassLootBoxes} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded uppercase text-xs">
                                   Открыть 10 (Массово)
                               </button>
                           )}
                       </div>
                   )}
                   
                   {(lootBoxReward || lootBoxSummary) && (
                        <button onClick={() => { setLootBoxReward(null); setLootBoxSummary(null); setShowLootBoxModal(false); }} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 rounded uppercase">
                           Закрыть
                        </button>
                   )}
               </div>
          </div>
      )}

      {/* NPC Modal */}
      {showNPCModal && activeNPC && (
           <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4">
               <div className="bg-slate-800 border-4 border-slate-500 rounded-lg max-w-lg w-full p-6 relative">
                   <h2 className="text-xl text-white font-bold mb-1">{activeNPC.name}</h2>
                   <div className="text-xs text-slate-400 mb-6 uppercase tracking-widest">{activeNPC.title}</div>
                   
                   <div className="bg-slate-900/50 p-4 rounded border border-slate-700 mb-6 min-h-[100px] text-sm italic text-slate-300">
                       "{activeNPC.dialogues[npcDialogId]?.text}"
                   </div>
                   
                   <div className="space-y-2">
                       {activeNPC.dialogues[npcDialogId]?.options.map((opt, idx) => (
                           <button key={idx} onClick={() => handleNPCAction(opt)} className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded text-left px-4 border border-slate-600 hover:border-slate-400 transition-colors">
                               {opt.text}
                           </button>
                       ))}
                   </div>
               </div>
           </div>
      )}

      {/* Gacha Info Modal */}
      {showGachaInfoModal && (
          <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-2 border-purple-500 rounded-lg max-w-sm w-full p-6 relative">
                  <button onClick={() => setShowGachaInfoModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X/></button>
                  <h2 className="text-lg font-bold mb-4 text-purple-400 flex items-center gap-2"><Info /> Шансы Призыва</h2>
                  <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span className="text-slate-400">Обычное</span>
                          <span className="text-white font-mono">{(BASE_DROP_RATES.COMMON * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span className="text-blue-400">Редкое</span>
                          <span className="text-white font-mono">{(BASE_DROP_RATES.RARE * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span className="text-purple-400">Эпическое</span>
                          <span className="text-white font-mono">{(BASE_DROP_RATES.EPIC * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-700 pb-1">
                          <span className="text-yellow-400 font-bold animate-pulse">Легендарное</span>
                          <span className="text-white font-mono">{(BASE_DROP_RATES.LEGENDARY * 100).toFixed(0)}%</span>
                      </div>
                  </div>
                  <div className="mt-4 p-3 bg-slate-900 rounded text-xs text-slate-400 italic">
                      "Только Легендарные предметы создаются древней магией ИИ..."
                  </div>
              </div>
          </div>
      )}

      {/* Sell Confirmation Modal */}
      {itemToSell && (
          <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-2 border-red-500 rounded-lg max-w-sm w-full p-6 text-center">
                   <h2 className="text-xl font-bold mb-4 text-white">Продать предмет?</h2>
                   <div className="mb-4 bg-slate-900 p-4 rounded border border-slate-700">
                       <InventoryItem item={itemToSell} onSell={() => {}} />
                   </div>
                   <p className="text-slate-300 text-sm mb-6">Вы получите: <span className="text-yellow-400 font-bold">{calculateSellPrice(itemToSell)} G</span></p>
                   <div className="grid grid-cols-2 gap-4">
                       <button onClick={() => setItemToSell(null)} className="bg-slate-600 text-white py-2 rounded">Отмена</button>
                       <button onClick={confirmSellItem} className="bg-red-600 text-white py-2 rounded font-bold">Продать</button>
                   </div>
              </div>
          </div>
      )}
      
      {/* Offline Progress Modal */}
      {showOfflineProgressModal !== null && (
          <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
              <div className="bg-slate-800 border-2 border-yellow-500 rounded-lg max-w-sm w-full p-6 text-center">
                  <h2 className="text-2xl text-yellow-400 font-bold mb-2">С возвращением!</h2>
                  <p className="text-slate-300 mb-4 text-sm">Пока вас не было, ваши герои заработали:</p>
                  <div className="text-3xl text-white font-bold mb-6 flex justify-center items-center gap-2">
                      <Coins className="text-yellow-400"/> {showOfflineProgressModal}
                  </div>
                  <button onClick={() => setShowOfflineProgressModal(null)} className="bg-yellow-600 text-white w-full py-2 rounded font-bold">Забрать</button>
              </div>
          </div>
      )}

      {/* Changelog Modal */}
      {showChangelogModal && (
          <div className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-4">
               <div className="bg-slate-800 border-2 border-slate-500 rounded-lg max-w-md w-full p-6 relative">
                  <button onClick={() => setShowChangelogModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X/></button>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><List /> История Обновлений</h2>
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {CHANGELOG.slice().reverse().map((log, i) => (
                          <div key={i} className="border-b border-slate-700 pb-2">
                              <div className="font-bold text-blue-400 text-sm">v{log.version}</div>
                              <div className="text-slate-300 text-xs">{log.text}</div>
                          </div>
                      ))}
                  </div>
               </div>
          </div>
      )}

      {/* Pending Item Modal */}
      {pendingItem && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-800 border-4 border-yellow-500 rounded-lg max-w-2xl w-full p-6 relative shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                  <h2 className="text-xl md:text-2xl text-yellow-400 font-bold mb-4 md:mb-6 text-center uppercase tracking-widest drop-shadow-md">
                      Ритуал Завершен!
                  </h2>
                  <div className="flex flex-col md:flex-row gap-4 items-stretch mb-6">
                      {/* Old Item */}
                      {inventory.find(i => i.type === pendingItem.type) ? (
                          <div className="flex-1 bg-slate-900/50 p-4 rounded border border-slate-700 opacity-70">
                              <div className="text-xs text-slate-400 uppercase font-bold mb-2">Текущий Предмет</div>
                              <InventoryItem item={inventory.find(i => i.type === pendingItem.type)!} onSell={() => {}} />
                              <div className="text-center text-green-400 text-xs mt-2">
                                  Цена продажи: {calculateSellPrice(inventory.find(i => i.type === pendingItem.type)!)} G
                              </div>
                          </div>
                      ) : (
                          <div className="flex-1 bg-slate-900/50 p-4 rounded border border-slate-700 flex items-center justify-center text-slate-500 italic text-xs">
                              Слот пуст
                          </div>
                      )}
                      
                      <div className="flex items-center justify-center py-2 md:py-0">
                          <ArrowRight size={24} className="text-yellow-500 rotate-90 md:rotate-0" />
                      </div>

                      {/* New Item */}
                      <div className="flex-1 bg-yellow-900/20 p-4 rounded border border-yellow-500 relative">
                          <div className="absolute -top-3 right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded animate-bounce">НОВОЕ!</div>
                          <div className="text-xs text-yellow-200 uppercase font-bold mb-2">Найдено</div>
                          <InventoryItem item={pendingItem} isNew={true} onSell={() => {}} />
                           <div className="text-center text-green-400 text-xs mt-2">
                                  Цена продажи: {calculateSellPrice(pendingItem)} G
                           </div>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => resolvePendingItem('keep_old')} className="bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 rounded font-bold flex items-center justify-center gap-2 transition-colors text-xs md:text-sm">
                          <Trash2 size={16} /> {inventory.find(i => i.type === pendingItem.type) ? "Оставить Старое" : "Продать Новое"}
                      </button>
                      <button onClick={() => resolvePendingItem('equip_new')} className="bg-green-600 hover:bg-green-500 text-white py-3 rounded font-bold flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-lg border-b-4 border-green-800 text-xs md:text-sm">
                          <CheckCircle size={16} /> {inventory.find(i => i.type === pendingItem.type) ? "Заменить" : "Забрать"}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Tutorial Modal */}
      {showTutorial && (
          <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4">
              <div className="bg-slate-800 border-4 border-blue-500 rounded-lg max-w-md w-full p-6 relative shadow-2xl text-center">
                  {tutorialStep === 1 && (
                      <>
                          <h2 className="text-2xl font-bold mb-4 text-yellow-400">Привет, Искатель!</h2>
                          <p className="mb-6 text-sm">Добро пожаловать в Pixel Loot Lord.</p>
                          <button onClick={() => setTutorialStep(2)} className="bg-blue-600 text-white py-2 px-6 rounded font-bold w-full">Далее</button>
                      </>
                  )}
                  {tutorialStep === 2 && (
                      <>
                          <h2 className="text-2xl font-bold mb-4 text-red-400">Сражайся!</h2>
                          <p className="mb-6 text-sm">Кликай по монстру сверху, чтобы нанести урон и получить Золото.</p>
                          <button onClick={() => setTutorialStep(3)} className="bg-blue-600 text-white py-2 px-6 rounded font-bold w-full">Далее</button>
                      </>
                  )}
                   {tutorialStep === 3 && (
                      <>
                          <h2 className="text-2xl font-bold mb-4 text-green-400">Качайся!</h2>
                          <p className="mb-6 text-sm">Используй меню внизу (или справа), чтобы улучшать урон и открывать экипировку.</p>
                          <button onClick={completeTutorial} className="bg-green-600 text-white py-2 px-6 rounded font-bold w-full">В БОЙ!</button>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Story / Zone Modal */}
      {showStoryModal && (
           <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-500">
               <div className="max-w-xl w-full text-center relative">
                   <div className="mb-2 text-yellow-400 text-xs tracking-widest uppercase font-bold">Новая Локация</div>
                   <h1 className={`text-3xl md:text-5xl font-bold mb-6 ${currentZone.textColor}`}>{currentZone.name}</h1>
                   <div className="bg-slate-800/80 p-6 rounded-lg border border-slate-600 shadow-2xl backdrop-blur-sm">
                       <p className="text-sm md:text-lg italic text-slate-300 mb-6">"{currentZone.description}"</p>
                       <div className="space-y-3">
                           {currentZone.choices?.map((choice, idx) => (
                               <button key={idx} onClick={() => handleStoryChoice(choice)} className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-500 p-3 rounded text-left flex justify-between items-center group">
                                   <span className="font-bold text-white text-sm group-hover:text-yellow-300">{choice.text}</span>
                               </button>
                           ))}
                       </div>
                   </div>
               </div>
           </div>
      )}

      {/* Map Modal */}
      {showMapModal && (
           <div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4">
               <div className="max-w-3xl w-full relative bg-slate-900 border-4 border-slate-600 rounded-lg p-6 shadow-2xl h-[80vh] flex flex-col">
                   <button onClick={() => setShowMapModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={24}/></button>
                   <h2 className="text-2xl text-white font-bold mb-6 flex items-center gap-2"><MapIcon /> КАРТА</h2>
                   <div className="mb-4">
                        <button onClick={() => { setShowMapModal(false); openNPCInteraction(NPCId.GUIDE); }} className="w-full bg-slate-800 border-2 border-yellow-600 p-3 rounded flex items-center justify-center gap-2 hover:bg-slate-700">
                             <Tent className="text-yellow-500"/> Посетить Лагерь (Безопасная Зона)
                        </button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                       {ZONES.map((zone) => {
                           const isCurrent = currentZone.id === zone.id;
                           const isLocked = stats.level < zone.minLevel;
                           return (
                               <div key={zone.id} className={`p-4 rounded border-2 transition-all ${isCurrent ? 'bg-slate-800 border-yellow-500' : (isLocked ? 'bg-black/50 border-slate-800 opacity-60' : 'bg-slate-800 border-green-800')}`}>
                                   <h3 className={`font-bold ${isCurrent ? 'text-yellow-400' : 'text-slate-200'}`}>{zone.name}</h3>
                                   <p className="text-xs text-slate-400">{zone.minLevel}-{zone.maxLevel}</p>
                                   {isCurrent && <span className="text-xs text-yellow-500 font-bold">ВЫ ЗДЕСЬ</span>}
                               </div>
                           );
                       })}
                   </div>
               </div>
           </div>
      )}

      {/* Boss Intro Modal */}
      {showBossIntro && monster.isBoss && (
          <div className="fixed inset-0 z-[80] bg-red-900/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-slate-900 border-4 border-red-600 rounded-xl max-w-lg w-full p-8 text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] relative">
                  <div className="text-red-500 font-bold tracking-[0.5em] text-xs mb-4 animate-pulse">ОПАСНОСТЬ</div>
                  <h2 className="text-3xl text-white font-bold mb-2 uppercase">{monster.name}</h2>
                  <div className="my-6 flex justify-center"><PixelMonster name={monster.name} isBoss={true} className="w-32 h-32 scale-[1.5]" /></div>
                  <div className="bg-black/40 p-4 rounded border border-red-900/50 mb-6 text-left text-xs text-slate-300">
                      "{BOSS_INFO[monster.name]?.lore || 'Зло приближается...'}"
                  </div>
                  <button onClick={startBossFight} className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded font-bold text-lg uppercase shadow-lg border-b-4 border-red-800">В БОЙ!</button>
              </div>
          </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-800 border-4 border-slate-600 rounded-lg max-w-md w-full p-6 relative shadow-2xl max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setShowStatsModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X/></button>
                  <h2 className="text-xl text-white font-bold mb-4 flex items-center gap-2">СТАТИСТИКА</h2>
                  <div className="space-y-1 text-xs md:text-sm">
                      <StatRow label="Уровень" value={stats.level.toString()} tooltip="" icon={<Crown size={14}/>} />
                      <StatRow label="Клик" value={(stats.clickDamage * activeEffects.damageMult).toFixed(0)} tooltip="" icon={<Sword size={14}/>} />
                      <StatRow label="DPS" value={(stats.autoDps * activeEffects.damageMult).toFixed(0)} tooltip="" icon={<Zap size={14}/>} />
                      <StatRow label="Крит" value={`${(stats.critChance*100).toFixed(1)}%`} tooltip="" icon={<Sparkles size={14}/>} />
                      <StatRow label="Души" value={`${stats.souls}`} tooltip="" icon={<Ghost size={14}/>} />
                      <StatRow label="Всего Золота" value={`${stats.totalGoldCollected}`} tooltip="" icon={<Coins size={14}/>} />
                      <StatRow label="Убито" value={`${stats.totalMonstersKilled}`} tooltip="" icon={<Skull size={14}/>} />
                      <StatRow label="Легендарки" value={`${stats.totalLegendariesFound}`} tooltip="" icon={<Trophy size={14}/>} />
                      <StatRow label="Лутбоксы" value={`${stats.lootBoxes}`} tooltip="" icon={<Box size={14}/>} />
                  </div>
              </div>
          </div>
      )}

      {/* Shop Modal */}
      {showShopModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-slate-800 border-4 border-blue-500 rounded-lg max-w-2xl w-full p-4 md:p-6 relative max-h-[85vh] flex flex-col shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                <button onClick={() => setShowShopModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X/></button>
                <h2 className="text-xl text-blue-400 font-bold mb-4 flex items-center gap-2"><ShoppingBag /> МАГАЗИН</h2>
                <div className="text-yellow-400 font-mono mb-2 text-right text-xs">Золото: {stats.gold} G</div>
                <div className="flex border-b border-slate-600 mb-4">
                    <button onClick={() => setShopTab('game')} className={`px-4 py-2 text-xs md:text-sm font-bold ${shopTab === 'game' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}>Предметы</button>
                    <button onClick={() => setShopTab('05ru')} className={`px-4 py-2 text-xs md:text-sm font-bold flex items-center gap-2 ${shopTab === '05ru' ? 'text-orange-400 border-b-2 border-orange-400' : 'text-slate-400'}`}>05.ru</button>
                </div>
                <div className="overflow-y-auto flex-1 space-y-3 custom-scrollbar pr-1">
                    {SHOP_ITEMS.filter(item => item.category === shopTab).map(item => {
                        const cost = getShopItemCost(item.id);
                        const currency = item.currency || 'gold';
                        const canAfford = currency === 'gold' ? stats.gold >= cost : stats.souls >= cost;
                        return (
                            <div key={item.id} className="bg-slate-900/50 p-2 md:p-3 rounded border border-slate-700 flex justify-between items-center">
                                <div className="flex gap-3 items-center">
                                    <div className={`p-2 rounded-full ${item.category === '05ru' ? 'bg-orange-900 text-orange-400' : 'bg-blue-900 text-blue-400'}`}>
                                        {item.id === 'mystery_box' ? <Box size={16} className="text-purple-400"/> : (item.category === '05ru' ? <Gift size={16}/> : <Zap size={16}/>)}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white text-xs md:text-sm">{item.name}</div>
                                        <div className="text-[10px] text-slate-400 leading-tight">{item.description}</div>
                                    </div>
                                </div>
                                <button onClick={() => buyShopItem(item.id)} disabled={!canAfford} className={`px-3 py-1 md:px-4 md:py-2 rounded font-bold text-[10px] md:text-xs flex items-center gap-1 ${canAfford ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                                    {cost} {currency === 'gold' ? 'G' : <Ghost size={10} />}
                                </button>
                            </div>
                        );
                    })}
                </div>
              </div>
          </div>
      )}

      {/* Prestige Modal */}
      {showPrestigeModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-800 border-4 border-purple-500 rounded-lg max-w-lg w-full p-6 relative">
                <button onClick={() => setShowPrestigeModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X/></button>
                <h2 className="text-2xl text-purple-400 font-bold mb-4 flex items-center gap-2"><Ghost /> АЛТАРЬ ДУШ</h2>
                <div className="flex justify-between items-center mb-6 bg-slate-900 p-4 rounded border border-slate-700">
                    <div>
                        <div className="text-slate-400 text-xs">Ваши Души</div>
                        <div className="text-2xl font-bold text-purple-300 flex items-center gap-2"><Ghost size={20} /> {stats.souls}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-slate-400 text-xs">Душ при сбросе</div>
                        <div className="text-xl font-bold text-green-400">+{calculatePotentialSouls()}</div>
                    </div>
                </div>
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded">
                        <div><div className="font-bold text-sm">Урон</div><div className="text-[10px] text-slate-400">x{stats.prestigeDamageMult.toFixed(1)}</div></div>
                        <button onClick={() => buyPrestigeUpgrade('dmg')} disabled={stats.souls < 10} className={`px-3 py-1 rounded text-xs font-bold ${stats.souls >= 10 ? 'bg-purple-600' : 'bg-slate-600 opacity-50'}`}>10 Souls</button>
                    </div>
                    <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded">
                        <div><div className="font-bold text-sm">Золото</div><div className="text-[10px] text-slate-400">x{stats.prestigeGoldMult.toFixed(1)}</div></div>
                        <button onClick={() => buyPrestigeUpgrade('gold')} disabled={stats.souls < 10} className={`px-3 py-1 rounded text-xs font-bold ${stats.souls >= 10 ? 'bg-purple-600' : 'bg-slate-600 opacity-50'}`}>10 Souls</button>
                    </div>
                </div>
                <button onClick={performPrestige} disabled={calculatePotentialSouls() === 0} className={`w-full py-3 rounded font-bold text-lg border-2 flex items-center justify-center gap-2 transition-all ${calculatePotentialSouls() > 0 ? 'bg-red-900 border-red-500 hover:bg-red-800 text-white' : 'bg-slate-700 border-slate-600 text-slate-500'}`}>
                    <Repeat /> ПЕРЕРОДИТЬСЯ
                </button>
            </div>
        </div>
      )}

      {/* Achievements Modal */}
      {showAchievementsModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
             <div className="bg-slate-800 border-4 border-yellow-500 rounded-lg max-w-4xl w-full p-6 relative h-[80vh] flex flex-col">
                <button onClick={() => setShowAchievementsModal(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X/></button>
                <h2 className="text-xl text-yellow-400 font-bold mb-4 flex items-center gap-2 flex-shrink-0"><Trophy /> ЗАЛ СЛАВЫ</h2>
                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ACHIEVEMENTS.map(ach => {
                            const unlocked = stats.unlockedAchievements.includes(ach.id);
                            return (
                                <div key={ach.id} className={`p-4 rounded border flex flex-col gap-2 relative overflow-hidden ${unlocked ? 'bg-gradient-to-br from-yellow-900/40 to-slate-900 border-yellow-600/50' : 'bg-slate-900 border-slate-700 opacity-60'}`}>
                                    <div className="flex justify-between items-start z-10">
                                        <div className={`p-2 rounded-full ${unlocked ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-slate-500'}`}>
                                            {unlocked ? <Trophy size={16} /> : <Lock size={16} />}
                                        </div>
                                    </div>
                                    <div className="z-10">
                                        <div className={`font-bold text-sm md:text-lg ${unlocked ? 'text-white' : 'text-slate-400'}`}>{ach.name}</div>
                                        <div className="text-xs text-slate-400 mb-2">{ach.description}</div>
                                        <div className="text-[10px] font-mono bg-black/30 p-2 rounded flex items-center gap-2">
                                            <Gift size={10} className={unlocked ? 'text-green-400' : 'text-slate-600'}/> 
                                            <span className={unlocked ? 'text-green-300' : 'text-slate-500'}>{ach.rewardDescription}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
             </div>
        </div>
      )}

    </div>
  );
}
