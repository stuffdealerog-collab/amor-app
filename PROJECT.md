# Amor — Социальное приложение нового поколения

> **«Найди своих людей»** — социальная платформа для пользователей 6–21 лет. Дружба по вайбу, а не по фото. Коллекционные персонажи, квесты, Mood Rooms с голосовыми каналами.

## Статус проекта

**Фаза:** MVP (Phase 1)
**Платформа:** PWA (Progressive Web App) на Next.js
**Деплой:** Vercel — https://amor-app-gamma.vercel.app/
**Состояние:** Production-ready MVP. Все основные фичи реализованы и подключены к Supabase.

---

## Стек технологий

| Слой | Технология | Версия |
|------|-----------|--------|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **Language** | TypeScript | 5.7.3 |
| **UI** | React | 19.2.4 |
| **Styling** | Tailwind CSS v4 + custom CSS | 4.2.0 |
| **Components** | shadcn/ui (Radix primitives) | — |
| **State** | Zustand | 5.0.11 |
| **Backend** | Supabase (Auth, DB, Realtime, Presence, Storage, Edge Functions) | 2.97.0 |
| **Voice** | LiveKit Cloud (WebRTC) | livekit-client 2.17.2 |
| **PWA** | Service Worker + Web Manifest | — |
| **Hosting** | Vercel | — |
| **Analytics** | Vercel Analytics | — |

---

## Архитектура

```
app/
├── layout.tsx                # Root layout (PWA meta, SW registration, Inter font, viewport-fit: cover)
├── page.tsx                  # SPA entry — phase router + presence/notifications init
├── globals.css               # Design system: colors, glass, glows, gradients, animations, safe area, banner presets
├── auth/callback/route.ts    # Supabase PKCE/magic-link callback handler

components/
├── amor/                     # Feature components (screens)
│   ├── intro-screen.tsx      # Splash + onboarding slides
│   ├── auth-screen.tsx       # Email OTP login
│   ├── onboarding-screen.tsx # 5-step profile setup (up to 6 photos)
│   ├── vibe-screen.tsx       # Swipe feed (full-bleed cards, touch+mouse drag)
│   ├── chat-screen.tsx       # Chat list + 1-on-1 messaging (text, image, voice, read receipts, typing, presence)
│   ├── rooms-screen.tsx      # Mood Rooms (4 categories)
│   ├── voice-room.tsx        # LiveKit voice channel UI
│   ├── profile-screen.tsx    # User profile + photos + characters + achievements + banner
│   ├── edit-profile-screen.tsx # Edit profile (photos, bio, interests, music, banner picker)
│   ├── shop-screen.tsx       # Character shop (free chest timer, video, drop rates, promo codes)
│   ├── box-opening-screen.tsx# Gacha animation (rarity-based VFX)
│   ├── quests-screen.tsx     # Daily/pair quests
│   ├── match-screen.tsx      # Match celebration overlay
│   ├── notifications-screen.tsx # Real notifications from matches + messages
│   ├── settings-screen.tsx   # Settings + parental controls + logout
│   ├── voice-recorder.tsx    # VoiceRecorder + VoiceBioPlayer (AudioContext API)
│   ├── pwa-install-prompt.tsx # PWA install instructions (iOS/Android/desktop)
│   ├── top-bar.tsx           # App header with notification badge
│   ├── bottom-nav.tsx        # Tab navigation with chat unread badge
│   └── collection-data.ts    # Static character/collection data + roll logic
├── ui/                       # shadcn/ui primitives
└── theme-provider.tsx

lib/
├── stores/                   # Zustand state management
│   ├── auth.ts              # Auth state (email OTP sign-in, session)
│   ├── profile.ts           # Profile CRUD, avatar/photo/banner upload
│   ├── match.ts             # Cards feed, swipes (skip 2-day cooldown), match detection
│   ├── chat.ts              # Messaging (text/image/voice), read receipts, typing, optimistic updates
│   ├── rooms.ts             # Room listing (batch member count), join/leave, room chat
│   ├── characters.ts        # Collection, owned characters, equip/unequip, free chest timer
│   ├── quests.ts            # Quests CRUD, progress tracking
│   ├── stars.ts             # Stars balance, gift, exchange
│   ├── notifications.ts     # Aggregated notifications (matches + unread messages), localStorage persistence
│   ├── presence.ts          # Online/offline status via Supabase Realtime Presence
│   └── promo.ts             # Promo code redemption (stars, chest, character)
├── supabase/
│   ├── client.ts            # Browser Supabase client (singleton)
│   ├── server.ts            # Server Supabase client (SSR)
│   └── database.types.ts    # TypeScript types matching DB schema
├── sanitize.ts              # Input sanitization (stripTags, length limits)
├── compress-image.ts        # Client-side JPEG compression (max 1200px, quality 0.7)
├── livekit.ts               # LiveKit helpers (connect, mute, token fetch)
└── utils.ts                 # cn() utility

supabase/
├── migrations/
│   ├── 001_initial_schema.sql  # Full DB schema + RLS + seed data
│   └── 002_add_music_columns.sql # Patches: music, banner, chat media, read_at, promo, storage policies, DB constraints
└── functions/
    ├── generate-livekit-token/
    ├── purchase-chest/
    ├── exchange-stars/
    └── send-sms/

middleware.ts                 # Supabase session refresh on every request
public/
├── manifest.json             # PWA manifest (standalone, portrait, amor-icon-pwa.png)
├── sw.js                     # Service Worker (network-first, skip external APIs)
└── images/
    ├── amor-logo.png         # White logo for in-app display
    ├── amor-icon-pwa.png     # Dark icon for PWA home screen
    ├── amor-icon.svg         # SVG fallback icon
    └── collection-rap/       # Character images (OG Buda, GONE.Fludd, MAYOT, etc.)
```

