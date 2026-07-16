import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      storageKey="sevalink-theme"
      themes={['light', 'dark']}
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
