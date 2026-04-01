import { test, expect, Page } from '@playwright/test';

const TEST_IMAGES_DIR = 'public/test-images';

async function startDemoMode(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  
  const demoHospitalInput = page.locator('#demo-hospital');
  const isVisible = await demoHospitalInput.isVisible({ timeout: 5000 }).catch(() => false);
  
  if (isVisible) {
    await demoHospitalInput.fill('테스트치과');
    await page.locator('#demo-region').fill('서울 강남구');
    await page.locator('button:has-text("데모 시작하기")').click();
    await page.waitForURL('**/', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  }
}

async function uploadImage(page: Page, imageName: string) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(`${TEST_IMAGES_DIR}/${imageName}`);
  await page.waitForSelector('img[src^="blob:"]', { timeout: 10000 });
}

async function openFaceBlurModal(page: Page) {
  const thumbnailContainer = page.locator('.cursor-pointer.relative').first();
  await thumbnailContainer.click({ force: true });
  await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
}

test.describe('Face Blur Modal - UI Flow', () => {
  test('should load page and start demo', async ({ page }) => {
    await startDemoMode(page);
    await expect(page).toHaveTitle(/Mediblog|병원/);
  });

  test('should upload image', async ({ page }) => {
    await startDemoMode(page);
    await uploadImage(page, 'single-face.jpg');
    await expect(page.locator('img[src^="blob:"]')).toBeVisible();
  });

  test('should open face blur modal', async ({ page }) => {
    await startDemoMode(page);
    await uploadImage(page, 'single-face.jpg');
    await openFaceBlurModal(page);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=얼굴 모자이크 처리')).toBeVisible();
  });

  test('should show mode buttons in modal', async ({ page }) => {
    await startDemoMode(page);
    await uploadImage(page, 'single-face.jpg');
    await openFaceBlurModal(page);
    
    await expect(page.locator('button:has-text("모자이크")')).toBeVisible();
    await expect(page.locator('button:has-text("이모티콘")')).toBeVisible();
    await expect(page.locator('button:has-text("원본")')).toBeVisible();
  });

  test('should show undo button disabled initially', async ({ page }) => {
    await startDemoMode(page);
    await uploadImage(page, 'single-face.jpg');
    await openFaceBlurModal(page);
    
    const undoBtn = page.locator('button:has-text("취소")');
    await expect(undoBtn).toBeDisabled();
  });

  test('should close modal on escape key', async ({ page }) => {
    await startDemoMode(page);
    await uploadImage(page, 'single-face.jpg');
    await openFaceBlurModal(page);
    
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe('Face Blur Modal - Manual Face Detection', () => {
  test.skip('should detect faces (requires manual testing)', async () => {
    test.skip(true, 'face-api.js model loading requires real browser. Run manually: npm run dev');
  });
});
