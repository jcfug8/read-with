import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import { StoryPage } from './story-page.js';
import { Recognize } from './recognize.js';

// Story component (parent)
const Story = {
  components: {
    StoryPage,
    Recognize,
  },
  template: `
    <div class="story-page">
      <a href="index.html" class="back-link">← Back to Stories</a>
      <div v-if="loading" class="loading">Loading story...</div>
      <div v-else-if="pages.length > 0" class="story-container">
        <Recognize :focusPhrase="currentFocusPhrase" @result="handleRecognizeResult" />
        <StoryPage 
          v-for="(page, index) in pages" 
          :key="index"
          :pageData="page.data"
          :recognitionResult="recognitionResult"
          :isActive="index === currentPageIndex"
          @updateFocusPhrase="handleUpdateFocusPhrase"
          v-show="index === currentPageIndex"
        />
        
        <!-- Navigation -->
        <div class="navigation">
          <button 
            @click="previousPage" 
            :disabled="currentPageIndex === 0"
            class="nav-button prev-button"
          >
            ← Previous
          </button>
          <span class="page-indicator">{{ currentPageIndex + 1 }} / {{ pages.length }}</span>
          <button 
            @click="nextPage" 
            :disabled="currentPageIndex === pages.length - 1"
            class="nav-button next-button"
          >
            Next →
          </button>
        </div>
      </div>
      <div v-else class="error">Story not found</div>
    </div>
  `,
  data() {
    return {
      story: null,
      loading: true,
      pages: [],
      currentPageIndex: 0,
      recognitionResult: null,
      currentFocusPhrase: null
    };
  },
  methods: {
    handleRecognizeResult(result) {
      this.recognitionResult = result;
    },
    handleUpdateFocusPhrase(focusPhrase) {
      this.currentFocusPhrase = focusPhrase;
    },
    nextPage() {
      if (this.currentPageIndex < this.pages.length - 1) {
        this.currentPageIndex++;
      }
    },
    previousPage() {
      if (this.currentPageIndex > 0) {
        this.currentPageIndex--;
      }
    },
    buildPagesList(story) {
      const pages = [];
      
      // Front cover
      pages.push({
        data: {
          images: [story.cover_image],
          sentences: [story.title]
        }
      });
      
      // Content pages
      story.pages.forEach((page) => {
        pages.push({
          data: {
            images: page.images,
            sentences: page.sentences
          }
        });
      });
      
      // Back cover
      pages.push({
        data: {
          images: [story.cover_image],
          sentences: ['The End']
        }
      });
      
      return pages;
    }
  },
  async mounted() {
    // Get story filename from query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const storyFile = urlParams.get('story');
    
    if (!storyFile) {
      this.loading = false;
      return;
    }
    
    try {
      const response = await fetch(`stories/${storyFile}.json`);
      if (response.ok) {
        this.story = await response.json();
        this.pages = this.buildPagesList(this.story);
      }
    } catch (error) {
      console.error('Error loading story:', error);
    } finally {
      this.loading = false;
    }
  }
};

createApp({
  components: {
    Story
  },
  template: '<Story />'
}).mount('#app');
