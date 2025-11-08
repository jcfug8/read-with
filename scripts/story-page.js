import { Sentence } from './sentence.js';

// StoryPage component (child)
export const StoryPage = {
  components: {
    Sentence
  },
  props: ['pageData', 'isCurrentPage', 'storyDir', 'pageStyle'],
  template: `
    <div :class="['content-page', { 'cover-back-page': pageStyle === 'cover' || pageStyle === 'back' }]" ref="pageElement">
      <div class="page-images">
        <img 
          v-for="(image, imgIndex) in pageData.images" 
          :key="imgIndex"
          :src="getImagePath(image)" 
          :alt="'Page image ' + (imgIndex + 1)"
          :class="['page-image', { 'cover-back-image': pageStyle === 'cover' || pageStyle === 'back' }]"
        />
      </div>
      <div :class="['page-sentences', { 'cover-back-text': pageStyle === 'cover' || pageStyle === 'back' }]">
        <Sentence
          v-for="(sentence, sentenceIndex) in pageData.sentences"
          :key="sentenceIndex"
          :ref="el => { if (el) sentenceRefs[sentenceIndex] = el }"
          :sentence="sentence"
          :isCurrentSentence="currentSentenceIndex === sentenceIndex && isCurrentPage"
        />
        <div v-if="isCompleted" class="page-complete">
          ✓ Page Complete!
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      currentSentenceIndex: 0,
      sentenceRefs: {},
      isCompleted: false,
    };
  },
  watch: {
    isCompleted: {
      handler(newValue, oldValue) {
        // Show fireworks when page becomes completed (transitions from false to true)
        if (newValue === true && oldValue === false) {
          this.createFireworks();
        }
      }
    }
  },
  methods: {
    getImagePath(imageFilename) {
      if (!this.storyDir || !imageFilename) return imageFilename;
      // If the image path is already absolute (starts with http:// or https://), return as-is
      if (imageFilename.startsWith('http://') || imageFilename.startsWith('https://')) {
        return imageFilename;
      }
      // Otherwise, resolve relative to the story directory
      return `stories/${this.storyDir}/${imageFilename}`;
    },
    getFocusPhrase(focusPhraseSize) {
      if (this.isCompleted) return;
      let focusPhrase = this.sentenceRefs[this.currentSentenceIndex].getFocusPhrase(focusPhraseSize);
      for (let wordsNeeded = focusPhraseSize - focusPhrase.length; wordsNeeded > 0; wordsNeeded = focusPhraseSize - focusPhrase.length) {
        if (this.currentSentenceIndex + 1 === this.pageData.sentences.length) break;
        focusPhrase = this.sentenceRefs[this.currentSentenceIndex+1].getFocusPhrase(wordsNeeded);
      }
      return focusPhrase;
    },
    processRecognitionResult(word) {  
      if (this.isCompleted) return;

      if (this.sentenceRefs[this.currentSentenceIndex].processRecognitionResult(word)) {
        this.currentSentenceIndex++
        if (this.currentSentenceIndex === this.pageData.sentences.length) {
          this.playPageCompleteSound();
          this.isCompleted = true;
        }
      }
      return this.isCompleted;
    },
    createFireworks() {
      if (!this.$refs.pageElement) return;
      
      const pageEl = this.$refs.pageElement;
      const rect = pageEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Colors for particles
      const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#95e1d3'];
      
      // Create more particles for page completion (30 particles)
      const particleCount = 30;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'spark-particle';
        
        // Random color
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.boxShadow = `0 0 15px ${color}`;
        particle.style.width = '10px';
        particle.style.height = '10px';
        
        // Position at page center
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        
        // Random angle and distance (much farther for page completion)
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 100 + Math.random() * 300;
        const endX = centerX + Math.cos(angle) * distance;
        const endY = centerY + Math.sin(angle) * distance;
        
        // Add to body
        document.body.appendChild(particle);
        
        // Animate
        requestAnimationFrame(() => {
          particle.style.transition = 'all 1s ease-out';
          particle.style.transform = `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`;
          particle.style.opacity = '0';
        });
        
        // Remove after animation
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 1000);
      }
    },
    playPageCompleteSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 200; // Lower pitch for page completion
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
      catch (e) {
        console.log('Could not play sound:', e);
      }
    },
  }
};
