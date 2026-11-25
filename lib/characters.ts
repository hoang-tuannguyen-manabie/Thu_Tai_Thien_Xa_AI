export interface PlayerCharacter {
  id: string
  name: string
  image: string
  row: number
  col: number
  /** Pixel coordinates on the 513x486 characters-sprite.png sheet */
  cropRect: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface PlayerProfile {
  playerName: string
  characterId: string
  characterImage: string
  characterName: string
}

export const CHARACTERS_SPRITE_SHEET = "/assets/characters/characters-sprite.png"
export const PLAYER_PROFILE_STORAGE_KEY = "manabie_ai_sniper_player_profile_2026"

const COL_RANGES: Array<[number, number]> = [
  [10, 90],
  [99, 168],
  [179, 254],
  [260, 331],
  [343, 417],
  [429, 500],
]

const ROW_RANGES: Array<[number, number]> = [
  [26, 104],
  [112, 185],
  [191, 265],
  [271, 338],
  [347, 412],
  [418, 477],
]

const CHARACTER_NAMES: string[] = [
  // Row 1
  "Mana Thông Thái",
  "Robot Nano Xanh",
  "Thỏ Trắng Tinh Anh",
  "Cáo Cam Phi Hành",
  "Gấu Trúc Tre Xanh",
  "Cánh Cụt Mũ Len",
  // Row 2
  "Mèo Tím Vũ Trụ",
  "Gà Vàng Năng Động",
  "Quái Nhỏ Một Mắt",
  "Khủng Long Xanh Ngọc",
  "Mèo Trắng Đọc Sách",
  "Bạn Nhỏ Sao Hỏa",
  // Row 3
  "Bạn Nhỏ Sao Mộc",
  "Cừu Bông Học Bá",
  "Hổ Ngầu Kính Râm",
  "Thỏ Hồng Nơ Xinh",
  "Gấu Koala Xanh",
  "Robot Trắng Tương Lai",
  // Row 4
  "Tuần Lộc Khăn Xanh",
  "Cánh Cụt Kính Bơi",
  "Rồng Tím Đáng Yêu",
  "Ếch Xanh Vui Nhộn",
  "Bé Sao Băng Xanh",
  "Cáo Đỏ Thám Hiểm",
  // Row 5
  "Kỳ Lân Cầu Vồng",
  "Cú Nâu Thông Thái",
  "Sứa Biển Phát Sáng",
  "Cún Vàng Đáng Yêu",
  "Nấm Đỏ Tinh Nghịch",
  "Robot Mèo Cyber",
  // Row 6
  "Cá Voi Đại Dương",
  "Mầm Xanh Hiếu Học",
  "Cua Đỏ Vui Vẻ",
  "Cú Xanh Đọc Sách",
  "Hà Mã Thân Thiện",
  "Ngôi Sao Lấp Lánh",
]

export const PLAYER_CHARACTERS: PlayerCharacter[] = CHARACTER_NAMES.map((name, index) => {
  const row = Math.floor(index / 6)
  const col = index % 6
  const [x1, x2] = COL_RANGES[col]
  const [y1, y2] = ROW_RANGES[row]
  const idNum = String(index + 1).padStart(2, "0")

  return {
    id: `character-${idNum}`,
    name,
    image: `/assets/characters/character-${idNum}.png`,
    row,
    col,
    cropRect: {
      x: x1,
      y: y1,
      width: x2 - x1 + 1,
      height: y2 - y1 + 1,
    },
  }
})

export function getCharacterById(characterId?: string | null): PlayerCharacter {
  if (!characterId) return PLAYER_CHARACTERS[0]
  return PLAYER_CHARACTERS.find((c) => c.id === characterId) || PLAYER_CHARACTERS[0]
}

export function loadSavedPlayerProfile(): PlayerProfile | null {
  if (typeof window === "undefined") return null
  try {
    const raw =
      window.sessionStorage.getItem(PLAYER_PROFILE_STORAGE_KEY) ??
      window.localStorage.getItem(PLAYER_PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>
    if (
      parsed &&
      typeof parsed.playerName === "string" &&
      parsed.playerName.trim().length > 0 &&
      typeof parsed.characterId === "string"
    ) {
      const char = getCharacterById(parsed.characterId)
      return {
        playerName: parsed.playerName.trim().slice(0, 20),
        characterId: char.id,
        characterImage: char.image,
        characterName: char.name,
      }
    }
  } catch {
    // ignore storage errors
  }
  return null
}

export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === "undefined") return
  try {
    const serialized = JSON.stringify(profile)
    window.sessionStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, serialized)
    window.localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, serialized)
  } catch {
    // ignore storage errors
  }
}
