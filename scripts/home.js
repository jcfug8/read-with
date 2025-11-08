import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

createApp({
  template: `
    <div class="home">
      <h1>Stories</h1>
      <div class="stories-grid">
        <a 
          v-for="story in stories" 
          :key="story.title" 
          :href="'story.html?story=' + story.filename"
          class="story-card"
        >
          <img :src="getCoverImagePath(story)" :alt="story.title" class="cover-image" />
          <h2>{{ story.title }}</h2>
        </a>
      </div>
    </div>
  `,
  data() {
    return {
      stories: []
    };
  },
  methods: {
    getCoverImagePath(metadata) {
      if (!metadata.cover_image) return `stories/${metadata.filename}/cover.png`;
      // If the image path is already absolute (starts with http:// or https://), return as-is
      if (metadata.cover_image.startsWith('http://') || metadata.cover_image.startsWith('https://')) {
        return metadata.cover_image;
      }
      // Otherwise, resolve relative to the story directory
      return `stories/${metadata.filename}/${metadata.cover_image}`;
    }
  },
  async mounted() {
    // Fetch the stories index to get list of available story directories
    const indexResponse = await fetch('stories/index.json');
    const index = await indexResponse.json();
    
    // Fetch metadata.json for each story
    const storyPromises = index.stories.map(async (storyDir) => {
      const response = await fetch(`stories/${storyDir}/metadata.json`);
      const metadata = await response.json();
      return {
        ...metadata,
        filename: storyDir
      };
    });
    
    this.stories = await Promise.all(storyPromises);
  }
}).mount('#app');

