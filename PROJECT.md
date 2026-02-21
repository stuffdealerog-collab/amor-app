# Amor — Социальное приложение нового поколения

> **«Найди своих людей»** — социальная платформа для пользователей 6–21 лет. Дружба по вайбу, а не по фото. Коллекционные персонажи, квесты, Mood Rooms с голосовыми каналами.

## Статус проекта

**Фаза:** MVP (Phase 1)
**Платформа:** PWA (Progressive Web App) на Next.js
**Состояние:** Frontend реализован и подключён к Supabase. Требуется тестирование и доработка.

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
| **Backend** | Supabase (Auth, DB, Realtime, Storage, Edge Functions) | 2.97.0 |
| **Voice** | LiveKit Cloud (WebRTC) | livekit-client 2.17.2 |
| **PWA** | Service Worker + Web Manifest | — |
| **Analytics** | Vercel Analytics | — |

---

## Архитектура

```
app/                          # Next.js App Router
├── layout.tsx                # Root layout (PWA meta, SW registration, Inter font)
├── page.tsx                  # SPA entry — phase router (intro → auth → onboarding → main)
├── globals.css               # Design system: colors, glass, glows, gradients, animations
├── auth/callback/route.ts    # Supabase PKCE/magic-link callback handler

components/
├── amor/                     # Feature components (screens)
│   ├── intro-screen.tsx      # Splash + onboarding slides
│   ├── auth-screen.tsx       # Email OTP login
│   ├── onboarding-screen.tsx # 5-step profile setup
│   ├── vibe-screen.tsx       # Swipe feed (Tinder-like, with vibe %)
│   ├── chat-screen.tsx       # 1-on-1 messaging (Realtime)
│   ├── rooms-screen.tsx      # Mood Rooms (4 categories)
│   ├── voice-room.tsx        # LiveKit voice channel UI
│   ├── profile-screen.tsx    # User profile + characters + achievements
│   ├── shop-screen.tsx       # Character shop + box opening
│   ├── box-opening-screen.tsx# Gacha animation (rarity-based VFX)
│   ├── quests-screen.tsx     # Daily/pair quests
│   ├── match-screen.tsx      # Match celebration overlay
│   ├── notifications-screen.tsx
│   ├── settings-screen.tsx   # Settings + parental controls + logout
│   ├── voice-recorder.tsx    # VoiceRecorder (запись) + VoiceBioPlayer (воспроизведение) — AudioContext API
│   ├── top-bar.tsx           # App header
│   ├── bottom-nav.tsx        # Tab navigation
│   └── collection-data.ts   # Static character/collection data + roll logic
├── ui/                       # shadcn/ui primitives
└── theme-provider.tsx

lib/
├── stores/                   # Zustand state management
│   ├── auth.ts              # Auth state (email OTP sign-in, session)
│   ├── profile.ts           # Profile CRUD, avatar upload
│   ├── match.ts             # Cards feed, swipes, match detection
│   ├── chat.ts              # 1-on-1 messaging (Realtime subscriptions)
│   ├── rooms.ts             # Room listing, join/leave, room chat (Realtime)
│   ├── characters.ts        # Collection, owned characters, equip/unequip
│   ├── quests.ts            # Quests CRUD, progress tracking
│   └── stars.ts             # Stars balance, gift, exchange
├── supabase/
│   ├── client.ts            # Browser Supabase client (singleton)
│   ├── server.ts            # Server Supabase client (SSR)
│   └── database.types.ts    # TypeScript types matching DB schema
├── livekit.ts               # LiveKit helpers (connect, mute, token fetch)
└── utils.ts                 # cn() utility

supabase/
├── migrations/
│   └── 001_initial_schema.sql  # Full DB schema + RLS + seed data
└── functions/
    ├── generate-livekit-token/  # JWT token generation for voice rooms
    ├── purchase-chest/          # Server-side gacha roll
    ├── exchange-stars/          # Atomic stars-to-character exchange
    └── send-sms/                # Eskiz.uz SMS hook (not used, email auth now)

middleware.ts                 # Supabase session refresh on every request
public/
├── manifest.json             # PWA manifest
├── sw.js                     # Service Worker (cache-first strategy)
└── images/                   # Logo, mascot, character PNGs
```

