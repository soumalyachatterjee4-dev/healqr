import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Sparkles, Loader2, Send, Plus, Trash2, Crop, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { db, storage } from '../lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { sendAIRXNotification } from '../utils/cloudFunctions';

// Direct Gemini API (client-side key for browser calls)
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_API_KEY = 'AIzaSyAEXO21T32uegMq4U57OnSDuBdA6CC_OOc';

const MAX_PAGES = 5;

interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

import { Language } from '../utils/translations';

interface DoctorAIRXUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientName: string;
  patientId: string;
  patientPhone: string;
  patientLanguage: Language;
  onUploadSuccess?: () => void;
}

export const DoctorAIRXUploadModal: React.FC<DoctorAIRXUploadModalProps> = ({
  isOpen,
  onClose,
  patientName,
  patientId,
  patientPhone,
  patientLanguage,
  onUploadSuccess,
}) => {
  // File & Preview state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Processing state
  const [processingStep, setProcessingStep] = useState<'upload' | 'analyzing' | 'result' | 'sending' | 'done'>('upload');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [decodedText, setDecodedText] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [isSending, setIsSending] = useState(false);

  // Doctor info
  const [doctorName, setDoctorName] = useState('');
  const [doctorId] = useState(() => {
    const userId = localStorage.getItem('userId');
    if (userId) return userId;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { return JSON.parse(userStr).uid || ''; } catch { return ''; }
    }
    return '';
  });

  // Crop tool state
  const [savedRegions, setSavedRegions] = useState<(CropRegion | null)[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPageIndex, setDrawingPageIndex] = useState<number | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const containerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize crop arrays when files change
  useEffect(() => {
    setSavedRegions(prev => {
      const newRegions: (CropRegion | null)[] = new Array(selectedFiles.length).fill(null);
      prev.forEach((r, i) => { if (i < newRegions.length) newRegions[i] = r; });
      return newRegions;
    });
  }, [selectedFiles.length]);

  // Load doctor name from Firestore
  useEffect(() => {
    const load = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr || !db) return;
      try {
        const user = JSON.parse(userStr);
        let snap = await getDoc(doc(db, 'doctors', user.uid));
        if (!snap.exists()) snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setDoctorName(snap.data().name || 'Doctor');
      } catch {}
    };
    load();
  }, []);

  // Redraw saved crop regions when they change
  useEffect(() => {
    savedRegions.forEach((region, index) => {
      const canvas = canvasRefs.current[index];
      const container = containerRefs.current[index];
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;

      if (region) {
        drawCropOverlay(canvas, region);
      }
    });
  }, [savedRegions, previewUrls]);

  // ==================== FILE HANDLING ====================

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select only image files (JPG/PNG)');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Each file must be less than 10MB');
      return false;
    }
    return true;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, MAX_PAGES);
    if (!fileArray.every(validateFile)) return;

    // Revoke old URLs
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    setSelectedFiles(fileArray);
    setPreviewUrls(fileArray.map(f => URL.createObjectURL(f)));
    setSavedRegions(new Array(fileArray.length).fill(null));
    setProcessingStep('upload');
    e.target.value = '';
  };

  const handleAddPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!validateFile(file)) return;

    setSelectedFiles(prev => [...prev, file]);
    setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]);
    e.target.value = '';
  };

  const handleRemovePage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    setSavedRegions(prev => prev.filter((_, i) => i !== index));
  };

  // ==================== CROP TOOL ====================

  const drawCropOverlay = (canvas: HTMLCanvasElement, region: CropRegion) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Clear selected region
    ctx.clearRect(region.x, region.y, region.width, region.height);

    // Dashed border
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.strokeRect(region.x, region.y, region.width, region.height);
    ctx.setLineDash([]);

    // Corner handles
    const hs = 8;
    ctx.fillStyle = 'rgba(167, 139, 250, 0.9)';
    const corners = [
      [region.x, region.y],
      [region.x + region.width, region.y],
      [region.x, region.y + region.height],
      [region.x + region.width, region.y + region.height],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
    });
  };

  const syncCanvasSize = (index: number) => {
    const canvas = canvasRefs.current[index];
    const container = containerRefs.current[index];
    if (canvas && container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      const region = savedRegions[index];
      if (region) drawCropOverlay(canvas, region);
    }
  };

  const getCoords = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRefs.current[index];
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e
      ? (e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX)
      : e.clientX;
    const clientY = 'touches' in e
      ? (e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY)
      : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(index, e);
    if (!coords) return;
    syncCanvasSize(index);
    setIsDrawing(true);
    setDrawingPageIndex(index);
    setStartPoint(coords);
  };

  const handlePointerMove = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || drawingPageIndex !== index || !startPoint) return;
    const coords = getCoords(index, e);
    if (!coords) return;

    const region: CropRegion = {
      x: Math.min(startPoint.x, coords.x),
      y: Math.min(startPoint.y, coords.y),
      width: Math.abs(coords.x - startPoint.x),
      height: Math.abs(coords.y - startPoint.y),
    };

    const canvas = canvasRefs.current[index];
    if (canvas) drawCropOverlay(canvas, region);
  };

  const handlePointerUp = (index: number, e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || drawingPageIndex !== index || !startPoint) return;
    const coords = getCoords(index, e);

    setIsDrawing(false);
    setDrawingPageIndex(null);

    if (coords) {
      const region: CropRegion = {
        x: Math.min(startPoint.x, coords.x),
        y: Math.min(startPoint.y, coords.y),
        width: Math.abs(coords.x - startPoint.x),
        height: Math.abs(coords.y - startPoint.y),
      };

      if (region.width > 20 && region.height > 20) {
        setSavedRegions(prev => {
          const newRegions = [...prev];
          newRegions[index] = region;
          return newRegions;
        });
      } else {
        // Clear tiny accidental selections
        const canvas = canvasRefs.current[index];
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }
    setStartPoint(null);
  };

  // Crop image accounting for object-contain positioning
  const cropImageToFile = (imageUrl: string, region: CropRegion, container: HTMLDivElement): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = containerW / containerH;

        let renderedW: number, renderedH: number, offsetX: number, offsetY: number;
        if (imgAspect > containerAspect) {
          renderedW = containerW;
          renderedH = containerW / imgAspect;
          offsetX = 0;
          offsetY = (containerH - renderedH) / 2;
        } else {
          renderedH = containerH;
          renderedW = containerH * imgAspect;
          offsetX = (containerW - renderedW) / 2;
          offsetY = 0;
        }

        const scaleX = img.naturalWidth / renderedW;
        const scaleY = img.naturalHeight / renderedH;

        const cropX = Math.max(0, (region.x - offsetX) * scaleX);
        const cropY = Math.max(0, (region.y - offsetY) * scaleY);
        const cropW = Math.min(img.naturalWidth - cropX, region.width * scaleX);
        const cropH = Math.min(img.naturalHeight - cropY, region.height * scaleY);

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, cropW);
        canvas.height = Math.max(1, cropH);
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }

        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Blob creation failed')); return; }
          resolve(new File([blob], 'cropped.jpg', { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = imageUrl;
    });
  };

  // ==================== GEMINI API ====================

  const fileToBase64Part = (file: File): Promise<{ inline_data: { mime_type: string; data: string } }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve({ inline_data: { mime_type: file.type || 'image/jpeg', data: base64 } });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const analyzeWithGemini = async (files: File[]): Promise<any> => {
    const imageParts = await Promise.all(files.map(fileToBase64Part));

    const languageMap: Record<Language, string> = {
      'english': 'English',
      'hindi': 'Hindi (हिंदी)',
      'bengali': 'Bengali (বাংলা)',
      'marathi': 'Marathi (मराठी)',
      'tamil': 'Tamil (தமிழ்)',
      'telugu': 'Telugu (తెలుగు)',
      'gujarati': 'Gujarati (ગુજરાતી)',
      'kannada': 'Kannada (ಕನ್ನಡ)',
      'malayalam': 'Malayalam (മലയാളం)',
      'punjabi': 'Punjabi (ਪੰਜਾਬੀ)',
      'assamese': 'Assamese (অসমीয়া)'
    };

    const lang = languageMap[patientLanguage] || 'English';

    const prompt = `You are an expert Pharmacist. You are given prescription image(s). The user has highlighted a specific area containing medicines.

Task: Extract ALL medicine names, dosage, frequency, duration, and any advice/instructions from the prescription.

OUTPUT FORMAT (Strict JSON):
{
  "medicines": [
    {
      "name": "Medicine Name (corrected spelling)",
      "dosage": "500mg",
      "frequency": "1-0-1",
      "duration": "5 days",
      "instructions": "Take after food",
      "translatedInstructions": "Translation in ${lang}"
    }
  ],
  "advice": [
    {
      "english": "Any advice written by doctor",
      "translated": "Translation in ${lang}"
    }
  ],
  "confidenceScore": 85
}

RULES:
1. Extract ALL medicine names visible. Common abbreviations: Tab=Tablet, Cap=Capsule, Syr=Syrup, Inj=Injection.
2. Decode dosage frequency: OD=Once/day, BD=Twice/day, TDS=Thrice/day, QID=4 times/day, HS=At night, SOS=As needed.
3. Correct obvious spelling mistakes in medicine names.
4. Translate ALL instructions to ${lang}.
5. Do NOT include doctor name, clinic info, or patient demographics.
6. If you can see ANY text at all, try your best to decode it. Do NOT return empty arrays unless the image is completely unreadable.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, ...imageParts] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `Status ${response.status}`;
      console.error('❌ Gemini API error:', response.status, errData);
      throw new Error(`AI analysis failed: ${errMsg}`);
    }

    const data = await response.json();
    console.log('🔍 Full Gemini response structure:', JSON.stringify(data).substring(0, 500));

    // Gemini 2.5 may return thinking + text parts
    const parts = data.candidates?.[0]?.content?.parts || [];
    let text = '';
    for (const part of parts) {
      if (part.text) text += part.text;
    }
    if (!text) throw new Error('No response from AI');

    console.log('🤖 Gemini raw response:', text);

    // Clean: remove markdown fences, thinking blocks, extra whitespace
    let cleanJson = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove thinking tags if any
      .trim();

    // Find the JSON object in the text (sometimes there's preamble text)
    const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not find JSON in AI response');

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('✅ Parsed result:', parsed);
    return parsed;
  };

  // ==================== BUSINESS LOGIC ====================

  const formatResultToText = (result: any): string => {
    let text = '';
    if (result.diagnosis) text += `DIAGNOSIS: ${result.diagnosis}\n\n`;

    if (result.medicines?.length) {
      text += 'MEDICINES:\n';
      result.medicines.forEach((m: any, i: number) => {
        text += `${i + 1}. ${m.name}`;
        if (m.dosage) text += ` - ${m.dosage}`;
        if (m.frequency) text += ` (${m.frequency})`;
        if (m.duration) text += ` for ${m.duration}`;
        text += '\n';
        if (m.instructions) text += `   ${m.instructions}\n`;
        if (m.translatedInstructions) text += `   → ${m.translatedInstructions}\n`;
      });
    }

    if (result.advice?.length) {
      text += '\nADVICE:\n';
      result.advice.forEach((a: any, i: number) => {
        text += `${i + 1}. ${a.english}`;
        if (a.translated) text += ` → ${a.translated}`;
        text += '\n';
      });
    }

    return text;
  };

  // Check if at least one page has a crop selection
  const hasAnyCropSelection = savedRegions.some(r => r !== null && r.width > 20 && r.height > 20);

  const handleDecodeAndTranslate = async () => {
    if (selectedFiles.length === 0) return;
    if (!hasAnyCropSelection) {
      toast.error('Please select the medicine portion on at least one page before decoding');
      return;
    }
    setProcessingStep('analyzing');

    try {
      // Send BOTH full original images AND cropped portions for better AI context
      const filesToProcess: File[] = [];

      // Always include full original images first (gives Gemini full context)
      for (let i = 0; i < selectedFiles.length; i++) {
        filesToProcess.push(selectedFiles[i]);
        console.log(`📄 Page ${i + 1}: added full original image`);
      }

      // Then add cropped portions (helps Gemini focus on medicine area)
      for (let i = 0; i < selectedFiles.length; i++) {
        const region = savedRegions[i];
        const container = containerRefs.current[i];

        if (region && container && region.width > 20 && region.height > 20) {
          try {
            const cropped = await cropImageToFile(previewUrls[i], region, container);
            console.log(`✂️ Page ${i + 1}: cropped ${Math.round(region.width)}x${Math.round(region.height)}px, file size: ${cropped.size} bytes`);
            filesToProcess.push(cropped);
          } catch (err) {
            console.warn(`⚠️ Page ${i + 1}: crop failed:`, err);
          }
        }
      }

      console.log(`📤 Sending ${filesToProcess.length} images to Gemini (${selectedFiles.length} original + cropped portions)`);

      const result = await analyzeWithGemini(filesToProcess);
      console.log('✅ Gemini analysis result:', result);

      setAnalysisResult(result);
      setDecodedText(formatResultToText(result));
      setConfidenceScore(result.confidenceScore || 0);
      setProcessingStep('result');
    } catch (error: any) {
      console.error('❌ Analysis failed:', error);
      toast.error(error.message || 'Analysis failed');
      setProcessingStep('upload');
    }
  };

  // Compress image before upload
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const MAX = 1200;
        if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } }
        else { if (h > MAX) { w *= MAX / h; h = MAX; } }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No ctx')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Compress failed')), 'image/jpeg', 0.8);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  // Upload images to Firebase Storage
  const uploadImagesToStorage = async (): Promise<string[]> => {
    const urls: string[] = [];
    if (!storage) throw new Error('Storage not initialized');
    for (let i = 0; i < selectedFiles.length; i++) {
      const compressed = await compressImage(selectedFiles[i]);
      const storageRef = ref(storage, `prescriptions/${patientId}/${Date.now()}_${i}.jpg`);
      await uploadBytes(storageRef, compressed);
      urls.push(await getDownloadURL(storageRef));
    }
    return urls;
  };

  // Send FCM push notification via Cloud Function
  const sendFCMNotification = async (notificationId: string) => {
    if (!patientPhone || !db) return;
    const phone10 = patientPhone.replace(/\D/g, '').replace(/^91/, '').slice(-10);
    const tokenDoc = await getDoc(doc(db, 'fcmTokens', `patient_${phone10}`));
    const fcmToken = tokenDoc.exists() ? tokenDoc.data().token : null;

    if (!fcmToken) {
      toast.warning('Patient notification token missing. Saved but not pushed.');
      return;
    }

    try {
      const result = await sendAIRXNotification({
        patientId, patientName,
        doctorName: doctorName || 'Doctor',
        notificationId, fcmToken,
      });
      if (result.success) {
        await setDoc(doc(db!, 'notifications', notificationId), {
          status: 'sent', sentAt: serverTimestamp(), fcmMessageId: result.messageId,
        }, { merge: true });
      }
    } catch (err) {
      console.error('FCM error:', err);
    }
  };

  // Send original images (no AI)
  const handleSendOriginal = async () => {
    if (selectedFiles.length === 0 || isSending) return;
    setIsSending(true);
    setProcessingStep('sending');

    try {
      const imageUrls = await uploadImagesToStorage();
      const notifRef = await addDoc(collection(db!, 'notifications'), {
        type: 'ai_rx_prescription', patientId, recipientId: patientId,
        patientName, doctorId, doctorName: doctorName || 'Doctor',
        decodedText: 'Original prescription (no AI analysis)',
        ocrConfidence: 0, prescriptionImages: imageUrls,
        totalPages: imageUrls.length, language: patientLanguage,
        createdAt: serverTimestamp(), status: 'pending',
        deliveryMethod: 'fcm', read: false, isOriginal: true,
      });

      await sendFCMNotification(notifRef.id);
      setProcessingStep('done');
      toast.success('Original prescription sent to patient!');
      onUploadSuccess?.();
      setTimeout(resetAndClose, 2000);
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
      setProcessingStep('upload');
      setIsSending(false);
    }
  };

  // Send AI-decoded results to patient
  const handleSendToPatient = async () => {
    if (isSending) return;
    setIsSending(true);
    setProcessingStep('sending');

    try {
      const imageUrls = await uploadImagesToStorage();
      const notifRef = await addDoc(collection(db!, 'notifications'), {
        type: 'ai_rx_prescription', patientId, recipientId: patientId,
        patientName, doctorId, doctorName: doctorName || 'Doctor',
        decodedText, ocrConfidence: confidenceScore,
        analysisResult, prescriptionImages: imageUrls,
        totalPages: imageUrls.length, language: patientLanguage,
        createdAt: serverTimestamp(), status: 'pending',
        deliveryMethod: 'fcm', read: false,
      });

      await sendFCMNotification(notifRef.id);
      setProcessingStep('done');
      toast.success('AI-decoded prescription sent to patient!');
      onUploadSuccess?.();
      setTimeout(resetAndClose, 2000);
    } catch (error: any) {
      toast.error('Failed: ' + error.message);
      setProcessingStep('result');
      setIsSending(false);
    }
  };

  const resetAndClose = () => {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setSelectedFiles([]);
    setPreviewUrls([]);
    setProcessingStep('upload');
    setAnalysisResult(null);
    setDecodedText('');
    setConfidenceScore(0);
    setIsSending(false);
    setSavedRegions([]);
    onClose();
  };

  if (!isOpen) return null;

  // ==================== RENDER ====================
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-700/50">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">AI RX Analysis</h2>
              <p className="text-gray-400 text-xs">Powered by Gemini 2.5 Flash</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            disabled={processingStep === 'analyzing' || processingStep === 'sending'}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ---- ANALYZING STATE ---- */}
          {processingStep === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 border-2 border-purple-500/50 rounded-full flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Analyzing Prescription</h3>
              <p className="text-gray-400 text-center">Gemini AI is decoding handwriting & translating instructions...</p>
            </div>
          )}

          {/* ---- SENDING STATE ---- */}
          {processingStep === 'sending' && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-6" />
              <h3 className="text-white font-bold text-xl mb-2">Sending to Patient</h3>
              <p className="text-gray-400 text-center">Uploading images & sending notification...</p>
            </div>
          )}

          {/* ---- DONE STATE ---- */}
          {processingStep === 'done' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">Sent Successfully!</h3>
              <p className="text-gray-400 text-center">Patient has been notified</p>
            </div>
          )}

          {/* ---- UPLOAD STATE ---- */}
          {processingStep === 'upload' && (
            <>
              {/* Upload Area */}
              <label className="block cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-gray-600 rounded-xl p-10 text-center hover:border-gray-400 transition-colors bg-gray-900/30">
                  <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3" />
                  <div className="text-white font-semibold">Click to upload RX images</div>
                  <div className="text-gray-500 text-sm mt-1">Max {MAX_PAGES} pages • JPG/PNG</div>
                </div>
              </label>

              {/* Pages Section */}
              {selectedFiles.length > 0 && (
                <>
                  {/* Crop Hint + Page Counter */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Crop className="w-4 h-4" />
                      <span>Crop images to focus on handwriting</span>
                    </div>
                    <span className="text-gray-500 text-sm">{selectedFiles.length} / {MAX_PAGES} Pages</span>
                  </div>

                  {/* Page Thumbnails Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {previewUrls.map((url, index) => (
                      <div key={index}>
                        <div
                          ref={el => { containerRefs.current[index] = el; }}
                          className="relative bg-black rounded-lg overflow-hidden"
                          style={{ aspectRatio: '3/4' }}
                        >
                          <img
                            src={url}
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-contain"
                            draggable={false}
                            onLoad={() => syncCanvasSize(index)}
                          />
                          <canvas
                            ref={el => { canvasRefs.current[index] = el; }}
                            onMouseDown={e => handlePointerDown(index, e)}
                            onMouseMove={e => handlePointerMove(index, e)}
                            onMouseUp={e => handlePointerUp(index, e)}
                            onMouseLeave={e => { if (isDrawing && drawingPageIndex === index) handlePointerUp(index, e); }}
                            onTouchStart={e => { e.preventDefault(); handlePointerDown(index, e); }}
                            onTouchMove={e => { e.preventDefault(); handlePointerMove(index, e); }}
                            onTouchEnd={e => { e.preventDefault(); handlePointerUp(index, e); }}
                            className="absolute inset-0 w-full h-full cursor-crosshair"
                            style={{ touchAction: 'none' }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 text-sm">Page {index + 1}</span>
                            {savedRegions[index] ? (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">✓ Selected</span>
                            ) : (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">Select area</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemovePage(index)}
                            className="text-red-400 text-sm flex items-center gap-1 hover:text-red-300 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Page Slot */}
                    {selectedFiles.length < MAX_PAGES && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          onChange={handleAddPage}
                          className="hidden"
                        />
                        <div
                          className="border-2 border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center hover:border-gray-500 transition-colors bg-gray-800/20"
                          style={{ aspectRatio: '3/4' }}
                        >
                          <div className="w-12 h-12 border-2 border-gray-600 rounded-full flex items-center justify-center mb-2">
                            <Plus className="w-6 h-6 text-gray-500" />
                          </div>
                          <span className="text-gray-500 text-sm">Add Page</span>
                        </div>
                      </label>
                    )}
                  </div>

                  {/* Selection Status Message */}
                  {!hasAnyCropSelection && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-sm text-purple-300 flex items-start gap-2">
                      <Crop className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>Draw a rectangle on the prescription to select the <strong>medicine portion only</strong>. Full-page decoding is not required.</span>
                    </div>
                  )}

                  {/* Decode & Translate Button */}
                  <button
                    onClick={handleDecodeAndTranslate}
                    disabled={!hasAnyCropSelection}
                    className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-opacity shadow-lg ${
                      hasAnyCropSelection
                        ? 'bg-gradient-to-r from-pink-500 via-fuchsia-500 to-pink-600 text-white hover:opacity-90 shadow-pink-500/20'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Sparkles className="w-5 h-5" />
                    Decode & Translate (AI)
                  </button>

                  {/* OR Divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-700" />
                    <span className="text-gray-500 text-sm">OR</span>
                    <div className="flex-1 h-px bg-gray-700" />
                  </div>

                  {/* Send Original Button */}
                  <button
                    onClick={handleSendOriginal}
                    disabled={isSending}
                    className="w-full py-3.5 bg-transparent border border-gray-600 text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    Send Original (No AI Analysis)
                  </button>
                </>
              )}
            </>
          )}

          {/* ---- RESULT STATE ---- */}
          {processingStep === 'result' && analysisResult && (
            <div className="space-y-5">
              {/* Header + Confidence */}
              <div className="flex items-center justify-between">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  AI Analysis Result
                </h3>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  confidenceScore >= 80 ? 'bg-green-500/20 text-green-400' :
                  confidenceScore >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {confidenceScore}% Confidence
                </span>
              </div>

              {/* Diagnosis */}
              {analysisResult.diagnosis && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-xs font-medium uppercase mb-1">Diagnosis</div>
                  <div className="text-white font-medium">{analysisResult.diagnosis}</div>
                </div>
              )}

              {/* Medicines */}
              {analysisResult.medicines?.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-gray-400 text-xs font-medium uppercase">
                    Medicines ({analysisResult.medicines.length})
                  </div>
                  {analysisResult.medicines.map((med: any, i: number) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-white font-semibold">{i + 1}. {med.name}</span>
                        {med.dosage && (
                          <span className="text-purple-400 text-sm font-medium ml-2 shrink-0">{med.dosage}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {med.frequency && (
                          <div>
                            <span className="text-gray-500">Frequency: </span>
                            <span className="text-gray-300">{med.frequency}</span>
                          </div>
                        )}
                        {med.duration && (
                          <div>
                            <span className="text-gray-500">Duration: </span>
                            <span className="text-gray-300">{med.duration}</span>
                          </div>
                        )}
                      </div>
                      {med.instructions && (
                        <div className="mt-2 text-sm">
                          <span className="text-gray-500">Instructions: </span>
                          <span className="text-gray-300">{med.instructions}</span>
                        </div>
                      )}
                      {med.translatedInstructions && (
                        <div className="mt-1 text-sm text-purple-300 italic">
                          {med.translatedInstructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback: show raw decoded text if no structured medicines */
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <div className="text-gray-400 text-xs font-medium uppercase mb-2">Decoded Text (Raw)</div>
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
                    {decodedText || JSON.stringify(analysisResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Advice */}
              {analysisResult.advice?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-gray-400 text-xs font-medium uppercase">Advice</div>
                  {analysisResult.advice.map((adv: any, i: number) => (
                    <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                      <div className="text-gray-300 text-sm">{adv.english}</div>
                      {adv.translated && (
                        <div className="text-purple-300 text-sm italic mt-1">{adv.translated}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Original Images Thumbnails */}
              <div className="space-y-2">
                <div className="text-gray-400 text-xs font-medium uppercase">Original Prescription</div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {previewUrls.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Page ${i + 1}`}
                      className="h-20 w-auto rounded border border-gray-700 object-cover shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>AI decoded text may contain errors. Please verify before sending to patient.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setProcessingStep('upload'); setAnalysisResult(null); }}
                  disabled={isSending}
                  className="flex-1 py-3 border border-gray-600 text-gray-300 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Re-analyze
                </button>
                <button
                  onClick={handleSendToPatient}
                  disabled={isSending}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSending ? 'Sending...' : 'Send to Patient'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
