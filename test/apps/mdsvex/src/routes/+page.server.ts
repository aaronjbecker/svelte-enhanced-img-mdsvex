// @ts-nocheck
import { fetchPosts } from '$lib/posts.server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const posts = await fetchPosts();
	return {
		posts
	};
};