---

## Дизайн-система

### Цвета (всегда dark theme)

| Имя | Hex | Назначение |
|-----|-----|-----------|
| `amor-pink` | `#ff2e6c` | Primary, CTA, likes, active states |
| `amor-cyan` | `#1df0b8` | Accent, security badges, online |
| `amor-gold` | `#ffc830` | Stars, rewards, premium |
| `amor-purple` | `#9061f9` | Secondary accent, gradients |
| `amor-orange` | `#ff7b3a` | Warnings, streaks |
| `amor-blue` | `#3e8bff` | Info, links |
| `background` | `#06060a` | App background |
| `foreground` | `#eeeef2` | Primary text |
| `amor-surface` | `#0c0c14` | Card background |
| `muted-foreground` | `#5e5e78` | Secondary text |

### Визуальные паттерны

- **Glass morphism:** `backdrop-filter: blur(28px) saturate(1.4)` с полупрозрачным фоном
- **Glows:** `box-shadow` с цветовым свечением для акцентов
- **Gradients:** `grad-pink`, `grad-cyan`, `grad-sunset`, `grad-gold`, `grad-purple`
- **Animations:** 30+ кастомных keyframe анимаций (fade, scale, float, shake, burst)
- **Stagger:** `.stagger` и `.stagger-fast` для последовательных анимаций дочерних элементов

### Эффекты редкости персонажей

| Rarity | CSS class | Визуальный эффект |
|--------|-----------|-------------------|
| Mythic | `effect-holo` | Голографический переливающийся шиммер |
| Legendary | `effect-glitch` | Глитч-эффект со скан-линиями |
| Epic | `effect-flame` | Пульсирующее свечение снизу |
| Epic | `effect-gold` | Плавающие золотые частицы |
| Rare | `effect-sparkle` | Мерцающие розовые точки |
| Rare | `effect-mist` | Бирюзовый туман |

---

## Ключевые фичи

### 1. Аутентификация (Email OTP)
- Вход по email через Supabase `signInWithOtp`
- Код приходит на email (6-8 цифр)
- Пробуем верификацию с `type: 'email'` и fallback на `type: 'signup'`
- Сессия хранится в cookies через `@supabase/ssr`
- Middleware обновляет сессию при каждом запросе

### 2. Онбординг (5 шагов)
1. Welcome screen
2. Имя + возраст (6-21 лет) + текстовое био (до 200 символов, опционально)
3. Фото (опционально, загрузка в Supabase Storage `avatars`) + голосовое био (запись до 30 сек, загрузка в Storage `voice-bios`)
4. Интересы (3-8 из 15 вариантов)
5. Музыкальная ДНК: жанры (до 5), любимые артисты (до 5), ссылка на Яндекс Музыку (опционально)

### 3. Возрастные пулы
Пользователи разделены на 3 пула (определяется автоматически по возрасту):
- **Kids** (6-12): контент и комнаты для детей
- **Teens** (13-17): основная аудитория
- **Young Adults** (18-21): взрослый контент

RLS-политики гарантируют, что пользователи видят только свой пул.

### 4. Vibe Matching (Swipe Feed)
- Загрузка профилей из того же age_pool
- Vibe Score рассчитывается по пересечению интересов
- Карточки сортируются по vibe score
- Свайп вправо = like, влево = skip, кнопка = superlike
- Взаимный лайк → match → уведомление
- Лимит 5 свайпов/день (базовый)

### 5. Чат (Realtime)
- 1-on-1 чат между матчами
- Realtime через Supabase Postgres Changes
- Системные сообщения
- Отображение статуса "онлайн"

### 6. Mood Rooms
Групповые комнаты по категориям:
- **Поболтать** (chat) — текстовые
- **Поиграем** (play) — голосовые
- **Поддержка** (support) — текстовые
- **Творчество** (creative) — текст + голос

Каждая комната имеет:
- Лимит участников (max_members)
- Тип: text / voice / both
- Age pool ограничение
- Premium флаг
- Realtime чат и обновление участников

