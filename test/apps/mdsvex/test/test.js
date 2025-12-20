import { expect, test } from '@playwright/test';

test('blog post listing page displays all posts', async ({ page }) => {
	await page.goto('/');

	// Verify page title
	await expect(page.locator('h1')).toHaveText('Blog Posts');

	// Verify all three posts are listed
	await expect(page.locator('#post-list li')).toHaveCount(3);

	// Verify posts are sorted by date (descending)
	const postTitles = await page.locator('#post-list h2').allTextContents();
	expect(postTitles).toEqual([
		'Testing Markdown Image Syntax',
		'Testing Enhanced Image Syntax',
		'Testing HTML Image Syntax'
	]);
});

test('enhanced:img syntax in mdsvex is properly transformed', async ({ page }) => {
	await page.goto('/posts/enhanced-syntax');

	// Verify the post content is rendered
	await expect(page.locator('header h1').first()).toHaveText('Testing Enhanced Image Syntax');

	// Verify the image exists
	const img = page.locator('#enhanced-test');
	await expect(img).toBeVisible();
	await expect(img).toHaveAttribute('alt', 'Test image using enhanced syntax');

	// Verify it's wrapped in a picture element
	const picture = page.locator('picture').filter({ has: img });
	await expect(picture).toBeVisible();

	// Verify multiple source formats exist (avif, webp)
	const sources = picture.locator('source');
	const sourceCount = await sources.count();
	expect(sourceCount).toBeGreaterThanOrEqual(3); // avif, webp, png

	// Verify avif source exists and has srcset
	const avifSource = picture.locator('source[type="image/avif"]').first();
	await expect(avifSource).toHaveAttribute('srcset');

	// Verify webp source exists
	const webpSource = picture.locator('source[type="image/webp"]').first();
	await expect(webpSource).toHaveAttribute('srcset');
});

test('regular img tags in mdsvex are converted when convertRegularImgTags is enabled', async ({
	page
}) => {
	await page.goto('/posts/html-syntax');

	// Verify the post content is rendered
	await expect(page.locator('header h1').first()).toHaveText('Testing HTML Image Syntax');

	// Verify the image exists
	const img = page.locator('#html-test');
	await expect(img).toBeVisible();
	await expect(img).toHaveAttribute('alt', 'Test image using HTML syntax');

	// Verify it's wrapped in a picture element
	const picture = page.locator('picture').filter({ has: img });
	await expect(picture).toBeVisible();

	// Verify multiple source formats exist
	const sources = picture.locator('source');
	const sourceCount = await sources.count();
	expect(sourceCount).toBeGreaterThanOrEqual(3); // avif, webp, png

	// Verify avif source exists and has srcset
	const avifSource = picture.locator('source[type="image/avif"]').first();
	await expect(avifSource).toHaveAttribute('srcset');

	// Verify webp source exists
	const webpSource = picture.locator('source[type="image/webp"]').first();
	await expect(webpSource).toHaveAttribute('srcset');
});

test('markdown image syntax is converted when convertMarkdownSyntax is enabled', async ({
	page
}) => {
	await page.goto('/posts/markdown-syntax');

	// Verify the post content is rendered
	await expect(page.locator('header h1').first()).toHaveText('Testing Markdown Image Syntax');

	// For markdown syntax without an id, we need to locate it by alt text
	const img = page.locator('img[alt="Test image using markdown syntax"]');
	await expect(img).toBeVisible();

	// Verify it's wrapped in a picture element
	const picture = page.locator('picture').filter({ has: img });
	await expect(picture).toBeVisible();

	// Verify multiple source formats exist
	const sources = picture.locator('source');
	const sourceCount = await sources.count();
	expect(sourceCount).toBeGreaterThanOrEqual(3); // avif, webp, png

	// Verify avif source exists and has srcset
	const avifSource = picture.locator('source[type="image/avif"]').first();
	await expect(avifSource).toHaveAttribute('srcset');

	// Verify webp source exists
	const webpSource = picture.locator('source[type="image/webp"]').first();
	await expect(webpSource).toHaveAttribute('srcset');
});

test('all three image types render with responsive srcsets', async ({ page }) => {
	// Test enhanced syntax post - check source elements have srcsets
	await page.goto('/posts/enhanced-syntax');
	const enhancedPicture = page.locator('picture').filter({ has: page.locator('#enhanced-test') });
	const enhancedSources = enhancedPicture.locator('source');
	expect(await enhancedSources.count()).toBeGreaterThanOrEqual(3); // Should have at least avif, webp, png
	const firstSource = enhancedSources.first();
	await expect(firstSource).toHaveAttribute('srcset');
	const srcset = await firstSource.getAttribute('srcset');
	expect(srcset).toBeTruthy();
	expect(srcset.length).toBeGreaterThan(0);

	// Test HTML syntax post
	await page.goto('/posts/html-syntax');
	const htmlPicture = page.locator('picture').filter({ has: page.locator('#html-test') });
	const htmlSources = htmlPicture.locator('source');
	expect(await htmlSources.count()).toBeGreaterThanOrEqual(3);

	// Test markdown syntax post
	await page.goto('/posts/markdown-syntax');
	const markdownPicture = page
		.locator('picture')
		.filter({ has: page.locator('img[alt="Test image using markdown syntax"]') });
	const markdownSources = markdownPicture.locator('source');
	expect(await markdownSources.count()).toBeGreaterThanOrEqual(3);
});

test('post metadata is correctly loaded from frontmatter', async ({ page }) => {
	await page.goto('/');

	// Check that metadata is displayed in the listing
	const enhancedPost = page.locator('[data-testid="post-link-enhanced-syntax"]');
	await expect(enhancedPost.locator('h2')).toHaveText('Testing Enhanced Image Syntax');
	await expect(enhancedPost.locator('p').first()).toContainText(
		'A blog post demonstrating enhanced:img syntax with mdsvex'
	);
	await expect(enhancedPost.locator('.meta')).toContainText('Test Author');
	await expect(enhancedPost.locator('.meta')).toContainText('2024-01-15');
	await expect(enhancedPost.locator('.categories')).toContainText('testing, images');
});
