// Word component
export const Word = {
  props: ['word', 'isCompleted', 'isCurrent', 'isLast'],
  template: `
    <span 
      :class="{ 
        'word-completed': isCompleted,
        'word-current': isCurrent
      }"
      class="word"
    >
      {{ word }}<span v-if="!isLast">&nbsp;</span>
    </span>
  `,
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

