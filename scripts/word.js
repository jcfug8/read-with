// Word component
export const Word = {
  props: ['word', 'isCurrentWord'],
  emits: ['finish'],
  template: `
    <span 
      :class="{ 
        'word-completed': isCompleted,
        'word-current': isCurrentWord
      }"
      class="word"
    >{{ word }}</span>
  `,
  data() {
    return {
      isCompleted: false
    };
  },
  watch: {
    isCompleted: {
      handler(newValue, oldValue) {
        // Play sound when word becomes completed (transitions from false to true)
        if (newValue === true && oldValue === false) {
          this.playWordAdvanceSound();
        }
      }
    }
  },
  methods: {
    normalizeWord(word) {
      return word.toLowerCase().replace(/[.,!?;:]/g, '');
    },
    processRecognitionResult(word) {
      if (this.isCompleted) return;
      
      const normalizedWord = this.normalizeWord(this.word);
      const normalizedInputWord = this.normalizeWord(word);
      
      // Check if the input word matches this word
      if (normalizedInputWord === normalizedWord) {
        this.isCompleted = true;
        this.playWordAdvanceSound();
        return true;
      }
      
      return false;
    },
    playWordAdvanceSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Higher pitch for success
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (e) {
        console.log('Could not play sound:', e);
      }
    }
  }
};

