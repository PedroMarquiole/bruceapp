import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom não implementa scrollTo; o ScrollRestoration do router o chama ao navegar.
window.scrollTo = () => {}
