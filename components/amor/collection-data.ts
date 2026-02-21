export type Rarity = "Mythic" | "Legendary" | "Epic" | "Rare" | "Common"

export interface Character {
  id: string
  name: string
  rarity: Rarity
  color: string
  boost: string
  img: string
  dropRate: number
  effect: string
  description: string
}

export interface Collection {
  id: string
  name: string
  subtitle: string
  characters: Character[]
  daysLeft: number
}

export const RARITY_ORDER: Record<Rarity, number> = {
  Mythic: 5,
  Legendary: 4,
  Epic: 3,
  Rare: 2,
  Common: 1,
}

export const RARITY_CONFIG: Record<Rarity, { label: string; glow: string }> = {
  Mythic: { label: "MYTHIC", glow: "0 0 24px rgba(255,58,110,0.6), 0 0 60px rgba(255,58,110,0.2)" },
  Legendary: { label: "LEGENDARY", glow: "0 0 20px rgba(0,255,136,0.5), 0 0 50px rgba(0,255,136,0.15)" },
  Epic: { label: "EPIC", glow: "0 0 16px rgba(144,97,249,0.45), 0 0 40px rgba(144,97,249,0.12)" },
  Rare: { label: "RARE", glow: "0 0 12px rgba(62,139,255,0.35), 0 0 30px rgba(62,139,255,0.1)" },
  Common: { label: "COMMON", glow: "none" },
}

export const RAP_COLLECTION: Collection = {
  id: "sng-rappers-s1",
  name: "СНГ Рэперы",
  subtitle: "Сезон 1 — Легенды нового поколения",
  daysLeft: 23,
  characters: [
    {
      id: "og-buda",
      name: "OG Buda",
      rarity: "Mythic",
      color: "#ff3a6e",
      boost: "+80%",
      img: "/images/collection-rap/og-buda.png",
      dropRate: 0.02,
      effect: "effect-holo",
      description: "Легенда нового поколения",
    },
    {
      id: "gone-fludd",
      name: "GONE.Fludd",
      rarity: "Legendary",
      color: "#00ff88",
      boost: "+50%",
      img: "/images/collection-rap/gone-fludd.png",
      dropRate: 0.05,
      effect: "effect-glitch",
      description: "Кислотный визионер",
    },
    {
      id: "mayot",
      name: "MAYOT",
      rarity: "Epic",
      color: "#9061f9",
      boost: "+30%",
      img: "/images/collection-rap/mayot.png",
      dropRate: 0.09,
      effect: "effect-flame",
      description: "Фиолетовое пламя",
    },
    {
      id: "macan",
      name: "MACAN",
      rarity: "Epic",
      color: "#ffc830",
      boost: "+30%",
      img: "/images/collection-rap/macan.png",
      dropRate: 0.09,
      effect: "effect-gold",
      description: "Золотой голос",
    },
    {
      id: "dora",
      name: "Дора",
      rarity: "Rare",
      color: "#ff5e94",
      boost: "+15%",
      img: "/images/collection-rap/dora.png",
      dropRate: 0.375,
      effect: "effect-sparkle",
      description: "Розовые искры",
    },
    {
      id: "dark-prince",
      name: "Тёмный принц",
      rarity: "Rare",
      color: "#1df0b8",
      boost: "+15%",
      img: "/images/collection-rap/dark-prince.png",
      dropRate: 0.375,
      effect: "effect-mist",
      description: "Тень из тумана",
    },
  ],
}

export function rollCharacter(collection: Collection): Character {
  const roll = Math.random()
  let cumulative = 0
  for (const char of collection.characters) {
    cumulative += char.dropRate
    if (roll <= cumulative) return char
  }
  return collection.characters[collection.characters.length - 1]
}
