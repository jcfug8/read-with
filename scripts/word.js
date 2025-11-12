const { isHomophone, getHomophones } = await import('./homophone.js');

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
      ref="wordElement"
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
        // Play sound and show fireworks when word becomes completed (transitions from false to true)
        if (newValue === true && oldValue === false) {
          this.playWordAdvanceSound();
          this.createFireworks();
        }
      }
    }
  },
  computed: {
    normalizedWord() {
      return this.normalizeWord(this.word);
    },
  },
  methods: {
    normalizeWord(word) {
      return word.toLowerCase().replace(/[.,!?;:'"]/g, '');
    },
    isPrefix(word) {
      let words = [word]
      if (getHomophones(word, this.normalizedWord)) {
        words = getHomophones(word)
      }
      for (let word of words) {
        if (word.length == 1) continue;
        if (word.startsWith(this.normalizedWord)) {
          return word.slice(this.normalizedWord.length);
        }
      }
      return null;
    },
    processRecognitionResult(word) {
      if (this.isCompleted) return;

      console.log("processing word: ", word, "---", this.normalizedWord);
      
      const normalizedInputWord = this.normalizeWord(word);
      
      // Check if the input word matches this word
      if (normalizedInputWord === this.normalizedWord || isHomophone(normalizedInputWord, this.normalizedWord) || this.isPrefix(normalizedInputWord)) {
        this.isCompleted = true;
        this.playWordAdvanceSound();
      }
      
      return {
        isCompleted: this.isCompleted,
        unmatchedPortion: this.isPrefix(normalizedInputWord)
      }
    },
    createFireworks() {
      if (!this.$refs.wordElement) return;
      
      const wordEl = this.$refs.wordElement;
      const rect = wordEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Colors for particles
      const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a8e6cf', '#ff8b94', '#95e1d3'];
      
      // Create 12 particles
      const particleCount = 20;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'spark-particle';
        
        // Random color
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.boxShadow = `0 0 6px ${color}`;
        
        // Position at word center
        particle.style.left = centerX + 'px';
        particle.style.top = centerY + 'px';
        
        // Random angle and distance
        const angle = (i / particleCount) * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
        const endX = centerX + Math.cos(angle) * distance;
        const endY = centerY + Math.sin(angle) * distance;
        
        // Add to body
        document.body.appendChild(particle);
        
        // Animate
        requestAnimationFrame(() => {
          particle.style.transition = 'all 0.6s ease-out';
          particle.style.transform = `translate(${endX - centerX}px, ${endY - centerY}px) scale(0)`;
          particle.style.opacity = '0';
        });
        
        // Remove after animation
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 600);
      }
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
        
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (e) {
        console.log('Could not play sound:', e);
      }
    }
  }
};