### 7. Голосовые каналы (LiveKit)
- Discord-style voice rooms
- WebRTC через LiveKit Cloud
- Mute/unmute, индикатор говорящего
- JWT-токен генерируется через Edge Function с проверкой age_pool
- Участники отображаются в сетке с аватарами

### 8. Система персонажей (Gacha)
- Коллекции с временным ограничением (дни до конца)
- 5 уровней редкости: Common, Rare, Epic, Legendary, Mythic
- Drop rates настраиваются в БД
- Анимация открытия коробки (4 фазы: idle → shake → crack → reveal → result)
- Уникальные VFX для каждого уровня редкости
- Персонажи экипируются и отображаются на карточке в ленте
- Дубликаты дают XP и повышают уровень

**Текущая коллекция:** «СНГ Рэперы — Сезон 1»
- OG Buda (Mythic, 2%)
- GONE.Fludd (Legendary, 5%)
- MAYOT (Epic, 9%)
- MACAN (Epic, 9%)
- Дора (Rare, 37.5%)
- Тёмный принц (Rare, 37.5%)

### 9. Amor Stars (Репутация)
- Валюта приложения
- Зарабатываются через квесты
- Можно дарить другим пользователям
- Обмен: 100 звёзд → случайный Rare персонаж
- Баланс хранится в `profiles.stars_count`
- Транзакции логируются в `stars_transactions`

### 10. Квесты
- **Ежедневные** (daily): индивидуальные задания
- **Парные** (pair): задания с другом
- Прогресс отслеживается в `user_quests`
- Награды: Stars + XP

---

### 11. Голосовое био
- Запись через `MediaRecorder` API (WebM/Opus)
- Максимальная длительность: 30 секунд
- Воспроизведение через `Web Audio API` (`AudioContext` → `AudioBufferSourceNode`)
- Валидация: проверка пиковой амплитуды после записи (если peak < 0.001 — предупреждение «микрофон не записал звук»)
- Загрузка в Supabase Storage bucket `voice-bios`
- Компоненты: `VoiceRecorder` (запись + превью), `VoiceBioPlayer` (воспроизведение в профиле)
- Файл: `components/amor/voice-recorder.tsx`

### 12. Музыкальная ДНК
- Выбор жанров (до 5 из 15 вариантов)
- Ввод любимых артистов (до 5)
- Опциональная ссылка на профиль Яндекс Музыки
- Отображается в профиле и на карточках в ленте
- Поля БД: `music_genres text[]`, `favorite_artists text[]`, `yandex_music_link text`

---

## База данных (Supabase PostgreSQL)

### Таблицы

| Таблица | Назначение |
|---------|-----------|
| `profiles` | Профили пользователей (PK = auth.users.id). Включает: bio, voice_bio_url, music_genres[], favorite_artists[], yandex_music_link |
| `collections` | Коллекции персонажей |
| `characters` | Персонажи с drop_rate и визуальными эффектами |
| `user_characters` | Связь пользователь-персонаж (level, xp, equipped) |
| `swipes` | Свайпы (like/skip/superlike), UNIQUE(swiper, swiped) |
| `matches` | Матчи между пользователями |
| `messages` | Сообщения в 1-on-1 чатах |
| `rooms` | Mood Rooms с категориями и типами |
| `room_members` | Участники комнат |
| `room_messages` | Сообщения в комнатах |
| `quests` | Шаблоны квестов |
| `user_quests` | Прогресс пользователя по квестам |
| `stars_transactions` | Лог транзакций звёзд |

### RLS (Row Level Security)
- Profiles: видны только пользователи из того же age_pool
- User data (characters, quests, stars): только свои данные
- Collections/Characters/Quests/Rooms: публичное чтение
- Messages: только участники матча
- Room data: чтение открыто, запись только от своего имени

### Realtime
Подписки включены для: `messages`, `room_messages`, `room_members`, `matches`

### Triggers
- `set_age_pool()`: автоматически вычисляет `age_pool` из `age` при INSERT/UPDATE

---

## Edge Functions (Deno)

