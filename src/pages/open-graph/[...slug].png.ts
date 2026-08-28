import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";

const posts = await getCollection(
    "blog",
    (post) => import.meta.env.PROD ? !post.data.draft : true,
);

const pages = Object.fromEntries(
    posts.map((post) => [
        post.id,
        {
            title: post.data.title,
            description: post.data.description,
        },
    ]),
);

const { getStaticPaths, GET } = await OGImageRoute({
    pages: pages,
    getSlug: (path) => path,
    getImageOptions: (_path, page) => ({
        title: page.title,
        description: page.description,

        // Generous top padding pushes content toward the vertical center
        padding: 100,

        // Subtle dark slate gradient
        bgGradient: [
            [15, 23, 42], // Slate 900
            [30, 41, 59], // Slate 800
        ],

        // Left accent bar
        border: { color: [35, 55, 255], width: 16 },

        // Font layout
        font: {
            title: {
                size: 68,
                color: [255, 255, 255],
                families: ["Inter"],
                lineHeight: 1.15,
            },
            description: {
                size: 32,
                color: [203, 213, 225],
                families: ["Inter"],
                lineHeight: 1.4,
            },
        },
        fonts: [
            "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf",
        ],
    }),
});

export { GET, getStaticPaths };
