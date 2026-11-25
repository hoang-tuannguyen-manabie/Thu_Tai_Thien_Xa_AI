"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Edit3,
  Gamepad2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react"
import {
  CHARACTERS_SPRITE_SHEET,
  getCharacterById,
  PLAYER_CHARACTERS,
  type PlayerCharacter,
  type PlayerProfile,
} from "@/lib/characters"
import { gameAudio } from "@/lib/audio"

export type SetupStep = "name" | "character" | "confirm"

export interface PlayerSetupModalProps {
  open: boolean
  initialProfile: PlayerProfile | null
  initialStep?: SetupStep
  onConfirm: (profile: PlayerProfile) => void
  onClose?: () => void
}

/**
 * Renders an individual companion character avatar with lazy-loading
 * and automatic CSS sprite-sheet fallback (513x486 grid) if the individual PNG fails.
 */
export function CharacterAvatar({
  character,
  className = "w-full h-full",
  imgClassName = "w-full h-full object-contain",
}: {
  character: PlayerCharacter
  className?: string
  imgClassName?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [useSpriteFallback, setUseSpriteFallback] = useState(false)

  const { x, y, width, height } = character.cropRect
  const bgPosX = (x / (513 - width)) * 100
  const bgPosY = (y / (486 - height)) * 100
  const bgSizeX = (513 / width) * 100
  const bgSizeY = (486 / height) * 100

  return (
    <div className={`relative overflow-hidden flex items-center justify-center select-none ${className}`}>
      {!loaded && !useSpriteFallback && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#dcfce7] animate-pulse rounded-xl"
          aria-hidden="true"
        />
      )}

      {!useSpriteFallback ? (
        <img
          src={character.image}
          alt={character.name}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setUseSpriteFallback(true)
            setLoaded(true)
          }}
          className={`${imgClassName} transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <div
          role="img"
          aria-label={character.name}
          className="w-full h-full rounded-xl"
          style={{
            backgroundImage: `url(${CHARACTERS_SPRITE_SHEET})`,
            backgroundPosition: `${bgPosX.toFixed(3)}% ${bgPosY.toFixed(3)}%`,
            backgroundSize: `${bgSizeX.toFixed(3)}% ${bgSizeY.toFixed(3)}%`,
            backgroundRepeat: "no-repeat",
          }}
        />
      )}
    </div>
  )
}

export function PlayerSetupModal({
  open,
  initialProfile,
  initialStep = "name",
  onConfirm,
  onClose,
}: PlayerSetupModalProps) {
  const [step, setStep] = useState<SetupStep>(initialStep)
  const [rawName, setRawName] = useState<string>(initialProfile?.playerName ?? "")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [selectedCharId, setSelectedCharId] = useState<string>(
    initialProfile?.characterId ?? PLAYER_CHARACTERS[0].id
  )
  const nameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) {
      setStep(initialStep)
      setRawName(initialProfile?.playerName ?? "")
      setSelectedCharId(initialProfile?.characterId ?? PLAYER_CHARACTERS[0].id)
      setErrorMsg(null)
    }
  }, [open, initialStep, initialProfile])

  useEffect(() => {
    if (open && step === "name") {
      const timer = window.setTimeout(() => {
        nameInputRef.current?.focus()
      }, 80)
      return () => window.clearTimeout(timer)
    }
  }, [open, step])

  if (!open) return null

  const selectedCharacter = getCharacterById(selectedCharId)

  const validateName = (input: string): { valid: boolean; cleaned: string; error: string | null } => {
    const cleaned = input.trim()
    if (input.length === 0) {
      return {
        valid: false,
        cleaned: "",
        error: "Vui lòng nhập tên của em trước khi tiếp tục nhé!",
      }
    }
    if (cleaned.length === 0) {
      return {
        valid: false,
        cleaned: "",
        error: "Tên không được chỉ chứa khoảng trắng. Hãy nhập tên thật hoặc biệt danh nhé!",
      }
    }
    if (cleaned.length > 20) {
      return {
        valid: false,
        cleaned: cleaned.slice(0, 20),
        error: "Tên tối đa 20 ký tự để hiển thị đẹp nhất trên bảng điểm!",
      }
    }
    return { valid: true, cleaned, error: null }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.length > 20) {
      setRawName(val.slice(0, 20))
      setErrorMsg("Tên tối đa 20 ký tự!")
      return
    }
    setRawName(val)
    if (errorMsg) setErrorMsg(null)
  }

  const handleProceedToCharacter = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    gameAudio.init()
    const res = validateName(rawName)
    if (!res.valid) {
      setErrorMsg(res.error)
      nameInputRef.current?.focus()
      return
    }
    gameAudio.playClick()
    setRawName(res.cleaned)
    setErrorMsg(null)
    setStep("character")
  }

  const handleSelectCharacter = (char: PlayerCharacter) => {
    gameAudio.init()
    gameAudio.playClick()
    setSelectedCharId(char.id)
  }

  const handleGridKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null
    if (e.key === "ArrowRight") nextIndex = (index + 1) % PLAYER_CHARACTERS.length
    else if (e.key === "ArrowLeft")
      nextIndex = (index - 1 + PLAYER_CHARACTERS.length) % PLAYER_CHARACTERS.length
    else if (e.key === "ArrowDown") nextIndex = Math.min(PLAYER_CHARACTERS.length - 1, index + 6)
    else if (e.key === "ArrowUp") nextIndex = Math.max(0, index - 6)

    if (nextIndex !== null) {
      e.preventDefault()
      const nextChar = PLAYER_CHARACTERS[nextIndex]
      handleSelectCharacter(nextChar)
      const btn = document.getElementById(`char-option-${nextChar.id}`)
      btn?.focus()
    } else if (e.key === "Enter") {
      e.preventDefault()
      gameAudio.playClick()
      setStep("confirm")
    }
  }

  const handleConfirmStartGame = () => {
    const res = validateName(rawName)
    if (!res.valid) {
      setStep("name")
      setErrorMsg(res.error)
      return
    }
    gameAudio.init()
    gameAudio.playClick()
    onConfirm({
      playerName: res.cleaned,
      characterId: selectedCharacter.id,
      characterImage: selectedCharacter.image,
      characterName: selectedCharacter.name,
    })
  }

  return (
    <div
      className="player-setup-backdrop fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-[#1b3a8a]/45 backdrop-blur-md overflow-hidden select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-setup-title"
    >
      {/* Split Pastel Mint / Sky background accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-70" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 w-1/2 bg-[#ebf9f1]/80" />
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[#eaf2ff]/80" />
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#d3f2df]" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#d6e6ff]" />
      </div>

      <div className="player-setup-dialog relative w-full max-w-3xl md:max-w-4xl h-auto max-h-[95dvh] rounded-2xl sm:rounded-3xl bg-white border-4 border-[#395ad2] shadow-[0_8px_0_#1b3a8a,0_24px_60px_rgba(27,58,138,0.28)] overflow-hidden flex flex-col">
        {/* Royal Navy Step Header */}
        <div className="player-setup-header px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Step 1 */}
            <button
              type="button"
              onClick={() => {
                gameAudio.playClick()
                setStep("name")
              }}
              className={`player-step-pill ${step === "name" ? "is-active" : ""}`}
            >
              <span className="player-step-badge">1</span>
              <span>Nhập tên</span>
            </button>

            <span className="text-white/60 text-xs font-black">›</span>

            {/* Step 2 */}
            <button
              type="button"
              onClick={() => {
                const res = validateName(rawName)
                if (!res.valid) {
                  setErrorMsg(res.error)
                  setStep("name")
                  return
                }
                gameAudio.playClick()
                setRawName(res.cleaned)
                setStep("character")
              }}
              className={`player-step-pill ${step === "character" ? "is-active" : ""}`}
            >
              <span className="player-step-badge">2</span>
              <span>Chọn đồng hành (36)</span>
            </button>

            <span className="text-white/60 text-xs font-black">›</span>

            {/* Step 3 */}
            <button
              type="button"
              onClick={() => {
                const res = validateName(rawName)
                if (!res.valid) {
                  setErrorMsg(res.error)
                  setStep("name")
                  return
                }
                gameAudio.playClick()
                setRawName(res.cleaned)
                setStep("confirm")
              }}
              className={`player-step-pill ${step === "confirm" ? "is-active" : ""}`}
            >
              <span className="player-step-badge">3</span>
              <span>Xác nhận</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-[10px] font-extrabold uppercase tracking-wider">
              <Sparkles size={12} />
              <span>Thử Tài Xạ Thủ AI</span>
            </span>
            {onClose && (
              <button
                type="button"
                onClick={() => {
                  gameAudio.playClick()
                  onClose()
                }}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Đóng cửa sổ thiết lập người chơi"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Main Modal Body */}
        <div className="p-3 sm:p-5 flex flex-col flex-1 min-h-0 overflow-hidden bg-gradient-to-b from-[#f8fbff] to-white justify-between">
          {/* STEP 1: ENTER PLAYER NAME */}
          {step === "name" && (
            <form
              onSubmit={handleProceedToCharacter}
              className="flex flex-col items-center justify-center text-center gap-3 sm:gap-4 py-2 px-2 max-w-lg mx-auto w-full flex-1 my-auto"
              noValidate
            >
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-[#ebf9f1] border-4 border-[#42b883] p-1.5 shadow-[0_4px_0_#15803d] flex items-center justify-center shrink-0">
                <CharacterAvatar
                  character={selectedCharacter}
                  className="w-full h-full rounded-2xl"
                  imgClassName="w-full h-full object-contain"
                />
                <span className="absolute -bottom-2.5 px-2.5 py-0.5 rounded-full bg-[#42b883] border-2 border-white text-white text-[10px] font-black uppercase tracking-wider shadow">
                  36 Nhân Vật
                </span>
              </div>

              <div className="flex flex-col gap-1 mt-1 text-center">
                <h2
                  id="player-setup-title"
                  className="text-lg sm:text-2xl font-black text-[#24304a] tracking-tight"
                >
                  Chào mừng Xạ Thủ AI tương lai!
                </h2>
                <p className="text-xs sm:text-sm text-[#64708a] font-semibold leading-relaxed">
                  Nhập tên của em và chọn nhân vật đồng hành trước khi bước vào đấu trường bắn bia AI.
                </p>
              </div>

              <div className="w-full flex flex-col gap-1.5 text-left">
                <div className="flex items-center justify-between px-1">
                  <label
                    htmlFor="player-name-input"
                    className="text-xs font-extrabold uppercase tracking-wider text-[#24304a]"
                  >
                    Tên xạ thủ <span className="text-[#ff9b42]">*</span>
                  </label>
                  <span
                    className={`text-xs font-mono font-bold ${
                      rawName.trim().length >= 18 ? "text-[#d97706]" : "text-[#7e89a2]"
                    }`}
                  >
                    {rawName.trim().length}/20 ký tự
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={nameInputRef}
                    id="player-name-input"
                    type="text"
                    inputMode="text"
                    enterKeyHint="next"
                    autoComplete="nickname"
                    maxLength={20}
                    value={rawName}
                    onChange={handleNameChange}
                    placeholder="Nhập tên hoặc biệt danh của em..."
                    aria-invalid={Boolean(errorMsg)}
                    aria-describedby={errorMsg ? "player-name-error" : undefined}
                    className={`w-full px-4 py-3 rounded-2xl bg-[#f4f6fc] border-3 text-sm sm:text-base font-extrabold text-[#24304a] placeholder:text-[#9ba4b6] focus:outline-none focus:bg-white transition-all ${
                      errorMsg
                        ? "border-[#ef5350] focus:border-[#ef5350] shadow-[0_3px_0_#b91c1c]"
                        : "border-[#9baae8] focus:border-[#395ad2] shadow-[0_3px_0_#cbd5e1] focus:shadow-[0_3px_0_#2644af]"
                    }`}
                  />
                  {rawName.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawName("")
                        setErrorMsg(null)
                        nameInputRef.current?.focus()
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
                      title="Xóa tên đang nhập"
                      aria-label="Xóa tên đang nhập"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {errorMsg && (
                  <div
                    id="player-name-error"
                    role="alert"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-bold"
                  >
                    <AlertCircle size={15} className="text-red-600 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="primary-button w-full mt-1"
              >
                <span>TIẾP TỤC CHỌN NHÂN VẬT ĐỒNG HÀNH</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: SELECT COMPANION CHARACTER (36 CHARACTERS) */}
          {step === "character" && (
            <div className="flex flex-col gap-2.5 flex-1 min-h-0">
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <h2
                    id="player-setup-title"
                    className="text-base sm:text-xl font-black text-[#24304a] tracking-tight truncate"
                  >
                    Chọn nhân vật đồng hành
                  </h2>
                  <p className="text-xs text-[#64708a] font-semibold truncate">
                    Xin chào xạ thủ <strong className="text-[#42b883] font-extrabold">{rawName.trim()}</strong>! Hãy chọn 1 trong 36 người bạn đồng hành:
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#ebf9f1] border-2 border-[#42b883] shrink-0 shadow-xs">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-[#86efac] shrink-0 p-0.5">
                    <CharacterAvatar character={selectedCharacter} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] uppercase font-extrabold text-[#15803d] tracking-wider leading-none">
                      Đang chọn:
                    </span>
                    <span className="text-xs sm:text-sm font-black text-[#24304a] leading-tight truncate max-w-[110px] sm:max-w-[150px]">
                      {selectedCharacter.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* 36 Characters Grid */}
              <div
                role="radiogroup"
                aria-label="Danh sách 36 nhân vật đồng hành"
                className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-1.5 sm:gap-2 overflow-y-auto p-1 flex-1 min-h-0 items-center justify-items-center"
              >
                {PLAYER_CHARACTERS.map((char, idx) => {
                  const isSelected = char.id === selectedCharId
                  return (
                    <button
                      key={char.id}
                      id={`char-option-${char.id}`}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={char.name}
                      onClick={() => handleSelectCharacter(char)}
                      onKeyDown={(e) => handleGridKeyDown(e, idx)}
                      className={`group relative rounded-xl sm:rounded-2xl p-1 flex flex-col items-center justify-center transition-all duration-150 cursor-pointer select-none focus:outline-none aspect-square w-full max-w-[64px] ${
                        isSelected
                          ? "bg-[#ebf9f1] border-3 border-[#42b883] shadow-[0_3px_0_#15803d] scale-105 z-10"
                          : "bg-white hover:bg-[#eaf2ff] border border-[#dbeafe] hover:border-[#395ad2]"
                      }`}
                      title={char.name}
                    >
                      {isSelected && (
                        <span
                          className="absolute -top-1 -right-1 z-20 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-[#42b883] border-2 border-white text-white flex items-center justify-center shadow"
                          aria-hidden="true"
                        >
                          <Check size={11} strokeWidth={3.2} />
                        </span>
                      )}

                      <div className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden flex items-center justify-center p-0.5">
                        <CharacterAvatar
                          character={char}
                          className="w-full h-full"
                          imgClassName="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick()
                    setStep("name")
                  }}
                  className="secondary-button"
                >
                  <ArrowLeft size={16} />
                  <span>SỬA LẠI TÊN</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    gameAudio.playClick()
                    setStep("confirm")
                  }}
                  className="primary-button"
                >
                  <span>XÁC NHẬN NHÂN VẬT</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRM PROFILE */}
          {step === "confirm" && (
            <div className="flex flex-col items-center justify-center text-center gap-3 py-2 px-2 max-w-md mx-auto w-full flex-1 my-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ebf9f1] border-2 border-[#42b883] text-[#15803d] text-xs font-black uppercase tracking-wider">
                <ShieldCheck size={15} />
                <span>Hồ sơ Xạ Thủ AI đã sẵn sàng</span>
              </div>

              <div className="w-full rounded-3xl bg-gradient-to-br from-[#ebf9f1] via-[#f4f6fc] to-[#eaf2ff] border-2 border-[#9baae8] p-4 flex flex-col items-center gap-2.5 relative overflow-hidden shadow-sm">
                <div className="relative w-20 h-20 rounded-2xl bg-white border-4 border-[#42b883] p-1.5 shadow-[0_4px_0_#15803d]">
                  <CharacterAvatar
                    character={selectedCharacter}
                    className="w-full h-full rounded-xl"
                    imgClassName="w-full h-full object-contain"
                  />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#42b883] border-2 border-white text-white flex items-center justify-center shadow">
                    <Check size={13} strokeWidth={3} />
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#64708a]">
                    Xạ Thủ AI
                  </span>
                  <h3
                    id="player-setup-title"
                    className="text-xl sm:text-2xl font-black text-[#24304a] tracking-wide"
                  >
                    {rawName.trim()}
                  </h3>
                  <div className="inline-flex items-center justify-center gap-1.5 mt-0.5 px-3 py-1 rounded-full bg-white border border-[#9baae8] text-[#395ad2] text-xs font-bold shadow-2xs">
                    <span>Bạn đồng hành:</span>
                    <strong className="text-[#24304a] font-black">{selectedCharacter.name}</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 w-full mt-1">
                <button
                  type="button"
                  onClick={handleConfirmStartGame}
                  className="primary-button w-full"
                >
                  <Gamepad2 size={19} />
                  <span>VÀO SÂN CHƠI XẠ THỦ AI</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClick()
                      setStep("name")
                    }}
                    className="secondary-button justify-center"
                  >
                    <Edit3 size={15} />
                    <span>ĐỔI TÊN</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      gameAudio.playClick()
                      setStep("character")
                    }}
                    className="secondary-button justify-center"
                  >
                    <RefreshCw size={15} />
                    <span>ĐỔI NHÂN VẬT</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
