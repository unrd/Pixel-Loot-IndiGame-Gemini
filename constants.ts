
import { Rarity, Achievement, ShopItem, Zone, ItemType, NPC, NPCId } from './types';

export const MONSTER_NAMES = [
  "Слизень", "Крыса", "Гоблин", "Скелет", "Орк", "Призрак", 
  "Тролль", "Голем", "Виверна", "Дракон", "Повелитель Демонов"
];

export const BOSS_NAMES = [
  "Король Слизней", "Крысиный Император", "Вождь Гоблинов", "Костяной Лорд", 
  "Орк-Завоеватель", "Призрак Оперы", "Горный Тролль", "Титановый Голем", 
  "Древняя Виверна", "Дракон Пустоты", "Архидемон"
];

export const BOSS_INFO: Record<string, { lore: string, mechanics: string }> = {
  "Король Слизней": {
    lore: "Древняя сущность, поглотившая тысячи незадачливых искателей приключений.",
    mechanics: "Огромный запас здоровья. Требует высокого постоянного урона."
  },
  "Крысиный Император": {
    lore: "Правитель подземных коммуникаций, чей трон сделан из украденного сыра и золота.",
    mechanics: "Быстрый и юркий. Проверьте свои рефлексы."
  },
  "Вождь Гоблинов": {
    lore: "Жестокий лидер, объединивший разрозненные племена под знаменем грабежа.",
    mechanics: "Бронированный. Используйте пробивающие предметы."
  },
  "Костяной Лорд": {
    lore: "Некромант, отказавшийся от смерти ради вечной власти над мертвыми.",
    mechanics: "Не чувствует боли. Критические удары особенно эффективны."
  },
  "Орк-Завоеватель": {
    lore: "Ветеран тысячи войн, чья кожа тверже стали.",
    mechanics: "Ярость берсерка. Чем меньше здоровья, тем опаснее он выглядит."
  },
  "Призрак Оперы": {
    lore: "Дух безумного музыканта, чья мелодия сводит с ума.",
    mechanics: "Призрачная форма. Требуется магическое оружие или высокий урон."
  },
  "Горный Тролль": {
    lore: "Исполин, способный дробить скалы голыми руками.",
    mechanics: "Медленный, но невероятно живучий. Регенерация."
  },
  "Титановый Голем": {
    lore: "Страж древних технологий, забывший своих создателей.",
    mechanics: "Иммунитет к обычным атакам. Нужны мощные криты."
  },
  "Древняя Виверна": {
    lore: "Королева небес, чье пламя плавит металл.",
    mechanics: "Воздушная цель. Авто-урон менее эффективен."
  },
  "Дракон Пустоты": {
    lore: "Существо из другого измерения, пожирающее саму реальность.",
    mechanics: "Искажение времени. У вас меньше времени на убийство."
  },
  "Архидемон": {
    lore: "Воплощение чистой злобы, стремящееся уничтожить этот мир.",
    mechanics: "Финальное испытание. Используйте всё, что у вас есть."
  }
};

export const RARITY_COLORS = {
  [Rarity.COMMON]: 'text-gray-400 border-gray-400',
  [Rarity.RARE]: 'text-blue-400 border-blue-400',
  [Rarity.EPIC]: 'text-purple-400 border-purple-400',
  [Rarity.LEGENDARY]: 'text-yellow-400 border-yellow-400',
};

export const RARITY_LABELS = {
  [Rarity.COMMON]: 'Обычное',
  [Rarity.RARE]: 'Редкое',
  [Rarity.EPIC]: 'Эпическое',
  [Rarity.LEGENDARY]: 'Легендарное',
};

export const GACHA_COST_BASE = 50;
export const LOOTBOX_COST = 200;
export const CLICK_UPGRADE_COST_BASE = 10;
export const AUTO_UPGRADE_COST_BASE = 25;

export const BASE_CRIT_CHANCE = 0.01;
export const BASE_CRIT_MULTIPLIER = 1.5;

export const BASE_DROP_RATES = {
  COMMON: 0.60,
  RARE: 0.30,
  EPIC: 0.09,
  LEGENDARY: 0.01
};

