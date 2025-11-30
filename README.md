# Pixel Loot Lord (Пиксельный Лорд Лута)

Это браузерная RPG-кликер игра с элементами рогалика, созданная с использованием React, TypeScript, Tailwind CSS и Google Gemini API.

## Особенности

*   **Бесконечный геймплей:** Кликайте, убивайте монстров, прокачивайте авто-урон.
*   **Генеративный контент:** Легендарные предметы создаются с помощью ИИ (Google Gemini), получая уникальные названия и лор.
*   **Система экипировки:** Оружие, Броня, Аксессуары. Менеджмент инвентаря.
*   **Механики:** Боссы, Престиж (Сброс прогресса ради душ), Лутбоксы, Рулетка, NPC, Сюжетные зоны.
*   **Атмосфера:** 8-bit звуковые эффекты и процедурная дарк-эмбиент музыка.

## Технологический стек

*   **Frontend:** React 19, TypeScript
*   **Стили:** Tailwind CSS
*   **Иконки:** Lucide React
*   **AI:** Google GenAI SDK (`@google/genai`)
*   **Сборка:** Vite (Рекомендуется)

## Установка и запуск

### 1. Предварительные требования

Убедитесь, что у вас установлен [Node.js](https://nodejs.org/) (версии 18+).

### 2. Создание проекта

Рекомендуется использовать Vite для быстрой настройки:

```bash
npm create vite@latest pixel-loot -- --template react-ts
cd pixel-loot
```

### 3. Установка зависимостей

Скопируйте файлы проекта (`App.tsx`, `index.tsx`, `types.ts`, и т.д.) в папку `src`. Затем установите необходимые пакеты:

```bash
npm install react react-dom lucide-react @google/genai
npm install -D tailwindcss postcss autoprefixer
```

### 4. Настройка Tailwind CSS

Инициализируйте Tailwind:

```bash
npx tailwindcss init -p
```

Обновите `tailwind.config.js`:

```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Добавьте директивы Tailwind в ваш CSS файл (например, `src/index.css`):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 5. Настройка API ключа (Важно!)

Для работы генерации легендарных предметов требуется ключ от Google Gemini API.

1.  Получите ключ в [Google AI Studio](https://aistudio.google.com/).
2.  В корне проекта создайте файл `.env`.
3.  Добавьте туда ключ (для Vite используйте префикс `VITE_`):

```env
VITE_API_KEY=ваш_ключ_здесь
```

**Важно:** В коде используется `process.env.API_KEY`. Если вы используете Vite, вам нужно настроить `vite.config.ts`, чтобы он прокидывал эту переменную, или заменить в коде `process.env.API_KEY` на `import.meta.env.VITE_API_KEY`.

Пример настройки `vite.config.ts` для совместимости:

```typescript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    },
  }
})
```

### 6. Запуск

```bash
npm run dev
```

Откройте браузер по адресу `http://localhost:5173`.

## Деплой (Развертывание)

Самый простой способ развернуть приложение — использовать **Vercel** или **Netlify**.

1.  Загрузите код на GitHub.
2.  Импортируйте проект в Vercel/Netlify.
3.  В настройках проекта (Environment Variables) добавьте переменную `API_KEY` (или `VITE_API_KEY` в зависимости от вашей конфигурации сборщика) со значением вашего ключа от Google Gemini.
4.  Нажмите Deploy.

## Структура файлов

*   `App.tsx` - Основная логика игры, UI, стейт-менеджмент.
*   `types.ts` - TypeScript интерфейсы.
*   `constants.ts` - Игровые константы, списки врагов, настройки баланса.
*   `services/audioService.ts` - Аудио движок (музыка и SFX).
*   `services/geminiService.ts` - Интеграция с AI.
*   `components/*` - Компоненты UI (Монстры, Предметы).
