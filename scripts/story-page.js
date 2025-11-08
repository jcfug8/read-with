import { Sentence } from './sentence.js';

// StoryPage component (child)
export const StoryPage = {
  components: {
    Sentence
  },
  props: ['pageData', 'isCurrentPage'],
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
  methods: {
    getFocusPhrase(focusPhraseSize) {
      focusPhrase = this.sentenceRefs[this.currentSentenceIndex].getFocusPhrase(5);
      for (let wordsNeeded = focusPhraseSize - focusPhrase.length; wordsNeeded > 0; wordsNeeded = focusPhraseSize - focusPhrase.length) {
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
    playPageCompleteSound() {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 100; // Higher pitch for success
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      }
      catch (e) {
        console.log('Could not play sound:', e);
      }
    },
  }
};
