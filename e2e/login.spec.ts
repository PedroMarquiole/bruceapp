import { expect, test, fakeSession } from './fixtures'

test('sem sessão, abre a tela de entrada', async ({ loggedOut: page }) => {
  await page.goto('/treino')
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toHaveCount(0)
  await page.screenshot({ path: 'test-results/screens/login.png' })
})

test('fluxo completo: e-mail, código e entrada no app', async ({ loggedOut: page }) => {
  const pedidos: string[] = []
  await page.route('**/auth/v1/otp**', async (route) => {
    pedidos.push(route.request().postDataJSON().email)
    await route.fulfill({ status: 200, json: {} })
  })
  await page.route('**/auth/v1/verify**', async (route) => {
    const body = route.request().postDataJSON()
    if (body.token !== '123456') {
      return route.fulfill({
        status: 403,
        json: { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' },
      })
    }
    await route.fulfill({ status: 200, json: fakeSession() })
  })

  await page.goto('/')
  await page.getByLabel('E-mail').fill('eu@teste.invalid')
  await page.getByRole('button', { name: 'Enviar código' }).click()
  await expect(page.getByLabel('Código')).toBeFocused()
  expect(pedidos).toEqual(['eu@teste.invalid'])
  await page.screenshot({ path: 'test-results/screens/login-codigo.png' })

  await page.getByLabel('Código').fill('000000')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('Código inválido ou expirado')

  await page.getByLabel('Código').fill('123456')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
})
