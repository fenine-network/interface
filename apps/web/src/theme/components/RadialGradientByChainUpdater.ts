import { useIsNftPage } from 'hooks/useIsNftPage'
import { useEffect } from 'react'
import { useDarkModeManager } from 'theme/components/ThemeToggle'
import { darkTheme, lightTheme } from '../colors'

const initialStyles = {
  width: '200vw',
  height: '200vh',
  transform: 'translate(-50vw, -100vh)',
}
const backgroundResetStyles = {
  width: '100vw',
  height: '100vh',
  transform: 'unset',
}

type TargetBackgroundStyles = typeof initialStyles | typeof backgroundResetStyles

const backgroundRadialGradientElement = document.getElementById('background-radial-gradient')
const setBackground = (newValues: TargetBackgroundStyles) =>
  Object.entries(newValues).forEach(([key, value]) => {
    if (backgroundRadialGradientElement) {
      backgroundRadialGradientElement.style[key as keyof typeof backgroundResetStyles] = value
    }
  })

function setDefaultBackground(backgroundRadialGradientElement: HTMLElement, darkMode?: boolean) {
  setBackground(initialStyles)
  const lightGradient =
    'radial-gradient(100% 120% at 50% 0%, rgba(59, 60, 58, 0.12) 0%, rgba(59, 60, 58, 0.04) 42%, rgba(250, 247, 227, 0) 100%), #FAF7E3'
  const darkGradient =
    'radial-gradient(100% 120% at 50% 0%, rgba(250, 247, 227, 0.16) 0%, rgba(250, 247, 227, 0.04) 42%, rgba(59, 60, 58, 0) 100%), #3B3C3A'
  backgroundRadialGradientElement.style.background = darkMode ? darkGradient : lightGradient
}

export default function RadialGradientByChainUpdater(): null {
  const [darkMode] = useDarkModeManager()
  const isNftPage = useIsNftPage()

  // manage background color
  useEffect(() => {
    if (!backgroundRadialGradientElement) {
      return
    }

    if (isNftPage) {
      setBackground(initialStyles)
      backgroundRadialGradientElement.style.background = darkMode ? darkTheme.surface1 : lightTheme.surface1
      return
    }
    setBackground(backgroundResetStyles)
    setDefaultBackground(backgroundRadialGradientElement, darkMode)
  }, [darkMode, isNftPage])
  return null
}
