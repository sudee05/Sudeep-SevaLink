import { Bell, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button' 
import { supabase } from '@/lib/supabase'


export function PortalTopbar({ title }) {
 async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-4 py-3 backdrop-blur lg:px-6">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-64 pl-9" placeholder="Search here..." />
        </div>
        <ThemeToggle />
        <Button variant="outline" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <Button onClick={() => logout()}>
          Logout
        </Button>
      </div>
    </div>
  )
}