export const STATIC_ITEMS: Record<string, Record<string, string[]>> = {
  [ItemType.WEAPON]: {
    [Rarity.COMMON]: ["Ржавый Меч", "Деревянная Дубина", "Сломанный Кинжал", "Старая Коса", "Каменный Молот"],
    [Rarity.RARE]: ["Стальной Гладиус", "Острый Топор", "Копье Стражника", "Боевой Молот", "Охотничий Лук"],
    [Rarity.EPIC]: ["Меч Дракона", "Топор Берсерка", "Клинки Тени", "Молот Бури", "Посох Архимага"]
  },
  [ItemType.ARMOR]: {
    [Rarity.COMMON]: ["Тряпье", "Кожаная Куртка", "Рваный Плащ", "Деревянный Щит", "Старая Шляпа"],
    [Rarity.RARE]: ["Кольчуга", "Стальной Нагрудник", "Шлем Рыцаря", "Железные Сапоги", "Укрепленный Щит"],
    [Rarity.EPIC]: ["Мифриловая Броня", "Плащ Невидимка", "Шлем Ужаса", "Сапоги Скорости", "Щит Эгиды"]
  },
  [ItemType.ACCESSORY]: {
    [Rarity.COMMON]: ["Медное Кольцо", "Веревочный Амулет", "Стеклянные Бусы", "Простой Браслет", "Старая Монета"],
    [Rarity.RARE]: ["Серебряный Перстень", "Амулет Удачи", "Ожерелье Клыков", "Браслет Силы", "Кольцо Ловкости"],
    [Rarity.EPIC]: ["Золотой Перстень", "Око Дракона", "Амулет Бессмертия", "Кольцо Власти", "Сердце Титана"]
  }
};

export const STATIC_DESCRIPTIONS = [
  "Простой, но надежный.",
  "Пахнет пылью и стариной.",
  "Выглядит так, будто им уже пользовались.",
  "Лучше, чем ничего.",
  "Стандартное снаряжение новичка.",
  "Слегка светится в темноте.",
  "Сделано мастером своего дела.",
  "Хранит следы былых сражений."
];

