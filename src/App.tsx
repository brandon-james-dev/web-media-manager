import { useState } from 'react'
import { Button } from './components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './components/ui/card'
import { ModeToggle } from './components/mode-toggle'
import { ThemeProvider } from "./components/theme-provider"
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <ThemeProvider storageKey="vite-ui-theme">
        <ModeToggle />
        <div className="flex justify-center">
          <a href="https://vite.dev" target="_blank" rel='noopener'>
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank" rel='noopener'>
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <div className="flex justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="text-2xl">Vite + React</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setCount((count) => count + 1)}>
                count is {count}
              </Button>
            </CardContent>
            <CardFooter>
              <p className="read-the-docs">
                Click on the Vite and React logos to learn more
              </p>
            </CardFooter>
          </Card>
        </div>
      </ThemeProvider>
    </>
  )
}

export default App
