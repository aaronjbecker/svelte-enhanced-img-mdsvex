<script>
	// @ts-nocheck
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.metadata.title}</title>
</svelte:head>

<article id="post-content">
	<header>
		<h1>{data.metadata.title}</h1>
		<p class="meta">By {data.metadata.author} on {data.metadata.articlePublishedTime}</p>
	</header>

	<data.component />
</article>

<a href="/">Back to posts</a>