export const ZONES: Zone[] = [
  {
    id: 'forest',
    name: 'Тихий Лес',
    description: 'Вы очнулись на опушке древнего леса. Вокруг слышен шорох листвы и писк мелких тварей.',
    mission: 'Очистите лес от слизней и крыс, чтобы найти путь к цивилизации.',
    minLevel: 1,
    maxLevel: 10,
    bgGradient: 'linear-gradient(to bottom, #1a2e1a, #0f172a)',
    textColor: 'text-green-400',
    choices: [
      {
        text: 'Осмотреть старый пень',
        outcomeText: 'Вы нашли спрятанное золото!',
        rewardType: 'gold',
        rewardValue: 100
      },
      {
        text: 'Помедитировать',
        outcomeText: 'Вы чувствуете прилив сил (+100% Урона на 1 мин)',
        rewardType: 'buff_damage',
        rewardValue: 60000
      }
    ]
  },
  {
    id: 'cave',
    name: 'Гнилые Пещеры',
    description: 'Тропа привела вас в сырые, темные пещеры. Воздух спертый, пахнет плесенью и опасностью.',
    mission: 'Гоблины и скелеты охраняют проход. Пробивайтесь с боем!',
    minLevel: 11,
    maxLevel: 20,
    bgGradient: 'linear-gradient(to bottom, #2d2a2e, #1a1a1a)',
    textColor: 'text-gray-400',
    choices: [
      {
        text: 'Обыскать трупы гоблинов',
        outcomeText: 'В карманах нашлось немного монет.',
        rewardType: 'gold',
        rewardValue: 500
      },
      {
        text: 'Заточить оружие о камень',
        outcomeText: 'Ваш клинок стал острее (+100% Урона на 2 мин)',
        rewardType: 'buff_damage',
        rewardValue: 120000
      }
    ]
  },
  {
    id: 'castle',
    name: 'Проклятый Замок',
    description: 'Перед вами возвышаются руины величия. Здесь обитают те, кто не нашел покоя после смерти.',
    mission: 'Призраки и рыцари смерти не пропустят живых. Докажите свою силу.',
    minLevel: 21,
    maxLevel: 30,
    bgGradient: 'linear-gradient(to bottom, #2e1a2e, #0f0518)',
    textColor: 'text-purple-400',
    choices: [
      {
        text: 'Прочитать древний свиток',
        outcomeText: 'Тайные знания наполнили вас силой (+100% Золота на 2 мин)',
        rewardType: 'buff_gold',
        rewardValue: 120000
      },
      {
        text: 'Выпить воды из фонтана',
        outcomeText: 'Вода оказалась святой! (+100% Урона на 2 мин)',
        rewardType: 'buff_damage',
        rewardValue: 120000
      }
    ]
  },
  {
    id: 'volcano',
    name: 'Лавовая Пустошь',
    description: 'Жар невыносим. Земля трескается под ногами. Вы вошли во владения демонов.',
    mission: 'Выжить в этом аду и сразить огненных тварей.',
    minLevel: 31,
    maxLevel: 40,
    bgGradient: 'linear-gradient(to bottom, #4a1a1a, #2a0a0a)',
    textColor: 'text-red-400',
    choices: [
      {
        text: 'Собрать кристаллы огня',
        outcomeText: 'Они стоят целое состояние!',
        rewardType: 'gold',
        rewardValue: 5000
      }
    ]
  },
  {
    id: 'void',
    name: 'Грань Реальности',
    description: 'Законы физики здесь не работают. Пространство искажается, время течет вспять.',
    mission: 'Сразитесь с воплощениями хаоса и станьте Лордом Лута.',
    minLevel: 41,
    maxLevel: 9999,
    bgGradient: 'linear-gradient(to bottom, #0f172a, #000000)',
    textColor: 'text-blue-400',
    choices: [
       {
        text: 'Поглотить энергию пустоты',
        outcomeText: 'Безграничная мощь! (+100% Урона на 5 мин)',
        rewardType: 'buff_damage',
        rewardValue: 300000
      }
    ]
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'kill_10',
    name: 'Первая Кровь',
    description: 'Убейте 10 монстров',
    type: 'kills',
    threshold: 10,
    rewardDescription: '+10% Урона',
    rewardType: 'damage',
    rewardValue: 0.1
  },
  {
    id: 'kill_100',
    name: 'Охотник',
    description: 'Убейте 100 монстров',
    type: 'kills',
    threshold: 100,
    rewardDescription: '+20% Урона',
    rewardType: 'damage',
    rewardValue: 0.2
  },
  {
    id: 'kill_500',
    name: 'Истребитель',
    description: 'Убейте 500 монстров',
    type: 'kills',
    threshold: 500,
    rewardDescription: '+30% Урона',
    rewardType: 'damage',
    rewardValue: 0.3
  },
  {
    id: 'gold_1000',
    name: 'Копилка',
    description: 'Соберите 1,000 золота (всего)',
    type: 'gold',
    threshold: 1000,
    rewardDescription: '+10% Золота',
    rewardType: 'gold',
    rewardValue: 0.1
  },
  {
    id: 'gold_10000',
    name: 'Сокровищница',
    description: 'Соберите 10,000 золота (всего)',
    type: 'gold',
    threshold: 10000,
    rewardDescription: '+25% Золота',
    rewardType: 'gold',
    rewardValue: 0.25
  },
  {
    id: 'legendary_1',
    name: 'Избранный',
    description: 'Найдите 1 Легендарный предмет',
    type: 'legendaries',
    threshold: 1,
    rewardDescription: '+50% Урона',
    rewardType: 'damage',
    rewardValue: 0.5
  },
  {
    id: 'legendary_5',
    name: 'Лорд Лута',
    description: 'Найдите 5 Легендарных предметов',
    type: 'legendaries',
    threshold: 5,
    rewardDescription: '+100% Золота',
    rewardType: 'gold',
    rewardValue: 1.0
  }
];

export const SHOP_ITEMS: ShopItem[] = [
  // Game Items
  {
    id: 'potion_damage',
    name: 'Зелье Ярости',
    description: '+100% Урона на 2 минуты',
    cost: 500,
    category: 'game',
    type: 'consumable_damage',
    duration: 120000 // 2 mins
  },
  {
    id: 'potion_gold',
    name: 'Эликсир Мидаса',
    description: '+100% Золота на 2 минуты',
    cost: 500,
    category: 'game',
    type: 'consumable_gold',
    duration: 120000
  },
  {
    id: 'perm_crit_chance',
    name: 'Острый Глаз',
    description: '+1% Шанс Крита (Навсегда)',
    cost: 1000,
    category: 'game',
    type: 'permanent_crit_chance',
    value: 0.01,
    costMultiplier: 1.5
  },
  {
    id: 'perm_crit_damage',
    name: 'Жестокий Удар',
    description: '+10% Сила Крита (Навсегда)',
    cost: 1000,
    category: 'game',
    type: 'permanent_crit_damage',
    value: 0.1,
    costMultiplier: 1.5
  },
  // 05.ru Items
  {
    id: '05_bonuses_small',
    name: '300 Бонусных рублей',
    description: 'Пополнение бонусного счета в 05.ru',
    cost: 50000,
    currency: 'gold',
    category: '05ru',
    type: 'gift_card',
    value: 300
  },
  {
    id: '05_bonuses_large',
    name: '1000 Бонусных рублей',
    description: 'Крупное пополнение счета в 05.ru',
    cost: 150000,
    currency: 'gold',
    category: '05ru',
    type: 'gift_card',
    value: 1000
  },
  {
    id: '05_promo_code',
    name: 'Секретный Промокод',
    description: 'Скидка на заказ в 05.ru',
    cost: 50,
    currency: 'souls',
    category: '05ru',
    type: 'promo_code'
  }
];

