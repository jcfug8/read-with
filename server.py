from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import torch
import numpy as np
import json
from transformers import AutoProcessor, AutoModelForSpeechSeq2Seq
from transformers.generation.logits_process import LogitsProcessor

app = FastAPI()

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model globally
processor = None
model = None
device = "cuda" if torch.cuda.is_available() else "cpu"
torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

def load_model():
    global processor, model
    if processor is None or model is None:
        print("Loading model...")
        processor = AutoProcessor.from_pretrained("distil-whisper/distil-medium.en")
        model = AutoModelForSpeechSeq2Seq.from_pretrained(
            "distil-whisper/distil-medium.en",
            torch_dtype=torch_dtype,
            low_cpu_mem_usage=True,
            use_safetensors=True
        )
        model.to(device)
        model.eval()
        print("Model loaded!")

class KeywordLogitsProcessor(LogitsProcessor):
    """Logits processor that boosts specific token IDs"""
    def __init__(self, token_ids_to_boost, bias_value=2.0):
        self.token_ids_to_boost = set(token_ids_to_boost)
        self.bias_value = bias_value
    
    def __call__(self, input_ids, scores):
        # Add bias to specified token IDs
        for token_id in self.token_ids_to_boost:
            if token_id < scores.shape[-1]:  # Make sure token_id is valid
                scores[:, token_id] += self.bias_value
        return scores

def detect_silence(audio_data, threshold=0.01):
    """
    Detect if audio is mostly silence
    Returns True if audio is below threshold (likely silence)
    """
    # Calculate RMS (Root Mean Square) energy
    rms = np.sqrt(np.mean(audio_data ** 2))
    return rms < threshold

@app.on_event("startup")
async def startup_event():
    load_model()

