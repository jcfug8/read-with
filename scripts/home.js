import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

createApp({
  template: `
    <div class="home">
      <h1>Stories</h1>
      <div class="stories-grid">
        <a 
          v-for="story in stories" 
          :key="story.title" 
          :href="'story.html?story=' + story.filename.replace('.json', '')"
          class="story-card"
        >
          <img :src="story.cover_image" :alt="story.title" class="cover-image" />
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
  async mounted() {
    // Fetch the stories index to get list of available stories
    const indexResponse = await fetch('stories/index.json');
    const index = await indexResponse.json();
    
    // Fetch all story files dynamically
    const storyPromises = index.stories.map(async (filename) => {
      const response = await fetch(`stories/${filename}`);
      const storyData = await response.json();
      return {
        ...storyData,
        filename: filename
      };
    });
    
    this.stories = await Promise.all(storyPromises);
  }
}).mount('#app');

