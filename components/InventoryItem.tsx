
import React from 'react';
import { Item, Rarity, ItemType } from '../types';
import { RARITY_COLORS, RARITY_LABELS } from '../constants';
import { Sword, Coins, Shield, Sparkles, Shirt } from 'lucide-react';

interface Props {
  item: Item;
  isNew?: boolean;
  onSell: (item: Item) => void;
}

export const InventoryItem: React.FC<Props> = ({ item, isNew, onSell }) => {
  // Enhanced Backgrounds based on rarity
  let bgClass = 'bg-slate-800 border-slate-600';
  if (item.rarity === Rarity.COMMON) bgClass = 'bg-slate-800 border-slate-600';
  if (item.rarity === Rarity.RARE) bgClass = 'bg-blue-950/40 border-blue-500/50';
  if (item.rarity === Rarity.EPIC) bgClass = 'bg-purple-950/40 border-purple-500/50';
  if (item.rarity === Rarity.LEGENDARY) bgClass = 'bg-yellow-950/40 border-yellow-500/50';

  // Enhanced animation: Pop-In + Glow Pulse + Z-index boost
  const animationClasses = isNew ? 'pop-in highlight-pulse z-10 ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : '';

  // Default to Weapon if type is undefined (migration for old saves)
  const type = item.type !== undefined ? item.type : ItemType.WEAPON; 
  
  let TypeIcon = Sword;
  if (type === ItemType.ACCESSORY) TypeIcon = Sparkles;
  if (type === ItemType.ARMOR) TypeIcon = Shirt;

  const textColor = RARITY_COLORS[item.rarity];

  return (
    <div className={`relative p-2 border-2 ${item.isEquipped ? 'border-green-500 bg-green-900/20' : bgClass} rounded-sm mb-2 flex flex-col gap-1 text-xs transition-all hover:scale-[1.02] ${animationClasses}`}>
      {isNew && (
        <span className="absolute -top-3 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 animate-bounce rounded-full shadow-lg z-20 border border-white">
          НОВОЕ!
        </span>
      )}
      
      {item.isEquipped && (
         <div className="absolute top-0 right-0 p-1 bg-green-600 text-white rounded-bl-lg z-10 shadow-sm">
            <div className="w-3 h-3 border-r-2 border-b-2 border-white rotate-45 transform -translate-y-[2px]"></div>
         </div>
      )}

      <div className="flex justify-between items-start pr-6">
        <div className="flex items-center gap-2">
            <TypeIcon size={14} className="opacity-50" />
            <span className={`font-bold ${textColor} ${item.rarity === Rarity.LEGENDARY ? 'animate-pulse drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]' : ''}`}>{item.name}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
         <span className={`text-[9px] uppercase border px-1 rounded ${textColor.replace('text-', 'border-')} opacity-80`}>
             {RARITY_LABELS[item.rarity]}
         </span>
         <span className="text-[10px] font-mono bg-slate-900 px-1 rounded text-slate-300 border border-slate-700">
            LVL {item.itemLevel || 1}
         </span>
      </div>

      <div className="text-slate-400 italic text-[10px] leading-tight my-1">
        "{item.description}"
      </div>
      
      <div className="flex justify-between items-end mt-1">
          <div className="flex gap-2 flex-wrap">
            {item.damageBonus > 0 && (
              <div className="flex items-center gap-1 text-red-300 bg-red-900/20 px-1 rounded" title="Урон">
                <Sword size={10} /> +{item.damageBonus}
              </div>
            )}
            {item.defenseBonus !== undefined && item.defenseBonus > 0 && (
              <div className="flex items-center gap-1 text-blue-300 bg-blue-900/20 px-1 rounded" title="Защита (Бонус к клику)">
                <Shield size={10} /> +{item.defenseBonus}
              </div>
            )}
            {item.goldMultiplier > 0 && (
              <div className="flex items-center gap-1 text-yellow-300 bg-yellow-900/20 px-1 rounded" title="Золото">
                <Coins size={10} /> +{(item.goldMultiplier * 100).toFixed(0)}%
              </div>
            )}
          </div>

          <button 
            onClick={(e) => {
                e.stopPropagation();
                onSell(item);
            }}
            className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors flex items-center gap-1 bg-red-900/50 text-red-300 hover:bg-red-800 hover:text-white border border-red-900/50`}
          >
             Продать
          </button>
      </div>
    </div>
  );
};
