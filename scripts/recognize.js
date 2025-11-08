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
        WebSocket or microphone access is not supported in your browser.
      </div>
    </div>
  `,
  data() {
    return {
      websocket: null,
      audioContext: null,
      sourceNode: null,
      processorNode: null,
      mediaStream: null,
      isRecognizing: false,
      isSupported: false,
      serverUrl: 'ws://localhost:8001/ws/transcribe',
      sampleRate: 16000,
      channels: 1
    };
  },
  watch: {
    focusPhrase: {
      handler(newPhrase) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN && newPhrase) {
          this.updateKeywords(newPhrase);
        }
      },
      immediate: false
    }
  },
  mounted() {
    // Check if WebSocket and Web Audio API are available
    if (window.WebSocket && (window.AudioContext || window.webkitAudioContext)) {
      this.isSupported = true;
    }
  },
  methods: {
    updateKeywords(focusPhrase) {
      if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN || !focusPhrase) return;
      
      try {
        // Send keywords to server for boosting
        // Handle both string and array inputs
        let keywords;
        if (typeof focusPhrase === 'string') {
          keywords = focusPhrase;
        } else if (Array.isArray(focusPhrase)) {
          keywords = focusPhrase;
        } else {
          return;
        }
        
        const message = JSON.stringify({
          keywords: keywords
        });
        
        this.websocket.send(message);
        console.log('Sent keywords to server:', keywords);
      } catch (e) {
        console.error('Error sending keywords:', e);
      }
    },
    async connectWebSocket() {
      return new Promise((resolve, reject) => {
        try {
          const ws = new WebSocket(this.serverUrl);
          
          ws.onopen = () => {
            console.log('WebSocket connected');
            this.websocket = ws;
            
            // Send initial keywords if available
            if (this.focusPhrase) {
              this.updateKeywords(this.focusPhrase);
            }
            
            resolve();
          };
          
          ws.onmessage = (event) => {
            try {
              const result = JSON.parse(event.data);
              
              if (result.error) {
                console.error('Transcription error:', result.error);
              } else if (result.text) {
                console.log("result: ", result);
                // Emit result as array of transcripts (matching old API format)
                this.$emit('result', [result.text]);
              }
            } catch (e) {
              console.error('Error parsing transcription message:', e, 'Data:', event.data);
            }
          };
          
          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            reject(new Error('Failed to connect to transcription server'));
          };
          
          ws.onclose = () => {
            console.log('WebSocket closed');
            this.websocket = null;
            if (this.isRecognizing) {
              // Try to reconnect if we're still supposed to be recognizing
              setTimeout(() => {
                if (this.isRecognizing) {
                  this.connectWebSocket().catch(err => {
                    console.error('Failed to reconnect:', err);
                  });
                }
              }, 1000);
            }
          };
        } catch (error) {
          reject(error);
        }
      });
    },
    toggleRecognition() {
      if (!this.isSupported) return;
      
      if (this.isRecognizing) {
        this.stopRecognition();
      } else {
        this.startRecognition();
      }
    },
    async startRecognition() {
      try {
        // Get user media
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: this.sampleRate,
            channelCount: this.channels,
            echoCancellation: true,
            noiseSuppression: true
          }
        });

        // Create audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: this.sampleRate
        });

        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // Connect to WebSocket
        await this.connectWebSocket();
        
        // Create script processor to convert to 16-bit PCM
        this.processorNode = this.audioContext.createScriptProcessor(4096, this.channels, this.channels);
        
        this.processorNode.onaudioprocess = (e) => {
          if (!this.isRecognizing || !this.websocket || this.websocket.readyState !== WebSocket.OPEN) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          // Send audio directly via WebSocket
          try {
            this.websocket.send(int16Data.buffer);
          } catch (error) {
            console.error('Error sending audio:', error);
          }
        };

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination);
        
        this.isRecognizing = true;
      } catch (error) {
        console.error('Error starting recognition:', error);
        this.isRecognizing = false;
      }
    },
    stopRecognition() {
      this.isRecognizing = false;
      
      // Disconnect audio nodes
      if (this.processorNode) {
        this.processorNode.disconnect();
        this.processorNode = null;
      }
      
      if (this.sourceNode) {
        this.sourceNode.disconnect();
        this.sourceNode = null;
      }
      
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      
      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
      }
      
      // Close WebSocket connection
      if (this.websocket) {
        this.websocket.close();
        this.websocket = null;
      }
    }
  },
  beforeUnmount() {
    // Clean up when component is destroyed
    if (this.isRecognizing) {
      this.stopRecognition();
    }
  }
};
