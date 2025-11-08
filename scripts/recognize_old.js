export const Recognize = {
  props: ['focusPhrase'],
  emits: ['result'],
  template: `
    <div class="recognize-container">
      <button 
        @click="toggleRecognition" 
        :class="['recognize-button', { 'active': isRecognizing }]"
        :disabled="!isSupported"
      >
        {{ isRecognizing ? 'Stop Recognition' : 'Start Recognition' }}
      </button>
      <div v-if="!isSupported" class="error-message">
        Speech recognition is not supported in your browser.
      </div>
    </div>
  `,
  data() {
    return {
      recognition: null,
      isRecognizing: false,
      isSupported: false
    };
  },
  watch: {
    focusPhrase: {
      handler(newPhrase) {
          if (this.recognition && newPhrase) {
          this.updatePhrases(newPhrase);
        }
      },
      immediate: false
    }
  },
  mounted() {
    // Check if SpeechRecognition is available
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.isSupported = true;
      this.initializeRecognition();
    }
  },
  methods: {
    buildPhrases(focusPhrase) {
      if (!focusPhrase) return [];
      
      // Handle both string and array inputs
      const sentences = typeof focusPhrase === 'string' ? [focusPhrase] : focusPhrase;
      if (sentences.length === 0) return [];
      
      const phrases = [];
      
      sentences.forEach(sentence => {
        // Remove punctuation and normalize
        const normalized = sentence.toLowerCase().replace(/[.,!?;:]/g, '').trim();
        const words = normalized.split(/\s+/).filter(word => word.length > 0);
        
        // Create all possible word sequences starting from each position
        for (let start = 0; start < words.length; start++) {
          for (let end = start + 1; end <= words.length; end++) {
            const phrase = words.slice(start, end).join(' ');
            if (phrase.length > 0) {
              phrases.push({
                phrase: phrase,
                boost: 10.0
              });
            }
          }
        }
      });
      
      return phrases;
    },
    updatePhrases(focusPhrase) {
      console.log("updatePhrases called with focusPhrase: ", focusPhrase);
      if (!this.recognition || !focusPhrase) return;
      
      const phrases = this.buildPhrases(focusPhrase);
      
      if (phrases.length > 0) {
        // Update phrases if the API supports it
        try {
          console.log("updating phrases: ", phrases);
          this.recognition.phrases = phrases;
        } catch (e) {
          console.log('Could not update phrases:', e);
        }
      }
    },
    initializeRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'en-US';
    //   this.recognition.continuous = true;
      this.recognition.interimResults = true;
      
      // Initialize phrases if focusPhrase is available
      if (this.focusPhrase) {
        this.updatePhrases(this.focusPhrase);
      }
      
      this.recognition.onend = () => {
        // Auto-restart if we're still supposed to be recognizing
        if (this.isRecognizing) {
          try {
            // Update phrases before restarting
            if (this.focusPhrase) {
              this.updatePhrases(this.focusPhrase);
            }
            this.recognition.start();
          } catch (e) {
            console.log('Recognition restarting...');
          }
        }
      };
      
      this.recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        if (event.error === 'no-speech' || event.error === 'aborted') {
          // Try to restart on certain errors
          if (this.isRecognizing) {
            setTimeout(() => {
              try {
                // Update phrases before restarting
                if (this.focusPhrase) {
                  this.updatePhrases(this.focusPhrase);
                }
                this.recognition.start();
              } catch (e) {
                console.log('Recognition restart after error...');
              }
            }, 100);
          }
        }
      };
      
      this.recognition.onresult = (event) => {
        // Handle recognition results
        const transcripts = []
        for (let i = 0; i < event.results.length; i++) {
            for (let j = 0; j < event.results[i].length; j++) {
                transcripts.push(event.results[i][j].transcript);
            }
        }
        // Emit event or handle result here
        this.$emit('result', transcripts);
      };
    },
    toggleRecognition() {
      if (!this.isSupported || !this.recognition) return;
      
      if (this.isRecognizing) {
        this.stopRecognition();
      } else {
        this.startRecognition();
      }
    },
    startRecognition() {
      if (!this.recognition) return;
      
      // Update phrases before starting
      if (this.focusPhrase) {
        this.updatePhrases(this.focusPhrase);
      }
      
      try {
        this.recognition.start();
        this.isRecognizing = true;
      } catch (e) {
        console.error('Error starting recognition:', e);
      }
    },
    stopRecognition() {
      if (!this.recognition) return;
      
      this.isRecognizing = false;
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  },
  beforeUnmount() {
    // Clean up recognition when component is destroyed
    if (this.recognition && this.isRecognizing) {
      this.stopRecognition();
    }
  }
};
