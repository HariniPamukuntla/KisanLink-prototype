import type { LanguageCode } from '../types';

export interface SpeechTranscription { text: string; language?: LanguageCode; }
export class SpeechServiceError extends Error { code: 'not-configured'|'permission-denied'|'recording-failed'|'transcription-failed'; constructor(message:string,code:'not-configured'|'permission-denied'|'recording-failed'|'transcription-failed'){super(message);this.name='SpeechServiceError';this.code=code;} }
const DEFAULT_STT_ENDPOINT='/api/voice/transcribe';
function getSTTEndpoint(){return import.meta.env.VITE_STT_API_URL?.trim()||DEFAULT_STT_ENDPOINT;}
function browserRecognition(){if(typeof window==='undefined')return null;const w=window as any;return w.SpeechRecognition||w.webkitSpeechRecognition||null;}
export function isSpeechServiceConfigured(){return true;}
function getMimeType(){const candidates=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg'];return candidates.find(type=>typeof MediaRecorder!=='undefined'&&MediaRecorder.isTypeSupported(type))||'';}
export async function transcribeAudio(audio:Blob,languageHint:'auto'|LanguageCode='auto'):Promise<SpeechTranscription>{const endpoint=getSTTEndpoint();const form=new FormData();form.append('audio',audio,'kisanvoice.webm');form.append('language',languageHint);try{const response=await fetch(endpoint,{method:'POST',body:form});if(response.ok){const payload=await response.json() as any;const text=typeof payload.text==='string'?payload.text:payload.transcript;if(typeof text==='string'&&text.trim())return{text:text.trim(),language:typeof(payload.language||payload.lang)==='string'?(payload.language||payload.lang):undefined};}}catch{}
 throw new SpeechServiceError('I couldn’t understand the audio. Please try again.','transcription-failed');}

export class SpeechRecorder {
  private recorder:MediaRecorder|null=null; private stream:MediaStream|null=null; private chunks:Blob[]=[]; private stopPromise:Promise<SpeechTranscription>|null=null; private recognition:any=null; private recognitionText=''; private usingBrowserRecognition=false;
  async start(){
    const Recognition=browserRecognition();
    if(Recognition){
      try{
        this.usingBrowserRecognition=true; this.recognitionText='';
        this.recognition=new Recognition(); this.recognition.continuous=true; this.recognition.interimResults=true;
        const langMap:Record<string,string>={en:'en-IN',hi:'hi-IN',mr:'mr-IN',te:'te-IN',ta:'ta-IN',kn:'kn-IN',bn:'bn-IN',gu:'gu-IN'};
        this.recognition.lang=langMap[(window.localStorage.getItem('kisanlink-language')||'en') as string]||'en-IN';
        this.stopPromise=new Promise((resolve,reject)=>{this.recognition.onresult=(event:any)=>{let text='';for(let i=0;i<event.results.length;i++)text+=event.results[i][0]?.transcript||'';this.recognitionText=text.trim();};this.recognition.onerror=(event:any)=>{if(event?.error==='not-allowed'||event?.error==='service-not-allowed')reject(new SpeechServiceError('Microphone permission is required for voice questions.','permission-denied'));else reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.','recording-failed'));};this.recognition.onend=()=>{if(this.recognitionText)resolve({text:this.recognitionText});else reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.','transcription-failed'));};});
        this.recognition.start(); return;
      }catch(error){this.recognition=null;this.usingBrowserRecognition=false;if(error instanceof SpeechServiceError)throw error;}
    }
    if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined')throw new SpeechServiceError('Voice input is unavailable on this browser. You can type your question below.','recording-failed');
    try{this.stream=await navigator.mediaDevices.getUserMedia({audio:true});const mimeType=getMimeType();this.recorder=new MediaRecorder(this.stream,mimeType?{mimeType}:undefined);this.chunks=[];this.stopPromise=new Promise((resolve,reject)=>{if(!this.recorder){reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.','recording-failed'));return;}this.recorder.ondataavailable=e=>{if(e.data.size>0)this.chunks.push(e.data);};this.recorder.onerror=()=>reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.','recording-failed'));this.recorder.onstop=async()=>{this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;try{resolve(await transcribeAudio(new Blob(this.chunks,{type:this.recorder?.mimeType||'audio/webm'}),'auto'));}catch(error){reject(error);}};});this.recorder.start();}catch(error){this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;if(error instanceof DOMException&&error.name==='NotAllowedError')throw new SpeechServiceError('Microphone permission is required for voice questions.','permission-denied');throw error instanceof SpeechServiceError?error:new SpeechServiceError('I couldn’t understand the audio. Please try again.','recording-failed');}
  }
  stop(languageHint:'auto'|LanguageCode='auto'){if(this.usingBrowserRecognition&&this.recognition&&this.stopPromise){const promise=this.stopPromise;this.recognition.stop();return promise.then(t=>{if(languageHint!=='auto')t.language=languageHint;return t;});}if(!this.recorder||this.recorder.state==='inactive'||!this.stopPromise)return Promise.reject(new SpeechServiceError('I couldn’t understand the audio. Please try again.','recording-failed'));this.recorder.stop();return this.stopPromise.then(t=>{if(languageHint!=='auto')t.language=languageHint;return t;});}
  cancel(){try{this.recognition?.stop();}catch{}this.recognition=null;this.usingBrowserRecognition=false;if(this.recorder&&this.recorder.state!=='inactive')this.recorder.stop();this.stream?.getTracks().forEach(track=>track.stop());this.stream=null;this.recorder=null;}
}