@app.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio transcription with overlapping windows
    Receives audio chunks (16-bit PCM, 16kHz) and sends back transcriptions
    Uses 1-second windows with 0.5-second steps (50% overlap) for lower latency
    """
    await websocket.accept()
    
    audio_buffer = b""
    # Overlapping window configuration:
    # Window size: 1 second (16000 samples at 16kHz = 32000 bytes)
    # Step size: 0.5 seconds (8000 samples = 16000 bytes)
    # This gives 50% overlap for better accuracy and lower latency
    window_samples = 16000  # 16000 = 1 second
    window_bytes = window_samples * 2
    step_samples = 12000 
    step_bytes = step_samples * 2  
    
    last_processed_position = 0
    keyword_token_ids = set()  # Store token IDs to boost
    bias_value = 6.0  # Boost strength
    
    try:
        while True:
            # Receive message and check type
            message = await websocket.receive()
            
            if "text" in message:
                print(f"Received text")
                # Text message - keyword update
                try:
                    data = json.loads(message["text"])
                    if "keywords" in data or "phrases" in data:
                        # Get keywords/phrases
                        keywords = data.get("keywords", data.get("phrases", []))
                        
                        # Convert to list if it's a string
                        if isinstance(keywords, str):
                            # If it's a phrase, split into words
                            keywords = keywords.lower().split()
                        elif isinstance(keywords, list):
                            # Flatten list and split phrases into words
                            all_words = []
                            for item in keywords:
                                if isinstance(item, str):
                                    all_words.extend(item.lower().split())
                            keywords = all_words
                        
                        # Tokenize keywords to get token IDs
                        keyword_token_ids = set()
                        tokenizer = processor.tokenizer
                        
                        for keyword in keywords:
                            # Tokenize the keyword
                            tokens = tokenizer.encode(keyword, add_special_tokens=False)
                            keyword_token_ids.update(tokens)
                        
                        print(f"Updated keywords: {keywords} -> {len(keyword_token_ids)} token IDs to boost")
                except json.JSONDecodeError:
                    # Not valid JSON, ignore
                    pass
                except Exception as e:
                    print(f"Error processing keyword update: {e}")
                    pass
                # Continue to next message (don't process audio)
                continue
            
            elif "bytes" in message:
                print(f"Received bytes")
                # Binary message - audio data
                data = message["bytes"]
                audio_buffer += data
                
                # Process overlapping windows
                # Process when we have enough audio for at least one window
                while len(audio_buffer) >= last_processed_position + window_bytes:
                    # Extract window starting from last processed position
                    window_start = last_processed_position
                    window_end = window_start + window_bytes
                    chunk_data = audio_buffer[window_start:window_end]
                    
                    # Convert bytes to numpy array (16-bit PCM, little-endian)
                    audio_data = np.frombuffer(chunk_data, dtype=np.int16).astype(np.float32) / 32768.0
                    
                    # Check for silence - skip processing if audio is too quiet
                    if detect_silence(audio_data, threshold=0.05):
                        # Advance position but don't process
                        last_processed_position += step_bytes
                        continue
                    
                    # Process audio with Whisper
                    inputs = processor(audio_data, sampling_rate=16000, return_tensors="pt")
                    inputs = {k: v.to(device) for k, v in inputs.items()}
                    
                    # Prepare generation kwargs
                    generate_kwargs = {
                        "max_length": 448,
                        # "language": "en",
                        # "task": "transcribe"
                    }
                    
                    # Add logits processor if we have keywords to boost
                    if keyword_token_ids:
                        logits_processor = KeywordLogitsProcessor(keyword_token_ids, bias_value)
                        generate_kwargs["logits_processor"] = [logits_processor]
                    
                    with torch.no_grad():
                        generated_ids = model.generate(
                            **inputs,
                            **generate_kwargs
                        )
                    
                    transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
                    
                    if transcription.strip():
                        result = {"text": transcription.strip(), "partial": True}
                        await websocket.send_json(result)
                    
                    # Advance by step size (overlapping windows)
                    last_processed_position += step_bytes
                
                # Clean up old audio from buffer (keep only recent audio for overlap)
                # Keep at least one window size + some buffer
                max_buffer_size = window_bytes * 2
                if len(audio_buffer) > max_buffer_size:
                    # Remove old audio, but keep enough for overlap
                    remove_size = len(audio_buffer) - max_buffer_size
                    # Round down to step boundary
                    remove_size = (remove_size // step_bytes) * step_bytes
                    if remove_size > 0 and remove_size <= last_processed_position:
                        audio_buffer = audio_buffer[remove_size:]
                        last_processed_position -= remove_size
            else:
                # Unknown message type, skip
                continue
        
    except WebSocketDisconnect:
        # Process remaining audio when connection closes
        remaining_start = last_processed_position
        if len(audio_buffer) > remaining_start + step_bytes:  # At least 0.5 seconds remaining
            remaining_data = audio_buffer[remaining_start:]
            audio_data = np.frombuffer(remaining_data, dtype=np.int16).astype(np.float32) / 32768.0
            
            inputs = processor(audio_data, sampling_rate=16000, return_tensors="pt")
            inputs = {k: v.to(device) for k, v in inputs.items()}
            
            # Prepare generation kwargs
            generate_kwargs = {
                "max_length": 448,
            }
            
            # Add logits processor if we have keywords to boost
            if keyword_token_ids:
                logits_processor = KeywordLogitsProcessor(keyword_token_ids, bias_value)
                generate_kwargs["logits_processor"] = [logits_processor]
            
            with torch.no_grad():
                generated_ids = model.generate(
                    **inputs,
                    **generate_kwargs
                )
            
            transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            if transcription.strip():
                result = {"text": transcription.strip(), "partial": False}
                try:
                    await websocket.send_json(result)
                except:
                    pass  # Connection already closed
        
        print("WebSocket client disconnected")
    except Exception as e:
        import traceback
        error_result = {"error": str(e), "traceback": traceback.format_exc()}
        try:
            await websocket.send_json(error_result)
        except:
            pass
        print(f"WebSocket error: {e}")

@app.get("/")
async def root():
    return {"message": "Transcription server is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

