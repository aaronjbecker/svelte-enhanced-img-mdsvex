---
title: Test Markdown File
---

<script>
	
	import existing from './existing.js';

</script>

# Test Markdown Images

Regular markdown image syntax:
<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="Alt text for markdown" width=1440 height=1440 /></picture>

Enhanced img tag:
<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="enhanced test" width=1440 height=1440 /></picture>

Regular img tag:
<picture><source srcset="/1 1440w, /2 960w" type="image/avif" /><source srcset="/3 1440w, /4 960w" type="image/webp" /><source srcset="5 1440w, /6 960w" type="image/png" /><img src="/7" alt="regular img test" width=1440 height=1440 /></picture>

Image with sizes:
<picture><source srcset="/1 1440w, /2 960w" sizes="(min-width: 60rem) 80vw, 100vw" type="image/avif" /><source srcset="/3 1440w, /4 960w" sizes="(min-width: 60rem) 80vw, 100vw" type="image/webp" /><source srcset="5 1440w, /6 960w" sizes="(min-width: 60rem) 80vw, 100vw" type="image/png" /><img src="/7" alt="sizes test" width=1440 height=1440 /></picture>

Some regular content here.

Another markdown image:
<picture><source srcset={"__VITE_ASSET__2AM7_y_a__ 1440w, __VITE_ASSET__2AM7_y_b__ 960w"} type="image/avif" /><source srcset={"__VITE_ASSET__2AM7_y_c__ 1440w, __VITE_ASSET__2AM7_y_d__ 960w"} type="image/webp" /><source srcset={"__VITE_ASSET__2AM7_y_e__ 1440w, __VITE_ASSET__2AM7_y_f__ 960w"} type="image/png" /><img src={"__VITE_ASSET__2AM7_y_g__"} alt="Another test" width=1440 height=1440 /></picture>
