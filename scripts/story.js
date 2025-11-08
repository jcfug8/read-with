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
        <Recognize 
          :focusPhrase="currentFocusPhrase" 
          @result="handleRecognizeResult" 
          @recognizing="handleRecognizing"
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
        
        <StoryPage 
          v-for="(page, index) in pages" 
          :key="index"
          :ref="el => { if (el) pageRefs[index] = el }"
          :pageData="page.data"
          :isCurrentPage="index === currentPageIndex"
          v-show="index === currentPageIndex"
        />
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
      currentFocusPhrase: null,
      storyFile: null,
      pageRefs: {},
      focusPhraseSize: 5,
    };
  },
  watch: {
    currentPageIndex(newIndex) {
      this.updateUrl();
      if (this.pageRefs[newIndex]) {
        this.currentFocusPhrase = this.pageRefs[newIndex].getFocusPhrase(this.focusPhraseSize);
      }
    },
  },
  methods: {
    updateUrl() {
      if (!this.storyFile) return;
      
      const url = new URL(window.location);
      url.searchParams.set('story', this.storyFile);
      url.searchParams.set('page', this.currentPageIndex);
      window.history.pushState({}, '', url);
    },
    handleRecognizing() {
      this.currentFocusPhrase = this.pageRefs[this.currentPageIndex].getFocusPhrase(this.focusPhraseSize);
    },
    handleRecognizeResult(result) {
      const allWords = [];
      for (let i = 0; i < result.length; i++) {
        const transcript = result[i];
        const words = transcript.trim().split(/\s+/);
        allWords.push(...words);
      }

      for (let i = 0; i < allWords.length; i++) {
        this.pageRefs[this.currentPageIndex].processRecognitionResult(allWords[i])
      }

      this.currentFocusPhrase = this.pageRefs[this.currentPageIndex].getFocusPhrase(this.focusPhraseSize);
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
    // Get story filename and page from query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const storyFile = urlParams.get('story');
    const pageParam = urlParams.get('page');
    
    if (!storyFile) {
      this.loading = false;
      return;
    }
    
    this.storyFile = storyFile;
    
    // Set initial page from query param if provided
    if (pageParam !== null) {
      const pageIndex = parseInt(pageParam, 10);
      if (!isNaN(pageIndex) && pageIndex >= 0) {
        this.currentPageIndex = pageIndex;
      }
    }
    
    try {
      const response = await fetch(`stories/${storyFile}.json`);
      if (response.ok) {
        this.story = await response.json();
        this.pages = this.buildPagesList(this.story);
        
        // Validate and adjust page index after pages are loaded
        if (this.currentPageIndex >= this.pages.length) {
          this.currentPageIndex = this.pages.length - 1;
        }
        
        // Update URL with initial page
        this.updateUrl();
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
