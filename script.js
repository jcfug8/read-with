// Short story
 const story = "Fred likes to dig in the sandbox. Max likes to dig in the sandbox, too. Max helps Fred dig a pond. Max can be a big hill for Fred's trucks to go on. Fred fills six buckets with sand. He flips the buckets. He stacks them up. It is a sand castle! Fred's sand castle has a flag on top. Max gets in the sandbox. He sits on the sand castle. Oh, no! Fred understands. He can fix the sand castle. It is OK, Max! Fred and Max like to dig in the sandbox.";

 // Display story with each word in a span
 const wordsDiv = document.getElementById("words");
 const storyWords = story.split(/\s+/);
 const wordSpans = [];
 let nextWordIndex = 0; // Track the next word to color
 
 storyWords.forEach((word, index) => {
     const span = document.createElement("span");
     span.textContent = word;
     span.style.marginRight = "0.3em";
     wordsDiv.appendChild(span);
     wordSpans.push(span);
     if (isLastWordInSentence(index)) {
        wordsDiv.appendChild(document.createElement("br"));
     }
 });

 // Normalize word for comparison (remove punctuation, lowercase)
 function normalizeWord(word) {
     return word.toLowerCase().replace(/[.,!?;:]/g, '');
 }

// Function to color the next word sequentially
function colorNextWord() {
    if (nextWordIndex < wordSpans.length) {
        wordSpans[nextWordIndex].style.color = "blue";
        wordSpans[nextWordIndex].style.fontWeight = "bold";
        nextWordIndex++;
    }
}

// Function to update underline to the current sentence
function updatePhraseUnderlines() {
    // First, remove underline from all words
    wordSpans.forEach(span => {
        span.style.textDecoration = "none";
    });
    
    // Then, add underline to words in the current sentence
    if (nextWordIndex < storyWords.length) {    
        // Underline words before (if they exist)
        for (let wordBeforeIndex = nextWordIndex; wordBeforeIndex > 0; wordBeforeIndex--) {
            if (isLastWordInSentence(wordBeforeIndex)) {
                break;
            }
            wordSpans[wordBeforeIndex].style.textDecoration = "underline";
        }
        
        // Underline words after (if they exist)
        for (let wordAfterIndex = nextWordIndex; wordAfterIndex < storyWords.length; wordAfterIndex++) {
            wordSpans[wordAfterIndex].style.textDecoration = "underline";
            if (isLastWordInSentence(wordAfterIndex)) {
                break;
            }
        }
    }
}

const words = document.getElementById("words");
const toggleButton = document.getElementById("toggleRecognition");
let recognition = null;
let isRecognizing = false;
let lastProcessedResultIndex = 0; // Track which results we've already processed

function updatePhrases() {
    // Create phrases array with context: up to 10 words around the next word
    const phrases = [];
    
    if (nextWordIndex < storyWords.length) {
        const nextWord = storyWords[nextWordIndex];
        console.log("Next word: ", nextWord, "---", nextWordIndex);
        
        // Build phrase with up to 10 words of context
        // Include words before and after the current word
        let phraseParts = [];
        
        // Calculate how many words before and after to include
        // Target: up to 10 words total, with the current word in the middle
        const wordsBefore = Math.min(2, nextWordIndex); // Up to 4 words before
        const wordsAfter = Math.min(3, storyWords.length - nextWordIndex - 1); // Up to 5 words after
        
        // Add words before (if they exist) - remove punctuation
        for (let i = wordsBefore; i > 0; i--) {
            phraseParts.push(normalizeWord(storyWords[nextWordIndex - i]));
        }
        
        // Add the next word we're looking for - remove punctuation
        phraseParts.push(normalizeWord(nextWord));
        
        // Add words after (if they exist) - remove punctuation
        for (let i = 1; i <= wordsAfter; i++) {
            phraseParts.push(normalizeWord(storyWords[nextWordIndex + i]));
        }
        
        // Create phrases: individual words, two-word pairs, and full phrase
        // Individual words
        for (let i = 0; i < phraseParts.length; i++) {
            phrases.push({
                phrase: phraseParts[i],
                boost: 5.0
            });
        }
        
        // Two-word pairs
        for (let i = 0; i < phraseParts.length - 1; i++) {
            phrases.push({
                phrase: `${phraseParts[i]} ${phraseParts[i + 1]}`,
                boost: 7.0
            });
        }
        
        // Full phrase (up to 10 words)
        if (phraseParts.length > 0) {
            phrases.push({
                phrase: phraseParts.join(' '),
                boost: 10.0
            });
        }
        
        // Update underline styling for words in the current phrase
        updatePhraseUnderlines();
    } else {
        // Remove underlines when there are no more words
        wordSpans.forEach(span => {
            span.style.textDecoration = "none";
        });
    }
    
    return phrases;
}

