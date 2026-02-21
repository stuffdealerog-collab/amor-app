"use client"

import { Room, RoomEvent, Track, RemoteParticipant, LocalParticipant } from 'livekit-client'
import { createClient } from '@/lib/supabase/client'

export interface VoiceParticipant {
  id: string
  name: string
  isSpeaking: boolean
  isMuted: boolean
  isLocal: boolean
}

export async function getVoiceToken(roomId: string): Promise<string | null> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('generate-livekit-token', {
    body: { room_id: roomId },
  })
  if (error) {
    console.error('Failed to get voice token:', error)
    return null
  }
  return data?.token ?? null
}

export function createVoiceRoom() {
  return new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
}

export async function connectToVoiceRoom(
  room: Room,
  token: string,
  url: string,
  onParticipantsChange: (participants: VoiceParticipant[]) => void
): Promise<void> {
  const getParticipants = (): VoiceParticipant[] => {
    const participants: VoiceParticipant[] = []

    if (room.localParticipant) {
      participants.push({
        id: room.localParticipant.identity,
        name: room.localParticipant.name || room.localParticipant.identity,
        isSpeaking: room.localParticipant.isSpeaking,
        isMuted: room.localParticipant.audioTrackPublications.size === 0 ||
          ![...room.localParticipant.audioTrackPublications.values()].some(p => !p.isMuted),
        isLocal: true,
      })
    }

    room.remoteParticipants.forEach((p: RemoteParticipant) => {
      participants.push({
        id: p.identity,
        name: p.name || p.identity,
        isSpeaking: p.isSpeaking,
        isMuted: p.audioTrackPublications.size === 0 ||
          ![...p.audioTrackPublications.values()].some(pub => !pub.isMuted),
        isLocal: false,
      })
    })

    return participants
  }

  room.on(RoomEvent.ParticipantConnected, () => onParticipantsChange(getParticipants()))
  room.on(RoomEvent.ParticipantDisconnected, () => onParticipantsChange(getParticipants()))
  room.on(RoomEvent.ActiveSpeakersChanged, () => onParticipantsChange(getParticipants()))
  room.on(RoomEvent.TrackMuted, () => onParticipantsChange(getParticipants()))
  room.on(RoomEvent.TrackUnmuted, () => onParticipantsChange(getParticipants()))
  room.on(RoomEvent.LocalTrackPublished, () => onParticipantsChange(getParticipants()))

  await room.connect(url, token)
  await room.localParticipant.setMicrophoneEnabled(true)

  onParticipantsChange(getParticipants())
}

export async function disconnectFromVoiceRoom(room: Room): Promise<void> {
  await room.disconnect()
}

export async function toggleMute(room: Room): Promise<boolean> {
  const enabled = room.localParticipant.isMicrophoneEnabled
  await room.localParticipant.setMicrophoneEnabled(!enabled)
  return !enabled
}
