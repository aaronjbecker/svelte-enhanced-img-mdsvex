<script>
	// @ts-nocheck
	let { data } = $props();
</script>

<h1>Blog Posts</h1>
<ul id="post-list">
	{#each data.posts as post}
		<li>
			<a href="/posts/{post.slug}" data-testid="post-link-{post.slug}">
				<h2>{post.title}</h2>
				<p>{post.description}</p>
				<p class="meta">By {post.author} on {post.articlePublishedTime}</p>
				<p class="categories">Categories: {post.categories.join(', ')}</p>
			</a>
		</li>
	{/each}
</ul>
