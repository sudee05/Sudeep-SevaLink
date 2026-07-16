import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const activeTheme = theme === 'dark' || theme === 'light' ? theme : resolvedTheme === 'dark' ? 'dark' : 'light'

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(activeTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {activeTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