---

## Ключевые фичи

### 1. Аутентификация (Email OTP)
- Вход по email через Supabase `signInWithOtp`
- Код приходит на email (6-8 цифр)
- Сессия хранится в cookies через `@supabase/ssr`
- Middleware обновляет сессию при каждом запросе

### 2. Онбординг (5 шагов)
1. Welcome screen с визуализацией шагов
2. Имя + возраст (6-21 лет) + текстовое био
3. Фото (до 6 штук, сжатие через Canvas) + голосовое био (30 сек)
4. Интересы (3-8 из 15 вариантов)
5. Музыкальная ДНК: жанры, артисты, Яндекс Музыка

### 3. Профиль
- До 6 фотографий с грид-управлением
- Кастомный фон профиля (10 пресетов + загрузка своего)
- Био, голосовое био, интересы, музыкальная ДНК
- Вкладки: Обо мне, Фото, Персонажи, Награды
- Редактирование всех данных через edit-profile-screen

### 4. Vibe Matching (Swipe Feed)
- Full-bleed карточки с фото, touch + mouse drag
- Vibe Score по пересечению интересов
- Свайп вправо = like, влево = skip, кнопка = superlike
- **Skip cooldown:** скипнутые пользователи возвращаются через 2 дня
- Экипированный персонаж отображается в полный рост (35% opacity)
- Throttle: 400мс между свайпами

### 5. Чат (Realtime)
- 1-on-1 чат между матчами
- **Текст, фото, голосовые сообщения**
- Фото сжимаются перед отправкой (JPEG, quality 0.7, max 1200px)
- **Статус прочитанности:** одна галочка = отправлено, две = прочитано (бирюзовые)
- **Индикатор "печатает..."** через Supabase Broadcast
- **Онлайн-статус** через Supabase Presence (зелёная точка)
- **Оптимистичные обновления** (сообщение появляется сразу)
- **Превью профиля** собеседника при тапе на аватарку
- **Поиск** по имени в списке чатов
- **Непрочитанные** — бейдж в списке и на вкладке Чаты

### 6. Уведомления
- Агрегация из matches + messages (без отдельной таблицы)
- Realtime обновление счётчика
- Бейдж на кнопке в TopBar
- Состояние "прочитано" сохраняется в localStorage
- Автоматическая пометка при закрытии экрана уведомлений

### 7. Онлайн-статус (Presence)
- Supabase Realtime Presence channel `amor-presence`
- Зелёная точка на аватарке (чат, список чатов)
- Текст: "в сети" / "печатает..." / "не в сети"
- Приоритет: печатает > в сети > не в сети
- Автоотключение при выходе/закрытии

