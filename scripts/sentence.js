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
    }
  }
};

