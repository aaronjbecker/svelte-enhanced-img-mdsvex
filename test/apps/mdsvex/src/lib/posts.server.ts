import type { PostMetadata } from './types';

export const fetchPosts = async (): Promise<PostMetadata[]> => {
	const posts: PostMetadata[] = await Promise.all(
		Object.entries(import.meta.glob('/src/posts/*.md')).map(async ([path, resolver]) => {
			// mdsvex populates frontmatter into a metadata object
			const { metadata } = (await resolver()) as { metadata: PostMetadata };
			const slug = path.split('/').pop()?.slice(0, -3) || '';
			return { ...metadata, slug };
		})
	);

	// Sort by date descending
	return posts.sort(
		(a, b) => new Date(b.articlePublishedTime).getTime() - new Date(a.articlePublishedTime).getTime()
	);
};
