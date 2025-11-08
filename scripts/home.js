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
    getCoverImagePath(story) {
      if (!story.cover_image || !story.filename) return story.cover_image;
      // If the image path is already absolute (starts with http:// or https://), return as-is
      if (story.cover_image.startsWith('http://') || story.cover_image.startsWith('https://')) {
        return story.cover_image;
      }
      // Otherwise, resolve relative to the story directory
      return `stories/${story.filename}/${story.cover_image}`;
    }
  },
  async mounted() {
    // Fetch the stories index to get list of available story directories
    const indexResponse = await fetch('stories/index.json');
    const index = await indexResponse.json();
    
    // Fetch all story files dynamically from their directories
    const storyPromises = index.stories.map(async (storyDir) => {
      const response = await fetch(`stories/${storyDir}/story.json`);
      const storyData = await response.json();
      return {
        ...storyData,
        filename: storyDir  // Directory name, used for linking
      };
    });
    
    this.stories = await Promise.all(storyPromises);
  }
}).mount('#app');

