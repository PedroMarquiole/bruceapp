import { expect, test } from './fixtures'

const telas = [
  { path: '/', heading: null, nome: 'hoje' },
  { path: '/nutricao', heading: 'Nutrição', nome: 'nutricao' },
  { path: '/treino', heading: 'Treino', nome: 'treino' },
  { path: '/evolucao', heading: 'Evolução', nome: 'evolucao' },
  { path: '/bruce', heading: 'Bruce', nome: 'bruce' },
  { path: '/perfil', heading: 'Perfil', nome: 'perfil' },
  { path: '/perfil/sistema', heading: 'Sistema visual', nome: 'sistema' },
  { path: '/habitos', heading: 'Hábitos', nome: 'habitos' },
  { path: '/treino/exercicios', heading: 'Exercícios', nome: 'exercicios' },
] as const

for (const tela of telas) {
  test(`tela ${tela.nome} abre sem rolagem horizontal`, async ({ loggedIn: page }) => {
    const erros: string[] = []
    page.on('pageerror', (e) => erros.push(e.message))
    await page.goto(tela.path)
    await page.waitForTimeout(800)
    if (tela.heading) {
      await expect(page.getByRole('heading', { level: 1, name: tela.heading })).toBeVisible()
    } else {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    }
    await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
    const larguraExtra = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(larguraExtra).toBe(0)
    expect(erros).toEqual([])
    await page.screenshot({ path: `test-results/screens/${tela.nome}.png` })
    await page.screenshot({ path: `test-results/screens/${tela.nome}-inteira.png`, fullPage: true })
  })
}

test('manifesto do PWA está publicado', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.name).toBe('Bruceapp')
  expect(manifest.display).toBe('standalone')
})

test('rota desconhecida cai no index (SPA) e mostra a tela de não encontrado', async ({
  loggedIn: page,
}) => {
  await page.goto('/qualquer-coisa')
  await expect(page.getByRole('heading', { name: 'Tela não encontrada' })).toBeVisible()
})
