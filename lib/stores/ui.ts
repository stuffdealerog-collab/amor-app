import { create } from 'zustand'

interface UIState {
    showNotifications: boolean
    showSettings: boolean
    showShop: boolean
    showQuests: boolean
    showEditProfile: boolean

    setShowNotifications: (show: boolean) => void
    setShowSettings: (show: boolean) => void
    setShowShop: (show: boolean) => void
    setShowQuests: (show: boolean) => void
    setShowEditProfile: (show: boolean) => void

    closeAll: () => void
}

export const useUIStore = create<UIState>((set) => ({
    showNotifications: false,
    showSettings: false,
    showShop: false,
    showQuests: false,
    showEditProfile: false,

    setShowNotifications: (show) => set({ showNotifications: show }),
    setShowSettings: (show) => set({ showSettings: show }),
    setShowShop: (show) => set({ showShop: show }),
    setShowQuests: (show) => set({ showQuests: show }),
    setShowEditProfile: (show) => set({ showEditProfile: show }),

    closeAll: () => set({
        showNotifications: false,
        showSettings: false,
        showShop: false,
        showQuests: false,
        showEditProfile: false
    })
}))