| Функция | Назначение |
|---------|-----------|
| `generate-livekit-token` | JWT-токен для LiveKit с проверкой age_pool и room capacity |
| `purchase-chest` | Серверный gacha-ролл с обработкой дубликатов |
| `exchange-stars` | Атомарный обмен 100 звёзд на Rare персонажа |
| `send-sms` | Eskiz.uz SMS hook (не используется, email auth) |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# LiveKit
LIVEKIT_API_KEY=APIxxx
LIVEKIT_API_SECRET=xxx
NEXT_PUBLIC_LIVEKIT_URL=wss://xxx.livekit.cloud
```

---

## PWA

- `public/manifest.json`: standalone app, portrait, тема #ff2e6c
- `public/sw.js`: cache-first для статики, network-first для API
- **Development:** Service Worker автоматически отключается на localhost (unregister + cache clear в `layout.tsx`)
- **Production:** Service Worker регистрируется только на production-доменах
- Meta tags в `layout.tsx`: apple-web-app-capable, theme-color
- Иконки: `amor-logo.png` (192x192 и 512x512)

---

## Роутинг (SPA)

Приложение — одностраничное. `page.tsx` управляет фазами:

```
null → (auth check) → intro → auth → onboarding → main
```

- `null`: Splash screen пока auth инициализируется
- `intro`: Слайды + splash (пропускается если уже залогинен)
- `auth`: Email OTP
- `onboarding`: 5 шагов создания профиля
- `main`: 4 вкладки (Вайб, Комнаты, Чаты, Профиль) + модальные экраны

---

## Известные проблемы / TODO

### Критичные
- [x] RLS policy `profiles_select_same_pool` — исправлено: `get_my_age_pool()` SECURITY DEFINER функция устраняет циклическую зависимость
- [x] `profiles` upsert — исправлено: `createProfile` возвращает реальные данные из БД через `.select()`, добавлен `profileLoaded` флаг
- [ ] LiveKit Edge Function не развёрнута (голос не работает до deploy)

### Функциональные
- [x] Музыкальная ДНК — реализовано: жанры, артисты, ссылка Яндекс Музыки (сохраняется в БД)
- [x] Голосовое био — реализовано: запись через MediaRecorder, воспроизведение через Web Audio API (AudioContext), загрузка в Supabase Storage `voice-bios`
- [x] Текстовое био — реализовано: поле в онбординге и отображение в профиле
- [ ] Родительский контроль (Trust Shield) — только UI, нет логики
- [ ] Уведомления — статичные моки, нет push-уведомлений
- [ ] Оплата (Season Pass, покупка коробок) — нет платёжной интеграции
- [ ] AI-модерация — только бейдж, нет реальной модерации
- [ ] Невидимка — UI-переключатель без логики
- [ ] Фото в чате — кнопка есть, функционал нет
- [ ] Голосовые сообщения — кнопка есть, функционал нет

### Технические
- [ ] Нет тестов
- [ ] Нет error boundary
- [ ] `styles/globals.css` — дубликат, используется только `app/globals.css`
- [ ] `create-placeholders.js` — вспомогательный скрипт, можно удалить
- [x] Service Worker — исправлено: автоматически отключается на localhost (unregister + cache clear), работает только в production

---

## Запуск

```bash
# Установка зависимостей
npm install

# Разработка
npm run dev

# Сборка
npm run build

# Запуск production
npm start
```

### Supabase Setup

1. Создать проект на [supabase.com](https://supabase.com)
2. Скопировать URL и Anon Key в `.env.local`
3. Открыть SQL Editor → вставить содержимое `supabase/migrations/001_initial_schema.sql` → Run
4. Storage → создать public bucket `avatars`
5. Storage → создать public bucket `voice-bios`
6. Auth → Settings → Email Auth → включить, настроить SMTP (Gmail)
7. Auth → Email Templates → **обязательно** заменить `{{ .ConfirmationURL }}` на `{{ .Token }}` в шаблонах «Confirm signup» и «Magic Link» (иначе приходит ссылка вместо OTP-кода)

### LiveKit Setup

1. Создать проект на [livekit.io](https://livekit.io)
2. Скопировать API Key, Secret, и WebSocket URL в `.env.local`
3. Развернуть Edge Function `generate-livekit-token`
