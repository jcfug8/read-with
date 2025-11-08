import { Word } from './word.js';

// Sentence component
export const Sentence = {
  components: {
    Word
  },
  props: ['sentence', 'sentenceIndex', 'currentSentenceIndex', 'currentWordIndex', 'isPageComplete'],
  template: `
    <p class="sentence">
      <Word
        v-for="(word, wordIndex) in words"
        :key="wordIndex"
        :word="word"
        :isCompleted="isWordCompleted(wordIndex)"
        :isCurrent="isCurrentWord(wordIndex)"
        :isLast="wordIndex === words.length - 1"
      />
    </p>
  `,
  computed: {
    words() {
      return this.sentence.split(/\s+/);
    },
    allWordsCompleted() {
      // Check if all words in this sentence are completed
      for (let i = 0; i < this.words.length; i++) {
        if (!this.isWordCompleted(i)) {
          return false;
        }
      }
      return true;
    }
  },
  watch: {
    allWordsCompleted: {
      handler(newValue, oldValue) {
        // Play sound when sentence becomes fully completed (transitions from false to true)
        // Only play if this is the current sentence (not a previous one)
        if (newValue === true && oldValue === false && this.sentenceIndex === this.currentSentenceIndex) {
          this.playSentenceAdvanceSound();
        }
      }
    }
  },
  methods: {
    isWordCompleted(wordIndex) {
      // Word is completed if page is complete, or if it's in a sentence before current, 
      // or if it's in the current sentence but before or equal to the current word
      if (this.isPageComplete) {
        return true;
      }
      if (this.sentenceIndex < this.currentSentenceIndex) {
        return true;
      }
      if (this.sentenceIndex === this.currentSentenceIndex && wordIndex <= this.currentWordIndex) {
        return true;
      }
      return false;
    },
    isCurrentWord(wordIndex) {
      return this.sentenceIndex === this.currentSentenceIndex && wordIndex === this.currentWordIndex;
    },
    playSentenceAdvanceSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 400; // Lower pitch for sentence completion
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
      catch (e) {
        console.log('Could not play sound:', e);
      }
    }
  }
};

