import { Word } from './word.js';

// Sentence component
export const Sentence = {
  components: {
    Word
  },
  props: ['sentence', 'isCurrentSentence'],
  template: `
    <p class="sentence">
      <Word
        v-for="(word, wordIndex) in words"
        :key="wordIndex"
        :ref="el => { if (el) wordRefs[wordIndex] = el }"
        :word="word"
        :isCurrentWord="currentWordIndex === wordIndex && isCurrentSentence"
      />
    </p>
  `,
  data() {
    return {
      currentWordIndex: 0,
      wordRefs: {},
      isCompleted: false,
    };
  },
  computed: {
    words() {
      return this.sentence.split(/\s+/);
    },
  },
  methods: {
    processRecognitionResult(word) {
      if (this.isCompleted) return;

      if (this.wordRefs[this.currentWordIndex].processRecognitionResult(word)) {
        this.currentWordIndex++;
        if (this.currentWordIndex === this.words.length) {
          this.playSentenceAdvanceSound();
          this.isCompleted = true;
        }
      }
      return this.isCompleted;
    },
    getFocusPhrase(focusPhraseSize) {
      return this.words.slice(this.currentWordIndex, this.currentWordIndex + focusPhraseSize).join(' ');
    },
    playSentenceAdvanceSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 400; // Lower pitch for sentence completion
        oscillator.type = 'triangle';
        
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