### 8. Система персонажей (Gacha)
- Коллекции с временным ограничением
- 5 уровней редкости: Common, Rare, Epic, Legendary, Mythic
- Drop rates отображаются в магазине (2%, 5%, 18%, 75%)
- **Бесплатная коробка раз в 72 часа** (таймер с обратным отсчётом)
- Анимация открытия с VFX по редкости
- Персонажи экипируются и отображаются в свайпах
- Дубликаты дают +1 XP

### 9. Промо-коды
- Таблицы `promo_codes` + `promo_redemptions`
- 3 типа: `stars` (начисление звёзд), `chest` (бесплатная коробка), `character` (конкретный персонаж)
- Проверка: срок действия, лимит использований, одноразовость на пользователя
- Ввод в магазине с визуальной обратной связью

### 10. Mood Rooms + Голосовые каналы
- 4 категории: Поболтать, Поиграем, Поддержка, Творчество
- Batch-запрос количества участников (оптимизировано)
- LiveKit Cloud для голосовых комнат

### 11. Квесты + Amor Stars
- Ежедневные и парные квесты
- Звёзды — валюта приложения
- Транзакции логируются

---

## База данных

### Таблицы

| Таблица | Назначение |
|---------|-----------|
| `profiles` | Профили (bio, photos[], banner_url, music_genres[], favorite_artists[], last_free_chest) |
| `collections` | Коллекции персонажей |
| `characters` | Персонажи (drop_rate, css_effect, color) |
| `user_characters` | Связь пользователь-персонаж (level, xp, equipped) |
| `swipes` | Свайпы (like/skip/superlike + created_at для cooldown) |
| `matches` | Матчи между пользователями |
| `messages` | Сообщения (type: text/image/voice, media_url, read_at) |
| `rooms` | Mood Rooms |
| `room_members` | Участники комнат |
| `room_messages` | Сообщения в комнатах |
| `quests` | Шаблоны квестов |
| `user_quests` | Прогресс пользователя |
| `stars_transactions` | Лог транзакций звёзд |
| `promo_codes` | Промо-коды (type, value, max_uses, expires_at) |
| `promo_redemptions` | Активации промо-кодов (UNIQUE user+promo) |

### Безопасность
- RLS на всех таблицах
- Storage policies для upload (authenticated) и read (public)
- DB constraints: messages 2000 chars, name 30, bio 200
- Client-side sanitization (HTML stripping)
- Image compression before upload

---

## PWA

- `manifest.json`: standalone, portrait, `amor-icon-pwa.png`
- `sw.js`: network-first с cache fallback, пропуск Supabase API
- `layout.tsx`: viewport-fit: cover, apple-web-app-capable, theme-color #ff2e6c
- `pwa-install-prompt.tsx`: инструкция установки для iOS/Android/desktop (показывается один раз)
- Safe area: CSS переменные `--sat`, `--sab` для iPhone notch

---

## Суммарные SQL-патчи (для существующей БД)

Все патчи в файле `supabase/migrations/002_add_music_columns.sql`. Включают:
- Колонки профиля: music_genres, favorite_artists, yandex_music_link, bio, voice_bio_url, vibe_question, banner_url, last_free_chest
- Чат: media_url, read_at в messages, тип voice в message_type
- Промо-коды: promo_codes + promo_redemptions таблицы + RLS
- Storage policies для avatars, voice-bios, chat-media
- DB constraints для длины контента

---

## Supabase Setup

1. Создать проект на supabase.com
2. Скопировать URL и Anon Key в `.env.local`
3. SQL Editor → `001_initial_schema.sql` → Run
4. SQL Editor → `002_add_music_columns.sql` → Run
5. Storage → создать public buckets: `avatars`, `voice-bios`, `chat-media`
6. Auth → Email Auth → включить, настроить SMTP
7. Auth → Email Templates → заменить `{{ .ConfirmationURL }}` на `{{ .Token }}`
8. Auth → URL Configuration → Site URL = https://amor-app-gamma.vercel.app
9. Settings → API → Reload schema

---

## Запуск

```bash
npm install
npm run dev        # Разработка (localhost:3000)
npm run build      # Сборка
npm start          # Production
```

## Деплой

```bash
git add -A
git commit -m "description"
git push           # Vercel auto-deploys from main branch
```

Env vars на Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
