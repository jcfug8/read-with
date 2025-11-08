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
      if (this.isCompleted) return;
      return this.words.slice(this.currentWordIndex, this.currentWordIndex + focusPhraseSize).join(' ');
    },
    playSentenceAdvanceSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a two-tone sequence for a fancier sound
        const playTone = (frequency, startTime, duration) => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'triangle';
          
          gainNode.gain.setValueAtTime(0, startTime);
          gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
          gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
          
          oscillator.start(startTime);
          oscillator.stop(startTime + duration);
        };
        
        // Play two tones in sequence (ascending)
        const now = audioContext.currentTime;
        playTone(400, now, 0.15);
        playTone(500, now + 0.1, 0.15);
      }
      catch (e) {
        console.log('Could not play sound:', e);
      }
    }
  }
};

