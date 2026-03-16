/**
 * Safe localStorage wrapper that handles QuotaExceededError gracefully.
 *
 * When the quota is exceeded, it shows a toast notification and returns false.
 * All other errors are silently swallowed (matching existing store behavior).
 */
export function safePersist(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error: unknown) {
    if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.code === 22)) {
      const toast = useToast()
      toast.add({
        title: 'Storage full',
        description: 'localStorage quota exceeded. Consider clearing old data in Settings.',
        icon: 'i-lucide-hard-drive',
        color: 'warning'
      })
      return false
    }
    return false
  }
}
