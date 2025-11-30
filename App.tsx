
import React, { useState, useEffect, useRef } from 'react';
import { Coins, Sword, Crown, Ghost, Trophy, List, Menu, Box, Tent, History, Info, X, Map as MapIcon, ArrowUpCircle, Volume2, VolumeX, ArrowRight, Grid, ShoppingBag, Zap, Lock, CheckCircle } from 'lucide-react';
import { Item, Rarity, Monster, PlayerStats, FloatingText, ItemType, Buffs, Zone, StoryChoice, NPC, NPCId, DialogOption } from './types';
import { MONSTER_NAMES, BOSS_NAMES, GACHA_COST_BASE, CLICK_UPGRADE_COST_BASE, AUTO_UPGRADE_COST_BASE, ACHIEVEMENTS, SHOP_ITEMS, BASE_CRIT_CHANCE, BASE_CRIT_MULTIPLIER, ZONES, CHANGELOG, RANDOM_EVENTS, STATIC_ITEMS, STATIC_DESCRIPTIONS, LOOTBOX_COST, NPCS, BOSS_INFO, BASE_DROP_RATES, RARITY_COLORS } from './constants';
import { generateItemDetails } from './services/geminiService';
import { InventoryItem } from './components/InventoryItem';
import { PixelMonster } from './components/PixelMonster';
import { playClickSound, playDeathSound, playGoldSound, playUpgradeSound, playGachaPullSound, playGachaRevealSound, playBackgroundMusic, playZoneUnlockTheme, toggleMute } from './services/audioService';

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
  totalLootBoxesOpened: 0,
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

  const [showTutorial, setShowTutorial] = useState(false);

  const [currentZone, setCurrentZone] = useState<Zone>(ZONES[0]);
  const [seenZones, setSeenZones] = useState<string[]>(() => {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
          try { return JSON.parse(saved).seenZones || []; } catch(e) {}
      }
      return [];
  });

  const gachaCost = Math.floor(GACHA_COST_BASE * Math.pow(1.05, stats.level));

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
      // Dummy resume context
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
        const parsed = JSON.parse(saved);
        const lastTime = parsed.timestamp || Date.now();
        const now = Date.now();
        const diffSeconds = Math.floor((now - lastTime) / 1000);

        if (diffSeconds > 60 && stats.autoDps > 0) {
             const earned = Math.floor(stats.autoDps * diffSeconds * 0.5); // 50% efficiency
             if (earned > 0) {
                 setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold + earned, totalGoldCollected: prev.totalGoldCollected + earned }));
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
      setStats((prev: PlayerStats) => ({ ...prev, level: newLevel, experience: 0 }));
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
    
    const baseHp = 15;
    const baseGold = 3;
    
    const hp = Math.floor(baseHp * Math.pow(1.25, level - 1) * (isBoss ? 10 : 1));
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
    setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold - LOOTBOX_COST, lootBoxes: prev.lootBoxes + 1 }));
    playUpgradeSound();
  };

  const spinLootBox = () => {
    if (stats.lootBoxes <= 0 || isLootBoxSpinning) return;
    setStats((prev: PlayerStats) => ({ ...prev, lootBoxes: prev.lootBoxes - 1, totalLootBoxesOpened: (prev.totalLootBoxesOpened || 0) + 1 }));
    setIsLootBoxSpinning(true);
    setLootBoxReward(null);
    playGachaPullSound();
  };

  const openMassLootBoxes = () => {
    const amount = Math.min(10, stats.lootBoxes);
    if (amount <= 0) return;
    
    setStats((prev: PlayerStats) => ({ ...prev, lootBoxes: prev.lootBoxes - amount, totalLootBoxesOpened: (prev.totalLootBoxesOpened || 0) + amount }));
    
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
            pullGacha(true); // Triggers item modal independently
            results.push("ПРЕДМЕТ (В инвентаре)");
        }
    }
    
    if (totalGold > 0) setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold + totalGold }));
    if (totalSouls > 0) setStats((prev: PlayerStats) => ({ ...prev, souls: prev.souls + totalSouls }));
    
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
          setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold + gold }));
          rewardText = `${gold} Золота`;
      } else if (roll < 0.8) {
           const souls = 1;
           setStats((prev: PlayerStats) => ({ ...prev, souls: prev.souls + souls }));
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
             setStats((prev: PlayerStats) => ({...prev, gold: prev.gold + bonus}));
         } else if (event.rewardType === 'buff_damage') {
             setBuffs((prev: Buffs) => ({...prev, damageBuffExpiry: Date.now() + event.value}));
         } else if (event.rewardType === 'gold_flat') {
             setStats((prev: PlayerStats) => ({...prev, gold: prev.gold + event.value}));
         } else if (event.rewardType === 'mystery_box') {
             setStats((prev: PlayerStats) => ({...prev, lootBoxes: prev.lootBoxes + 1}));
             showToast("Найдена Загадочная Коробка!");
         }
    }

    setStats((prev: PlayerStats) => {
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
    
    const wasBoss = deadMonster.isBoss;
    const willLevelUp = (stats.experience + 10) >= stats.maxExperience;
    const nextLevel = (wasBoss || willLevelUp) ? stats.level + 1 : stats.level;
    spawnMonster(nextLevel);
  };

  const buyUpgrade = (type: 'click' | 'auto') => {
    if (type === 'click') {
      if (stats.gold >= costs.click) {
        playUpgradeSound();
        setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold - costs.click, clickDamage: prev.clickDamage + 1 }));
        setCosts(prev => ({ ...prev, click: Math.floor(prev.click * 1.15) }));
      }
    } else {
      if (stats.gold >= costs.auto) {
        playUpgradeSound();
        setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold - costs.auto, autoDps: prev.autoDps + 1 }));
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
              setStats((prev: PlayerStats) => ({...prev, gold: prev.gold + (option.reward!.value || 0)}));
          } else if (option.reward.type === 'buff_dmg') {
              setBuffs((prev: Buffs) => ({...prev, damageBuffExpiry: Date.now() + (option.reward!.value || 0)}));
          }
      }
      
      if (option.action === 'trade') {
          if (option.text.includes('1000g')) {
               if (stats.gold >= 1000) {
                   setStats((prev: PlayerStats) => ({...prev, gold: prev.gold - 1000}));
                   showToast("Приятно иметь с вами дело.");
               } else {
                   showToast("Недостаточно золота.");
                   return; 
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

  const buyShopItem = (itemId: string) => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return;
      const cost = getShopItemCost(item.id);
      const currency = item.currency || 'gold';
      const userBalance = currency === 'gold' ? stats.gold : stats.souls;
      if (userBalance < cost) return;

      playUpgradeSound();
      setStats((prev: PlayerStats) => ({ ...prev, [currency]: userBalance - cost }));

      if (item.category === '05ru') {
          const fakeCode = "05" + Math.random().toString(36).substr(2, 6).toUpperCase();
          showToast(item.type === 'promo_code' ? `Промокод: ${fakeCode}` : `Получено: ${item.name}`);
          return;
      }

      if (item.type.startsWith('consumable')) {
          const now = Date.now();
          if (item.id === 'potion_damage') setBuffs((prev: Buffs) => ({...prev, damageBuffExpiry: Math.max(now, prev.damageBuffExpiry) + (item.duration || 0)}));
          else if (item.id === 'potion_gold') setBuffs((prev: Buffs) => ({...prev, goldBuffExpiry: Math.max(now, prev.goldBuffExpiry) + (item.duration || 0)}));
      } else if (item.type.startsWith('permanent')) {
          if (item.id === 'perm_crit_chance') setStats((prev: PlayerStats) => ({...prev, critChance: prev.critChance + (item.value || 0)}));
          else if (item.id === 'perm_crit_damage') setStats((prev: PlayerStats) => ({...prev, critMultiplier: prev.critMultiplier + (item.value || 0)}));
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
      setStats((prev: PlayerStats) => ({...prev, gold: prev.gold + price}));
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
          setStats((prev: PlayerStats) => ({...prev, gold: prev.gold + price}));
          showToast(`Продано: +${price} G`);
      } else {
          if (currentItem) {
              const price = calculateSellPrice(currentItem);
              setStats((prev: PlayerStats) => ({...prev, gold: prev.gold + price}));
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
    setStats((prev: PlayerStats) => ({
      ...INITIAL_STATS,
      souls: prev.souls + soulsEarned,
      prestigeDamageMult: prev.prestigeDamageMult,
      prestigeGoldMult: prev.prestigeGoldMult,
      totalMonstersKilled: prev.totalMonstersKilled,
      totalGoldCollected: prev.totalGoldCollected,
      totalLegendariesFound: prev.totalLegendariesFound,
      unlockedAchievements: prev.unlockedAchievements,
      critChance: prev.critChance, 
      critMultiplier: prev.critMultiplier,
      totalLootBoxesOpened: prev.totalLootBoxesOpened // Added
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
      setStats((prev: PlayerStats) => ({
          ...prev, souls: prev.souls - cost,
          prestigeDamageMult: type === 'dmg' ? prev.prestigeDamageMult + 0.5 : prev.prestigeDamageMult,
          prestigeGoldMult: type === 'gold' ? prev.prestigeGoldMult + 0.5 : prev.prestigeGoldMult
      }));
  };

  const handleStoryChoice = (choice: StoryChoice) => {
      if (choice.rewardType === 'gold') setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold + choice.rewardValue }));
      else if (choice.rewardType === 'buff_damage') setBuffs((prev: Buffs) => ({ ...prev, damageBuffExpiry: Date.now() + choice.rewardValue }));
      else if (choice.rewardType === 'buff_gold') setBuffs((prev: Buffs) => ({ ...prev, goldBuffExpiry: Date.now() + choice.rewardValue }));
      showToast(choice.outcomeText);
      setShowStoryModal(false);
      setIsGamePaused(false);
      playBackgroundMusic(currentZone.id);
  };

  const pullGacha = async (isFree = false) => {
    if (!isFree && (stats.gold < gachaCost || gachaProcessing)) return;

    if (!isFree) {
        playGachaPullSound();
        setStats((prev: PlayerStats) => ({ ...prev, gold: prev.gold - gachaCost }));
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
        newItem.goldMultiplier = 0.05 * multiplier; 
    }

    if (rarity === Rarity.LEGENDARY) {
      setStats((prev: PlayerStats) => ({...prev, totalLegendariesFound: prev.totalLegendariesFound + 1}));
    }

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
  const totalBuffTime = 120000; 

  const StatRow = ({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
      <div className="flex items-center gap-2 relative group cursor-help">
          <div className="text-slate-400">{icon}</div>
          <span className="font-bold text-slate-200 text-xs md:text-sm">{label}</span>
      </div>
      <span className="font-mono text-white text-xs md:text-sm">{value}</span>
    </div>
  );

  const LeftPanel = () => (
      <div className="bg-slate-800 border-r-4 border-slate-700 p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 mb-6 text-yellow-500 font-bold border-b border-slate-700 pb-2">
              <Crown size={20} />
              <span>ГЕРОЙ</span>
          </div>
          
          <div className="space-y-1 mb-6">
              <StatRow label="Уровень" value={stats.level.toString()} icon={<Crown size={14}/>} />
              <StatRow label="Души" value={`${stats.souls}`} icon={<Ghost size={14}/>} />
              <StatRow label="Золото" value={`${stats.gold}`} icon={<Coins size={14}/>} />
          </div>

          <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold border-b border-slate-700 pb-2">
               <History size={20} />
               <span>СИСТЕМА</span>
          </div>

          <div className="space-y-3">
              <button onClick={() => setShowAchievementsModal(true)} className="w-full bg-slate-700 hover:bg-slate-600 p-2 rounded-sm text-xs text-left flex items-center gap-2 border border-slate-600 shadow-sm transition-transform active:scale-95">
                  <Trophy size={14} className="text-yellow-400"/> Достижения
              </button>
              <button onClick={() => setShowChangelogModal(true)} className="w-full bg-slate-700 hover:bg-slate-600 p-2 rounded-sm text-xs text-left flex items-center gap-2">
                  <List size={14} /> Список Изменений
              </button>
          </div>
      </div>
  );

  const BattleArena = () => (
      <div className="h-full relative flex flex-col items-center p-6 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
        
        <div className="w-full max-w-md flex justify-center gap-4 mb-4 z-20 h-8">
            {damageBuffRemaining > 0 && (
                <div className="flex-1 bg-slate-900/80 border border-red-500 rounded-none p-1 flex items-center gap-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-red-900/30" style={{ width: `${(damageBuffRemaining / totalBuffTime) * 100}%` }}></div>
                    <Sword size={12} className="text-red-400 relative z-10" />
                    <span className="text-[10px] text-white relative z-10 font-mono flex-1 text-center">{formatTime(damageBuffRemaining)}</span>
                </div>
            )}
            {goldBuffRemaining > 0 && (
                <div className="flex-1 bg-slate-900/80 border border-yellow-500 rounded-none p-1 flex items-center gap-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-yellow-900/30" style={{ width: `${(goldBuffRemaining / totalBuffTime) * 100}%` }}></div>
                    <Coins size={12} className="text-yellow-400 relative z-10" />
                    <span className="text-[10px] text-white relative z-10 font-mono flex-1 text-center">{formatTime(goldBuffRemaining)}</span>
                </div>
            )}
        </div>

        {monster.isBoss && (
           <div className="absolute top-20 w-1/2 h-3 bg-slate-800 rounded-none border border-red-900 overflow-hidden shadow-lg z-10">
               <div 
                  className={`h-full bg-yellow-500 transition-all duration-1000 linear ${isGamePaused ? 'opacity-50' : ''}`}
                  style={{ width: `${((monster.timeRemaining || 0) / 30) * 100}%` }}
               />
           </div>
        )}

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
                <div className="absolute -top-4 left-0 w-full h-3 bg-slate-800 border border-slate-600 rounded-none overflow-hidden">
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
        
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {floatingTexts.map(text => (
            <div 
                key={text.id} 
                className={`float-text absolute font-pixel font-bold ${text.color} ${text.isCrit ? 'crit-text' : 'text-sm'}`}
                style={{ left: `${text.x}%`, top: `${text.y}%` }}
            >
                {text.text}
            </div>
          ))}
        </div>
      </div>
  );

  const RightPanel = () => (
      <div className="bg-slate-800 border-l-4 border-slate-700 flex flex-col h-full overflow-hidden">
          <div className="flex border-b border-slate-700 bg-slate-900">
             <button onClick={() => setMobileTab('upgrades')} className={`flex-1 p-3 flex justify-center items-center ${mobileTab === 'upgrades' ? 'bg-slate-800 text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400 hover:text-white'}`}>
                <ArrowUpCircle size={20} />
             </button>
             <button onClick={() => setMobileTab('inventory')} className={`flex-1 p-3 flex justify-center items-center ${mobileTab === 'inventory' ? 'bg-slate-800 text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}>
                <Sword size={20} />
             </button>
             <button onClick={() => setMobileTab('shop')} className={`flex-1 p-3 flex justify-center items-center ${mobileTab === 'shop' ? 'bg-slate-800 text-green-400 border-b-2 border-green-400' : 'text-slate-400 hover:text-white'}`}>
                <ShoppingBag size={20} />
             </button>
             <button onClick={() => setMobileTab('info')} className={`flex-1 p-3 flex justify-center items-center ${mobileTab === 'info' ? 'bg-slate-800 text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-white'}`}>
                <Menu size={20} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {mobileTab === 'upgrades' && (
                  <div className="space-y-4">
                      <div className="bg-slate-700/50 p-3 rounded-sm border border-slate-600">
                          <div className="flex justify-between mb-1">
                              <span className="text-sm font-bold flex items-center gap-2"><Sword size={14}/> Клик</span>
                              <span className="text-xs text-yellow-400">{costs.click} G</span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">Урон: {stats.clickDamage}</div>
                          <button onClick={() => buyUpgrade('click')} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-sm text-xs font-bold shadow active:translate-y-0.5">
                              Улучшить
                          </button>
                      </div>

                      <div className="bg-slate-700/50 p-3 rounded-sm border border-slate-600">
                          <div className="flex justify-between mb-1">
                              <span className="text-sm font-bold flex items-center gap-2"><Zap size={14}/> Авто</span>
                              <span className="text-xs text-yellow-400">{costs.auto} G</span>
                          </div>
                          <div className="text-xs text-slate-400 mb-2">DPS: {stats.autoDps}</div>
                          <button onClick={() => buyUpgrade('auto')} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded-sm text-xs font-bold shadow active:translate-y-0.5">
                              Улучшить
                          </button>
                      </div>

                      <div className="bg-gradient-to-r from-purple-900 to-slate-900 p-3 rounded-sm border border-purple-500/50 mt-6 relative">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-sm font-bold text-purple-200 flex items-center gap-2"><Ghost size={14}/> Призыв</span>
                             <button onClick={() => setShowGachaInfoModal(true)} className="p-1 text-slate-400 hover:text-white"><Info size={12}/></button>
                         </div>
                         <button 
                            disabled={gachaProcessing}
                            onClick={() => pullGacha(false)}
                            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed py-3 rounded-sm text-xs font-bold shadow active:translate-y-0.5 text-white flex justify-center items-center gap-2"
                         >
                            {gachaProcessing ? 'Призыв...' : `Призвать (${gachaCost} G)`}
                         </button>
                      </div>

                      <div className="bg-gradient-to-r from-orange-900 to-slate-900 p-3 rounded-sm border border-orange-500/50 mt-4">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-sm font-bold text-orange-200 flex items-center gap-2"><Box size={14}/> Лутбокс</span>
                             <span className="text-xs text-slate-300">У вас: {stats.lootBoxes}</span>
                         </div>
                         <div className="grid grid-cols-2 gap-2">
                            <button onClick={buyLootBox} className="bg-orange-700 hover:bg-orange-600 py-2 rounded-sm text-[10px] font-bold">Купить ({LOOTBOX_COST}G)</button>
                            <button onClick={() => setShowLootBoxModal(true)} disabled={stats.lootBoxes === 0} className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:opacity-50 py-2 rounded-sm text-[10px] font-bold">Открыть</button>
                         </div>
                      </div>
                  </div>
              )}

              {mobileTab === 'inventory' && (
                  <div>
                      <div className="flex gap-1 mb-2 overflow-x-auto pb-2">
                          {['ALL', ItemType.WEAPON, ItemType.ARMOR, ItemType.ACCESSORY].map(tab => (
                             <button 
                                key={tab}
                                onClick={() => setInventoryTab(tab as ItemType | 'ALL')}
                                className={`px-2 py-1 rounded-sm text-[10px] border ${inventoryTab === tab ? 'bg-slate-600 border-white text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}
                             >
                                {tab === 'ALL' ? 'Все' : (tab === ItemType.WEAPON ? 'Оружие' : (tab === ItemType.ARMOR ? 'Броня' : 'Акс'))}
                             </button>
                          ))}
                      </div>
                      {inventory.filter(i => inventoryTab === 'ALL' || i.type === inventoryTab).length === 0 ? (
                          <div className="text-center text-slate-500 py-8 text-xs">Инвентарь пуст</div>
                      ) : (
                          inventory.filter(i => inventoryTab === 'ALL' || i.type === inventoryTab).map(item => (
                            <InventoryItem 
                                key={item.id} 
                                item={item} 
                                onSell={(item) => setItemToSell(item)}
                            />
                          ))
                      )}
                  </div>
              )}

              {mobileTab === 'shop' && (
                  <div>
                      <div className="flex mb-4 border-b border-slate-600">
                          <button onClick={() => setShopTab('game')} className={`flex-1 py-2 text-xs font-bold ${shopTab === 'game' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-400'}`}>Предметы</button>
                          <button onClick={() => setShopTab('05ru')} className={`flex-1 py-2 text-xs font-bold ${shopTab === '05ru' ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-400'}`}>05.ru</button>
                      </div>
                      <div className="space-y-3">
                          {SHOP_ITEMS.filter(i => i.category === shopTab).map(item => (
                              <div key={item.id} className="bg-slate-700/50 p-2 rounded-sm border border-slate-600 flex justify-between items-center">
                                  <div>
                                      <div className="text-xs font-bold text-white">{item.name}</div>
                                      <div className="text-[10px] text-slate-400">{item.description}</div>
                                  </div>
                                  <button onClick={() => buyShopItem(item.id)} className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded-sm text-[10px] font-bold text-white min-w-[60px]">
                                      {item.cost} {item.currency === 'souls' ? 'Souls' : 'G'}
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              {mobileTab === 'info' && (
                   <div className="grid grid-cols-2 gap-3">
                       <button onClick={() => setShowMapModal(true)} className="bg-slate-700 p-3 rounded-sm flex flex-col items-center gap-2 hover:bg-slate-600">
                           <MapIcon size={24} className="text-blue-400"/>
                           <span className="text-xs">Карта Мира</span>
                       </button>
                       <button onClick={() => openNPCInteraction(NPCId.GUIDE)} className="bg-slate-700 p-3 rounded-sm flex flex-col items-center gap-2 hover:bg-slate-600">
                           <Tent size={24} className="text-green-400"/>
                           <span className="text-xs">Лагерь</span>
                       </button>
                       <button onClick={handleMuteToggle} className="bg-slate-700 p-3 rounded-sm flex flex-col items-center gap-2 hover:bg-slate-600">
                           {isMuted ? <VolumeX size={24} className="text-red-400"/> : <Volume2 size={24} className="text-slate-200"/>}
                           <span className="text-xs">Звук</span>
                       </button>
                       <button onClick={() => setShowPrestigeModal(true)} className="bg-slate-700 p-3 rounded-sm flex flex-col items-center gap-2 hover:bg-slate-600">
                           <Ghost size={24} className="text-purple-400"/>
                           <span className="text-xs">Престиж</span>
                       </button>
                   </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="h-screen bg-slate-900 text-slate-200 font-pixel overflow-hidden flex flex-col md:flex-row">
      {/* --- DESKTOP LAYOUT --- */}
      <div className="hidden md:flex w-full h-full">
         <div className="w-1/4 h-full z-20 shadow-xl">
             <LeftPanel />
         </div>
         <div className="flex-1 h-full z-10">
             <BattleArena />
         </div>
         <div className="w-1/4 h-full z-20 shadow-xl">
             <RightPanel />
         </div>
      </div>

      {/* --- MOBILE LAYOUT --- */}
      <div className="md:hidden flex flex-col w-full h-full">
         <div className="h-[40%]">
             <BattleArena />
         </div>
         <div className="h-[60%] border-t-4 border-slate-700 z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
             <RightPanel />
         </div>
      </div>
      
      {/* --- MODALS --- */}
      
      {/* Toast */}
      {achievementToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-sm shadow-lg z-50 animate-bounce font-bold text-xs text-center border-2 border-white">
          {achievementToast}
        </div>
      )}

      {autoSaveText && (
          <div className="fixed bottom-4 right-4 text-[10px] text-slate-500 opacity-50 flex items-center gap-1">
              <History size={10} /> {autoSaveText}
          </div>
      )}

      {/* New Item Modal */}
      {pendingItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 p-6 rounded-sm border-2 border-yellow-500 max-w-sm w-full mx-4 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-1 ${pendingItem.rarity === Rarity.LEGENDARY ? 'bg-yellow-400 animate-pulse' : 'bg-slate-600'}`}></div>
            <h2 className="text-center text-xl font-bold mb-4 text-yellow-400 drop-shadow-md">
                {pendingItem.rarity === Rarity.LEGENDARY ? 'ЛЕГЕНДАРНАЯ НАХОДКА!' : 'Новый Предмет!'}
            </h2>
            
            <div className="flex justify-center mb-6">
                <div className={`w-24 h-24 flex items-center justify-center rounded-sm border-2 ${pendingItem.rarity === Rarity.LEGENDARY ? 'border-yellow-400 bg-yellow-900/30 animate-pulse' : 'border-slate-500 bg-slate-700'}`}>
                    <Sword size={48} className={pendingItem.rarity === Rarity.LEGENDARY ? 'text-yellow-400' : 'text-slate-300'} />
                </div>
            </div>

            <div className="text-center mb-4">
              <div className="text-lg font-bold text-white mb-1">{pendingItem.name}</div>
              <div className="text-xs text-slate-400 italic mb-2">"{pendingItem.description}"</div>
              <div className="inline-block px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold bg-slate-700 text-slate-300">
                {pendingItem.rarity} | LVL {pendingItem.itemLevel}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-6 bg-slate-900/50 p-3 rounded-sm">
                <div className="text-slate-400">Урон:</div>
                <div className="text-right text-red-400 font-bold">+{pendingItem.damageBonus}</div>
                {pendingItem.defenseBonus ? (
                    <>
                    <div className="text-slate-400">Защита:</div>
                    <div className="text-right text-blue-400 font-bold">+{pendingItem.defenseBonus}</div>
                    </>
                ) : null}
                <div className="text-slate-400">Золото:</div>
                <div className="text-right text-yellow-400 font-bold">+{(pendingItem.goldMultiplier * 100).toFixed(0)}%</div>
            </div>

            <div className="space-y-2">
                <button 
                    onClick={() => resolvePendingItem('equip_new')}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-sm text-sm shadow-lg transform transition hover:scale-105"
                >
                    Экипировать (Продать старое)
                </button>
                <button 
                    onClick={() => resolvePendingItem('keep_old')}
                    className="w-full bg-red-900/50 hover:bg-red-900 text-red-200 font-bold py-2 rounded-sm text-xs"
                >
                    Продать новое
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Prestige Modal */}
      {showPrestigeModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border-2 border-purple-500 p-6 rounded-sm max-w-md w-full relative">
                <button onClick={() => setShowPrestigeModal(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white"><X size={20}/></button>
                <div className="text-center mb-6">
                    <Ghost size={48} className="mx-auto text-purple-500 mb-2"/>
                    <h2 className="text-2xl font-bold text-purple-400">Перерождение</h2>
                    <p className="text-slate-400 text-xs mt-2">Сбросьте прогресс (золото, уровни, предметы), чтобы получить ДУШИ.</p>
                </div>
                
                <div className="bg-slate-800 p-4 rounded-sm mb-6 text-center">
                    <div className="text-slate-400 text-xs">Вы получите:</div>
                    <div className="text-3xl font-bold text-purple-400 my-2">{calculatePotentialSouls()}</div>
                    <div className="text-slate-400 text-xs">Душ</div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button onClick={() => buyPrestigeUpgrade('dmg')} className="bg-slate-800 p-3 rounded-sm border border-slate-700 hover:border-purple-500 text-left">
                        <div className="text-xs text-slate-400 mb-1">Урон +50%</div>
                        <div className="font-bold text-purple-300">10 Душ</div>
                    </button>
                    <button onClick={() => buyPrestigeUpgrade('gold')} className="bg-slate-800 p-3 rounded-sm border border-slate-700 hover:border-purple-500 text-left">
                        <div className="text-xs text-slate-400 mb-1">Золото +50%</div>
                        <div className="font-bold text-purple-300">10 Душ</div>
                    </button>
                </div>

                <button 
                    onClick={performPrestige}
                    disabled={calculatePotentialSouls() === 0}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-sm shadow-lg"
                >
                    СОВЕРШИТЬ РИТУАЛ
                </button>
            </div>
        </div>
      )}

      {/* Sell Confirmation Modal */}
      {itemToSell && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-800 border border-slate-600 p-6 rounded-sm max-w-sm w-full">
                  <h3 className="text-lg font-bold mb-4 text-white">Продать предмет?</h3>
                  <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-sm mb-4">
                      <div className={`w-10 h-10 bg-slate-800 border ${RARITY_COLORS[itemToSell.rarity].replace('text-', 'border-')} rounded-sm flex items-center justify-center`}>
                          <Sword size={20} className={RARITY_COLORS[itemToSell.rarity]} />
                      </div>
                      <div>
                          <div className={`text-sm font-bold ${RARITY_COLORS[itemToSell.rarity]}`}>{itemToSell.name}</div>
                          <div className="text-xs text-yellow-400 font-mono">+{calculateSellPrice(itemToSell)} G</div>
                      </div>
                  </div>
                  <div className="flex gap-3">
                      <button onClick={confirmSellItem} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-sm text-xs">Продать</button>
                      <button onClick={() => setItemToSell(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-sm text-xs">Отмена</button>
                  </div>
              </div>
          </div>
      )}

      {/* Loot Box Roulette Modal */}
      {showLootBoxModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 backdrop-blur-sm p-4">
             <div className="bg-slate-900 border-2 border-orange-500 rounded-sm max-w-md w-full p-6 relative">
                 <button onClick={() => setShowLootBoxModal(false)} className="absolute top-2 right-2 text-slate-500 hover:text-white"><X size={20}/></button>
                 <h2 className="text-center text-xl font-bold text-orange-400 mb-6">Сундук Удачи</h2>
                 
                 <div className="h-32 bg-slate-800 mb-6 rounded-sm flex items-center justify-center relative overflow-hidden border-inner shadow-inner">
                     {isLootBoxSpinning ? (
                         <div className="text-4xl animate-bounce">🎰</div>
                     ) : (
                         <div className="text-center">
                             {lootBoxReward ? (
                                 <div className="text-2xl font-bold text-white animate-pulse">{lootBoxReward}</div>
                             ) : (
                                 <Box size={48} className="text-orange-600 opacity-50"/>
                             )}
                         </div>
                     )}
                 </div>

                 <div className="flex gap-2">
                     <button 
                        onClick={spinLootBox} 
                        disabled={stats.lootBoxes <= 0 || isLootBoxSpinning}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-sm"
                     >
                        Открыть (1)
                     </button>
                     <button 
                        onClick={openMassLootBoxes}
                        disabled={stats.lootBoxes < 2 || isLootBoxSpinning}
                        className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-sm"
                     >
                        Открыть (10)
                     </button>
                 </div>
                 <div className="text-center text-xs text-slate-500 mt-2">Доступно: {stats.lootBoxes}</div>

                 {lootBoxSummary && (
                     <div className="mt-4 max-h-32 overflow-y-auto bg-slate-950 p-2 rounded-sm text-xs text-slate-300">
                         {lootBoxSummary.map((res, idx) => (
                             <div key={idx} className="border-b border-slate-800 py-1 last:border-0">{res}</div>
                         ))}
                     </div>
                 )}
             </div>
          </div>
      )}

      {/* Achievements Modal */}
      {showAchievementsModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-600 p-6 rounded-sm max-w-lg w-full max-h-[80vh] flex flex-col">
                   <div className="flex justify-between items-center mb-4">
                       <h2 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Trophy /> Достижения</h2>
                       <button onClick={() => setShowAchievementsModal(false)}><X className="text-slate-400 hover:text-white"/></button>
                   </div>
                   <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-2">
                       {ACHIEVEMENTS.map(ach => {
                           const isUnlocked = stats.unlockedAchievements.includes(ach.id);
                           return (
                               <div key={ach.id} className={`p-3 rounded-sm border ${isUnlocked ? 'bg-slate-800 border-yellow-600/50' : 'bg-slate-900 border-slate-700 opacity-60'}`}>
                                   <div className="flex items-start gap-2 mb-2">
                                       <div className={`mt-1 ${isUnlocked ? 'text-yellow-400' : 'text-slate-600'}`}>
                                           {isUnlocked ? <Trophy size={16}/> : <Lock size={16}/>}
                                       </div>
                                       <div>
                                           <div className={`text-xs font-bold ${isUnlocked ? 'text-white' : 'text-slate-400'}`}>{ach.name}</div>
                                           <div className="text-[10px] text-slate-500 leading-tight">{ach.description}</div>
                                       </div>
                                   </div>
                                   <div className="text-[10px] font-mono bg-slate-950 p-1 rounded-sm text-center text-slate-300">
                                       Награда: {ach.rewardDescription}
                                   </div>
                               </div>
                           );
                       })}
                   </div>
              </div>
          </div>
      )}

      {/* Map Modal */}
      {showMapModal && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
              <div className="bg-slate-900 w-full max-w-2xl rounded-sm border border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                      <h2 className="text-xl font-bold text-blue-400 flex items-center gap-2"><MapIcon/> Карта Мира</h2>
                      <button onClick={() => setShowMapModal(false)}><X className="text-slate-400 hover:text-white"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]">
                      {ZONES.map((zone, idx) => {
                          const isLocked = stats.level < zone.minLevel;
                          const isCurrent = stats.level >= zone.minLevel && stats.level <= zone.maxLevel;
                          const isPassed = stats.level > zone.maxLevel;
                          
                          return (
                              <div key={zone.id} className={`relative p-4 rounded-sm border-2 transition-all ${isCurrent ? 'bg-slate-800 border-blue-500 scale-105 shadow-xl' : (isLocked ? 'bg-slate-900 border-slate-800 opacity-50 grayscale' : 'bg-slate-800 border-green-900')}`}>
                                  {isLocked && <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><Lock size={32} className="text-slate-500"/></div>}
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className={`font-bold text-lg ${zone.textColor}`}>{zone.name}</h3>
                                      <span className="text-xs font-mono bg-black/30 px-2 py-1 rounded-sm">LVL {zone.minLevel}-{zone.maxLevel}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mb-3">{zone.description}</p>
                                  {isCurrent && <div className="inline-block bg-blue-600 text-white text-[10px] px-2 py-1 rounded-sm font-bold animate-pulse">ТЕКУЩАЯ ЦЕЛЬ</div>}
                                  {isPassed && <div className="inline-block bg-green-900 text-green-300 text-[10px] px-2 py-1 rounded-sm font-bold flex items-center gap-1"><CheckCircle size={10}/> ПРОЙДЕНО</div>}
                              </div>
                          )
                      })}
                  </div>
              </div>
          </div>
      )}

      {/* Story Modal */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-6">
            <div className="max-w-lg w-full text-center">
                <div className="mb-6 text-6xl opacity-20"><MapIcon /></div>
                <h1 className={`text-3xl font-bold mb-4 ${currentZone.textColor}`}>{currentZone.name}</h1>
                <p className="text-slate-300 mb-8 leading-relaxed border-l-4 border-slate-700 pl-4 text-left">{currentZone.description}</p>
                <div className="text-sm font-mono text-yellow-500 mb-8">ЦЕЛЬ: {currentZone.mission}</div>
                
                {currentZone.choices && (
                    <div className="grid gap-3">
                        {currentZone.choices.map((choice, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleStoryChoice(choice)}
                                className="bg-slate-800 hover:bg-slate-700 p-4 rounded-sm border border-slate-600 text-left hover:border-white transition-colors group"
                            >
                                <div className="text-sm font-bold text-white group-hover:text-yellow-300 mb-1">{choice.text}</div>
                                <div className="text-xs text-slate-500">Награда: {choice.rewardType === 'gold' ? 'Золото' : 'Бафф'}</div>
                            </button>
                        ))}
                    </div>
                )}
                {!currentZone.choices && (
                    <button onClick={() => {setShowStoryModal(false); setIsGamePaused(false); playBackgroundMusic(currentZone.id);}} className="bg-white text-black px-8 py-3 rounded-sm font-bold hover:scale-105 transition">НАЧАТЬ ПУТЬ</button>
                )}
            </div>
        </div>
      )}

      {/* NPC Modal */}
      {showNPCModal && activeNPC && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
              <div className="bg-slate-900 w-full md:max-w-2xl h-[50vh] md:h-auto rounded-t-sm md:rounded-sm border-t-2 md:border-2 border-slate-600 flex flex-col overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
                  
                  <div className="flex-1 p-6 flex flex-col">
                       <div className="flex items-center gap-4 mb-6">
                           <div className="w-16 h-16 bg-slate-800 rounded-sm border-2 border-slate-500 flex items-center justify-center">
                               <Tent size={32} className="text-slate-400"/>
                           </div>
                           <div>
                               <h2 className="text-xl font-bold text-white">{activeNPC.name}</h2>
                               <p className="text-xs text-slate-400">{activeNPC.title}</p>
                           </div>
                       </div>

                       <div className="flex-1 bg-slate-800/50 p-4 rounded-sm border border-slate-700 mb-4 overflow-y-auto">
                           <p className="text-sm text-slate-200 leading-relaxed italic">"{activeNPC.dialogues[npcDialogId].text}"</p>
                       </div>

                       <div className="grid gap-2">
                           {activeNPC.dialogues[npcDialogId].options.map((opt, idx) => (
                               <button 
                                  key={idx} 
                                  onClick={() => handleNPCAction(opt)}
                                  className="bg-slate-800 hover:bg-slate-700 p-3 rounded-sm text-left text-sm border border-slate-600 hover:border-white transition-colors flex justify-between items-center"
                               >
                                   <span>{opt.text}</span>
                                   {opt.action === 'trade' && <span className="text-[10px] text-yellow-500 uppercase font-bold">Торговля</span>}
                                   {opt.action === 'exit' && <ArrowRight size={14} className="text-slate-500"/>}
                               </button>
                           ))}
                       </div>
                  </div>
              </div>
          </div>
      )}

      {/* Tutorial */}
      {showTutorial && (
          <div className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-6 text-center">
              <div className="max-w-md w-full">
                  <h1 className="text-3xl font-bold text-yellow-400 mb-4">Pixel Loot Lord</h1>
                  <p className="text-slate-300 mb-8">Добро пожаловать в мир, созданный из пикселей и управляемый ИИ. Твоя задача проста: кликай, убивай, собирай лут.</p>
                  
                  <div className="space-y-4 text-left bg-slate-800 p-6 rounded-sm mb-8 text-sm">
                      <div className="flex gap-3"><Sword className="text-red-400 shrink-0"/> <span>Убивай монстров, чтобы получать Золото.</span></div>
                      <div className="flex gap-3"><Grid className="text-blue-400 shrink-0"/> <span>Покупай улучшения и открывай новые зоны.</span></div>
                      <div className="flex gap-3"><Crown className="text-yellow-400 shrink-0"/> <span>Находи Легендарные предметы, созданные ИИ.</span></div>
                  </div>
                  
                  <button onClick={completeTutorial} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-sm font-bold text-white animate-pulse">НАЧАТЬ ИГРУ</button>
              </div>
          </div>
      )}

      {/* Boss Intro */}
      {showBossIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-in fade-in duration-500">
           <div className="text-center">
               <div className="text-red-600 font-bold text-6xl mb-2 animate-pulse">⚠ БОСС ⚠</div>
               <h2 className="text-4xl text-white font-bold mb-4">{monster.name}</h2>
               {BOSS_INFO[monster.name] && (
                   <div className="max-w-md mx-auto bg-slate-900 border border-red-900 p-4 rounded-sm mb-8">
                       <p className="text-slate-300 italic mb-2">"{BOSS_INFO[monster.name].lore}"</p>
                       <p className="text-red-400 text-xs font-mono uppercase">Слабость: {BOSS_INFO[monster.name].mechanics}</p>
                   </div>
               )}
               <button onClick={startBossFight} className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-sm text-xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.5)]">В БОЙ!</button>
           </div>
        </div>
      )}

    </div>
  );
}