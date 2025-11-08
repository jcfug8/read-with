import { Sentence } from './sentence.js';

// StoryPage component (child)
export const StoryPage = {
  components: {
    Sentence
  },
  props: ['pageData', 'recognitionResult', 'isActive'],
  emits: ['updateFocusPhrase'],
  template: `
    <div class="content-page">
      <div class="page-images">
        <img 
          v-for="(image, imgIndex) in pageData.images" 
          :key="imgIndex"
          :src="image" 
          :alt="'Page image ' + (imgIndex + 1)"
          class="page-image"
        />
      </div>
      <div class="page-sentences">
        <Sentence
          v-for="(sentence, sentIndex) in pageData.sentences"
          :key="sentIndex"
          :sentence="sentence"
          :sentenceIndex="sentIndex"
          :currentSentenceIndex="currentSentenceIndex"
          :currentWordIndex="currentWordIndex"
          :isPageComplete="isPageComplete"
        />
        <div v-if="isPageComplete" class="page-complete">
          ✓ Page Complete!
        </div>
      </div>
    </div>
  `,
  data() {
    return {
      currentSentenceIndex: 0,
      currentWordIndex: 0,
      lastProcessedResult: null
    };
  },
  computed: {
    currentSentence() {
      if (!this.pageData.sentences) return null;
      if (this.currentSentenceIndex >= this.pageData.sentences.length) return null;
      return this.pageData.sentences[this.currentSentenceIndex];
    },
    currentSentenceWords() {
      if (!this.currentSentence) return [];
      return this.currentSentence.split(/\s+/);
    },
    currentWord() {
      if (this.currentSentenceWords.length === 0) return null;
      if (this.currentWordIndex >= this.currentSentenceWords.length) return null;
      return this.currentSentenceWords[this.currentWordIndex];
    },
    normalizedCurrentWord() {
      if (!this.currentWord) return null;
      return this.normalizeWord(this.currentWord);
    },
    isPageComplete() {
      if (!this.pageData.sentences || this.pageData.sentences.length === 0) return false;
      
      const lastSentenceIndex = this.pageData.sentences.length - 1;
      const lastSentence = this.pageData.sentences[lastSentenceIndex];
      const lastSentenceWords = lastSentence.split(/\s+/);
      const lastWordIndex = lastSentenceWords.length - 1;
      
      // Page is complete if we're past the last word of the last sentence
      return this.currentSentenceIndex > lastSentenceIndex || 
             (this.currentSentenceIndex === lastSentenceIndex && this.currentWordIndex > lastWordIndex);
    }
  },
  watch: {
    recognitionResult: {
      handler(newResult) {
        if (!this.isActive) return; // Ignore if page is not active
        if (!newResult || !Array.isArray(newResult) || newResult.length === 0) return;
        
        this.processRecognitionResult(newResult);
      },
      deep: true
    },
    pageData: {
      handler() {
        // Reset indices when page data changes
        this.currentSentenceIndex = 0;
        this.currentWordIndex = 0;
        this.lastProcessedResult = null;
      },
      deep: true
    },
    isActive: {
      handler(newValue) {
        console.log("isActive changed: ", newValue);
        if (newValue) {
          // Emit focus phrase when page becomes active
          this.emitFocusPhrase();
        }
      }
    }
  },
  mounted() {
    // Emit focus phrase when component is mounted and active
    if (this.isActive) {
      this.$nextTick(() => {
        this.emitFocusPhrase();
      });
    }
  },
  methods: {
    getSentenceWords(sentence) {
      return sentence.split(/\s+/);
    },
    normalizeWord(word) {
      return word.toLowerCase().replace(/[.,!?;:]/g, '');
    },
    buildFocusPhrase() {
      // Build focus phrase with current word + 2 words before + 2 words after
      if (!this.pageData.sentences || this.pageData.sentences.length === 0) {
        return null;
      }
      
      // Get all words from all sentences in order
      const allWords = [];
      this.pageData.sentences.forEach((sentence, sentIndex) => {
        const words = this.getSentenceWords(sentence);
        words.forEach((word, wordIndex) => {
          allWords.push({
            word: word,
            sentenceIndex: sentIndex,
            wordIndex: wordIndex
          });
        });
      });
      
      // Find the index of the current word in the allWords array
      let currentWordGlobalIndex = -1;
      for (let i = 0; i < allWords.length; i++) {
        if (allWords[i].sentenceIndex === this.currentSentenceIndex && 
            allWords[i].wordIndex === this.currentWordIndex) {
          currentWordGlobalIndex = i;
          break;
        }
      }
      
      if (currentWordGlobalIndex === -1) {
        return null;
      }
      
      // Get 2 words before, current word, and 2 words after
      const startIndex = Math.max(0, currentWordGlobalIndex - 2);
      const endIndex = Math.min(allWords.length - 1, currentWordGlobalIndex + 2);
      
      const focusWords = [];
      for (let i = startIndex; i <= endIndex; i++) {
        focusWords.push(allWords[i].word);
      }
      
      return focusWords.join(' ');
    },
    emitFocusPhrase() {
      const focusPhrase = this.buildFocusPhrase();
      console.log("built focus phrase: ", focusPhrase);
      if (focusPhrase) {
        this.$emit('updateFocusPhrase', focusPhrase);
      }
    },
    processRecognitionResult(transcripts) {      
      // Only process if we have a current word to match
      if (!this.currentWord || !this.normalizedCurrentWord) {
        return;
      }
    
      
      // Check each transcript for a match with the current word
      for (let i = 0; i < transcripts.length; i++) {
        const transcript = transcripts[i];
        const words = transcript.trim().split(/\s+/).map(word => this.normalizeWord(word));
        
        // Check if any word in the transcript matches the current word
        for (let j = 0; j < words.length; j++) {
            console.log("checking word: ", words[j], "---", this.normalizedCurrentWord);
          if (words[j] === this.normalizedCurrentWord) {
            this.advanceWord();
          }
        }
      }
    },
    playPageCompleteSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 200; // Higher pitch for success
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
      catch (e) {
        console.log('Could not play sound:', e);
      }
    },
    advanceWord() {
      if (!this.currentSentenceWords || this.currentWordIndex >= this.currentSentenceWords.length - 1) {
        // End of sentence, advance to next sentence
        this.advanceSentence();
      } else {
        // Advance to next word in current sentence
        this.currentWordIndex++;
      }
      // Sound will be played by Word component when isCompleted changes
      // Emit focus phrase update after advancing
      this.emitFocusPhrase();
    },
    advanceSentence() {
      if (!this.pageData.sentences || this.currentSentenceIndex >= this.pageData.sentences.length - 1) {
        // End of all sentences on this page
        // Increment word index past the end to mark page as complete
        if (this.currentSentenceWords) {
          this.currentWordIndex = this.currentSentenceWords.length;
        }
        this.emitFocusPhrase();
        return;
      }
      // Sound will be played by Sentence component when all words become completed
      // Advance to next sentence and reset word index
      this.currentSentenceIndex++;
      this.currentWordIndex = 0;
      // Emit focus phrase update after advancing
      this.emitFocusPhrase();
    }
  }
};
