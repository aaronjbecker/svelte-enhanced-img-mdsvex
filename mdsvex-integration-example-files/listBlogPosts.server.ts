import type { PostMetadata } from "./types";

export const fetchPosts = async ({ offset = 0, limit = 10, category = null }: { offset?: number, limit?: number, category?: string | null }): Promise<PostMetadata[]> => {
    const posts: PostMetadata[] = await Promise.all(
        Object.entries(import.meta.glob('/src/posts/*.md')).map(async ([path, resolver]) => {
            // mdxvex populates frontmatter into a metadata object
            const { metadata } = await resolver() as { metadata: PostMetadata };
            const slug = path.split('/').pop()?.slice(0, -3) || '';
            return { ...metadata, slug }
        })
    );

    let sortedPosts = posts.sort((a, b) => new Date(b.articlePublishedTime).getTime() - new Date(a.articlePublishedTime).getTime())

    if (category) {
        sortedPosts = sortedPosts.filter(post => post.categories?.includes(category))
    }

    if (offset) {
        sortedPosts = sortedPosts.slice(offset)
    }

    if (limit && limit < sortedPosts.length && limit != -1) {
        sortedPosts = sortedPosts.slice(0, limit)
    }

    return sortedPosts;
}