export const CHANGELOG = [
  { version: '1.0', text: 'Первый релиз: Кликер, Монстры, Инвентарь.' },
  { version: '1.1', text: 'Добавлены Боссы и механика проигрыша по таймеру.' },
  { version: '1.2', text: 'Система Престижа (Души) и Магазин.' },
  { version: '1.3', text: 'Сюжетные Зоны и музыка Dark Fantasy.' },
  { version: '1.4', text: 'AI генерация лора предметов и Пиксельные монстры.' },
  { version: '1.5', text: 'Ежедневные награды, Оффлайн прогресс, Случайные события.' },
  { version: '1.6', text: 'Лутбоксы, Рулетка, Статичные предметы, Улучшенный UI.' },
  { version: '1.7', text: 'NPC, Лагерь, Массовое открытие лутбоксов, 8-bit звуки.' }
];

// Placeholder for future re-integration
export const DAILY_REWARDS = [
  { day: 1, reward: 100, type: 'gold', text: '100 Золота' },
];

export const RANDOM_EVENTS = [
  {
    id: 'lucky_chest',
    name: 'Счастливый Сундук',
    description: 'Монстр уронил тяжелый сундук. Внутри блестело золото!',
    rewardType: 'gold_mult',
    value: 5, // 5x monster gold
    weight: 0.4
  },
  {
    id: 'blessing',
    name: 'Благословение',
    description: 'Луч света пробился сквозь тьму. Вы чувствуете силу.',
    rewardType: 'buff_damage',
    value: 60000, // 1 min
    weight: 0.3
  },
  {
    id: 'thief_stash',
    name: 'Тайник Вора',
    description: 'Вы нашли карту, ведущую к тайнику.',
    rewardType: 'gold_flat',
    value: 500,
    weight: 0.2
  },
  {
    id: 'mystery_find',
    name: 'Загадочная Коробка',
    description: 'Странный предмет выпал из кармана врага.',
    rewardType: 'mystery_box',
    value: 1,
    weight: 0.1
  }
];

export const NPCS: Record<NPCId, NPC> = {
  [NPCId.GUIDE]: {
    id: NPCId.GUIDE,
    name: "Старый Путник",
    title: "Ветеран подземелий",
    dialogues: {
      'start': {
        text: "Здравствуй. Нечасто здесь встретишь живых. Нужен совет или помощь?",
        options: [
          { text: "Расскажи про это место.", nextId: 'lore' },
          { text: "Мне нужно лечение.", action: 'heal', nextId: 'healed', reward: { type: 'buff_dmg', value: 30000 } },
          { text: "Ухожу.", action: 'exit' }
        ]
      },
      'lore': {
        text: "Это место проклято давно. Говорят, ИИ сошел с ума и начал создавать монстров из пикселей.",
        options: [
          { text: "Понятно.", nextId: 'start' }
        ]
      },
      'healed': {
        text: "Вот, выпей это. Зелье старое, но бодрит.",
        options: [
          { text: "Спасибо.", action: 'exit' }
        ]
      }
    }
  },
  [NPCId.MERCHANT]: {
    id: NPCId.MERCHANT,
    name: "Таинственный Торговец",
    title: "Коллекционер редкостей",
    dialogues: {
      'start': {
        text: "Хе-хе... Золото, души, артефакты... У тебя есть что-то ценное?",
        options: [
          { text: "Что ты можешь предложить?", nextId: 'offer' },
          { text: "Нет, я просто смотрю.", action: 'exit' }
        ]
      },
      'offer': {
        text: "Могу дать тебе немного удачи за скромную плату.",
        options: [
          { text: "Давай (1000g)", action: 'trade', reward: { type: 'gold', value: 0 } }, 
          { text: "Слишком дорого.", action: 'exit' }
        ]
      }
    }
  }
};
