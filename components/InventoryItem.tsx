
import React from 'react';
import { Item, Rarity, ItemType } from '../types';
import { RARITY_COLORS, RARITY_LABELS } from '../constants';
import { Sword, Coins, Shield, Sparkles, User, Check, Shirt, Trash2 } from 'lucide-react';

interface Props {
  item: Item;
  isNew?: boolean;
  onSell: (item: Item) => void;
}

export const InventoryItem: React.FC<Props> = ({ item, isNew, onSell }) => {
  const colorClass = RARITY_COLORS[item.rarity];
  const bgClass = item.rarity === Rarity.LEGENDARY ? 'bg-yellow-900/20' : 'bg-slate-800';

  // Enhanced animation: Pop-In + Glow Pulse + Z-index boost
  const animationClasses = isNew ? 'pop-in highlight-pulse z-10 ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : '';

  // Default to Weapon if type is undefined (migration for old saves)
  const type = item.type !== undefined ? item.type : ItemType.WEAPON; 
  
  let TypeIcon = Sword;
  if (type === ItemType.ACCESSORY) TypeIcon = Sparkles;
  if (type === ItemType.ARMOR) TypeIcon = Shirt;

  const typeLabel = type === ItemType.WEAPON ? 'Оружие' : (type === ItemType.ACCESSORY ? 'Аксессуар' : 'Броня');

  return (
    <div className={`relative p-2 border-2 ${item.isEquipped ? 'border-green-500 bg-green-900/20' : colorClass} ${bgClass} rounded-sm mb-2 flex flex-col gap-1 text-xs transition-all hover:scale-[1.02] ${animationClasses}`}>
      {isNew && (
        <span className="absolute -top-3 -right-2 bg-gradient-to-r from-red-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 animate-bounce rounded-full shadow-lg z-20 border border-white">
          НОВОЕ!
        </span>
      )}
      
      {item.isEquipped && (
         <div className="absolute top-0 right-0 p-1 bg-green-600 text-white rounded-bl-lg z-10 shadow-sm">
            <Check size={12} />
         </div>
      )}

      <div className="flex justify-between items-start pr-4">
        <div className="flex items-center gap-2">
            <TypeIcon size={14} className="opacity-50" />
            <span className={`font-bold ${item.rarity === Rarity.LEGENDARY ? 'animate-pulse text-yellow-300 drop-shadow-[0_0_5px_rgba(234,179,8,0.8)]' : ''}`}>{item.name}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-center">
         <span className="text-[9px] opacity-70 uppercase border border-slate-600 px-1 rounded">{RARITY_LABELS[item.rarity]} | {typeLabel}</span>
      </div>

      <div className="text-slate-400 italic text-[10px] leading-tight my-1">
        "{item.description}"
      </div>
      
      <div className="flex justify-between items-end mt-1">
          <div className="flex gap-2 flex-wrap">
            {item.damageBonus > 0 && (
              <div className="flex items-center gap-1 text-red-300" title="Урон">
                <Sword size={10} /> +{item.damageBonus}
              </div>
            )}
            {item.defenseBonus !== undefined && item.defenseBonus > 0 && (
              <div className="flex items-center gap-1 text-blue-300" title="Защита (Бонус к клику)">
                <Shield size={10} /> +{item.defenseBonus}
              </div>
            )}
            {item.goldMultiplier > 0 && (
              <div className="flex items-center gap-1 text-yellow-300" title="Золото">
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
