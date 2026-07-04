import { expect, test } from '@playwright/test';

async function openApp(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Health Journal' })).toBeVisible();
  expect(errors).toEqual([]);
}

async function addMeal(page, meal = 'Breakfast', details = 'Porridge with berries') {
  await page.getByRole('button', { name: /add meal/i }).click();
  await page.locator('#meal-name').selectOption(meal);
  await page.locator('#entry-details').fill(details);
  await page.getByRole('button', { name: /^save$/i }).click();
}

async function addDrink(page, drink = 'Black Tea') {
  await page.getByRole('button', { name: /add drink/i }).click();
  await page.getByRole('button', { name: new RegExp(drink, 'i') }).click();
  await page.getByRole('button', { name: /^save$/i }).click();
}

async function addSymptom(page, symptom = 'Bloating') {
  await page.getByRole('button', { name: /log symptom/i }).click();
  await page.locator('#entry-title').fill(symptom);
  await page.locator('#entry-rating').fill('6');
  await page.locator('#entry-details').fill('Felt uncomfortable after lunch');
  await page.getByRole('button', { name: /^save$/i }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
});

test('app loads without JavaScript errors', async ({ page }) => {
  await openApp(page);
  await expect(page.getByText('Quick add')).toBeVisible();
  await expect(page.getByText('No meals yet')).toBeVisible();
  await expect(page.getByText('No drinks yet')).toBeVisible();
});

test('adds a meal and updates the meal summary and timeline', async ({ page }) => {
  await openApp(page);
  await addMeal(page, 'Breakfast', 'Porridge with berries');

  await expect(page.locator('#meal-summary')).toContainText('Breakfast');
  await expect(page.locator('#timeline')).toContainText('Breakfast');
  await expect(page.locator('#timeline')).toContainText('Porridge with berries');
});

test('adds a drink with the drink button grid and updates the timeline', async ({ page }) => {
  await openApp(page);
  await addDrink(page, 'Black Tea');

  await expect(page.locator('#drink-summary')).toContainText('Black Tea: 300ml');
  await expect(page.locator('#timeline')).toContainText('Black Tea');
  await expect(page.locator('#timeline')).toContainText('300ml');
});

test('adds a symptom and updates the symptom summary', async ({ page }) => {
  await openApp(page);
  await addSymptom(page, 'Bloating');

  await expect(page.locator('#symptom-summary')).toContainText('Bloating: 6/10');
  await expect(page.locator('#timeline')).toContainText('Bloating');
});

test('summary cards open dedicated views and All returns to full timeline', async ({ page }) => {
  await openApp(page);
  await addMeal(page, 'Lunch', 'Chicken salad');
  await addDrink(page, 'Coffee');
  await addSymptom(page, 'Sluggishness');

  await page.getByRole('button', { name: /meals/i }).click();
  await expect(page.locator('#timeline-title')).toHaveText('Meals');
  await expect(page.locator('#timeline')).toContainText('Lunch');
  await expect(page.locator('#timeline')).not.toContainText('Coffee');

  await page.getByRole('button', { name: /^all$/i }).click();
  await expect(page.locator('#timeline-title')).toHaveText('Timeline');
  await expect(page.locator('#timeline')).toContainText('Lunch');
  await expect(page.locator('#timeline')).toContainText('Coffee');
  await expect(page.locator('#timeline')).toContainText('Sluggishness');

  await page.getByRole('button', { name: /drinks/i }).click();
  await expect(page.locator('#timeline-title')).toHaveText('Drinks');
  await expect(page.locator('#timeline')).toContainText('Coffee');
  await expect(page.locator('#timeline')).not.toContainText('Lunch');

  await page.getByRole('button', { name: /symptoms/i }).click();
  await expect(page.locator('#timeline-title')).toHaveText('Symptoms');
  await expect(page.locator('#timeline')).toContainText('Sluggishness');
  await expect(page.locator('#timeline')).not.toContainText('Coffee');
});

test('deletes an entry', async ({ page }) => {
  await openApp(page);
  await addMeal(page, 'Dinner', 'Pasta');

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /delete/i }).click();

  await expect(page.locator('#timeline')).not.toContainText('Dinner');
  await expect(page.locator('#meal-summary')).toContainText('No meals yet');
});

test('entries persist after reload', async ({ page }) => {
  await openApp(page);
  await addDrink(page, 'Rooibos');

  await page.reload();
  await expect(page.locator('#drink-summary')).toContainText('Rooibos: 300ml');
  await expect(page.locator('#timeline')).toContainText('Rooibos');
});