function initializeRecognition() {
     recognition = new SpeechRecognition();
     recognition.lang = "en-US";
     recognition.continuous = true;
    //  recognition.interimResults = true;
     recognition.maxAlternatives = 3;
     recognition.continuous = true; // Keep recognition running
     recognition.phrases = updatePhrases(); // Set initial phrases with first word
     
     // Prevent recognition from stopping automatically
     recognition.onend = () => {
         if (isRecognizing) {
             // Update phrases with current next word before restarting
             recognition.phrases = updatePhrases();
             // Restart recognition if it stopped unexpectedly
             try {
                 recognition.start();
             } catch (e) {
                 // If already starting, ignore the error
                 console.log("Recognition restarting...");
             }
         }
     };
     
     recognition.onerror = (event) => {
         console.error("Recognition error:", event.error);
         if (event.error === 'no-speech' || event.error === 'aborted') {
             // For these errors, try to restart if we're still supposed to be running
             if (isRecognizing) {
                 setTimeout(() => {
                     try {
                         // Update grammar with current next word before restarting
                         recognition.grammars = updateGrammar();
                         recognition.start();
                     } catch (e) {
                         console.log("Recognition restart after error...");
                     }
                 }, 100);
             }
         }
    };
    
    recognition.onresult = (event) => {
        // Only process new results (from last processed index to current)
        // This ensures we don't reuse words from earlier in the transcript
        for (let i = lastProcessedResultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            
            // Try each alternative to find one that matches the next word
            // Check all alternatives for this result
            for (let j = 0; j < result.length; j++) {
                const transcript = result[j].transcript;
                const words = transcript.trim().split(/\s+/).map(normalizeWord);

                console.log("current alternative: ",words)
                // Process words sequentially from this alternative
                // Only match if the first word matches the next story word we're looking for

                for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
                    if (nextWordIndex < storyWords.length) {
                        const normalizedStoryWord = normalizeWord(storyWords[nextWordIndex]);
                        const currentWord = words[wordIndex];
                        console.log(nextWordIndex, " current word: ",currentWord, "---", normalizedStoryWord);
                        if (currentWord === normalizedStoryWord) {
                            const stop = isLastWordInSentence(nextWordIndex);
                            // Found the next word! Color it and move on
                            colorNextWord();
                            
                            // Update phrases with the next word
                            if (recognition && isRecognizing) {
                                recognition.phrases = updatePhrases();
                            }

                            if (stop) {
                                console.log("last word in sentence");
                                return;
                            }
                        }
                    }
                }
            }
        }
        
        // Update last processed index to current result index
        lastProcessedResultIndex = event.results.length;
    };
 }

 function isLastWordInSentence(wordIndex) {
    return storyWords[wordIndex].endsWith(".") || storyWords[wordIndex].endsWith("!") || storyWords[wordIndex].endsWith("?");
 }
 
 function startRecognition() {
    if (!recognition) {
        initializeRecognition();
    }
    if (!isRecognizing) {
        try {
            // Update phrases before starting to ensure it has the current next word
            recognition.phrases = updatePhrases();
            recognition.start();
            isRecognizing = true;
            lastProcessedResultIndex = 0; // Reset when starting recognition
            toggleButton.textContent = "Stop Recognition";
            toggleButton.style.backgroundColor = "#ff6b6b";
        } catch (e) {
            console.error("Error starting recognition:", e);
        }
    }
}
 
 function stopRecognition() {
     if (recognition && isRecognizing) {
         isRecognizing = false;
         recognition.stop();
         toggleButton.textContent = "Start Recognition";
         toggleButton.style.backgroundColor = "#51cf66";
     }
 }
 
 toggleButton.addEventListener("click", () => {
     if (isRecognizing) {
         stopRecognition();
     } else {
         startRecognition();
     }
 });
 
 // Initialize button style
toggleButton.style.backgroundColor = "#51cf66";
toggleButton.style.color = "white";
toggleButton.style.border = "none";
toggleButton.style.padding = "10px 20px";
toggleButton.style.fontSize = "16px";
toggleButton.style.cursor = "pointer";
toggleButton.style.borderRadius = "5px";
toggleButton.style.marginBottom = "20px";

// Initialize underlines for the first phrase
updatePhraseUnderlines();